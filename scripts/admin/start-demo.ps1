param([ValidateRange(1024,65535)][int]$Port = 3047)
$ErrorActionPreference = 'Stop'

# The demo is a separate local fixture runtime. Never connect it to Supabase.
$Forbidden = @('NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_STAGING_SUPABASE_URL','SUPABASE_INTERNAL_URL')
foreach ($Name in $Forbidden) {
  if ([Environment]::GetEnvironmentVariable($Name)) {
    throw "Clear $Name before starting the isolated synthetic admin preview."
  }
}
if ($env:NEXT_PUBLIC_APP_ENV -in @('staging','production') -or $env:NODE_ENV -eq 'production') {
  throw 'Start the synthetic preview in a fresh local shell, outside staging/production configuration.'
}
$Repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$Web = Join-Path $Repo 'apps/web'
# Next also reads dotenv files. Refuse configured Supabase URLs in those files.
foreach ($EnvFile in @('.env','.env.local','.env.development','.env.development.local')) {
  $EnvPath = Join-Path $Web $EnvFile
  if ((Test-Path -LiteralPath $EnvPath) -and
      (Select-String -LiteralPath $EnvPath -Pattern '^\s*(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_STAGING_SUPABASE_URL|SUPABASE_INTERNAL_URL)\s*=\s*[^\s#]' -Quiet)) {
    throw "Remove hosted/local Supabase URL configuration from $EnvPath for this isolated preview."
  }
}
$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
$Node = if ($NodeCommand) {$NodeCommand.Source} else {Join-Path $env:ProgramFiles 'nodejs/node.exe'}
$Next = Join-Path $Web 'node_modules/next/dist/bin/next'
if (!(Test-Path -LiteralPath $Node) -or !(Test-Path -LiteralPath $Next) -or
    !(Test-Path -LiteralPath (Join-Path $Web 'node_modules/@electric-sql/pglite/package.json'))) {
  throw 'Install the locked workspace dependencies with Node 24 and pnpm 11 before running admin:demo.'
}
$env:PARISH_ADMIN_DEMO = '1'
$env:NEXT_PUBLIC_APP_ENV = 'local'
$env:PATH = (Split-Path -Parent $Node) + [IO.Path]::PathSeparator + $env:PATH
Write-Host "Synthetic Parish Pass admin: http://127.0.0.1:$Port/admin/demo"
Write-Host 'Memory-only fixtures. Restart this process to reset them. No email, push, payments or hosted writes.'
Push-Location $Web
try { & $Node $Next dev --webpack --hostname 127.0.0.1 --port $Port }
finally { Pop-Location }
exit $LASTEXITCODE
