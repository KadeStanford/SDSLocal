param([string]$ProjectRef = 'lgddhdexvwclfrnzjtly')
$ErrorActionPreference = 'Stop'

function EnvValue([string]$Path, [string]$Name) {
  $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match ('^' + [regex]::Escape($Name) + '=') } | Select-Object -First 1
  if ($line) { return $line.Substring($Name.Length + 1) }
  return $null
}
function Sql([string]$Name, [string]$Query) {
  Start-Sleep -Seconds 2
  $response = Invoke-WebRequest -Method Post -Uri $script:migrationUrl -Headers $script:managementHeaders -Body (@{ name = $Name; query = $Query } | ConvertTo-Json -Compress) -TimeoutSec 180 -SkipHttpErrorCheck
  if ([int]$response.StatusCode -notin 200..299) { throw "$Name failed with HTTP $($response.StatusCode): $($response.Content)" }
}
function Login([string]$Email) {
  $response = Invoke-WebRequest -Method Post -Uri "$script:projectUrl/auth/v1/token?grant_type=password" -Headers $script:publicHeaders -Body (@{ email = $Email; password = $script:password } | ConvertTo-Json -Compress) -SkipHttpErrorCheck
  if ([int]$response.StatusCode -ne 200) { throw "Fixture login failed for $Email." }
  return ($response.Content | ConvertFrom-Json).access_token
}
function Call([string]$Token, [string]$Function, [hashtable]$Body, [int[]]$Expected = @(200)) {
  $headers = @{ apikey = $script:publicKey; Authorization = "Bearer $Token"; 'Content-Type' = 'application/json' }
  $response = Invoke-WebRequest -Method Post -Uri "$script:projectUrl/functions/v1/$Function" -Headers $headers -Body ($Body | ConvertTo-Json -Compress -Depth 8) -SkipHttpErrorCheck
  if ([int]$response.StatusCode -notin $Expected) { throw "$Function returned HTTP $($response.StatusCode), expected $($Expected -join '/'): $($response.Content)" }
  if ($response.Content) { return $response.Content | ConvertFrom-Json }
}
function Token([string]$CustomerToken, [string]$MembershipId) { return (Call $CustomerToken 'loyalty-token' @{ membershipId = $MembershipId }).token }
function Transact([string]$OperatorToken, [string]$Operation, [string]$Qr, [string]$Action, [string]$BusinessId, [string]$Key, [Nullable[int]]$Amount, [int[]]$Expected = @(200)) {
  $body = @{ operation = $Operation; token = $Qr; action = $Action; expectedBusinessId = $BusinessId; idempotencyKey = $Key; scanSource = 'manual' }
  if ($null -ne $Amount) { $body.purchaseAmountMinor = $Amount }
  return Call $OperatorToken 'loyalty-transact' $body $Expected
}

$root = Split-Path -Parent $PSScriptRoot
$rootEnv = Join-Path $root '.env'
$mobileEnv = Join-Path $root 'apps/mobile/.env.local'
$managementToken = EnvValue $rootEnv 'SUPABASE_ACCESS_TOKEN'
$configuredRef = EnvValue $rootEnv 'SDS_STAGING_SUPABASE_PROJECT_REF'
$script:password = EnvValue $rootEnv 'SDS_STAGING_DEMO_PASSWORD'
$script:publicKey = EnvValue $mobileEnv 'EXPO_PUBLIC_STAGING_SUPABASE_ANON_KEY'
if ($configuredRef -ne $ProjectRef) { throw "Refusing non-staging project $configuredRef." }
if (-not $managementToken -or -not $script:password -or -not $script:publicKey) { throw 'Ignored staging credentials are incomplete.' }
$script:projectUrl = "https://$ProjectRef.supabase.co"
$script:migrationUrl = "https://api.supabase.com/v1/projects/$ProjectRef/database/migrations"
$script:managementHeaders = @{ Authorization = "Bearer $managementToken"; 'Content-Type' = 'application/json' }
$script:publicHeaders = @{ apikey = $script:publicKey; 'Content-Type' = 'application/json' }
$run = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
$prefix = "codex-scanner-$run"
$password64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script:password))
$owner = [guid]::NewGuid(); $staff = [guid]::NewGuid(); $customer = [guid]::NewGuid(); $outsider = [guid]::NewGuid()
$visitBusiness = [guid]::NewGuid(); $pointsBusiness = [guid]::NewGuid(); $otherBusiness = [guid]::NewGuid()
$visitProgram = [guid]::NewGuid(); $pointsProgram = [guid]::NewGuid()
$visitMembership = [guid]::NewGuid(); $pointsMembership = [guid]::NewGuid()
$emails = @("$prefix-owner@fixture.sdslocal.test", "$prefix-staff@fixture.sdslocal.test", "$prefix-customer@fixture.sdslocal.test", "$prefix-outsider@fixture.sdslocal.test")
$ids = @($owner, $staff, $customer, $outsider)

$users = for ($i = 0; $i -lt $ids.Count; $i++) { "('00000000-0000-0000-0000-000000000000','$($ids[$i])','authenticated','authenticated','$($emails[$i])',extensions.crypt(convert_from(decode('$password64','base64'),'UTF8'),extensions.gen_salt('bf')),now(),'{`"provider`":`"email`",`"providers`": [`"email`"]}'::jsonb,'{`"display_name`":`"Scanner fixture $i`"}'::jsonb,now(),now(),'','','','')" }
$identities = for ($i = 0; $i -lt $ids.Count; $i++) { "('$($ids[$i])','$($ids[$i])',jsonb_build_object('sub','$($ids[$i])','email','$($emails[$i])'),'email','$($ids[$i])',now(),now(),now())" }
$setup = @"
begin;
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,recovery_token,email_change_token_new) values $($users -join ',');
insert into auth.identities(id,user_id,identity_data,provider,provider_id,last_sign_in_at,created_at,updated_at) values $($identities -join ',');
insert into public.businesses(id,created_by,slug,name,business_type,status,approved_at,description) values
('$visitBusiness','$owner','$prefix-visit','Scanner Visit Fixture','general','active',now(),'Disposable scanner fixture'),
('$pointsBusiness','$owner','$prefix-points','Scanner Points Fixture','general','active',now(),'Disposable scanner fixture'),
('$otherBusiness','$owner','$prefix-other','Scanner Other Fixture','general','active',now(),'Disposable scanner fixture');
insert into public.business_members(business_id,user_id,role,is_active) values
('$visitBusiness','$owner','owner',true),('$visitBusiness','$staff','staff',true),
('$pointsBusiness','$owner','owner',true),('$pointsBusiness','$staff','staff',true),('$otherBusiness','$owner','owner',true);
insert into public.loyalty_programs(id,business_id,name,reward_description,stamps_required,program_type,points_per_dollar,points_required,is_active) values
('$visitProgram','$visitBusiness','Visit Rewards','Free entree',8,'visits',null,null,true),
('$pointsProgram','$pointsBusiness','Points Rewards','Five dollar reward',8,'points',1,100,true);
insert into public.loyalty_memberships(id,program_id,business_id,customer_id,is_active) values
('$visitMembership','$visitProgram','$visitBusiness','$customer',true),('$pointsMembership','$pointsProgram','$pointsBusiness','$customer',true);
insert into public.loyalty_transactions(membership_id,business_id,transaction_type,amount,points_amount,actor_id,idempotency_key,token_id,created_at)
select '$visitMembership','$visitBusiness','stamp',1,0,'$owner',gen_random_uuid(),gen_random_uuid(),now()-interval '10 minutes' from generate_series(1,7);
insert into public.loyalty_transactions(membership_id,business_id,transaction_type,amount,points_amount,spend_minor,actor_id,idempotency_key,token_id)
values('$pointsMembership','$pointsBusiness','points_earned',1,80,8000,'$owner',gen_random_uuid(),gen_random_uuid());
commit;
"@

try {
  Sql "scanner_verify_stale_cleanup_$run" "delete from public.loyalty_scan_attempts where business_id in (select id from public.businesses where slug like 'codex-scanner-%'); delete from public.loyalty_transactions where business_id in (select id from public.businesses where slug like 'codex-scanner-%'); delete from public.businesses where slug like 'codex-scanner-%'; delete from auth.users where email like 'codex-scanner-%@fixture.sdslocal.test';"
  Sql "scanner_verify_setup_$run" $setup
  $ownerToken = Login $emails[0]; $staffToken = Login $emails[1]; $customerToken = Login $emails[2]; $outsiderToken = Login $emails[3]
  Write-Output 'PASS confirmed SQL fixtures signed in without sending Auth email'
  $customerHeaders = @{ apikey = $script:publicKey; Authorization = "Bearer $customerToken" }
  $visibleMemberships = Invoke-RestMethod -Method Get -Uri "$script:projectUrl/rest/v1/loyalty_memberships?select=id,customer_id&customer_id=eq.$customer" -Headers $customerHeaders
  if (@($visibleMemberships).Count -ne 2) { throw "Customer fixture could not read its two memberships (found $(@($visibleMemberships).Count))." }
  $visitMembershipApi = @($visibleMemberships | Where-Object { $_.id -eq $visitMembership.ToString() })[0].id
  $pointsMembershipApi = @($visibleMemberships | Where-Object { $_.id -eq $pointsMembership.ToString() })[0].id
  if (-not $visitMembershipApi -or -not $pointsMembershipApi) { throw 'Fixture membership identifiers did not round-trip through staging.' }

  $qr = Token $customerToken $visitMembershipApi
  $before = Transact $ownerToken 'preview' $qr 'stamp' $visitBusiness '' $null
  if ($before.preview.currentProgressStamps -ne 7 -or $before.preview.resultingProgressStamps -ne 0) { throw 'Visit preview was incorrect.' }
  Write-Output 'PASS authorized owner visit preview is server-calculated and non-mutating'
  $key = [guid]::NewGuid().ToString(); $commit = Transact $ownerToken 'commit' $qr 'stamp' $visitBusiness $key $null
  if ($commit.loyalty.rewardsReady -ne 1) { throw 'Visit confirmation was incorrect.' }
  $retry = Transact $ownerToken 'commit' $qr 'stamp' $visitBusiness $key $null
  if (-not $retry.loyalty.reconciled -or $retry.loyalty.transactionId -ne $commit.loyalty.transactionId) { throw 'Idempotent retry did not reconcile.' }
  [void](Transact $ownerToken 'commit' $qr 'stamp' $visitBusiness ([guid]::NewGuid().ToString()) $null @(409))
  Write-Output 'PASS visit confirmation, same-key reconciliation, and duplicate-token rejection'

  $redeemQr = Token $customerToken $visitMembershipApi
  $redeemPreview = Transact $staffToken 'preview' $redeemQr 'redemption' $visitBusiness '' $null
  if ($redeemPreview.preview.currentRewardsReady -ne 1 -or $redeemPreview.preview.resultingRewardsReady -ne 0) { throw 'Visit redemption preview was incorrect.' }
  [void](Transact $staffToken 'commit' $redeemQr 'redemption' $visitBusiness ([guid]::NewGuid().ToString()) $null)
  Write-Output 'PASS authorized staff redemption preview and confirmation'

  $pointsQr = Token $customerToken $pointsMembershipApi
  $pointsPreview = Transact $staffToken 'preview' $pointsQr 'earn_points' $pointsBusiness '' 2500
  if ($pointsPreview.preview.pointsAwarded -ne 25 -or $pointsPreview.preview.currentAvailablePoints -ne 80 -or $pointsPreview.preview.resultingAvailablePoints -ne 105) { throw 'Points preview calculation was incorrect.' }
  [void](Transact $staffToken 'commit' $pointsQr 'earn_points' $pointsBusiness ([guid]::NewGuid().ToString()) 2500)
  $pointsRedeemQr = Token $customerToken $pointsMembershipApi
  $pointsRedeem = Transact $ownerToken 'preview' $pointsRedeemQr 'redemption' $pointsBusiness '' $null
  if ($pointsRedeem.preview.resultingAvailablePoints -ne 5) { throw 'Points redemption preview was incorrect.' }
  [void](Transact $ownerToken 'commit' $pointsRedeemQr 'redemption' $pointsBusiness ([guid]::NewGuid().ToString()) $null)
  Write-Output 'PASS points preview, trusted award calculation, confirmation, and redemption'

  $noRewardQr = Token $customerToken $pointsMembershipApi
  [void](Transact $ownerToken 'preview' $noRewardQr 'redemption' $pointsBusiness '' $null @(409))
  [void](Transact $ownerToken 'preview' $noRewardQr 'earn_points' $visitBusiness '' 1000 @(409))
  [void](Transact $outsiderToken 'preview' $noRewardQr 'earn_points' $pointsBusiness '' 1000 @(403))
  [void](Call $ownerToken 'loyalty-transact' @{ operation = 'preview'; token = 'invalid-code'; action = 'stamp'; expectedBusinessId = $visitBusiness; scanSource = 'manual' } @(400))
  Write-Output 'PASS insufficient reward, wrong-business, unauthorized operator, and invalid-token rejection'

  $concurrentQr = Token $customerToken $pointsMembershipApi
  $concurrentUri = "$script:projectUrl/functions/v1/loyalty-transact"
  $concurrentHeaders = @{ apikey = $script:publicKey; Authorization = "Bearer $ownerToken"; 'Content-Type' = 'application/json' }
  $concurrentBodies = @(
    (@{ operation = 'commit'; token = $concurrentQr; action = 'earn_points'; expectedBusinessId = $pointsBusiness; idempotencyKey = [guid]::NewGuid().ToString(); scanSource = 'manual'; purchaseAmountMinor = 100 } | ConvertTo-Json -Compress),
    (@{ operation = 'commit'; token = $concurrentQr; action = 'earn_points'; expectedBusinessId = $pointsBusiness; idempotencyKey = [guid]::NewGuid().ToString(); scanSource = 'manual'; purchaseAmountMinor = 100 } | ConvertTo-Json -Compress)
  )
  $concurrentResponses = $concurrentBodies | ForEach-Object -Parallel {
    Invoke-WebRequest -Method Post -Uri $using:concurrentUri -Headers $using:concurrentHeaders -Body $_ -SkipHttpErrorCheck
  } -ThrottleLimit 2
  $concurrentStatuses = @($concurrentResponses | ForEach-Object { [int]$_.StatusCode } | Sort-Object)
  if (($concurrentStatuses -join ',') -ne '200,409') { throw "Concurrent token use returned $($concurrentStatuses -join ',')." }
  Write-Output 'PASS concurrent use of one token produced exactly one mutation'

  $expiringQr = Token $customerToken $pointsMembershipApi
  Start-Sleep -Seconds 46
  [void](Transact $ownerToken 'preview' $expiringQr 'earn_points' $pointsBusiness '' 100 @(410))
  Write-Output 'PASS expired rotating token is rejected and requires a fresh scan'

  Sql "scanner_verify_revoke_$run" "update public.business_members set is_active=false where business_id='$visitBusiness' and user_id='$staff';"
  $revokedQr = Token $customerToken $visitMembershipApi
  [void](Transact $staffToken 'preview' $revokedQr 'stamp' $visitBusiness '' $null @(403))
  Write-Output 'PASS revoked staff is rejected immediately'

  $headers = @{ apikey = $script:publicKey; Authorization = "Bearer $ownerToken"; 'Content-Type' = 'application/json' }
  $statsResponse = Invoke-RestMethod -Method Post -Uri "$script:projectUrl/rest/v1/rpc/get_business_scan_stats" -Headers $headers -Body (@{ p_business_id = $visitBusiness } | ConvertTo-Json)
  $visitStats = @($statsResponse)[0]
  if ($visitStats.completed_scans -ne 2 -or $visitStats.duplicate_scans -ne 1) { throw 'Analytics did not preserve confirmed/duplicate counts.' }
  Write-Output 'PASS previews do not inflate analytics and private business activity remains scoped'
} finally {
  $cleanup = @"
begin;
delete from public.loyalty_scan_attempts where business_id in ('$visitBusiness','$pointsBusiness','$otherBusiness');
delete from public.loyalty_transactions where business_id in ('$visitBusiness','$pointsBusiness','$otherBusiness');
delete from public.businesses where id in ('$visitBusiness','$pointsBusiness','$otherBusiness');
delete from auth.users where id in ('$owner','$staff','$customer','$outsider');
commit;
"@
  Sql "scanner_verify_cleanup_$run" $cleanup
  Write-Output 'PASS disposable users and all cascading scanner fixtures removed'
}
