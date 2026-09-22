param(
  [switch]$SkipMedia,
  [switch]$SkipCovers,
  [switch]$SkipMenuMedia,
  [switch]$MediaOnly,
  [switch]$RotatePassword
)

$ErrorActionPreference = 'Stop'

function Read-DotEnvValue([string]$Path, [string]$Name) {
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $line = Get-Content -LiteralPath $Path | Where-Object {
    $_ -match ('^' + [regex]::Escape($Name) + '=')
  } | Select-Object -First 1
  if (-not $line) { return $null }
  return $line.Substring($Name.Length + 1)
}

function Set-DotEnvValue([string]$Path, [string]$Name, [string]$Value) {
  $content = if (Test-Path -LiteralPath $Path) {
    [IO.File]::ReadAllText($Path)
  } else {
    ''
  }
  $line = "$Name=$Value"
  $pattern = '(?m)^' + [regex]::Escape($Name) + '=.*$'
  if ($content -match $pattern) {
    $content = [regex]::Replace($content, $pattern, $line)
  } else {
    if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { $content += "`r`n" }
    $content += "$line`r`n"
  }
  [IO.File]::WriteAllText($Path, $content, [Text.UTF8Encoding]::new($false))
}

function Escape-SqlLiteral([string]$Value) {
  return $Value.Replace("'", "''")
}

function Invoke-ManagementMigration([string]$Name, [string]$Sql) {
  $body = @{ name = $Name; query = $Sql } | ConvertTo-Json -Compress
  $response = Invoke-WebRequest -Method Post -Uri $script:migrationUrl -Headers $script:managementHeaders `
    -Body $body -TimeoutSec 240 -SkipHttpErrorCheck
  if ([int]$response.StatusCode -lt 200 -or [int]$response.StatusCode -ge 300) {
    throw "Staging seed migration failed (HTTP $($response.StatusCode)): $($response.Content)"
  }
}

function Replace-Nth([string]$Text, [string]$Search, [string[]]$Replacements) {
  $cursor = 0
  $result = [Text.StringBuilder]::new()
  foreach ($replacement in $Replacements) {
    $index = $Text.IndexOf($Search, $cursor, [StringComparison]::Ordinal)
    if ($index -lt 0) { throw "Expected demo seed selector was not found." }
    [void]$result.Append($Text.Substring($cursor, $index - $cursor))
    [void]$result.Append($replacement)
    $cursor = $index + $Search.Length
  }
  [void]$result.Append($Text.Substring($cursor))
  return $result.ToString()
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory)] [string]$Uri,
    [Parameter(Mandatory)] [string]$Method,
    [Parameter(Mandatory)] [hashtable]$Headers,
    [object]$Body
  )
  $arguments = @{
    Uri = $Uri
    Method = $Method
    Headers = $Headers
    TimeoutSec = 120
  }
  if ($null -ne $Body) {
    $arguments.ContentType = 'application/json'
    $arguments.Body = $Body | ConvertTo-Json -Depth 8 -Compress
  }
  return Invoke-RestMethod @arguments
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$rootEnvPath = Join-Path $repoRoot '.env'
$mobileEnvPath = Join-Path $repoRoot 'apps/mobile/.env.local'
$projectRef = Read-DotEnvValue $rootEnvPath 'SDS_STAGING_SUPABASE_PROJECT_REF'
$billingLock = Read-DotEnvValue $rootEnvPath 'SDS_STAGING_BILLING_LOCK'
$managementToken = Read-DotEnvValue $rootEnvPath 'SUPABASE_ACCESS_TOKEN'
$supabaseUrl = Read-DotEnvValue $mobileEnvPath 'EXPO_PUBLIC_SUPABASE_URL'
$publicKey = Read-DotEnvValue $mobileEnvPath 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
if ([string]::IsNullOrWhiteSpace($publicKey)) {
  $publicKey = Read-DotEnvValue $mobileEnvPath 'EXPO_PUBLIC_SUPABASE_ANON_KEY'
}

if ($projectRef -notmatch '^[a-z0-9]{8,40}$') { throw 'The staging project ref is missing or invalid.' }
if ($billingLock.ToLowerInvariant() -ne 'true') { throw 'SDS_STAGING_BILLING_LOCK must be true.' }
if ([string]::IsNullOrWhiteSpace($managementToken)) { throw 'SUPABASE_ACCESS_TOKEN is missing.' }
if ($supabaseUrl -ne "https://$projectRef.supabase.co") {
  throw 'The mobile environment does not point at the configured staging project.'
}
if ([string]::IsNullOrWhiteSpace($publicKey)) { throw 'The staging publishable/anon key is missing.' }

$demoPassword = Read-DotEnvValue $rootEnvPath 'SDS_STAGING_DEMO_PASSWORD'
if ($RotatePassword -or [string]::IsNullOrWhiteSpace($demoPassword)) {
  $demoPassword = "Sds!Demo-$([Guid]::NewGuid().ToString('N').Substring(0, 20))"
  Set-DotEnvValue $rootEnvPath 'SDS_STAGING_DEMO_PASSWORD' $demoPassword
}

$ownerId = '90000000-0000-4000-8000-000000000001'
$staffId = '90000000-0000-4000-8000-000000000002'
$customerId = '90000000-0000-4000-8000-000000000003'
$ownerEmail = 'owner@demo.sdslocal.test'
$staffEmail = 'staff@demo.sdslocal.test'
$customerEmail = 'customer@demo.sdslocal.test'

if (-not $MediaOnly) {
  Write-Host 'Checking and applying pending staging schema migrations...'
  & (Join-Path $PSScriptRoot 'apply-staging-migrations.ps1')
}

$script:migrationUrl = "https://api.supabase.com/v1/projects/$projectRef/database/migrations"
$script:managementHeaders = @{ Authorization = "Bearer $managementToken"; 'Content-Type' = 'application/json' }
$passwordSql = Escape-SqlLiteral $demoPassword

$accountTemplate = @'
begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '__OWNER_ID__', 'authenticated', 'authenticated', '__OWNER_EMAIL__', extensions.crypt('__PASSWORD__', extensions.gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Maya Landry"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '__STAFF_ID__', 'authenticated', 'authenticated', '__STAFF_EMAIL__', extensions.crypt('__PASSWORD__', extensions.gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Jordan Ellis"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '__CUSTOMER_ID__', 'authenticated', 'authenticated', '__CUSTOMER_EMAIL__', extensions.crypt('__PASSWORD__', extensions.gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Avery Brooks"}', now(), now())
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values
  ('90000000-0000-4000-8000-000000000011', '__OWNER_ID__', '__OWNER_EMAIL__', jsonb_build_object('sub', '__OWNER_ID__', 'email', '__OWNER_EMAIL__'), 'email', now(), now(), now()),
  ('90000000-0000-4000-8000-000000000012', '__STAFF_ID__', '__STAFF_EMAIL__', jsonb_build_object('sub', '__STAFF_ID__', 'email', '__STAFF_EMAIL__'), 'email', now(), now(), now()),
  ('90000000-0000-4000-8000-000000000013', '__CUSTOMER_ID__', '__CUSTOMER_EMAIL__', jsonb_build_object('sub', '__CUSTOMER_ID__', 'email', '__CUSTOMER_EMAIL__'), 'email', now(), now(), now())
on conflict (provider_id, provider) do update set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = now();

insert into public.profiles (id, display_name, city, region_code, postal_code, terms_accepted_at)
values
  ('__OWNER_ID__', 'Maya Landry', 'Hammond', 'LA', '70401', now()),
  ('__STAFF_ID__', 'Jordan Ellis', 'Ponchatoula', 'LA', '70454', now()),
  ('__CUSTOMER_ID__', 'Avery Brooks', 'Hammond', 'LA', '70403', now())
on conflict (id) do update set
  display_name = excluded.display_name,
  city = excluded.city,
  region_code = excluded.region_code,
  postal_code = excluded.postal_code,
  terms_accepted_at = coalesce(public.profiles.terms_accepted_at, excluded.terms_accepted_at),
  updated_at = now();

commit;
'@
$accountSql = $accountTemplate.Replace('__OWNER_ID__', $ownerId).Replace('__STAFF_ID__', $staffId).Replace('__CUSTOMER_ID__', $customerId).Replace('__OWNER_EMAIL__', $ownerEmail).Replace('__STAFF_EMAIL__', $staffEmail).Replace('__CUSTOMER_EMAIL__', $customerEmail).Replace('__PASSWORD__', $passwordSql)

$demoSeedPath = Join-Path $repoRoot 'supabase/seed/demo-businesses.sql'
$demoSql = Get-Content -Raw -LiteralPath $demoSeedPath
$selector = '(select id from public.profiles order by created_at limit 1)'
$ownerSelector = "(select id from public.profiles where id = '$ownerId'::uuid)"
$customerSelector = "(select id from public.profiles where id = '$customerId'::uuid)"
$demoSql = Replace-Nth $demoSql $selector @($ownerSelector, $ownerSelector, $customerSelector, $customerSelector)

$relationshipsTemplate = @'
begin;

insert into public.business_members (business_id, user_id, role, is_active)
select business.id, '__STAFF_ID__'::uuid, 'staff', true
from public.businesses business
where business.slug in ('demo-cypress-care', 'demo-magnolia-room', 'demo-roaming-roots')
on conflict (business_id, user_id) do update set role = 'staff', is_active = true;

insert into public.business_updates (id, business_id, created_by, update_type, title, body, expires_at, created_at)
select update_row.id, business.id, '__OWNER_ID__'::uuid, update_row.update_type,
  update_row.title, update_row.body, update_row.expires_at, update_row.created_at
from (
  values
    ('81000000-0000-4000-8000-000000000001'::uuid, 'demo-bayou-bloom', 'announcement', 'Porch season is here', 'Our shaded porch is open daily, with extra tables available for weekend brunch.', null::timestamptz, now() - interval '2 days'),
    ('81000000-0000-4000-8000-000000000002'::uuid, 'demo-lantern-row', 'deal', 'Local maker spotlight', 'Take 15% off the featured maker collection through Sunday while supplies last.', now() + interval '10 days', now() - interval '1 day'),
    ('81000000-0000-4000-8000-000000000003'::uuid, 'demo-magnolia-room', 'announcement', 'Friday doors open at 7', 'The listening room opens at 7 PM. Arrive early for table seating and the full kitchen menu.', null::timestamptz, now() - interval '8 hours'),
    ('81000000-0000-4000-8000-000000000004'::uuid, 'demo-roaming-roots', 'deal', 'Market lunch special', 'Add a cold brew to any grain bowl for $2 at this week''s downtown stop.', now() + interval '7 days', now() - interval '4 hours')
) as update_row(id, business_slug, update_type, title, body, expires_at, created_at)
join public.businesses business on business.slug = update_row.business_slug
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  expires_at = excluded.expires_at,
  created_at = excluded.created_at;

insert into public.event_saves (event_id, customer_id, reminder_enabled)
select event.id, '__CUSTOMER_ID__'::uuid, true
from public.events event
join public.businesses business on business.id = event.business_id
where business.slug in ('demo-bayou-bloom', 'demo-magnolia-room', 'demo-roaming-roots')
  and event.is_published
on conflict (event_id, customer_id) do update set reminder_enabled = true;

commit;
'@
$relationshipsSql = $relationshipsTemplate.Replace('__STAFF_ID__', $staffId).Replace('__OWNER_ID__', $ownerId).Replace('__CUSTOMER_ID__', $customerId)

if (-not $MediaOnly) {
  Write-Host 'Seeding demo accounts, businesses, offerings, loyalty, events, and updates...'
  $migrationName = 'staging_demo_dataset_' + (Get-Date -Format 'yyyyMMddHHmmss')
  Invoke-ManagementMigration $migrationName ($accountSql + "`r`n" + $demoSql + "`r`n" + $relationshipsSql)
}

$authHeaders = @{ apikey = $publicKey }
function Sign-InDemo([string]$Email) {
  return Invoke-JsonRequest -Uri "$supabaseUrl/auth/v1/token?grant_type=password" -Method Post -Headers $authHeaders -Body @{
    email = $Email
    password = $demoPassword
  }
}

$ownerSession = Sign-InDemo $ownerEmail
[void](Sign-InDemo $staffEmail)
[void](Sign-InDemo $customerEmail)
Write-Host 'Verified all three demo account sign-ins.' -ForegroundColor Green

$sessionHeaders = @{ apikey = $publicKey; Authorization = "Bearer $($ownerSession.access_token)" }

if (-not $SkipMedia) {
  $coverAssets = @(
    @{ slug = 'demo-bayou-bloom'; caption = 'A sunny table at Bayou & Bloom.'; url = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?fm=webp&fit=crop&w=1600&q=78' },
    @{ slug = 'demo-cypress-care'; caption = 'A calm, finished home interior.'; url = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?fm=webp&fit=crop&w=1600&q=78' },
    @{ slug = 'demo-lantern-row'; caption = 'Handmade goods at Lantern Row Market.'; url = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?fm=webp&fit=crop&w=1600&q=78' },
    @{ slug = 'demo-magnolia-room'; caption = 'The Magnolia Room stage before doors open.'; url = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?fm=webp&fit=crop&w=1600&q=78' },
    @{ slug = 'demo-northshore-makers'; caption = 'Northshore Makers Guild studio space.'; url = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?fm=webp&fit=crop&w=1600&q=78' },
    @{ slug = 'demo-roaming-roots'; caption = 'Roaming Roots Food Truck at a neighborhood stop.'; url = 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?fm=webp&fit=crop&w=1600&q=78' },
    @{ slug = 'demo-cane-clove'; caption = 'Dinner service at Cane & Clove Kitchen.'; url = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?fm=webp&fit=crop&w=1600&q=78' }
  )

  $businesses = @(Invoke-RestMethod -Method Get -Uri "$supabaseUrl/rest/v1/businesses?select=id,slug,name" -Headers $sessionHeaders) | Where-Object { $_.slug -like 'demo-*' }
  $businessBySlug = @{}
  foreach ($business in $businesses) { $businessBySlug[$business.slug] = $business }

  $downloadRoot = Join-Path $repoRoot '.codex-tmp/staging-demo-stock'
  New-Item -ItemType Directory -Force -Path $downloadRoot | Out-Null
  try {
    $uploadHeaders = @{
      apikey = $publicKey
      Authorization = "Bearer $($ownerSession.access_token)"
      'x-upsert' = 'false'
    }

    if (-not $SkipCovers) {
      foreach ($asset in $coverAssets) {
        $business = $businessBySlug[$asset.slug]
        if (-not $business) { throw "Demo business $($asset.slug) was not returned by staging." }
        $assetGroupId = [Guid]::NewGuid().ToString()
        $stagedPath = "$ownerId/$($business.id)/$assetGroupId/cover.webp"
        $localFile = Join-Path $downloadRoot "$($asset.slug)-cover.webp"
        Invoke-WebRequest -Uri $asset.url -OutFile $localFile -UserAgent 'SDS Local staging demo seeder'
        $file = Get-Item -LiteralPath $localFile
        if ($file.Length -le 0 -or $file.Length -gt 921600) {
          throw "The cover for $($asset.slug) is empty or exceeds the 900 KB cover limit."
        }

        Invoke-RestMethod -Method Post -Uri "$supabaseUrl/storage/v1/object/media-staging/$stagedPath" `
          -Headers $uploadHeaders -ContentType 'image/webp' -InFile $localFile | Out-Null

        Invoke-JsonRequest -Uri "$supabaseUrl/functions/v1/finalize-business-image" -Method Post -Headers $sessionHeaders -Body @{
          businessId = $business.id
          assetGroupId = $assetGroupId
          role = 'cover'
          altText = $asset.caption
          variants = @(@{ path = $stagedPath; variant = 'cover' })
        } | Out-Null
        Write-Host "Published stock cover for $($business.name)."
      }
    }

    if (-not $SkipMenuMedia) {
      $menuAssets = @(
        @{ slug = 'demo-bayou-bloom'; item = 'Shrimp & grits'; caption = 'Creamy grits with Gulf shrimp and pepper relish.'; photo = 'photo-1547592180-85f173990554' },
        @{ slug = 'demo-bayou-bloom'; item = 'Porch brunch board'; caption = 'A relaxed brunch board with seasonal fruit and biscuits.'; photo = 'photo-1533089860892-a7c6f0a88666' },
        @{ slug = 'demo-bayou-bloom'; item = 'Seasonal latte'; caption = 'A seasonal latte finished with house-made syrup.'; photo = 'photo-1509042239860-f550ce710b93' },
        @{ slug = 'demo-bayou-bloom'; item = 'Half muffuletta'; caption = 'A pressed muffuletta with olive salad and provolone.'; photo = 'photo-1528735602780-2552fd46c7af' },
        @{ slug = 'demo-bayou-bloom'; item = 'Beignet flight'; caption = 'Warm beignets with rotating dipping sauces.'; photo = 'photo-1551024506-0bccd828d307' },
        @{ slug = 'demo-roaming-roots'; item = 'Citrus grain bowl'; caption = 'A bright grain bowl built from market vegetables.'; photo = 'photo-1512621776951-a57141f2eefd' },
        @{ slug = 'demo-roaming-roots'; item = 'Cuban-inspired press'; caption = 'A hot-pressed sandwich with pork, pickle, and mustard.'; photo = 'photo-1509722747041-616f39b57569' },
        @{ slug = 'demo-roaming-roots'; item = 'Cold brew'; caption = 'Smooth cold brew ready for the road.'; photo = 'photo-1517701604599-bb29b565090c' },
        @{ slug = 'demo-cane-clove'; item = 'Smoked chicken supper'; caption = 'Smoked chicken with greens and skillet cornbread.'; photo = 'photo-1532550907401-a500c9a57435' },
        @{ slug = 'demo-cane-clove'; item = 'Blackened catfish'; caption = 'Blackened catfish with dirty rice and remoulade.'; photo = 'photo-1515003197210-e0cd71810b5f' }
      )
      $offeringRows = @(Invoke-RestMethod -Method Get -Uri "$supabaseUrl/rest/v1/offering_items?select=id,business_id,name" -Headers $sessionHeaders) | ForEach-Object { $_ }
      $offeringByKey = @{}
      foreach ($offering in $offeringRows) {
        $offeringByKey["$($offering.business_id)|$($offering.name)"] = $offering
      }
      $variantPlans = @(
        @{ name = 'thumbnail'; width = 320; height = 213; quality = 65; maxBytes = 122880 },
        @{ name = 'card'; width = 800; height = 533; quality = 70; maxBytes = 307200 },
        @{ name = 'full'; width = 1600; height = 1067; quality = 78; maxBytes = 819200 }
      )

      foreach ($asset in $menuAssets) {
        $business = $businessBySlug[$asset.slug]
        if (-not $business) { throw "Demo business $($asset.slug) was not returned by staging." }
        $offering = $offeringByKey["$($business.id)|$($asset.item)"]
        if (-not $offering) { throw "Demo offering '$($asset.item)' was not returned for $($asset.slug)." }
        $assetGroupId = [Guid]::NewGuid().ToString()
        $variants = @()
        foreach ($plan in $variantPlans) {
          $localFile = Join-Path $downloadRoot "$($asset.slug)-$($offering.id)-$($plan.name).webp"
          $imageUrl = "https://images.unsplash.com/$($asset.photo)?fm=webp&fit=crop&w=$($plan.width)&h=$($plan.height)&q=$($plan.quality)"
          Invoke-WebRequest -Uri $imageUrl -OutFile $localFile -UserAgent 'SDS Local staging demo seeder'
          $file = Get-Item -LiteralPath $localFile
          if ($file.Length -le 0 -or $file.Length -gt $plan.maxBytes) {
            throw "The $($plan.name) image for '$($asset.item)' is empty or exceeds its upload limit."
          }
          $stagedPath = "$ownerId/$($business.id)/$assetGroupId/$($plan.name).webp"
          Invoke-RestMethod -Method Post -Uri "$supabaseUrl/storage/v1/object/media-staging/$stagedPath" `
            -Headers $uploadHeaders -ContentType 'image/webp' -InFile $localFile | Out-Null
          $variants += @{ path = $stagedPath; variant = $plan.name }
        }

        Invoke-JsonRequest -Uri "$supabaseUrl/functions/v1/finalize-business-image" -Method Post -Headers $sessionHeaders -Body @{
          businessId = $business.id
          assetGroupId = $assetGroupId
          role = 'offering'
          targetId = $offering.id
          altText = $asset.caption
          variants = $variants
        } | Out-Null
        Write-Host "Published menu photos for $($business.name): $($asset.item)."
      }
    }
  } finally {
    $resolvedTemp = [IO.Path]::GetFullPath($downloadRoot)
    $allowedTemp = [IO.Path]::GetFullPath((Join-Path $repoRoot '.codex-tmp'))
    if ($resolvedTemp.StartsWith($allowedTemp, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTemp)) {
      Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
    }
  }
}

$verification = @(Invoke-RestMethod -Method Get -Uri "$supabaseUrl/rest/v1/businesses?select=id,slug,name,status,business_photos(role,media_assets(status,storage_path))&order=name" -Headers $sessionHeaders) | Where-Object { $_.slug -like 'demo-*' }
$coverCount = @($verification | Where-Object {
  @($_.business_photos) | Where-Object { $_.role -eq 'cover' -and $_.media_assets.status -eq 'ready' }
}).Count

if ($verification.Count -ne 7) { throw "Expected 7 demo businesses, found $($verification.Count)." }
if (-not $SkipMedia -and -not $SkipCovers -and $coverCount -ne 7) { throw "Expected 7 ready demo covers, found $coverCount." }

$demoBusinessIds = @($verification | ForEach-Object { $_.id })
$menuRows = @(Invoke-RestMethod -Method Get -Uri "$supabaseUrl/rest/v1/offering_items?select=id,name,business_id,media_assets(status,storage_path,variant)" -Headers $sessionHeaders) | ForEach-Object { $_ }
$menuVerification = @($menuRows | Where-Object {
  $demoBusinessIds -contains $_.business_id -and $_.media_assets.status -eq 'ready'
})
$menuPhotoCount = $menuVerification.Count
if (-not $SkipMedia -and -not $SkipMenuMedia -and $menuPhotoCount -lt 10) {
  throw "Expected at least 10 demo offerings with ready menu photos, found $menuPhotoCount."
}

Write-Host "Staging demo seed verified: $($verification.Count) businesses, $coverCount ready covers, $menuPhotoCount menu items with ready photos, 3 sign-in accounts." -ForegroundColor Green
Write-Host 'Demo credentials are stored only in the ignored root .env file (SDS_STAGING_DEMO_PASSWORD).' -ForegroundColor Green
