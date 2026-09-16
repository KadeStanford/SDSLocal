$ErrorActionPreference = 'Stop'

function Read-LocalSupabaseValue([string]$Name) {
  $status = & "$PSScriptRoot\..\..\node_modules\.bin\supabase.CMD" status -o env
  $line = $status | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
  if (-not $line) { throw "Could not read $Name from Supabase status." }
  return ($line -replace "^$Name=", '').Trim('"')
}

function ConvertTo-Base64Url([byte[]]$Bytes) {
  return [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function New-ExpiredLoyaltyToken(
  [string]$Secret,
  [string]$UserId,
  [string]$MembershipId,
  [string]$BusinessId,
  [string]$ProgramId
) {
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $header = ConvertTo-Base64Url ([Text.Encoding]::UTF8.GetBytes((@{ alg = 'HS256'; typ = 'JWT' } | ConvertTo-Json -Compress)))
  $claims = @{
    iss = 'sds-local'
    aud = 'sds-loyalty'
    sub = $UserId
    membershipId = $MembershipId
    businessId = $BusinessId
    programId = $ProgramId
    jti = [guid]::NewGuid().ToString()
    iat = $now - 60
    exp = $now - 1
  }
  $payload = ConvertTo-Base64Url ([Text.Encoding]::UTF8.GetBytes(($claims | ConvertTo-Json -Compress)))
  $unsigned = "$header.$payload"
  $hmac = [Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($Secret))
  try { $signature = ConvertTo-Base64Url ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($unsigned))) }
  finally { $hmac.Dispose() }
  return "$unsigned.$signature"
}

$apiUrl = Read-LocalSupabaseValue 'API_URL'
$anonKey = Read-LocalSupabaseValue 'ANON_KEY'
$serviceKey = Read-LocalSupabaseValue 'SERVICE_ROLE_KEY'
$suffix = [guid]::NewGuid().ToString('N')
$email = "loyalty-test-$suffix@example.test"
$password = "Loyalty-Test-$suffix-A9!"
$userId = $null
$businessId = $null

$serviceHeaders = @{ apikey = $serviceKey; Authorization = "Bearer $serviceKey"; Prefer = 'return=representation' }
$jsonHeaders = @{ apikey = $serviceKey; Authorization = "Bearer $serviceKey" }

try {
  $user = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/admin/users" -Headers $jsonHeaders -ContentType 'application/json' -Body (@{ email = $email; password = $password; email_confirm = $true; user_metadata = @{ display_name = 'Loyalty Integration Test' } } | ConvertTo-Json -Depth 4)
  $userId = $user.id
  if (-not $userId) { throw 'Temporary test user was not created.' }

  $session = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers @{ apikey = $anonKey } -ContentType 'application/json' -Body (@{ email = $email; password = $password } | ConvertTo-Json)
  $accessToken = $session.access_token
  if (-not $accessToken) { throw 'Temporary test user could not sign in.' }

  $business = Invoke-RestMethod -Method Post -Uri "$apiUrl/rest/v1/businesses" -Headers $serviceHeaders -ContentType 'application/json' -Body (@{ created_by = $userId; slug = "loyalty-test-$suffix"; name = 'Loyalty Integration Test'; business_type = 'general'; status = 'active'; approved_at = [DateTime]::UtcNow.ToString('o'); description = 'Temporary automated loyalty integration test.' } | ConvertTo-Json)
  $businessId = @($business)[0].id
  $member = Invoke-RestMethod -Method Post -Uri "$apiUrl/rest/v1/business_members" -Headers $serviceHeaders -ContentType 'application/json' -Body (@{ business_id = $businessId; user_id = $userId; role = 'owner'; is_active = $true } | ConvertTo-Json)
  if (-not @($member)[0].id) { throw 'Temporary owner membership was not created.' }
  $program = Invoke-RestMethod -Method Post -Uri "$apiUrl/rest/v1/loyalty_programs" -Headers $serviceHeaders -ContentType 'application/json' -Body (@{ business_id = $businessId; name = 'Test Rewards'; reward_description = 'Test reward'; stamps_required = 8; terms = ''; is_active = $true } | ConvertTo-Json)
  $programId = @($program)[0].id
  $membership = Invoke-RestMethod -Method Post -Uri "$apiUrl/rest/v1/loyalty_memberships" -Headers $serviceHeaders -ContentType 'application/json' -Body (@{ program_id = $programId; business_id = $businessId; customer_id = $userId; is_active = $true } | ConvertTo-Json)
  $membershipId = @($membership)[0].id

  $functionHeaders = @{ apikey = $anonKey; Authorization = "Bearer $accessToken" }
  $code = Invoke-RestMethod -Method Post -Uri "$apiUrl/functions/v1/loyalty-token" -Headers $functionHeaders -ContentType 'application/json' -Body (@{ membershipId = $membershipId } | ConvertTo-Json)
  if (-not $code.token) { throw 'Rotating loyalty token was not returned.' }

  $stampBody = @{ token = $code.token; action = 'stamp'; idempotencyKey = [guid]::NewGuid().ToString() } | ConvertTo-Json
  $stamp = Invoke-RestMethod -Method Post -Uri "$apiUrl/functions/v1/loyalty-transact" -Headers $functionHeaders -ContentType 'application/json' -Body $stampBody
  if ($stamp.loyalty.progressStamps -ne 1) { throw 'Secure stamp integration result was incorrect.' }

  try {
    Invoke-RestMethod -Method Post -Uri "$apiUrl/functions/v1/loyalty-transact" -Headers $functionHeaders -ContentType 'application/json' -Body $stampBody | Out-Null
    throw 'Token replay was unexpectedly accepted.'
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw }
  }

  $expiredToken = New-ExpiredLoyaltyToken $serviceKey $userId $membershipId $businessId $programId
  try {
    Invoke-RestMethod -Method Post -Uri "$apiUrl/functions/v1/loyalty-transact" -Headers $functionHeaders -ContentType 'application/json' -Body (@{ token = $expiredToken; action = 'stamp'; idempotencyKey = [guid]::NewGuid().ToString() } | ConvertTo-Json) | Out-Null
    throw 'Expired token was unexpectedly accepted.'
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 410) { throw }
  }

  Write-Output 'secure loyalty Edge Function checks passed'
} finally {
  if ($businessId) {
    Invoke-RestMethod -Method Delete -Uri "$apiUrl/rest/v1/loyalty_transactions?business_id=eq.$businessId" -Headers $serviceHeaders | Out-Null
    Invoke-RestMethod -Method Delete -Uri "$apiUrl/rest/v1/businesses?id=eq.$businessId" -Headers $serviceHeaders | Out-Null
  }
  if ($userId) {
    Invoke-RestMethod -Method Delete -Uri "$apiUrl/auth/v1/admin/users/$userId" -Headers $jsonHeaders | Out-Null
  }
}
