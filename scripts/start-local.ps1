[CmdletBinding()]
param(
  [ValidateRange(30, 300)]
  [int]$TimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$logRoot = Join-Path $workspaceRoot '.codex-tmp\service-logs'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

function Resolve-Executable([string]$CommandName, [string]$Fallback) {
  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  if (Test-Path -LiteralPath $Fallback) { return $Fallback }
  throw "Required executable was not found: $CommandName"
}

$pnpm = Resolve-Executable 'pnpm.cmd' 'C:\Users\Stanj\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
$docker = Resolve-Executable 'docker.exe' 'F:\Docker\Docker\resources\bin\docker.exe'
$dockerDesktop = 'F:\Docker\Docker\Docker Desktop.exe'
$dockerCli = 'F:\Docker\Docker\DockerCli.exe'
$bonjourTool = Join-Path $env:WINDIR 'System32\dns-sd.exe'
$composeFile = Join-Path $workspaceRoot 'docker-compose.dev.yml'
$metroRuleDocPath = Join-Path $workspaceRoot 'docs\metro-lan-only.md'
$discoveryPidPath = Join-Path $workspaceRoot '.codex-tmp\metro-discovery.pid'
$discoveryLogPath = Join-Path $logRoot 'metro-discovery.log'
$composeWatchPidPath = Join-Path $workspaceRoot '.codex-tmp\compose-watch.pid'
$composeWatchLogPath = Join-Path $logRoot 'compose-watch.log'
# Always use Docker Desktop's Linux engine. This prevents a stale `default`
# context or DOCKER_HOST override from making the launcher appear unreachable.
$env:DOCKER_CONTEXT = 'desktop-linux'
$env:DOCKER_HOST = $null
if (-not (Test-Path -LiteralPath $dockerDesktop)) {
  throw "Docker Desktop was not found at $dockerDesktop. Set the path in scripts/start-local.ps1 if the install location changes."
}
if (-not (Test-Path -LiteralPath $composeFile)) {
  throw "Docker Compose file was not found at $composeFile."
}

function Test-DockerHealthy {
  try {
    & $docker info --format '{{.ServerVersion}}' *> $null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Test-LocalPort([int]$Port) {
  return $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Wait-ForDocker {
  for ($attempt = 1; $attempt -le $TimeoutSeconds; $attempt++) {
    if (Test-DockerHealthy) { return }
    Start-Sleep -Seconds 1
  }
  $errorPath = 'C:\Users\Stanj\AppData\Local\Docker\backend.error.json'
  if (Test-Path -LiteralPath $errorPath) {
    $dockerError = (Get-Content -LiteralPath $errorPath -Raw | ConvertFrom-Json).error
    throw "Docker Desktop did not become ready: $dockerError"
  }
  throw "Docker Desktop did not become ready within $TimeoutSeconds seconds."
}

function Wait-ForPorts([int[]]$Ports, [string]$ServiceName) {
  for ($attempt = 1; $attempt -le $TimeoutSeconds; $attempt++) {
    $missing = @($Ports | Where-Object { -not (Test-LocalPort $_) })
    if ($missing.Count -eq 0) { return }
    Start-Sleep -Seconds 1
  }
  throw "$ServiceName did not open port(s): $($missing -join ', ')"
}

function Assert-MetroLanRule {
  if (-not (Test-Path -LiteralPath $metroRuleDocPath)) {
    throw "Metro safety check failed: required LAN-only document is missing at $metroRuleDocPath."
  }
  $metroRule = Get-Content -LiteralPath $metroRuleDocPath -Raw
  if ($metroRule -notmatch 'must never advertise.*localhost' -or
      $metroRule -notmatch 'EXPO_HOST_IP') {
    throw 'Metro safety check failed: the LAN-only document no longer contains the required localhost prohibition.'
  }
  if ([string]::IsNullOrWhiteSpace($env:EXPO_HOST_IP) -or
      $env:EXPO_HOST_IP -match '^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0)$') {
    throw "Metro safety check failed: EXPO_HOST_IP must be a reachable LAN address, got '$($env:EXPO_HOST_IP)'."
  }
  Write-Host "Metro safety check: LAN-only ($($env:EXPO_HOST_IP)); read $metroRuleDocPath"
}

function Assert-MetroManifest([string]$IpAddress) {
  Assert-MetroLanRule
  $expectedHost = "$IpAddress`:8081"
  $lastError = 'manifest endpoint was not ready'
  for ($attempt = 1; $attempt -le $TimeoutSeconds; $attempt++) {
    try {
      $headers = @{ 'expo-platform' = 'ios'; 'expo-dev-client-id' = 'sds-local' }
      $manifest = (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8081/' -Headers $headers -TimeoutSec 10).Content |
        ConvertFrom-Json
      $launchUrl = [string]$manifest.launchAsset.url
      $hostUri = [string]$manifest.extra.expoClient.hostUri
      if ($hostUri -ne $expectedHost -or
          $launchUrl -notlike "http://$expectedHost/*" -or
          $launchUrl -match '(?i)localhost|127\.0\.0\.1') {
        throw "manifest is not LAN-only. launchAsset='$launchUrl'; hostUri='$hostUri'; expected='$expectedHost'"
      }
      Write-Host "Metro manifest verified: $expectedHost"
      return
    } catch {
      $lastError = $_.Exception.Message
      Start-Sleep -Seconds 1
    }
  }
  throw "Metro safety check failed after $TimeoutSeconds seconds: $lastError"
}

function Stop-MetroDiscovery {
  if (-not (Test-Path -LiteralPath $discoveryPidPath)) { return }

  $discoveryProcessId = 0
  $pidText = Get-Content -LiteralPath $discoveryPidPath -Raw -ErrorAction SilentlyContinue
  if ([string]::IsNullOrWhiteSpace($pidText) -or -not [int]::TryParse($pidText.Trim(), [ref]$discoveryProcessId)) {
    Remove-Item -LiteralPath $discoveryPidPath -Force -ErrorAction SilentlyContinue
    return
  }

  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $discoveryProcessId" -ErrorAction SilentlyContinue
  $isOurProcess = $processInfo -and
    ($processInfo.ExecutablePath -eq $bonjourTool) -and
    ($processInfo.CommandLine -like '*_expo._tcp*') -and
    ($processInfo.CommandLine -like '*SDS Local*')
  if ($isOurProcess) {
    Stop-Process -Id $discoveryProcessId -Force -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath $discoveryPidPath -Force -ErrorAction SilentlyContinue
}

function Start-MetroDiscovery([string]$IpAddress) {
  Assert-MetroLanRule
  Stop-MetroDiscovery
  if ($IpAddress -eq 'localhost') {
    Write-Warning 'No LAN address was found; Bonjour Metro discovery was skipped.'
    return
  }
  if (-not (Test-Path -LiteralPath $bonjourTool)) {
    Write-Warning "Windows Bonjour tool was not found at $bonjourTool; Metro is reachable by URL but will not be auto-discovered."
    return
  }

  Remove-Item -LiteralPath $discoveryLogPath -Force -ErrorAction SilentlyContinue
  $hostName = [System.Net.Dns]::GetHostName()
  # Docker Desktop publishes Metro on the host, but its Linux VM does not relay
  # Bonjour multicast. Proxy-register the published endpoint on Windows so the
  # Expo development client can discover it normally over the local network.
  $arguments = '-P "SDS Local" _expo._tcp local 8081 "{0}" "{1}" "name=SDS Local" "slug=sds-local" "androidPackage=com.stanforddevelopmentsolutions.sdslocal" "iosBundleIdentifier=com.stanforddevelopmentsolutions.sdslocal"' -f $hostName, $IpAddress
  $discoveryProcess = Start-Process -FilePath $bonjourTool `
    -ArgumentList $arguments `
    -RedirectStandardOutput $discoveryLogPath `
    -RedirectStandardError "$discoveryLogPath.err" `
    -PassThru `
    -WindowStyle Hidden
  Set-Content -LiteralPath $discoveryPidPath -Value $discoveryProcess.Id -NoNewline

  $registered = $false
  for ($attempt = 1; $attempt -le 20; $attempt++) {
    Start-Sleep -Milliseconds 250
    if ($discoveryProcess.HasExited) { break }
    if ((Get-Content -LiteralPath $discoveryLogPath -Raw -ErrorAction SilentlyContinue) -match 'Name now registered and active') {
      $registered = $true
      break
    }
  }
  if ($registered) {
    Write-Host "Bonjour discovery: SDS Local on $IpAddress`:8081"
  } else {
    $details = Get-Content -LiteralPath "$discoveryLogPath.err" -Raw -ErrorAction SilentlyContinue
    if (-not $details) { $details = Get-Content -LiteralPath $discoveryLogPath -Raw -ErrorAction SilentlyContinue }
    Write-Warning "Bonjour Metro discovery could not be registered. Metro is still available at exp://$IpAddress`:8081. $details"
  }
}

function Stop-ComposeWatch {
  if (-not (Test-Path -LiteralPath $composeWatchPidPath)) { return }

  $watchProcessId = 0
  $pidText = Get-Content -LiteralPath $composeWatchPidPath -Raw -ErrorAction SilentlyContinue
  if ([string]::IsNullOrWhiteSpace($pidText) -or -not [int]::TryParse($pidText.Trim(), [ref]$watchProcessId)) {
    Remove-Item -LiteralPath $composeWatchPidPath -Force -ErrorAction SilentlyContinue
    return
  }

  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $watchProcessId" -ErrorAction SilentlyContinue
  $isOurProcess = $processInfo -and
    ($processInfo.ExecutablePath -eq $docker) -and
    ($processInfo.CommandLine -like '*compose*watch*') -and
    ($processInfo.CommandLine -like "*$composeFile*")
  if ($isOurProcess) {
    # docker.exe launches a docker-compose.exe child on Windows. Stop the
    # entire small process tree so the child cannot keep Compose's project
    # lock after the parent exits.
    function Stop-ProcessTree([int]$ProcessId) {
      $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty ProcessId)
      foreach ($childProcessId in $children) {
        Stop-ProcessTree $childProcessId
      }
      Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    }
    Stop-ProcessTree $watchProcessId
  }
  Remove-Item -LiteralPath $composeWatchPidPath -Force -ErrorAction SilentlyContinue
}

function Start-ComposeWatch {
  Assert-MetroLanRule
  Stop-ComposeWatch
  Remove-Item -LiteralPath $composeWatchLogPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath "$composeWatchLogPath.err" -Force -ErrorAction SilentlyContinue

  # Compose Watch replaces the mobile bind mount. That matters on Windows:
  # Docker Desktop can expose current file contents through a bind mount while
  # dropping the inotify events Metro relies on for Fast Refresh. Watch syncs
  # saved source into the image-backed workspace and preserves those events.
  $watchArguments = @('compose', '-f', $composeFile, 'watch', '--no-up', 'mobile')
  $watchProcess = Start-Process -FilePath $docker `
    -ArgumentList $watchArguments `
    -WorkingDirectory $workspaceRoot `
    -RedirectStandardOutput $composeWatchLogPath `
    -RedirectStandardError "$composeWatchLogPath.err" `
    -PassThru `
    -WindowStyle Hidden
  Set-Content -LiteralPath $composeWatchPidPath -Value $watchProcess.Id -NoNewline

  Start-Sleep -Milliseconds 750
  if ($watchProcess.HasExited) {
    $details = Get-Content -LiteralPath "$composeWatchLogPath.err" -Raw -ErrorAction SilentlyContinue
    if (-not $details) { $details = Get-Content -LiteralPath $composeWatchLogPath -Raw -ErrorAction SilentlyContinue }
    Remove-Item -LiteralPath $composeWatchPidPath -Force -ErrorAction SilentlyContinue
    throw "Docker Compose Watch failed to start. $details"
  }
  Write-Host 'Compose Watch: mobile source sync enabled for Metro Fast Refresh.'
}

function Get-DockerProcess {
  return @(Get-Process -Name 'Docker Desktop', 'com.docker.backend', 'com.docker.proxy', 'com.docker.sailor' -ErrorAction SilentlyContinue)
}

function Quarantine-StaleDockerRuntime {
  $runtimeRoots = @(
    @{ Path = 'C:\Users\Stanj\AppData\Local\Docker\run'; Sockets = @('sailor-ingest.sock', 'dockerInference') },
    @{ Path = 'C:\Users\Stanj\AppData\Local\docker-secrets-engine'; Sockets = @('engine.sock') }
  )
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  foreach ($runtime in $runtimeRoots) {
    $hasStaleSocket = @($runtime.Sockets | Where-Object { Test-Path -LiteralPath (Join-Path $runtime.Path $_) }).Count -gt 0
    if (-not $hasStaleSocket) { continue }
    $destination = "$($runtime.Path).codex-stale-$stamp"
    $suffix = 1
    while (Test-Path -LiteralPath $destination) {
      $destination = "$($runtime.Path).codex-stale-$stamp-$suffix"
      $suffix++
    }
    Move-Item -LiteralPath $runtime.Path -Destination $destination
    New-Item -ItemType Directory -Path $runtime.Path -Force | Out-Null
    Write-Host "Quarantined stale Docker runtime: $destination"
  }
}

if (-not (Test-DockerHealthy)) {
  $dockerProcesses = Get-DockerProcess
  if ($dockerProcesses.Count -gt 0) {
    if (Test-Path -LiteralPath $dockerCli) {
      Start-Process -FilePath $dockerCli -ArgumentList '-Shutdown' -Wait -WindowStyle Hidden | Out-Null
    }
    for ($attempt = 1; $attempt -le 30; $attempt++) {
      $dockerProcesses = Get-DockerProcess
      if ($dockerProcesses.Count -eq 0) { break }
      Start-Sleep -Seconds 1
    }
    if ($dockerProcesses.Count -gt 0) {
      throw 'Docker Desktop processes are still running but the engine is unavailable. Close Docker Desktop, then run this launcher again.'
    }
  }
  Quarantine-StaleDockerRuntime
  Start-Process -FilePath $dockerDesktop | Out-Null
  Write-Host 'Starting Docker Desktop...'
  Wait-ForDocker
}
Write-Host 'Docker engine is ready.'

$supabasePorts = @(54321, 54322, 54323, 54324)
if (@($supabasePorts | Where-Object { -not (Test-LocalPort $_) }).Count -gt 0) {
  Write-Host 'Starting Supabase containers...'
  & $pnpm run db:start
  if ($LASTEXITCODE -ne 0) { throw 'Supabase failed to start. See the Docker/Supabase output above.' }
  Wait-ForPorts $supabasePorts 'Supabase'
} else {
  Write-Host 'Supabase is already ready.'
}

$lanIp = (Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } |
    ForEach-Object { $_.IPv4Address.IPAddress } |
    Where-Object { $_ -and $_ -notlike '127.*' } |
    Select-Object -First 1)
if (-not $lanIp) { $lanIp = 'localhost' }
$env:EXPO_HOST_IP = $lanIp
Assert-MetroLanRule

Write-Host 'Starting containerized web and mobile services...'
& $docker compose -f $composeFile up -d --build
if ($LASTEXITCODE -ne 0) {
  throw 'The containerized app services failed to start. Run docker compose -f docker-compose.dev.yml logs for details.'
}
Wait-ForPorts @(3000) 'Next.js container'
Wait-ForPorts @(8081) 'Expo Metro container'
Assert-MetroManifest $lanIp
Start-ComposeWatch
Start-MetroDiscovery $lanIp

Write-Host ''
Write-Host 'SDS Local is ready.' -ForegroundColor Green
Write-Host 'Web:      http://localhost:3000/auth'
Write-Host "Expo LAN: exp://$lanIp`:8081"
Write-Host 'Expo discovery: Bonjour _expo._tcp (automatic in the development client)'
Write-Host 'Fast Refresh: Docker Compose Watch syncs mobile source changes.'
Write-Host 'Supabase: http://localhost:54323'
Write-Host "Docker:   `$env:EXPO_HOST_IP='$lanIp'; docker compose -f docker-compose.dev.yml ps"
