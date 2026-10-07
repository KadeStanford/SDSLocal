[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$repository = Split-Path $PSScriptRoot -Parent
Set-Location $repository
$context = 'desktop-linux'
$endpoint = & docker context inspect $context --format '{{.Endpoints.docker.Host}}'
if ($LASTEXITCODE -ne 0 -or $endpoint -notlike 'npipe://*') { throw 'Requires local Docker Desktop.' }
# Windows PowerShell treats informational native stderr as an error record.
# Check the CLI exit code, not its notice about intentionally excluded services.
$ErrorActionPreference = 'Continue'
$status = & node node_modules/supabase/dist/supabase.js status --workdir .codex-tmp/database-verification -o env 2>$null
$statusExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($statusExit -ne 0) { throw 'Isolated local Supabase is not ready.' }
function Read-VerificationSetting([string]$Name) {
  $line = $status | Where-Object { $_.StartsWith($Name + '=') } | Select-Object -First 1
  if (-not $line) { throw "Local verification setting missing: $Name" }
  return $line.Substring($Name.Length + 1).Trim('"')
}
$api = Read-VerificationSetting 'API_URL'
if ($api -notin @('http://127.0.0.1:55321', 'http://localhost:55321')) {
  throw 'Refusing to run against a non-isolated or hosted Supabase API.'
}
$env:LOCAL_SUPABASE_URL = 'http://host.docker.internal:55321'
$env:LOCAL_SUPABASE_SERVICE_ROLE_KEY = Read-VerificationSetting 'SERVICE_ROLE_KEY'
try {
  # Deno runtime networking is limited to the isolated API. The Square transport
  # is an in-memory fixture and cannot issue a real provider request.
  & docker --context $context run --rm --name sds-database-integration-verify `
    --env LOCAL_SUPABASE_URL --env LOCAL_SUPABASE_SERVICE_ROLE_KEY `
    --mount "type=bind,source=$repository,target=/work,readonly" `
    --workdir /work denoland/deno:latest run --no-config --node-modules-dir=none `
    --allow-env=LOCAL_SUPABASE_URL,LOCAL_SUPABASE_SERVICE_ROLE_KEY `
    --allow-net=host.docker.internal:55321 --allow-read=/work `
    supabase/tests/square-local-integration.ts
  if ($LASTEXITCODE -ne 0) { throw 'Local database orchestration verification failed.' }
} finally {
  Remove-Item Env:LOCAL_SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:LOCAL_SUPABASE_URL -ErrorAction SilentlyContinue
}
