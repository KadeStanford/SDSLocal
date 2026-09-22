param(
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Read-DotEnvValue([string]$Path, [string]$Name) {
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match ("^" + [regex]::Escape($Name) + "=") } | Select-Object -First 1
  if (-not $line) { return $null }
  return $line.Substring($Name.Length + 1)
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot '.env'
$token = Read-DotEnvValue $envPath 'SUPABASE_ACCESS_TOKEN'
$projectRef = Read-DotEnvValue $envPath 'SDS_STAGING_SUPABASE_PROJECT_REF'
$billingLock = Read-DotEnvValue $envPath 'SDS_STAGING_BILLING_LOCK'

if ([string]::IsNullOrWhiteSpace($token)) {
  throw 'SUPABASE_ACCESS_TOKEN is missing from the ignored root .env file.'
}
if ($projectRef -notmatch '^[a-z0-9]{8,40}$') {
  throw 'SDS_STAGING_SUPABASE_PROJECT_REF is missing or invalid.'
}
if ($billingLock -and $billingLock.ToLowerInvariant() -ne 'true') {
  throw 'SDS_STAGING_BILLING_LOCK must remain true.'
}

$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
$apiBase = "https://api.supabase.com/v1/projects/$projectRef/database/migrations"
$historyResponse = Invoke-WebRequest -Method Get -Uri $apiBase -Headers @{ Authorization = "Bearer $token" } -SkipHttpErrorCheck
if ([int]$historyResponse.StatusCode -ne 200) {
  throw "Unable to read staging migration history (HTTP $($historyResponse.StatusCode))."
}

$applied = @{}
foreach ($entry in @($historyResponse.Content | ConvertFrom-Json)) {
  if ($entry.name) { $applied[[string]$entry.name] = $true }
}

$migrationPath = Join-Path $repoRoot 'supabase/migrations'
$files = Get-ChildItem -LiteralPath $migrationPath -Filter '*.sql' -File | Sort-Object Name
$pending = @($files | Where-Object { -not $applied.ContainsKey($_.BaseName) })

if ($pending.Count -eq 0) {
  Write-Host 'Staging migrations are up to date.' -ForegroundColor Green
  exit 0
}

Write-Host ("Pending staging migrations: {0}" -f $pending.Count)
foreach ($file in $pending) {
  if ($DryRun) {
    Write-Host ("would apply {0}" -f $file.BaseName)
    continue
  }

  # Supabase generates migration versions from the current second. The gap
  # avoids collisions when several ordered files are submitted in one run.
  Start-Sleep -Seconds 2
  $body = @{ query = Get-Content -Raw -LiteralPath $file.FullName; name = $file.BaseName } | ConvertTo-Json -Compress
  $response = Invoke-WebRequest -Method Post -Uri $apiBase -Headers $headers -Body $body -TimeoutSec 180 -SkipHttpErrorCheck
  if ([int]$response.StatusCode -lt 200 -or [int]$response.StatusCode -ge 300) {
    throw "Migration $($file.BaseName) failed (HTTP $($response.StatusCode)): $($response.Content)"
  }
  Write-Host ("applied {0}" -f $file.BaseName) -ForegroundColor Green
}
