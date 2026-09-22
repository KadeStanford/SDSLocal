param(
  [string]$ProjectRef = 'lgddhdexvwclfrnzjtly',
  [ValidatePattern('^kade20413@gmail\.com$')]
  [string]$AuthTestInbox = 'kade20413@gmail.com'
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
$prefix = "codex-onboarding-$runId"
$authTestParts = $AuthTestInbox.Split('@', 2)
$signupEmail = "$($authTestParts[0])+$prefix-signup@$($authTestParts[1])"
$passwordBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($password))
$ownerId = [guid]::NewGuid().ToString()
$secondId = [guid]::NewGuid().ToString()
$signupId = $null
$ownerToken = $null
$secondToken = $null

function Invoke-Migration([string]$Name, [string]$Query) {
  Start-Sleep -Seconds 2
  $body = @{ name = $Name; query = $Query } | ConvertTo-Json -Compress
  $response = Invoke-WebRequest -Method Post -Uri $migrationUrl -Headers $managementHeaders -Body $body -TimeoutSec 180 -SkipHttpErrorCheck
  if ([int]$response.StatusCode -lt 200 -or [int]$response.StatusCode -ge 300) {
    throw "Staging verification SQL failed (HTTP $($response.StatusCode))."
  }
}

function Invoke-Login([string]$Email) {
  $body = @{ email = $Email; password = $password } | ConvertTo-Json -Compress
  $response = Invoke-WebRequest -Method Post -Uri "$projectUrl/auth/v1/token?grant_type=password" -Headers $publicHeaders -Body $body -SkipHttpErrorCheck
  if ([int]$response.StatusCode -ne 200) { throw "Disposable account could not sign in (HTTP $($response.StatusCode))." }
  return ($response.Content | ConvertFrom-Json).access_token
}

function Invoke-Rpc([string]$Token, [string]$Name, [hashtable]$Payload = @{}) {
  $headers = @{ apikey = $publicKey; Authorization = "Bearer $Token"; 'Content-Type' = 'application/json' }
  return Invoke-WebRequest -Method Post -Uri "$projectUrl/rest/v1/rpc/$Name" -Headers $headers -Body ($Payload | ConvertTo-Json -Depth 8 -Compress) -SkipHttpErrorCheck
}

function Assert-Status($Response, [int[]]$Expected, [string]$Label) {
  if ([int]$Response.StatusCode -notin $Expected) {
    throw "$Label returned HTTP $($Response.StatusCode), expected $($Expected -join ' or ')."
  }
}

function New-BusinessPayload(
  [string]$RequestId,
  [string]$Name,
  [string]$Slug,
  [string]$Type,
  [string]$ServiceAreaType,
  [string]$Address = $null,
  [string]$City = 'Baton Rouge',
  [string]$Region = 'LA',
  [string[]]$Regions = @(),
  [bool]$Customized = $false
) {
  return @{
    p_request_id = $RequestId
    p_name = $Name
    p_requested_slug = $Slug
    p_slug_customized = $Customized
    p_business_type = $Type
    p_description = 'A disposable staging business used to verify mobile onboarding safely.'
    p_category_ids = @()
    p_address_line_1 = $Address
    p_city = $City
    p_region_code = $Region
    p_postal_code = $null
    p_country_code = 'US'
    p_service_area_type = $ServiceAreaType
    p_service_area_regions = $Regions
    p_service_radius_miles = $null
    p_service_area = $null
  }
}

$ownerEmail = "$prefix-owner@gmail.com"
$secondEmail = "$prefix-second@gmail.com"
$authRows = @(
  "('00000000-0000-0000-0000-000000000000', '$ownerId'::uuid, 'authenticated', 'authenticated', '$ownerEmail', extensions.crypt(convert_from(decode('$passwordBase64', 'base64'), 'UTF8'), extensions.gen_salt('bf')), now(), '{`"provider`":`"email`",`"providers`":[`"email`"]}'::jsonb, '{`"display_name`":`"Onboarding owner`"}'::jsonb, now(), now(), '', '', '', '')",
  "('00000000-0000-0000-0000-000000000000', '$secondId'::uuid, 'authenticated', 'authenticated', '$secondEmail', extensions.crypt(convert_from(decode('$passwordBase64', 'base64'), 'UTF8'), extensions.gen_salt('bf')), now(), '{`"provider`":`"email`",`"providers`":[`"email`"]}'::jsonb, '{`"display_name`":`"Onboarding second`"}'::jsonb, now(), now(), '', '', '', '')"
)
$identityRows = @(
  "('$ownerId'::uuid, '$ownerId'::uuid, jsonb_build_object('sub', '$ownerId', 'email', '$ownerEmail'), 'email', '$ownerId', now(), now(), now())",
  "('$secondId'::uuid, '$secondId'::uuid, jsonb_build_object('sub', '$secondId', 'email', '$secondEmail'), 'email', '$secondId', now(), now(), now())"
)

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
commit;
"@

try {
  $staleCleanupSql = @"
do `$`$
declare target_user uuid; target_users uuid[]; job jsonb;
begin
  select coalesce(array_agg(id), array[]::uuid[]) into target_users
  from auth.users
  where email like 'codex-onboarding-%'
     or email like 'kade20413+codex-onboarding-%@gmail.com';
  foreach target_user in array target_users
  loop
    job := public.begin_account_deletion(target_user);
    perform public.execute_account_deletion(target_user, (job ->> 'jobId')::uuid);
  end loop;
  delete from public.account_deletion_jobs
  where user_id = any(target_users) and status = 'completed';
end;
`$`$;
"@
  Invoke-Migration "onboarding_verify_stale_cleanup_$runId" $staleCleanupSql
  Invoke-Migration "onboarding_verify_setup_$runId" $setupSql
  $ownerToken = Invoke-Login $ownerEmail
  $secondToken = Invoke-Login $secondEmail
  Write-Output 'PASS disposable staging accounts can use email/password authentication'

  $signupResponse = Invoke-WebRequest -Method Post -Uri "$projectUrl/auth/v1/signup" -Headers $publicHeaders -Body (@{ email = $signupEmail; password = $password; data = @{} } | ConvertTo-Json -Compress) -SkipHttpErrorCheck
  Assert-Status $signupResponse @(200) 'Disposable customer signup'
  $signupId = ($signupResponse.Content | ConvertFrom-Json).user.id
  Write-Output 'PASS staging email signup path accepts a disposable customer'

  $fixedRequest = [guid]::NewGuid().ToString()
  $fixedPayload = New-BusinessPayload $fixedRequest 'Onboarding Fixed Fixture' "$prefix-fixed" 'services' 'at_location' '100 Test Street'
  $fixedResponse = Invoke-Rpc $ownerToken 'create_business_with_owner_v3' $fixedPayload
  Assert-Status $fixedResponse @(200) 'Fixed-location creation'
  $fixed = $fixedResponse.Content | ConvertFrom-Json
  Write-Output 'PASS fixed-location business creation'

  $retryPayload = New-BusinessPayload $fixedRequest 'Different Retry Name' "$prefix-different" 'retail' 'at_location' '200 Test Street'
  $retryResponse = Invoke-Rpc $ownerToken 'create_business_with_owner_v3' $retryPayload
  Assert-Status $retryResponse @(200) 'Idempotent creation retry'
  $retry = $retryResponse.Content | ConvertFrom-Json
  if ($retry.businessId -ne $fixed.businessId -or $retry.created) { throw 'Creation retry produced a duplicate business.' }
  Write-Output 'PASS duplicate submission returns the original business'

  $duplicateResponse = Invoke-Rpc $ownerToken 'create_business_with_owner_v3' (New-BusinessPayload ([guid]::NewGuid().ToString()) 'Onboarding Fixed Duplicate' "$prefix-fixed" 'services' 'at_location' '101 Test Street')
  Assert-Status $duplicateResponse @(200) 'Automatic collision allocation'
  $duplicate = $duplicateResponse.Content | ConvertFrom-Json
  if ($duplicate.pageAddress -ne "$prefix-fixed-2") { throw 'Automatic collision suffix was not stable and readable.' }
  Write-Output 'PASS duplicate names receive a readable unique page address'

  $manualSlug = "$prefix-custom"
  $available = Invoke-Rpc $ownerToken 'is_business_page_address_available' @{ p_requested_slug = $manualSlug }
  Assert-Status $available @(200) 'Available page-address check'
  if ($available.Content -ne 'true') { throw 'Unused custom page address was not available.' }
  $manualResponse = Invoke-Rpc $ownerToken 'create_business_with_owner_v3' (New-BusinessPayload ([guid]::NewGuid().ToString()) 'Manual Address Fixture' $manualSlug 'retail' 'at_location' '102 Test Street' 'Baton Rouge' 'LA' @() $true)
  Assert-Status $manualResponse @(200) 'Customized page address creation'
  $conflictResponse = Invoke-Rpc $ownerToken 'create_business_with_owner_v3' (New-BusinessPayload ([guid]::NewGuid().ToString()) 'Manual Conflict Fixture' $manualSlug 'retail' 'at_location' '103 Test Street' 'Baton Rouge' 'LA' @() $true)
  Assert-Status $conflictResponse @(400, 409) 'Customized page address conflict'
  Write-Output 'PASS custom page-address availability and conflict handling'

  $serviceResponse = Invoke-Rpc $ownerToken 'create_business_with_owner_v3' (New-BusinessPayload ([guid]::NewGuid().ToString()) 'Service Area Fixture' "$prefix-service" 'services' 'cities' $null 'Baton Rouge' 'LA' @('Baton Rouge', 'Prairieville'))
  Assert-Status $serviceResponse @(200) 'Service-area creation'
  $mobileResponse = Invoke-Rpc $ownerToken 'create_business_with_owner_v3' (New-BusinessPayload ([guid]::NewGuid().ToString()) 'Mobile Fixture' "$prefix-mobile" 'mobile' 'at_location' $null 'Baton Rouge' 'LA')
  Assert-Status $mobileResponse @(200) 'Mobile creation without fixed address'
  Write-Output 'PASS service-area and mobile-without-fixed-address creation'

  $otherResponse = Invoke-Rpc $secondToken 'create_business_with_owner_v3' (New-BusinessPayload $fixedRequest 'Second Account Fixture' "$prefix-second" 'services' 'at_location' '104 Test Street')
  Assert-Status $otherResponse @(200) 'Second-account request isolation'
  if (($otherResponse.Content | ConvertFrom-Json).businessId -eq $fixed.businessId) { throw 'Creation request leaked across accounts.' }
  Write-Output 'PASS creation request state is isolated by authenticated user'

  $verifySql = @"
do `$`$
begin
  if not exists (
    select 1 from public.business_members
    where business_id = '$($fixed.businessId)'::uuid and user_id = '$ownerId'::uuid and role = 'owner' and is_active
  ) then raise exception 'Fixed business owner membership is missing'; end if;
  if exists (
    select 1 from public.businesses
    where slug like '$prefix-%' and status <> 'draft'
  ) then raise exception 'A disposable business was published unexpectedly'; end if;
  if exists (
    select 1 from public.business_creation_requests request
    where request.user_id not in ('$ownerId'::uuid, '$secondId'::uuid)
      and request.request_id = '$fixedRequest'::uuid
  ) then raise exception 'Creation request ownership leaked'; end if;
end;
`$`$;
"@
  Invoke-Migration "onboarding_verify_assert_$runId" $verifySql
  Write-Output 'PASS owner membership, private draft status, and account-scoped request state'
}
finally {
  $cleanupIds = @($ownerId, $secondId)
  if ($signupId) { $cleanupIds += $signupId }
  $idList = ($cleanupIds | ForEach-Object { "'$_'::uuid" }) -join ', '
  $cleanupSql = @"
do `$`$
declare target_user uuid; job jsonb;
begin
  for target_user in
    select id from auth.users
    where id in ($idList) or email like '$prefix-%' or email = '$signupEmail'
  loop
    if exists (select 1 from auth.users where id = target_user) then
      job := public.begin_account_deletion(target_user);
      perform public.execute_account_deletion(target_user, (job ->> 'jobId')::uuid);
    end if;
  end loop;
  delete from public.account_deletion_jobs where user_id in ($idList) and status = 'completed';
  if exists (select 1 from auth.users where id in ($idList) or email like '$prefix-%' or email = '$signupEmail')
    or exists (select 1 from public.businesses where slug like '$prefix-%')
    or exists (select 1 from public.business_creation_requests where user_id in ($idList)) then
    raise exception 'Disposable onboarding fixtures remain';
  end if;
end;
`$`$;
"@
  try {
    Invoke-Migration "onboarding_verify_cleanup_$runId" $cleanupSql
    Write-Output 'PASS disposable staging accounts, businesses, and request state removed'
  }
  catch {
    Write-Warning 'Disposable onboarding fixture cleanup requires review.'
    throw
  }
}
