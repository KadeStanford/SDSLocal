param(
  [string]$ProjectRef = $env:SDS_STAGING_SUPABASE_PROJECT_REF,
  [string]$SiteUrl = $env:SDS_STAGING_SITE_URL
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  throw "Staging preflight failed: $Message"
}

if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
  Fail 'SDS_STAGING_SUPABASE_PROJECT_REF is not configured.'
}

if ($ProjectRef -notmatch '^[a-z0-9]{8,40}$') {
  Fail 'The staging project ref does not look like a Supabase project ref.'
}

if ([string]::IsNullOrWhiteSpace($SiteUrl)) {
  Fail 'SDS_STAGING_SITE_URL is not configured.'
}

$parsedUrl = $null
if (-not [Uri]::TryCreate($SiteUrl, [UriKind]::Absolute, [ref]$parsedUrl)) {
  Fail 'SDS_STAGING_SITE_URL must be an absolute HTTPS URL.'
}

if ($parsedUrl.Scheme -ne 'https') {
  Fail 'SDS_STAGING_SITE_URL must use HTTPS.'
}

if (
  $parsedUrl.IsLoopback -or
  $parsedUrl.Host -match '^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|::1|\[::1\])$' -or
  $parsedUrl.Host.EndsWith('.localhost', [StringComparison]::OrdinalIgnoreCase) -or
  $parsedUrl.Host.EndsWith('.local', [StringComparison]::OrdinalIgnoreCase)
) {
  Fail 'SDS_STAGING_SITE_URL cannot point to a loopback or local-only host.'
}

if ($env:SDS_STAGING_BILLING_LOCK -ne 'true') {
  Fail 'SDS_STAGING_BILLING_LOCK must remain true. The application also hard-locks staging billing.'
}

if ($env:SDS_STAGING_SUPABASE_ORGANIZATION_ID -or $env:SDS_STAGING_PAYMENT_METHOD_ID) {
  Fail 'Payment or organization identifiers are not accepted by the staging configuration.'
}

if ($env:SDS_PRODUCTION_SUPABASE_PROJECT_REF -and $ProjectRef -eq $env:SDS_PRODUCTION_SUPABASE_PROJECT_REF) {
  Fail 'The staging project ref must not equal the production project ref.'
}

Write-Host 'Staging preflight passed.' -ForegroundColor Green
Write-Host "Project ref: $ProjectRef"
Write-Host "Site URL:    $SiteUrl"
Write-Host 'Billing:     hard-locked to the free-only posture'
Write-Host 'No provider changes were made.'
