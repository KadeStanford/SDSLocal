[CmdletBinding()]
param(
  [switch]$Once,
  [switch]$IncludeMediaCleanup,
  [ValidateRange(30, 3600)]
  [int]$NotificationIntervalSeconds = 300,
  [ValidateRange(300, 86400)]
  [int]$MediaIntervalSeconds = 3600
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$supabaseCli = Join-Path $workspaceRoot 'node_modules\.bin\supabase.CMD'

function Get-LocalSupabaseEnv {
  if (-not (Test-Path -LiteralPath $supabaseCli)) {
    throw "Supabase CLI was not found at $supabaseCli. Run pnpm install first."
  }
  $lines = & $supabaseCli status -o env | Where-Object { $_ -match '^[A-Z0-9_]+=' }
  if ($LASTEXITCODE -ne 0) { throw 'Supabase is not running. Start it with pnpm db:start.' }
  $values = $lines | ConvertFrom-StringData
  if (-not $values.API_URL -or -not $values.SERVICE_ROLE_KEY) {
    throw 'Supabase status did not return API_URL and SERVICE_ROLE_KEY.'
  }
  return [pscustomobject]@{
    API_URL = $values.API_URL.Trim('"')
    SERVICE_ROLE_KEY = $values.SERVICE_ROLE_KEY.Trim('"')
  }
}

function Invoke-LocalFunction([string]$Name, [string]$ApiUrl, [string]$ServiceRoleKey) {
  $headers = @{
    apikey = $ServiceRoleKey
    Authorization = "Bearer $ServiceRoleKey"
    'x-sds-dispatch-trigger' = 'local-dev'
  }
  try {
    $request = @{
      Method = 'Post'
      Uri = "$ApiUrl/functions/v1/$Name"
      Headers = $headers
      ContentType = 'application/json'
      Body = '{}'
    }
    $result = Invoke-RestMethod @request
    Write-Host "[$(Get-Date -Format o)] ${Name}: $($result | ConvertTo-Json -Compress)"
  } catch {
    Write-Warning "[$(Get-Date -Format o)] $Name failed: $($_.Exception.Message)"
  }
}

$nextMediaRun = [DateTimeOffset]::MinValue
do {
  $localEnv = Get-LocalSupabaseEnv
  Invoke-LocalFunction 'notification-dispatch' $localEnv.API_URL $localEnv.SERVICE_ROLE_KEY
  if ($IncludeMediaCleanup -and [DateTimeOffset]::UtcNow -ge $nextMediaRun) {
    Invoke-LocalFunction 'media-cleanup' $localEnv.API_URL $localEnv.SERVICE_ROLE_KEY
    $nextMediaRun = [DateTimeOffset]::UtcNow.AddSeconds($MediaIntervalSeconds)
  }
  if ($Once) { break }
  Start-Sleep -Seconds $NotificationIntervalSeconds
} while ($true)
