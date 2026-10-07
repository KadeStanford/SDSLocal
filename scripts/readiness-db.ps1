[CmdletBinding()]
param([switch]$StartOnly)
$ErrorActionPreference = 'Stop'
$repository = Split-Path $PSScriptRoot -Parent
$project = 'parish-pass-readiness-audit'
$workdir = Join-Path $repository '.codex-tmp/readiness-database'
$resolved = [IO.Path]::GetFullPath($workdir)
if (-not $resolved.StartsWith($repository + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe test workdir' }
$report = Join-Path $repository 'reports/readiness/database'
New-Item -ItemType Directory -Path (Join-Path $workdir 'supabase/migrations'),(Join-Path $workdir 'supabase/seed'),(Join-Path $workdir 'supabase/templates'),$report -Force | Out-Null
$config = Get-Content -LiteralPath (Join-Path $repository 'supabase/config.toml') -Raw
$config = $config.Replace('project_id = "sds-local"', "project_id = `"$project`"")
foreach ($port in 54320..54329) { $config = $config.Replace([string]$port, [string]($port + 2000)) }
$config = [regex]::Replace($config, '(?m)^site_url = .*$', 'site_url = "http://127.0.0.1:4182"')
$config = [regex]::Replace($config, '(?m)^additional_redirect_urls = .*$', 'additional_redirect_urls = ["http://127.0.0.1:4182/**"]')
$config = [regex]::Replace($config, '(?s)(\[auth\.external\.(?:apple|google)\]\s*)enabled = true', '${1}enabled = false')
$config = [regex]::Replace($config, 'env\("SUPABASE_AUTH_EXTERNAL_GOOGLE_[A-Z_]+"\)', '""')
$config | Set-Content -LiteralPath (Join-Path $workdir 'supabase/config.toml') -Encoding utf8
Copy-Item -Path (Join-Path $repository 'supabase/migrations/*.sql') -Destination (Join-Path $workdir 'supabase/migrations')
Copy-Item -LiteralPath (Join-Path $repository 'supabase/seed/seed.sql') -Destination (Join-Path $workdir 'supabase/seed/seed.sql')
Copy-Item -Path (Join-Path $repository 'supabase/templates/*.html') -Destination (Join-Path $workdir 'supabase/templates')
$cli = Join-Path $repository 'node_modules/supabase/dist/supabase.js'
$env:DOCKER_HOST = 'npipe:////./pipe/dockerDesktopLinuxEngine'
$env:NO_COLOR = '1'
# This command only starts the explicitly named local project. It never links/pushes/deploys.
$ErrorActionPreference = 'Continue'
$startedAt = [DateTimeOffset]::UtcNow.ToString('o')
& node $cli start --workdir $workdir --exclude studio,imgproxy,edge-runtime,logflare,vector,supavisor 2>&1 | ForEach-Object { [regex]::Replace([string]$_, '(?i)(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sb_(?:secret|publishable)_[A-Za-z0-9_-]+)', '[local credential redacted]') } | Set-Content -LiteralPath (Join-Path $report 'start.log') -Encoding utf8
$startExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($startExit) { throw "Isolated stack startup failed (exit $startExit); inspect reports/readiness/database/start.log" }
if ($StartOnly) { Write-Output 'Isolated API http://127.0.0.1:56321; local mail http://127.0.0.1:56324'; return }
$container = "supabase_db_$project"
$identity = & docker --context desktop-linux inspect $container --format '{{.Name}}'
if ($identity -ne "/$container") { throw 'Isolated container identity mismatch' }
& docker --context desktop-linux cp (Join-Path $repository 'supabase/tests/.') "${container}:/tmp/parish-readiness-tests"
if ($LASTEXITCODE) { throw 'Fixture copy failed' }
$results = @()
foreach ($test in (Get-ChildItem -LiteralPath (Join-Path $repository 'supabase/tests') -Filter '*.sql' | Sort-Object Name)) {
  $begin = [DateTimeOffset]::UtcNow
  $ErrorActionPreference = 'Continue'
  $text = & docker --context desktop-linux exec $container psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -f "/tmp/parish-readiness-tests/$($test.Name)" 2>&1
  $code = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  $text | Set-Content -LiteralPath (Join-Path $report ($test.BaseName + '.log')) -Encoding utf8
  $results += @{ test=$test.Name; status=$(if ($code -eq 0) {'passed'} else {'failed'}); exitCode=$code; durationMs=[int]([DateTimeOffset]::UtcNow-$begin).TotalMilliseconds; sourceSha256=(Get-FileHash -LiteralPath $test.FullName).Hash; log=($test.BaseName+'.log') }
  Write-Output "$(if ($code -eq 0) {'PASS'} else {'FAIL'}) $($test.Name)"
}
@{ startedAtUtc=$startedAt; completedAtUtc=[DateTimeOffset]::UtcNow.ToString('o'); project=$project; scope='Real isolated PostgreSQL17, synthetic fixtures, no hosted/provider writes'; total=$results.Count; passed=@($results | Where-Object status -eq 'passed').Count; failed=@($results | Where-Object status -eq 'failed').Count; tests=$results } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $report 'summary.json') -Encoding utf8
if (@($results | Where-Object status -eq 'failed').Count) { exit 1 }
