param(
  [Parameter(Mandatory)][string]$SourceDirectory,
  [Parameter(Mandatory)][string]$IdentityManifest,
  [ValidateRange(3050,3050)][int]$Port = 3050,
  [switch]$BuildOnly
)
$ErrorActionPreference = 'Stop'

# Prepared runner only. A separate reviewed copy keeps the 3047 demo untouched.
# This script never installs SQL, grants access, dispatches notifications or deploys.
$Source = (Resolve-Path -LiteralPath $SourceDirectory).Path.TrimEnd('\','/')
$OwnSource = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')).TrimEnd('\','/')
if ($Source -eq $OwnSource -or $Source -eq 'F:\BusinessApp' -or
    $Source.StartsWith('F:\BusinessApp\', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Use a separate reviewed preview copy; the original and running demo are protected.'
}
$Identity = Get-Content -LiteralPath $IdentityManifest -Raw | ConvertFrom-Json
if ($Identity.project_ref -ne 'lgddhdexvwclfrnzjtly' -or
    $Identity.source_anchor -ne '79af5590270e826aae8e4219ec6e670fe57dadb5' -or
    $Identity.local_staging_preview_reviewed -ne $true -or
    !$Identity.source_checks -or !$Identity.functional_patch_sha256 -or
    !$Identity.assessment_patch_sha256 -or !$Identity.visual_patch_sha256) {
  throw 'Provide the reviewed integrated-source identity manifest described in admin-rollout-decision.md.'
}
$RequiredPaths = @('apps/web/src/app/admin/moderation-actions.ts',
  'apps/web/src/app/admin/moderation-workspace.tsx','apps/web/src/app/admin/moderation.css',
  'apps/web/src/lib/admin/moderation-server.ts','apps/web/src/lib/admin/moderation-types.ts',
  'apps/web/src/lib/admin/moderation-rules.ts','apps/web/src/lib/admin/demo-guard.ts',
  'apps/web/src/app/auth/actions.ts','apps/web/src/app/auth/callback/route.ts',
  'supabase/migrations/20261006000100_admin_moderation_workspace.sql',
  'supabase/migrations/20261006000200_moderation_outcome_notifications.sql',
  'supabase/migrations/20261006000300_validated_business_submission.sql')
foreach ($RequiredPath in $RequiredPaths) {
  if (@($Identity.source_checks | Where-Object path -eq $RequiredPath).Count -ne 1) {
    throw "Required reviewed source hash missing or duplicated: $RequiredPath"
  }
}
foreach ($Entry in $Identity.source_checks) {
  $Target = [IO.Path]::GetFullPath((Join-Path $Source $Entry.path))
  if (!$Target.StartsWith($Source + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
      !(Test-Path -LiteralPath $Target -PathType Leaf) -or
      (Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Entry.sha256) {
    throw "Reviewed source identity mismatch: $($Entry.path)"
  }
}
$Web = Join-Path $Source 'apps/web'
foreach ($Directory in @($Source,(Join-Path $Source 'apps'),$Web)) {
  if ((Get-Item -LiteralPath $Directory).Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw 'Source/application directories must be real isolated directories, not links to another checkout.'
  }
}
foreach ($Name in @('.env','.env.local','.env.production','.env.production.local')) {
  if (Test-Path -LiteralPath (Join-Path $Web $Name)) {
    throw 'Use a clean isolated copy without dotenv overrides; pass existing public staging configuration in this process.'
  }
}
foreach ($Name in @('SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_ACCESS_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL','SUPABASE_INTERNAL_URL')) {
  if ([Environment]::GetEnvironmentVariable($Name)) { throw "Clear $Name for this public-key-only staging preview." }
}
if ($env:PARISH_ADMIN_DEMO -eq '1' -or $env:NEXT_PUBLIC_APP_ENV -ne 'staging' -or
    $env:NEXT_PUBLIC_STAGING_SUPABASE_URL -ne 'https://lgddhdexvwclfrnzjtly.supabase.co') {
  throw 'Require demo OFF, staging environment and the exact reviewed staging URL.'
}
$PublicKey = $env:NEXT_PUBLIC_STAGING_SUPABASE_PUBLISHABLE_KEY
if (!$PublicKey) { throw 'Supply the existing staging public key privately; do not create or rotate a key.' }
if ($PublicKey.StartsWith('eyJ')) {
  $Parts = $PublicKey.Split('.')
  if ($Parts.Length -ne 3) { throw 'Invalid legacy public key.' }
  $Payload = $Parts[1].Replace('-','+').Replace('_','/')
  $Payload = $Payload.PadRight($Payload.Length + ((4 - $Payload.Length % 4) % 4), '=')
  $Claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Payload)) | ConvertFrom-Json
  if ($Claims.role -ne 'anon' -or $Claims.ref -ne 'lgddhdexvwclfrnzjtly') { throw 'Refuse a privileged or foreign-project key.' }
} elseif (!$PublicKey.StartsWith('sb_publishable_')) { throw 'Require a publishable public key.' }

# Harmless existing-project read verifies opaque publishable keys without printing them.
try {
  $Settings = Invoke-RestMethod -Method Get -Uri 'https://lgddhdexvwclfrnzjtly.supabase.co/auth/v1/settings' -Headers @{apikey=$PublicKey}
  if (!$Settings) { throw 'No settings response' }
} catch { throw 'The existing public staging key could not be verified against the exact target.' }

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
$Node = if ($NodeCommand) {$NodeCommand.Source} else {Join-Path $env:ProgramFiles 'nodejs/node.exe'}
$Next = Join-Path $Web 'node_modules/next/dist/bin/next'
if (!(Test-Path -LiteralPath $Node) -or !(Test-Path -LiteralPath $Next)) { throw 'Install the locked Node24/pnpm11 dependencies in the isolated copy.' }
$Saved = @{}
foreach ($Name in @('NODE_ENV','NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_SHARE_BASE_URL','NEXT_TELEMETRY_DISABLED')) {
  $Saved[$Name] = [Environment]::GetEnvironmentVariable($Name)
}
try {
  $env:NODE_ENV = 'production'
  $env:NEXT_TELEMETRY_DISABLED = '1'
  $env:NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:$Port"
  $env:NEXT_PUBLIC_SHARE_BASE_URL = ''
  Write-Host "Reviewed local staging source: $($Identity.functional_patch_sha256)"
  Write-Host 'Backend: sds-local-staging. Existing credentials only; no synthetic session.'
  Push-Location $Web
  try {
    & $Node $Next build --webpack
    if ($LASTEXITCODE -ne 0) { throw 'Production build failed; preview was not started.' }
    if (!$BuildOnly) {
      Write-Host "Sign in with the existing account: http://127.0.0.1:$Port/auth?next=%2Fadmin"
      & $Node $Next start --hostname 127.0.0.1 --port $Port
      if ($LASTEXITCODE -ne 0) { throw 'Local staging preview stopped with an error.' }
    }
  } finally { Pop-Location }
} finally {
  foreach ($Name in $Saved.Keys) { [Environment]::SetEnvironmentVariable($Name,$Saved[$Name]) }
}
