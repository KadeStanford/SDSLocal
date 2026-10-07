[CmdletBinding()]
param(
  [string]$ReportDirectory = '.codex-tmp/database-verification/results',
  [string[]]$TestNames = @()
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path $PSScriptRoot -Parent
$migrations = @(Get-ChildItem -LiteralPath (Join-Path $repository 'supabase/migrations') -Filter '*.sql')
$duplicates = @($migrations | Group-Object { $_.Name.Split('_')[0] } | Where-Object Count -GT 1)
if ($duplicates.Count) { throw "Duplicate migration versions: $($duplicates.Name -join ', ')" }
$container = 'supabase_db_sds-store-readiness-verify'
$context = 'desktop-linux'
$endpoint = & docker context inspect $context --format '{{.Endpoints.docker.Host}}'
if ($LASTEXITCODE -ne 0 -or $endpoint -notlike 'npipe://*') {
  throw 'Verification requires the local Windows Docker Desktop engine.'
}
$identity = & docker --context $context inspect $container --format '{{.Name}}'
if ($LASTEXITCODE -ne 0 -or $identity -ne "/$container") {
  throw 'Start the isolated sds-store-readiness-verify Supabase stack first.'
}
$reportPath = [IO.Path]::GetFullPath((Join-Path $repository $ReportDirectory))
if (-not $reportPath.StartsWith($repository + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Reports must remain inside the repository.'
}
New-Item -ItemType Directory -Path $reportPath -Force | Out-Null
& docker --context $context cp (Join-Path $repository 'supabase/tests/.') "${container}:/tmp/sds-database-tests"
if ($LASTEXITCODE -ne 0) { throw 'Could not copy local regression fixtures.' }
$tests = @(Get-ChildItem -LiteralPath (Join-Path $repository 'supabase/tests') -Filter '*.sql' | Sort-Object Name)
if ($TestNames.Count) {
  foreach ($name in $TestNames) {
    if ($name -notin $tests.Name) { throw "Unknown SQL test: $name" }
  }
  $tests = @($tests | Where-Object Name -In $TestNames)
}
$results = @()
foreach ($test in $tests) {
  $started = [DateTimeOffset]::UtcNow
  $output = & docker --context $context exec $container psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -f "/tmp/sds-database-tests/$($test.Name)" 2>&1
  $testExit = $LASTEXITCODE
  $logPath = Join-Path $reportPath ($test.BaseName + '.log')
  $output | Set-Content -LiteralPath $logPath -Encoding utf8
  $result = [ordered]@{
    test = $test.Name
    passed = $testExit -eq 0
    exitCode = $testExit
    durationMs = [int]([DateTimeOffset]::UtcNow - $started).TotalMilliseconds
    sourceSha256 = (Get-FileHash -LiteralPath $test.FullName -Algorithm SHA256).Hash
    log = $logPath
  }
  $results += $result
  Write-Output "$(if ($result.passed) { 'PASS' } else { 'FAIL' }) $($test.Name)"
  if (-not $result.passed) { $output | Select-Object -Last 8 | Write-Output }
}
$summary = [ordered]@{
  verifiedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
  scope = 'Isolated local PostgreSQL; no hosted services or real provider transactions'
  container = $container
  total = $results.Count
  passed = @($results | Where-Object { $_.passed }).Count
  failed = @($results | Where-Object { -not $_.passed }).Count
  migrations = @($migrations | Sort-Object Name | ForEach-Object {
    @{ name = $_.Name; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
  })
  tests = $results
}
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $reportPath 'summary.json') -Encoding utf8
Write-Output "SQL suite: $($summary.passed)/$($summary.total) passed."
if ($summary.failed) { exit 1 }
