param()

$ErrorActionPreference = 'Stop'

function Read-DotEnvValue([string]$Path, [string]$Name) {
  $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match ('^' + [regex]::Escape($Name) + '=') } | Select-Object -First 1
  if (-not $line) { return $null }
  return $line.Substring($Name.Length + 1)
}

function Invoke-JsonRequest {
  param([string]$Uri, [string]$Method, [hashtable]$Headers, [object]$Body)
  $args = @{ Uri = $Uri; Method = $Method; Headers = $Headers; TimeoutSec = 120 }
  if ($null -ne $Body) {
    $args.ContentType = 'application/json'
    $args.Body = $Body | ConvertTo-Json -Depth 10 -Compress
  }
  Invoke-RestMethod @args
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$projectRef = Read-DotEnvValue (Join-Path $repoRoot '.env') 'SDS_STAGING_SUPABASE_PROJECT_REF'
$password = Read-DotEnvValue (Join-Path $repoRoot '.env') 'SDS_STAGING_DEMO_PASSWORD'
$supabaseUrl = Read-DotEnvValue (Join-Path $repoRoot 'apps/mobile/.env.local') 'EXPO_PUBLIC_SUPABASE_URL'
$publicKey = Read-DotEnvValue (Join-Path $repoRoot 'apps/mobile/.env.local') 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
if (-not $publicKey) { $publicKey = Read-DotEnvValue (Join-Path $repoRoot 'apps/mobile/.env.local') 'EXPO_PUBLIC_SUPABASE_ANON_KEY' }
if ($supabaseUrl -ne "https://$projectRef.supabase.co" -or -not $password -or -not $publicKey) { throw 'Staging environment is incomplete.' }

$authHeaders = @{ apikey = $publicKey }
$session = Invoke-JsonRequest "$supabaseUrl/auth/v1/token?grant_type=password" 'Post' $authHeaders @{
  email = 'owner@demo.sdslocal.test'; password = $password
}
$headers = @{ apikey = $publicKey; Authorization = "Bearer $($session.access_token)"; 'x-upsert' = 'false' }
$business = (Invoke-RestMethod -Method Get -Uri "$supabaseUrl/rest/v1/businesses?select=id,slug&slug=eq.demo-juniper-ember-kitchen" -Headers $headers)[0]
if (-not $business) { throw 'The Stripe test business was not found. Apply migrations first.' }

$assets = @(
  @{ role = 'cover'; target = $null; caption = 'Juniper & Ember Kitchen dining room'; photo = 'photo-1517248135467-4c7edcad34c4' },
  @{ role = 'offering'; target = 'Cajun egg biscuit'; caption = 'Cajun egg biscuit'; photo = 'photo-1525351484163-7529414344d8' },
  @{ role = 'offering'; target = 'Ember breakfast bowl'; caption = 'Ember breakfast bowl'; photo = 'photo-1498837167922-ddd27525d352' },
  @{ role = 'offering'; target = 'House drip coffee'; caption = 'House drip coffee'; photo = 'photo-1495474472287-4d71bcdd2085' },
  @{ role = 'offering'; target = 'Seasonal latte'; caption = 'Seasonal latte'; photo = 'photo-1509042239860-f550ce710b93' },
  @{ role = 'offering'; target = 'Cold brew'; caption = 'Cold brew'; photo = 'photo-1517701604599-bb29b565090c' },
  @{ role = 'offering'; target = 'Crispy chicken grain bowl'; caption = 'Crispy chicken grain bowl'; photo = 'photo-1512621776951-a57141f2eefd' },
  @{ role = 'offering'; target = 'Pressed muffuletta'; caption = 'Pressed muffuletta'; photo = 'photo-1528735602780-2552fd46c7af' },
  @{ role = 'offering'; target = 'Beignet trio'; caption = 'Beignet trio'; photo = 'photo-1551024506-0bccd828d307' }
)
$downloadRoot = Join-Path $repoRoot '.codex-tmp/stripe-business-media'
New-Item -ItemType Directory -Force -Path $downloadRoot | Out-Null
try {
  foreach ($asset in $assets) {
    $targetId = if ($asset.target) {
      $encodedName = [Uri]::EscapeDataString([string]$asset.target)
      $targetRows = Invoke-RestMethod -Method Get -Uri "$supabaseUrl/rest/v1/offering_items?select=id&business_id=eq.$($business.id)&name=eq.$encodedName" -Headers $headers
      [string]$targetRows.id
    } else { $null }
    if ($asset.target -and -not $targetId) { throw "Offering '$($asset.target)' was not found." }
    $group = [Guid]::NewGuid().ToString()
    $variants = @()
    $plans = if ($asset.role -eq 'cover') {
      @(@{ name = 'cover'; width = 1600; height = 720; quality = 78; maxBytes = 921600 })
    } else {
      @(
        @{ name = 'thumbnail'; width = 320; height = 213; quality = 65; maxBytes = 122880 },
        @{ name = 'card'; width = 800; height = 533; quality = 70; maxBytes = 307200 },
        @{ name = 'full'; width = 1600; height = 1067; quality = 78; maxBytes = 819200 }
      )
    }
    foreach ($plan in $plans) {
      $file = Join-Path $downloadRoot "$group-$($plan.name).webp"
      Invoke-WebRequest -Uri "https://images.unsplash.com/$($asset.photo)?fm=webp&fit=crop&w=$($plan.width)&h=$($plan.height)&q=$($plan.quality)" -OutFile $file -UserAgent 'SDS Local staging fixture'
      $info = Get-Item -LiteralPath $file
      if ($info.Length -le 0 -or $info.Length -gt $plan.maxBytes) { throw "Image for '$($asset.caption)' is invalid or too large." }
      $path = "90000000-0000-4000-8000-000000000001/$($business.id)/$group/$($plan.name).webp"
      Invoke-RestMethod -Method Post -Uri "$supabaseUrl/storage/v1/object/media-staging/$path" -Headers $headers -ContentType 'image/webp' -InFile $file | Out-Null
      $variants += @{ path = $path; variant = $plan.name }
    }
    Invoke-JsonRequest "$supabaseUrl/functions/v1/finalize-business-image" 'Post' @{ apikey = $publicKey; Authorization = "Bearer $($session.access_token)" } @{
      businessId = $business.id; assetGroupId = $group; role = $asset.role; targetId = $targetId; altText = $asset.caption; variants = $variants
    } | Out-Null
    Write-Host "Published $($asset.role) image: $($asset.caption)"
  }
}
finally {
  if (Test-Path -LiteralPath $downloadRoot) { Remove-Item -LiteralPath $downloadRoot -Recurse -Force }
}
Write-Host 'Stripe test business media seed complete.' -ForegroundColor Green
