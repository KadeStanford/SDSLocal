param(
  [string]$ProjectRef = 'lgddhdexvwclfrnzjtly'
)

$ErrorActionPreference = 'Stop'

function Read-DotEnvValue([string]$Path, [string]$Name) {
  $line = Get-Content -LiteralPath $Path | Where-Object {
    $_ -match ('^' + [regex]::Escape($Name) + '=')
  } | Select-Object -First 1
  if (-not $line) { return $null }
  return $line.Substring($Name.Length + 1)
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$managementToken = Read-DotEnvValue (Join-Path $repoRoot '.env') 'SUPABASE_ACCESS_TOKEN'
$configuredRef = Read-DotEnvValue (Join-Path $repoRoot '.env') 'SDS_STAGING_SUPABASE_PROJECT_REF'
$password = Read-DotEnvValue (Join-Path $repoRoot '.env') 'SDS_STAGING_DEMO_PASSWORD'
$publicKey = Read-DotEnvValue (Join-Path $repoRoot 'apps/mobile/.env.local') 'EXPO_PUBLIC_STAGING_SUPABASE_ANON_KEY'
if ($configuredRef -ne $ProjectRef) { throw "Refusing non-staging project $configuredRef." }
if (-not $managementToken -or -not $password -or -not $publicKey) {
  throw 'The ignored staging management token, disposable password, and public key are required.'
}

$projectUrl = "https://$ProjectRef.supabase.co"
$migrationUrl = "https://api.supabase.com/v1/projects/$ProjectRef/database/migrations"
$managementHeaders = @{ Authorization = "Bearer $managementToken"; 'Content-Type' = 'application/json' }
$publicHeaders = @{ apikey = $publicKey; 'Content-Type' = 'application/json' }
$runId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
$prefix = "codex-nearby-$runId"
$passwordBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($password))
$ids = @{
  owner = [guid]::NewGuid().ToString()
  customer = [guid]::NewGuid().ToString()
  mobile = [guid]::NewGuid().ToString()
  fixed = [guid]::NewGuid().ToString()
  activeStop = [guid]::NewGuid().ToString()
  upcomingStop = [guid]::NewGuid().ToString()
  unpublishedStop = [guid]::NewGuid().ToString()
  expiredStop = [guid]::NewGuid().ToString()
}
$tokens = @{}
$setupApplied = $false

function Invoke-Migration([string]$Name, [string]$Query) {
  Start-Sleep -Seconds 2
  $body = @{ name = $Name; query = $Query } | ConvertTo-Json -Compress
  $response = Invoke-WebRequest -Method Post -Uri $migrationUrl -Headers $managementHeaders -Body $body -TimeoutSec 180 -SkipHttpErrorCheck
  if ([int]$response.StatusCode -lt 200 -or [int]$response.StatusCode -ge 300) {
    throw "Staging verification SQL failed (HTTP $($response.StatusCode))."
  }
}

function Invoke-Login([string]$kind) {
  $body = @{ email = "$prefix-$kind@gmail.com"; password = $password } | ConvertTo-Json -Compress
  $response = Invoke-WebRequest -Method Post -Uri "$projectUrl/auth/v1/token?grant_type=password" -Headers $publicHeaders -Body $body -SkipHttpErrorCheck
  if ([int]$response.StatusCode -ne 200) { throw "Disposable $kind account could not sign in." }
  return ($response.Content | ConvertFrom-Json).access_token
}

function Invoke-Rpc([string]$Token, [string]$Name, [hashtable]$Payload = @{}) {
  $headers = @{ apikey = $publicKey; Authorization = "Bearer $Token"; 'Content-Type' = 'application/json' }
  return Invoke-WebRequest -Method Post -Uri "$projectUrl/rest/v1/rpc/$Name" -Headers $headers -Body ($Payload | ConvertTo-Json -Compress) -SkipHttpErrorCheck
}

function Assert-Status($Response, [int[]]$Expected, [string]$Label) {
  if ([int]$Response.StatusCode -notin $Expected) {
    throw "$Label returned HTTP $($Response.StatusCode), expected $($Expected -join ' or ')."
  }
}

function Invoke-DeleteAccount([string]$Token) {
  return Invoke-WebRequest -Method Delete -Uri "$projectUrl/functions/v1/delete-account" -Headers @{ apikey = $publicKey; Authorization = "Bearer $Token"; 'Content-Type' = 'application/json' } -Body '{"confirmation":"DELETE"}' -SkipHttpErrorCheck
}

$authRows = foreach ($kind in @('owner', 'customer')) {
  $id = $ids[$kind]
  $email = "$prefix-$kind@gmail.com"
  "('00000000-0000-0000-0000-000000000000', '$id'::uuid, 'authenticated', 'authenticated', '$email', extensions.crypt(convert_from(decode('$passwordBase64', 'base64'), 'UTF8'), extensions.gen_salt('bf')), now(), '{`"provider`":`"email`",`"providers`":[`"email`"]}'::jsonb, '{`"display_name`":`"Nearby fixture $kind`"}'::jsonb, now(), now(), '', '', '', '')"
}
$identityRows = foreach ($kind in @('owner', 'customer')) {
  $id = $ids[$kind]
  $email = "$prefix-$kind@gmail.com"
  "('$id'::uuid, '$id'::uuid, jsonb_build_object('sub', '$id', 'email', '$email'), 'email', '$id', now(), now(), now())"
}

$setupSql = @"
begin;
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, recovery_token, email_change_token_new
) values $($authRows -join ",`n");
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) values $($identityRows -join ",`n");

insert into public.businesses (id, created_by, slug, name, business_type, status, approved_at)
values
  ('$($ids.mobile)'::uuid, '$($ids.owner)'::uuid, '$prefix-mobile', 'Bayou Bites Fixture', 'mobile', 'active', now()),
  ('$($ids.fixed)'::uuid, '$($ids.owner)'::uuid, '$prefix-fixed', 'Fixed Cafe Fixture', 'food_drink', 'active', now());
insert into public.business_members (business_id, user_id, role, is_active)
values
  ('$($ids.mobile)'::uuid, '$($ids.owner)'::uuid, 'owner', true),
  ('$($ids.fixed)'::uuid, '$($ids.owner)'::uuid, 'owner', true);
insert into public.business_follows (business_id, customer_id)
values
  ('$($ids.mobile)'::uuid, '$($ids.customer)'::uuid),
  ('$($ids.fixed)'::uuid, '$($ids.customer)'::uuid);
insert into public.business_location_stops (
  id, business_id, title, address_text, latitude, longitude, starts_at, ends_at, timezone, is_published
) values
  ('$($ids.activeStop)'::uuid, '$($ids.mobile)'::uuid, 'Market Square', '1 Market Square', 30.4515, -91.1871, now() - interval '5 minutes', now() + interval '2 hours', 'America/Chicago', true),
  ('$($ids.upcomingStop)'::uuid, '$($ids.mobile)'::uuid, 'River Center', '2 River Road', 30.4520, -91.1800, now() + interval '1 day', now() + interval '1 day 2 hours', 'America/Chicago', true),
  ('$($ids.unpublishedStop)'::uuid, '$($ids.mobile)'::uuid, 'Private Draft', null, 30.45, -91.18, now(), now() + interval '1 hour', 'America/Chicago', false),
  ('$($ids.expiredStop)'::uuid, '$($ids.mobile)'::uuid, 'Expired Stop', null, 30.45, -91.18, now() - interval '3 hours', now() - interval '1 hour', 'America/Chicago', true);
commit;
"@

try {
  Invoke-Migration "nearby_verify_setup_$runId" $setupSql
  $setupApplied = $true
  $tokens.owner = Invoke-Login 'owner'
  $tokens.customer = Invoke-Login 'customer'

  $settingsResponse = Invoke-Rpc $tokens.customer 'get_nearby_alert_preferences'
  Assert-Status $settingsResponse @(200) 'Default settings'
  $settings = $settingsResponse.Content | ConvertFrom-Json
  if ($settings.enabled -or $settings.radiusMiles -ne 5 -or $settings.businesses.Count -ne 1) {
    throw 'Default/off/five-mile/mobile-only settings verification failed.'
  }

  foreach ($radius in @(1, 5, 10, 13, 25)) {
    $response = Invoke-Rpc $tokens.customer 'set_nearby_alert_preferences' @{ p_enabled = $null; p_radius_miles = $radius }
    Assert-Status $response @(200) "Save $radius mile radius"
    if (($response.Content | ConvertFrom-Json).radiusMiles -ne $radius) { throw "$radius mile radius did not persist." }
  }
  Assert-Status (Invoke-Rpc $tokens.customer 'set_nearby_alert_preferences' @{ p_enabled = $null; p_radius_miles = 0 }) @(400) 'Radius below range'
  Assert-Status (Invoke-Rpc $tokens.customer 'set_nearby_alert_preferences' @{ p_enabled = $null; p_radius_miles = 26 }) @(400) 'Radius above range'

  $stops = (Invoke-Rpc $tokens.customer 'get_nearby_alert_stops').Content | ConvertFrom-Json
  if (@($stops).Count -ne 2) { throw 'Published active/upcoming stop filtering failed.' }

  Assert-Status (Invoke-Rpc $tokens.customer 'set_nearby_business_alert_preference' @{ p_business_id = $ids.mobile; p_is_enabled = $false }) @(204) 'Disable mobile business'
  $stops = (Invoke-Rpc $tokens.customer 'get_nearby_alert_stops').Content | ConvertFrom-Json
  if (@($stops).Count -ne 0) { throw 'Per-business disable did not remove stops.' }
  Assert-Status (Invoke-Rpc $tokens.customer 'set_nearby_business_alert_preference' @{ p_business_id = $ids.mobile; p_is_enabled = $true }) @(204) 'Re-enable mobile business'

  $customerHeaders = @{ apikey = $publicKey; Authorization = "Bearer $($tokens.customer)"; 'Content-Type' = 'application/json'; Prefer = 'return=minimal' }
  Assert-Status (Invoke-WebRequest -Method Post -Uri "$projectUrl/rest/v1/blocked_businesses" -Headers $customerHeaders -Body (@{ customer_id = $ids.customer; business_id = $ids.mobile } | ConvertTo-Json -Compress) -SkipHttpErrorCheck) @(201) 'Block mobile business'
  $stops = (Invoke-Rpc $tokens.customer 'get_nearby_alert_stops').Content | ConvertFrom-Json
  if (@($stops).Count -ne 0) { throw 'Blocking did not remove eligible stops.' }
  Assert-Status (Invoke-WebRequest -Method Delete -Uri "$projectUrl/rest/v1/blocked_businesses?customer_id=eq.$($ids.customer)&business_id=eq.$($ids.mobile)" -Headers $customerHeaders -SkipHttpErrorCheck) @(204) 'Unblock mobile business'

  Assert-Status (Invoke-WebRequest -Method Delete -Uri "$projectUrl/rest/v1/business_follows?customer_id=eq.$($ids.customer)&business_id=eq.$($ids.mobile)" -Headers $customerHeaders -SkipHttpErrorCheck) @(204) 'Unfollow mobile business'
  $stops = (Invoke-Rpc $tokens.customer 'get_nearby_alert_stops').Content | ConvertFrom-Json
  if (@($stops).Count -ne 0) { throw 'Unfollow did not remove eligible stops.' }
  Assert-Status (Invoke-WebRequest -Method Post -Uri "$projectUrl/rest/v1/business_follows" -Headers $customerHeaders -Body (@{ customer_id = $ids.customer; business_id = $ids.mobile } | ConvertTo-Json -Compress) -SkipHttpErrorCheck) @(201) 'Refollow mobile business'

  $ownerHeaders = @{ apikey = $publicKey; Authorization = "Bearer $($tokens.owner)"; 'Content-Type' = 'application/json' }
  $crossRead = Invoke-WebRequest -Method Get -Uri "$projectUrl/rest/v1/nearby_alert_preferences?user_id=eq.$($ids.customer)" -Headers $ownerHeaders -SkipHttpErrorCheck
  Assert-Status $crossRead @(200) 'Cross-user preference read'
  if (@($crossRead.Content | ConvertFrom-Json).Count -ne 0) { throw 'RLS exposed another user preference.' }
  $crossWrite = Invoke-WebRequest -Method Patch -Uri "$projectUrl/rest/v1/nearby_alert_preferences?user_id=eq.$($ids.customer)" -Headers $ownerHeaders -Body '{"radius_miles":1}' -SkipHttpErrorCheck
  Assert-Status $crossWrite @(401, 403) 'Cross-user preference write'

  $tokenValue = "ExpoPushToken[$prefix]"
  $firstToken = Invoke-Rpc $tokens.customer 'register_push_token' @{ p_expo_push_token = $tokenValue; p_platform = 'ios'; p_device_id_hash = $null }
  $secondToken = Invoke-Rpc $tokens.customer 'register_push_token' @{ p_expo_push_token = $tokenValue; p_platform = 'ios'; p_device_id_hash = $null }
  Assert-Status $firstToken @(200) 'Initial push-token registration'
  Assert-Status $secondToken @(200) 'Duplicate push-token registration'
  if ($firstToken.Content -ne $secondToken.Content) { throw 'Duplicate push-token registration was not idempotent.' }
  Assert-Status (Invoke-Rpc $tokens.customer 'deactivate_push_tokens') @(200) 'Push-token deactivation'

  Assert-Status (Invoke-DeleteAccount $tokens.customer) @(200) 'Customer account deletion'
  $verificationSql = @"
do `$`$
begin
  if exists (select 1 from public.nearby_alert_preferences where user_id = '$($ids.customer)'::uuid)
    or exists (select 1 from public.nearby_business_alert_preferences where user_id = '$($ids.customer)'::uuid)
    or exists (select 1 from public.push_tokens where user_id = '$($ids.customer)'::uuid) then
    raise exception 'Account deletion left nearby or push preferences behind';
  end if;
  if (select count(*) from public.businesses where slug like 'demo-%') < 7 then
    raise exception 'Existing demo businesses changed';
  end if;
end;
`$`$;
"@
  Invoke-Migration "nearby_verify_assert_$runId" $verificationSql

  Write-Output 'PASS default off and five-mile radius'
  Write-Output 'PASS whole-mile radius persistence from 1 through 25; out-of-range values rejected'
  Write-Output 'PASS mobile/fixed, publication, expiry, block, follow, and per-business eligibility'
  Write-Output 'PASS owner-only RLS and cross-user mutation rejection'
  Write-Output 'PASS duplicate push registration and token deactivation'
  Write-Output 'PASS account deletion cleanup and existing demo-business preservation'
}
finally {
  if ($setupApplied) {
    foreach ($kind in @('customer', 'owner')) {
      if ($tokens[$kind]) {
        try { [void](Invoke-DeleteAccount $tokens[$kind]) } catch { }
      }
    }
    $cleanupSql = @"
do `$`$
declare target_user uuid; job jsonb;
begin
  foreach target_user in array array['$($ids.customer)'::uuid, '$($ids.owner)'::uuid]
  loop
    if exists (select 1 from auth.users where id = target_user) then
      job := public.begin_account_deletion(target_user);
      perform public.execute_account_deletion(target_user, (job ->> 'jobId')::uuid);
    end if;
  end loop;
  delete from public.account_deletion_jobs
  where user_id in ('$($ids.customer)'::uuid, '$($ids.owner)'::uuid) and status = 'completed';
  if exists (select 1 from auth.users where id in ('$($ids.customer)'::uuid, '$($ids.owner)'::uuid))
    or exists (select 1 from public.businesses where slug like '$prefix-%')
    or exists (select 1 from public.nearby_alert_preferences where user_id in ('$($ids.customer)'::uuid, '$($ids.owner)'::uuid))
    or exists (select 1 from public.nearby_business_alert_preferences where user_id in ('$($ids.customer)'::uuid, '$($ids.owner)'::uuid)) then
    raise exception 'Disposable nearby-alert fixtures remain';
  end if;
end;
`$`$;
"@
    try { Invoke-Migration "nearby_verify_cleanup_$runId" $cleanupSql } catch { Write-Warning 'Disposable fixture cleanup requires review.' }
  }
}
