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
$password = Read-DotEnvValue (Join-Path $repoRoot '.env') 'SDS_STAGING_DEMO_PASSWORD'
$publicKey = Read-DotEnvValue (Join-Path $repoRoot 'apps/mobile/.env.local') 'EXPO_PUBLIC_STAGING_SUPABASE_ANON_KEY'
if (-not $managementToken -or -not $password -or -not $publicKey) {
  throw 'The ignored staging management token, disposable password, and public key are required.'
}

$projectUrl = "https://$ProjectRef.supabase.co"
$migrationUrl = "https://api.supabase.com/v1/projects/$ProjectRef/database/migrations"
$managementHeaders = @{ Authorization = "Bearer $managementToken"; 'Content-Type' = 'application/json' }
$publicHeaders = @{ apikey = $publicKey; 'Content-Type' = 'application/json' }
$runId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
$prefix = "codex-delete-$runId"
$passwordBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($password))

$ids = @{
  base = [guid]::NewGuid().ToString()
  customer = [guid]::NewGuid().ToString()
  staff = [guid]::NewGuid().ToString()
  coowner = [guid]::NewGuid().ToString()
  sole = [guid]::NewGuid().ToString()
  staffBusiness = [guid]::NewGuid().ToString()
  sharedBusiness = [guid]::NewGuid().ToString()
  soleBusiness = [guid]::NewGuid().ToString()
  program = [guid]::NewGuid().ToString()
  membership = [guid]::NewGuid().ToString()
  transaction = [guid]::NewGuid().ToString()
  media = [guid]::NewGuid().ToString()
  assetGroup = [guid]::NewGuid().ToString()
}
$users = @('base', 'customer', 'staff', 'coowner', 'sole')
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

function Invoke-Login([string]$Kind) {
  $body = @{ email = "$prefix-$Kind@gmail.com"; password = $password } | ConvertTo-Json -Compress
  $response = Invoke-WebRequest -Method Post -Uri "$projectUrl/auth/v1/token?grant_type=password" -Headers $publicHeaders -Body $body -SkipHttpErrorCheck
  if ([int]$response.StatusCode -ne 200) { throw "Disposable $Kind account could not sign in." }
  return ($response.Content | ConvertFrom-Json).access_token
}

function Invoke-DeletionImpact([string]$Token) {
  $response = Invoke-WebRequest -Method Get -Uri "$projectUrl/functions/v1/delete-account" -Headers @{ apikey = $publicKey; Authorization = "Bearer $Token" } -SkipHttpErrorCheck
  if ([int]$response.StatusCode -ne 200) { throw "Deletion impact returned HTTP $($response.StatusCode)." }
  return ($response.Content | ConvertFrom-Json).impact
}

function Invoke-Deletion([string]$Token, [hashtable]$Payload = @{ confirmation = 'DELETE' }) {
  $response = Invoke-WebRequest -Method Delete -Uri "$projectUrl/functions/v1/delete-account" -Headers @{ apikey = $publicKey; Authorization = "Bearer $Token"; 'Content-Type' = 'application/json' } -Body ($Payload | ConvertTo-Json -Compress) -SkipHttpErrorCheck
  return $response
}

function Assert-Status($Response, [int]$Expected, [string]$Label) {
  if ([int]$Response.StatusCode -ne $Expected) {
    throw "$Label returned HTTP $($Response.StatusCode), expected $Expected."
  }
}

$authRows = foreach ($kind in $users) {
  $id = $ids[$kind]
  $email = "$prefix-$kind@gmail.com"
  "('00000000-0000-0000-0000-000000000000', '$id'::uuid, 'authenticated', 'authenticated', '$email', extensions.crypt(convert_from(decode('$passwordBase64', 'base64'), 'UTF8'), extensions.gen_salt('bf')), now(), '{`"provider`":`"email`",`"providers`":[`"email`"]}'::jsonb, '{`"display_name`":`"Disposable deletion $kind`"}'::jsonb, now(), now(), '', '', '', '')"
}
$identityRows = foreach ($kind in $users) {
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
  ('$($ids.staffBusiness)'::uuid, '$($ids.base)'::uuid, '$prefix-staff-business', 'Disposable Staff Business', 'general', 'active', now()),
  ('$($ids.sharedBusiness)'::uuid, '$($ids.coowner)'::uuid, '$prefix-shared-business', 'Disposable Shared Business', 'general', 'active', now()),
  ('$($ids.soleBusiness)'::uuid, '$($ids.sole)'::uuid, '$prefix-sole-business', 'Disposable Sole Business', 'general', 'active', now());
insert into public.business_members (business_id, user_id, role, is_active)
values
  ('$($ids.staffBusiness)'::uuid, '$($ids.base)'::uuid, 'owner', true),
  ('$($ids.staffBusiness)'::uuid, '$($ids.staff)'::uuid, 'staff', true),
  ('$($ids.sharedBusiness)'::uuid, '$($ids.coowner)'::uuid, 'owner', true),
  ('$($ids.sharedBusiness)'::uuid, '$($ids.base)'::uuid, 'owner', true),
  ('$($ids.soleBusiness)'::uuid, '$($ids.sole)'::uuid, 'owner', true);

insert into public.loyalty_programs (id, business_id, name, reward_description, stamps_required)
values ('$($ids.program)'::uuid, '$($ids.staffBusiness)'::uuid, 'Disposable rewards', 'Disposable reward', 5);
insert into public.loyalty_memberships (id, program_id, business_id, customer_id)
values ('$($ids.membership)'::uuid, '$($ids.program)'::uuid, '$($ids.staffBusiness)'::uuid, '$($ids.customer)'::uuid);
insert into public.loyalty_transactions (
  id, membership_id, business_id, transaction_type, amount, actor_id, idempotency_key
) values (
  '$($ids.transaction)'::uuid, '$($ids.membership)'::uuid, '$($ids.staffBusiness)'::uuid,
  'stamp', 1, '$($ids.base)'::uuid, gen_random_uuid()
);
insert into public.business_follows (business_id, customer_id)
values ('$($ids.staffBusiness)'::uuid, '$($ids.customer)'::uuid);
insert into public.blocked_businesses (business_id, customer_id)
values ('$($ids.sharedBusiness)'::uuid, '$($ids.customer)'::uuid);
insert into public.notification_preferences (user_id, notification_type, is_enabled)
values ('$($ids.customer)'::uuid, 'events', false);
insert into public.push_tokens (user_id, expo_push_token, platform)
values ('$($ids.customer)'::uuid, 'ExpoPushToken[$prefix]', 'ios');

insert into public.media_assets (
  id, asset_group_id, business_id, uploaded_by, bucket, storage_path, role, variant,
  status, mime_type, width, height, byte_size, content_hash, ready_at
) values (
  '$($ids.media)'::uuid, '$($ids.assetGroup)'::uuid, '$($ids.soleBusiness)'::uuid,
  '$($ids.sole)'::uuid, 'business-media', '$($ids.soleBusiness)/$($ids.assetGroup)/full.webp',
  'gallery', 'full', 'ready', 'image/webp', 1, 1, 1, repeat('a', 64), now()
);
commit;
"@

try {
  Invoke-Migration "account_deletion_verify_setup_$runId" $setupSql
  $setupApplied = $true
  foreach ($kind in $users) { $tokens[$kind] = Invoke-Login $kind }

  $unauthenticated = Invoke-WebRequest -Method Get -Uri "$projectUrl/functions/v1/delete-account" -Headers @{ apikey = $publicKey } -SkipHttpErrorCheck
  Assert-Status $unauthenticated 401 'Unauthenticated request'

  $mismatch = Invoke-Deletion $tokens.customer @{ confirmation = 'DELETE'; userId = $ids.base }
  Assert-Status $mismatch 400 'Caller-supplied user ID request'

  $customerImpact = Invoke-DeletionImpact $tokens.customer
  if ($customerImpact.businesses.Count -ne 0) { throw 'Customer-only impact unexpectedly listed a business.' }
  Assert-Status (Invoke-Deletion $tokens.customer) 200 'Customer deletion'

  $staffImpact = Invoke-DeletionImpact $tokens.staff
  if ($staffImpact.businesses[0].action -ne 'remove_access') { throw 'Staff impact was not remove_access.' }
  Assert-Status (Invoke-Deletion $tokens.staff) 200 'Staff deletion'

  $coownerImpact = Invoke-DeletionImpact $tokens.coowner
  if ($coownerImpact.businesses[0].action -ne 'preserve_and_transfer') { throw 'Co-owner impact was not preserve_and_transfer.' }
  Assert-Status (Invoke-Deletion $tokens.coowner) 200 'Co-owner deletion'

  $stagingPath = "$($ids.sole)/$($ids.soleBusiness)/deletion-proof.png"
  $png = [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
  $upload = Invoke-WebRequest -Method Post -Uri "$projectUrl/storage/v1/object/media-staging/$stagingPath" -Headers @{ apikey = $publicKey; Authorization = "Bearer $($tokens.sole)"; 'Content-Type' = 'image/png'; 'x-upsert' = 'false' } -Body $png -SkipHttpErrorCheck
  Assert-Status $upload 200 'Disposable storage upload'
  $soleImpact = Invoke-DeletionImpact $tokens.sole
  if ($soleImpact.businesses[0].action -ne 'delete_business') { throw 'Sole-owner impact was not delete_business.' }
  Assert-Status (Invoke-Deletion $tokens.sole) 200 'Sole-owner deletion'

  $verificationSql = @"
do `$`$
declare duplicate_result jsonb;
begin
  if exists (select 1 from auth.users where id in ('$($ids.customer)'::uuid, '$($ids.staff)'::uuid, '$($ids.coowner)'::uuid, '$($ids.sole)'::uuid)) then
    raise exception 'A deleted disposable Auth user remains';
  end if;
  if exists (select 1 from public.profiles where id in ('$($ids.customer)'::uuid, '$($ids.staff)'::uuid, '$($ids.coowner)'::uuid, '$($ids.sole)'::uuid)) then
    raise exception 'A deleted disposable profile remains';
  end if;
  if exists (select 1 from public.push_tokens where user_id = '$($ids.customer)'::uuid)
    or exists (select 1 from public.notification_preferences where user_id = '$($ids.customer)'::uuid)
    or exists (select 1 from public.loyalty_memberships where customer_id = '$($ids.customer)'::uuid)
    or exists (select 1 from public.business_follows where customer_id = '$($ids.customer)'::uuid)
    or exists (select 1 from public.blocked_businesses where customer_id = '$($ids.customer)'::uuid) then
    raise exception 'Customer private rows remain';
  end if;
  if not exists (select 1 from public.businesses where id = '$($ids.staffBusiness)'::uuid)
    or exists (select 1 from public.business_members where user_id = '$($ids.staff)'::uuid) then
    raise exception 'Staff deletion damaged its business or retained access';
  end if;
  if not exists (
    select 1 from public.businesses
    where id = '$($ids.sharedBusiness)'::uuid and created_by = '$($ids.base)'::uuid
  ) then raise exception 'Shared business was not preserved under the remaining owner'; end if;
  if exists (select 1 from public.businesses where id = '$($ids.soleBusiness)'::uuid)
    or exists (select 1 from public.media_assets where business_id = '$($ids.soleBusiness)'::uuid) then
    raise exception 'Sole-owned business dependent rows remain';
  end if;
  if exists (select 1 from storage.objects where bucket_id = 'media-staging' and name = '$stagingPath') then
    raise exception 'Disposable staging storage object remains';
  end if;
  if not exists (select 1 from auth.users where id = '$($ids.base)'::uuid)
    or not exists (select 1 from public.businesses where id = '$($ids.staffBusiness)'::uuid) then
    raise exception 'Unrelated disposable owner or business was modified';
  end if;
  select public.execute_account_deletion('$($ids.customer)'::uuid, id)
    into duplicate_result
    from public.account_deletion_jobs where user_id = '$($ids.customer)'::uuid;
  if duplicate_result ->> 'alreadyDeleted' <> 'true' then
    raise exception 'Duplicate deletion was not idempotent';
  end if;
  if (select count(*) from public.businesses where slug like 'demo-%') < 7 then
    raise exception 'Existing demo businesses changed';
  end if;
  if has_function_privilege('authenticated', 'public.execute_account_deletion(uuid,uuid)', 'EXECUTE') then
    raise exception 'Authenticated clients can execute privileged deletion directly';
  end if;
end;
`$`$;
"@
  Invoke-Migration "account_deletion_verify_assert_$runId" $verificationSql

  Assert-Status (Invoke-Deletion $tokens.base) 200 'Disposable remaining-owner cleanup'
  Write-Output 'PASS anonymous request rejected'
  Write-Output 'PASS caller-supplied user ID rejected'
  Write-Output 'PASS customer-only deletion and private-record cleanup'
  Write-Output 'PASS staff access removed and business preserved'
  Write-Output 'PASS co-owner business preserved and created_by reassigned'
  Write-Output 'PASS sole-owner business, dependent data, and storage deleted'
  Write-Output 'PASS duplicate deletion idempotent and unrelated/demo businesses preserved'
}
finally {
  if ($setupApplied) {
    foreach ($kind in $users) {
      if ($tokens[$kind]) {
        try { [void](Invoke-Deletion $tokens[$kind]) } catch { }
      }
    }
    $cleanupSql = @"
do `$`$
declare target_user uuid; job jsonb;
begin
  foreach target_user in array array['$($ids.base)'::uuid, '$($ids.customer)'::uuid, '$($ids.staff)'::uuid, '$($ids.coowner)'::uuid, '$($ids.sole)'::uuid]
  loop
    if exists (select 1 from auth.users where id = target_user) then
      job := public.begin_account_deletion(target_user);
      perform public.execute_account_deletion(target_user, (job ->> 'jobId')::uuid);
    end if;
  end loop;
  delete from public.account_deletion_jobs
  where user_id in ('$($ids.base)'::uuid, '$($ids.customer)'::uuid, '$($ids.staff)'::uuid, '$($ids.coowner)'::uuid, '$($ids.sole)'::uuid)
    and status = 'completed';
  if exists (select 1 from auth.users where id in ('$($ids.base)'::uuid, '$($ids.customer)'::uuid, '$($ids.staff)'::uuid, '$($ids.coowner)'::uuid, '$($ids.sole)'::uuid))
    or exists (select 1 from public.businesses where slug like '$prefix-%')
    or exists (select 1 from public.account_deletion_jobs where user_id in ('$($ids.base)'::uuid, '$($ids.customer)'::uuid, '$($ids.staff)'::uuid, '$($ids.coowner)'::uuid, '$($ids.sole)'::uuid)) then
    raise exception 'Disposable verification fixtures remain';
  end if;
end;
`$`$;
"@
    try { Invoke-Migration "account_deletion_verify_cleanup_$runId" $cleanupSql } catch { Write-Warning 'Disposable fixture cleanup requires review.' }
  }
}
