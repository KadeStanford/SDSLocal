$ErrorActionPreference = 'Stop'

$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$dbContainer = 'supabase_db_sds-local'
$supabaseUrl = 'http://127.0.0.1:54321'
$envPath = Join-Path $workspace 'supabase/.temp/start-secrets/supabase_edge_runtime_sds-local/env/docker.env'
$serviceKeyLine = Get-Content -LiteralPath $envPath | Where-Object { $_ -like 'SUPABASE_SERVICE_ROLE_KEY=*' } | Select-Object -First 1
if (-not $serviceKeyLine) { throw 'The local Supabase service key could not be found.' }
$serviceKey = $serviceKeyLine.Substring('SUPABASE_SERVICE_ROLE_KEY='.Length)

$downloadRoot = Join-Path $workspace '.codex-tmp/demo-stock'
New-Item -ItemType Directory -Force -Path $downloadRoot | Out-Null

$assets = @(
  @{ slug = 'demo-bayou-bloom'; role = 'cover'; variant = 'cover'; group = '11111111-1111-4111-8111-aaaaaaaaaaaa'; file = 'cover.jpg'; caption = 'A sunny table at Bayou & Bloom.'; url = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-bayou-bloom'; role = 'gallery'; variant = 'full'; group = '11111111-1111-4111-8111-bbbbbbbbbbbb'; file = 'gallery.jpg'; caption = 'Fresh pastries and a slow morning.'; url = 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-bayou-bloom'; role = 'gallery'; variant = 'full'; group = '11111111-1111-4111-8111-cccccccccccc'; file = 'gallery-2.jpg'; caption = 'A bright corner for catching up with friends.'; url = 'https://images.unsplash.com/photo-1511081692775-05d0f180a065?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-cypress-care'; role = 'cover'; variant = 'cover'; group = '22222222-2222-4222-8222-aaaaaaaaaaaa'; file = 'cover.jpg'; caption = 'A calm, finished home interior.'; url = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-cypress-care'; role = 'gallery'; variant = 'full'; group = '22222222-2222-4222-8222-bbbbbbbbbbbb'; file = 'gallery.jpg'; caption = 'Tools ready for the next small repair.'; url = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-lantern-row'; role = 'cover'; variant = 'cover'; group = '33333333-3333-4333-8333-aaaaaaaaaaaa'; file = 'cover.jpg'; caption = 'Handmade goods at Lantern Row Market.'; url = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-lantern-row'; role = 'gallery'; variant = 'full'; group = '33333333-3333-4333-8333-bbbbbbbbbbbb'; file = 'gallery.jpg'; caption = 'A colorful shelf of local finds.'; url = 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-lantern-row'; role = 'gallery'; variant = 'full'; group = '33333333-3333-4333-8333-cccccccccccc'; file = 'gallery-2.jpg'; caption = 'Texture and color from regional makers.'; url = 'https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-magnolia-room'; role = 'cover'; variant = 'cover'; group = '44444444-4444-4444-8444-aaaaaaaaaaaa'; file = 'cover.jpg'; caption = 'The Magnolia Room stage before doors open.'; url = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-magnolia-room'; role = 'gallery'; variant = 'full'; group = '44444444-4444-4444-8444-bbbbbbbbbbbb'; file = 'gallery.jpg'; caption = 'Live music under warm lights.'; url = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-magnolia-room'; role = 'gallery'; variant = 'full'; group = '44444444-4444-4444-8444-cccccccccccc'; file = 'gallery-2.jpg'; caption = 'A close-up of the room before the show.'; url = 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-magnolia-room'; role = 'gallery'; variant = 'full'; group = '44444444-4444-4444-8444-dddddddddddd'; file = 'gallery-3.jpg'; caption = 'The crowd settling in for the first set.'; url = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-northshore-makers'; role = 'cover'; variant = 'cover'; group = '55555555-5555-4555-8555-aaaaaaaaaaaa'; file = 'cover.jpg'; caption = 'Northshore Makers Guild studio space.'; url = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80' },
  @{ slug = 'demo-northshore-makers'; role = 'gallery'; variant = 'full'; group = '55555555-5555-4555-8555-bbbbbbbbbbbb'; file = 'gallery.jpg'; caption = 'A workbench ready for a new project.'; url = 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1600&q=80' }
  ,@{ slug = 'demo-northshore-makers'; role = 'gallery'; variant = 'full'; group = '55555555-5555-4555-8555-cccccccccccc'; file = 'gallery-2.jpg'; caption = 'Tools and materials arranged for class.'; url = 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1400&q=80' }
  ,@{ slug = 'demo-northshore-makers'; role = 'gallery'; variant = 'full'; group = '55555555-5555-4555-8555-dddddddddddd'; file = 'gallery-3.jpg'; caption = 'A maker shaping the next piece.'; url = 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=80' }
  ,@{ slug = 'demo-northshore-makers'; role = 'gallery'; variant = 'full'; group = '55555555-5555-4555-8555-eeeeeeeeeeee'; file = 'gallery-4.jpg'; caption = 'Finished work ready for the community wall.'; url = 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1000&q=80' }
  ,@{ slug = 'demo-roaming-roots'; role = 'cover'; variant = 'cover'; group = '66666666-6666-4666-8666-aaaaaaaaaaaa'; file = 'cover.jpg'; caption = 'Roaming Roots Food Truck at a neighborhood stop.'; url = 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&w=1600&q=80' }
  ,@{ slug = 'demo-roaming-roots'; role = 'gallery'; variant = 'full'; group = '66666666-6666-4666-8666-bbbbbbbbbbbb'; file = 'gallery.jpg'; caption = 'Fresh bowls and seasonal toppings ready to order.'; url = 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1600&q=80' }
  ,@{ slug = 'demo-roaming-roots'; role = 'gallery'; variant = 'full'; group = '66666666-6666-4666-8666-cccccccccccc'; file = 'gallery-2.jpg'; caption = 'A bright lunch spread for the next stop.'; url = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80' }
  ,@{ slug = 'demo-cane-clove'; role = 'cover'; variant = 'cover'; group = '77777777-7777-4777-8777-aaaaaaaaaaaa'; file = 'cover.jpg'; caption = 'Dinner service at Cane & Clove Kitchen.'; url = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80' }
  ,@{ slug = 'demo-cane-clove'; role = 'gallery'; variant = 'full'; group = '77777777-7777-4777-8777-bbbbbbbbbbbb'; file = 'gallery.jpg'; caption = 'A warm table set for a neighborhood dinner.'; url = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80' }
)

$headers = @{ Authorization = "Bearer $serviceKey"; apikey = $serviceKey; 'x-upsert' = 'true' }
$profileId = (& docker exec $dbContainer psql -U postgres -d postgres -Atqc "select id::text from public.profiles order by created_at limit 1").Trim()
if (-not $profileId) { throw 'No local profile was found for demo media ownership.' }

foreach ($asset in $assets) {
  $businessId = (& docker exec $dbContainer psql -U postgres -d postgres -Atqc "select id::text from public.businesses where slug = '$($asset.slug)'").Trim()
  if (-not $businessId) { throw "Demo business $($asset.slug) was not found. Run demo-businesses.sql first." }

  $businessDir = Join-Path $downloadRoot $asset.slug
  New-Item -ItemType Directory -Force -Path $businessDir | Out-Null
  $localFile = Join-Path $businessDir $asset.file
  Invoke-WebRequest -Uri $asset.url -OutFile $localFile -UserAgent 'SDS Local demo data seeder'

  $storageFile = if ($asset.role -eq 'cover') { 'demo-cover.jpg' } else { "demo-$([IO.Path]::GetFileNameWithoutExtension($asset.file)).jpg" }
  $storagePath = "$businessId/$storageFile"
  $uploadUri = "$supabaseUrl/storage/v1/object/business-media/$storagePath"
  Invoke-RestMethod -Uri $uploadUri -Method Post -Headers $headers -ContentType 'image/jpeg' -InFile $localFile | Out-Null

  $fileInfo = Get-Item -LiteralPath $localFile
  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $localFile).Hash.ToLowerInvariant()
  $sqlCaption = $asset.caption.Replace("'", "''")
  $assetSql = @"
insert into public.media_assets (
  asset_group_id, business_id, uploaded_by, storage_path, role, variant, status,
  mime_type, width, height, byte_size, content_hash, alt_text, ready_at
) values (
  '$($asset.group)'::uuid, '$businessId'::uuid, '$profileId'::uuid, '$storagePath',
  '$($asset.role)'::public.photo_role, '$($asset.variant)'::public.media_variant,
  'ready', 'image/jpeg', 1600, 1067, $($fileInfo.Length), '$hash', '$sqlCaption', now()
)
on conflict (storage_path) do update set
  business_id = excluded.business_id,
  uploaded_by = excluded.uploaded_by,
  role = excluded.role,
  variant = excluded.variant,
  status = 'ready',
  mime_type = excluded.mime_type,
  width = excluded.width,
  height = excluded.height,
  byte_size = excluded.byte_size,
  content_hash = excluded.content_hash,
  alt_text = excluded.alt_text,
  ready_at = now();
"@
  & docker exec $dbContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c $assetSql | Out-Null

  $assetId = (& docker exec $dbContainer psql -U postgres -d postgres -Atqc "select id::text from public.media_assets where storage_path = '$storagePath'").Trim()
  $displayOrder = if ($asset.role -eq 'cover') { 0 } else {
    $match = [regex]::Match($asset.file, 'gallery-(\d+)\.')
    if ($match.Success) { [int]$match.Groups[1].Value } else { 1 }
  }
  $photoSql = @"
insert into public.business_photos (business_id, media_asset_id, role, caption, display_order)
values ('$businessId'::uuid, '$assetId'::uuid, '$($asset.role)'::public.photo_role, '$sqlCaption', $displayOrder)
on conflict (business_id, media_asset_id) do update set
  role = excluded.role,
  caption = excluded.caption,
  display_order = excluded.display_order;
"@
  & docker exec $dbContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c $photoSql | Out-Null
  Write-Output "Seeded $($asset.slug) $($asset.role) image."
}

# A handful of menu item images make the small, medium, and large restaurant
# fixtures feel distinct on the public menu. These are optional demo assets and
# use the same storage/metadata path as real offering uploads.
$menuAssets = @(
  @{ slug = 'demo-bayou-bloom'; item = 'Shrimp & grits'; group = '71111111-1111-4111-8111-aaaaaaaaaaaa'; file = 'shrimp-grits.jpg'; caption = 'Creamy grits with Gulf shrimp and pepper relish.'; url = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80' },
  @{ slug = 'demo-bayou-bloom'; item = 'Porch brunch board'; group = '71111111-1111-4111-8111-bbbbbbbbbbbb'; file = 'brunch-board.jpg'; caption = 'A relaxed brunch board with seasonal fruit and biscuits.'; url = 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1200&q=80' },
  @{ slug = 'demo-bayou-bloom'; item = 'Seasonal latte'; group = '71111111-1111-4111-8111-cccccccccccc'; file = 'seasonal-latte.jpg'; caption = 'A seasonal latte finished with house-made syrup.'; url = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80' },
  @{ slug = 'demo-bayou-bloom'; item = 'Half muffuletta'; group = '71111111-1111-4111-8111-dddddddddddd'; file = 'muffuletta.jpg'; caption = 'A pressed muffuletta with olive salad and provolone.'; url = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80' },
  @{ slug = 'demo-bayou-bloom'; item = 'Beignet flight'; group = '71111111-1111-4111-8111-eeeeeeeeeeee'; file = 'beignet-flight.jpg'; caption = 'Warm beignets with rotating dipping sauces.'; url = 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80' },
  @{ slug = 'demo-roaming-roots'; item = 'Citrus grain bowl'; group = '72222222-2222-4222-8222-aaaaaaaaaaaa'; file = 'citrus-bowl.jpg'; caption = 'A bright grain bowl built from market vegetables.'; url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80' },
  @{ slug = 'demo-roaming-roots'; item = 'Cuban-inspired press'; group = '72222222-2222-4222-8222-bbbbbbbbbbbb'; file = 'cuban-press.jpg'; caption = 'A hot-pressed sandwich with pork, pickle, and mustard.'; url = 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=1200&q=80' },
  @{ slug = 'demo-roaming-roots'; item = 'Cold brew'; group = '72222222-2222-4222-8222-cccccccccccc'; file = 'cold-brew.jpg'; caption = 'Smooth cold brew ready for the road.'; url = 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80' },
  @{ slug = 'demo-cane-clove'; item = 'Smoked chicken supper'; group = '73333333-3333-4333-8333-aaaaaaaaaaaa'; file = 'smoked-chicken.jpg'; caption = 'Smoked chicken with greens and skillet cornbread.'; url = 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1200&q=80' },
  @{ slug = 'demo-cane-clove'; item = 'Blackened catfish'; group = '73333333-3333-4333-8333-bbbbbbbbbbbb'; file = 'blackened-catfish.jpg'; caption = 'Blackened catfish with dirty rice and rémoulade.'; url = 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80' }
)

foreach ($asset in $menuAssets) {
  $businessId = (& docker exec $dbContainer psql -U postgres -d postgres -Atqc "select id::text from public.businesses where slug = '$($asset.slug)'").Trim()
  if (-not $businessId) { throw "Demo business $($asset.slug) was not found. Run demo-businesses.sql first." }

  $businessDir = Join-Path $downloadRoot $asset.slug
  New-Item -ItemType Directory -Force -Path $businessDir | Out-Null
  $localFile = Join-Path $businessDir $asset.file
  Invoke-WebRequest -Uri $asset.url -OutFile $localFile -UserAgent 'SDS Local demo data seeder'
  $storagePath = "$businessId/menu/$($asset.group)/card.jpg"
  Invoke-RestMethod -Uri "$supabaseUrl/storage/v1/object/business-media/$storagePath" -Method Post -Headers $headers -ContentType 'image/jpeg' -InFile $localFile | Out-Null

  $fileInfo = Get-Item -LiteralPath $localFile
  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $localFile).Hash.ToLowerInvariant()
  $sqlCaption = $asset.caption.Replace("'", "''")
  $assetSql = @"
insert into public.media_assets (
  asset_group_id, business_id, uploaded_by, storage_path, role, variant, status,
  mime_type, width, height, byte_size, content_hash, alt_text, ready_at
) values (
  '$($asset.group)'::uuid, '$businessId'::uuid, '$profileId'::uuid, '$storagePath',
  'offering'::public.photo_role, 'card'::public.media_variant,
  'ready', 'image/jpeg', 1200, 800, $($fileInfo.Length), '$hash', '$sqlCaption', now()
)
on conflict (storage_path) do update set
  business_id = excluded.business_id,
  uploaded_by = excluded.uploaded_by,
  role = excluded.role,
  variant = excluded.variant,
  status = 'ready',
  mime_type = excluded.mime_type,
  width = excluded.width,
  height = excluded.height,
  byte_size = excluded.byte_size,
  content_hash = excluded.content_hash,
  alt_text = excluded.alt_text,
  ready_at = now();
"@
  & docker exec $dbContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c $assetSql | Out-Null
  $assetId = (& docker exec $dbContainer psql -U postgres -d postgres -Atqc "select id::text from public.media_assets where storage_path = '$storagePath'").Trim()
  $itemName = $asset.item.Replace("'", "''")
  & docker exec $dbContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c "update public.offering_items item set media_asset_id = '$assetId'::uuid, updated_at = now() from public.businesses business where item.business_id = business.id and business.slug = '$($asset.slug)' and item.name = '$itemName';" | Out-Null
  Write-Output "Seeded $($asset.slug) menu item '$($asset.item)' image."
}

$eventAssets = @(
  @{ slug = 'demo-bayou-bloom'; eventSlug = 'first-friday-coffee'; kind = 'cover'; variant = 'event_card'; group = '61111111-1111-4111-8111-aaaaaaaaaaaa'; file = 'event-cover.jpg'; caption = 'Coffee flight setup before the doors open.'; url = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80' },
  @{ slug = 'demo-bayou-bloom'; eventSlug = 'first-friday-coffee'; kind = 'gallery'; variant = 'full'; group = '61111111-1111-4111-8111-bbbbbbbbbbbb'; file = 'event-gallery.jpg'; caption = 'A tasting flight ready for guests.'; url = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1400&q=80' },
  @{ slug = 'demo-cypress-care'; eventSlug = 'home-maintenance-clinic'; kind = 'cover'; variant = 'event_card'; group = '62222222-2222-4222-8222-aaaaaaaaaaaa'; file = 'event-cover.jpg'; caption = 'Tools and checklists for the home clinic.'; url = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=80' },
  @{ slug = 'demo-cypress-care'; eventSlug = 'home-maintenance-clinic'; kind = 'gallery'; variant = 'full'; group = '62222222-2222-4222-8222-bbbbbbbbbbbb'; file = 'event-gallery.jpg'; caption = 'A practical demonstration in progress.'; url = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80' },
  @{ slug = 'demo-lantern-row'; eventSlug = 'maker-saturday'; kind = 'cover'; variant = 'event_card'; group = '63333333-3333-4333-8333-aaaaaaaaaaaa'; file = 'event-cover.jpg'; caption = 'Maker Saturday tables set for browsing.'; url = 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1400&q=80' },
  @{ slug = 'demo-lantern-row'; eventSlug = 'maker-saturday'; kind = 'gallery'; variant = 'full'; group = '63333333-3333-4333-8333-bbbbbbbbbbbb'; file = 'event-gallery.jpg'; caption = 'Handmade pieces from this month''s makers.'; url = 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=1400&q=80' },
  @{ slug = 'demo-magnolia-room'; eventSlug = 'friday-listening-room'; kind = 'cover'; variant = 'event_card'; group = '64444444-4444-4444-8444-aaaaaaaaaaaa'; file = 'event-cover.jpg'; caption = 'The listening room stage before the first set.'; url = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80' },
  @{ slug = 'demo-magnolia-room'; eventSlug = 'friday-listening-room'; kind = 'gallery'; variant = 'full'; group = '64444444-4444-4444-8444-bbbbbbbbbbbb'; file = 'event-gallery.jpg'; caption = 'Warm lights over a live set.'; url = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=80' },
  @{ slug = 'demo-northshore-makers'; eventSlug = 'open-studio'; kind = 'cover'; variant = 'event_card'; group = '65555555-5555-4555-8555-aaaaaaaaaaaa'; file = 'event-cover.jpg'; caption = 'Open studio tools ready for visitors.'; url = 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1400&q=80' },
  @{ slug = 'demo-northshore-makers'; eventSlug = 'open-studio'; kind = 'gallery'; variant = 'full'; group = '65555555-5555-4555-8555-bbbbbbbbbbbb'; file = 'event-gallery.jpg'; caption = 'A finished project on the community wall.'; url = 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1400&q=80' }
  ,@{ slug = 'demo-roaming-roots'; eventSlug = 'downtown-bowl-pop-up'; kind = 'cover'; variant = 'event_card'; group = '66666666-6666-4666-8666-dddddddddddd'; file = 'event-cover.jpg'; caption = 'The truck is ready for the downtown lunch rush.'; url = 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&w=1400&q=80' }
  ,@{ slug = 'demo-roaming-roots'; eventSlug = 'downtown-bowl-pop-up'; kind = 'gallery'; variant = 'full'; group = '66666666-6666-4666-8666-eeeeeeeeeeee'; file = 'event-gallery.jpg'; caption = 'A colorful bowl assembled fresh at the stop.'; url = 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1400&q=80' }
  ,@{ slug = 'demo-roaming-roots'; eventSlug = 'market-brunch-run'; kind = 'cover'; variant = 'event_card'; group = '66666666-6666-4666-8666-ffffffffffff'; file = 'event-cover.jpg'; caption = 'Saturday service at the farmers market.'; url = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80' }
  ,@{ slug = 'demo-roaming-roots'; eventSlug = 'market-brunch-run'; kind = 'gallery'; variant = 'full'; group = '66666666-6666-4666-8666-999999999999'; file = 'event-gallery.jpg'; caption = 'Cold brew and pressed sandwiches for market morning.'; url = 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1400&q=80' }
)

foreach ($asset in $eventAssets) {
  $businessId = (& docker exec $dbContainer psql -U postgres -d postgres -Atqc "select id::text from public.businesses where slug = '$($asset.slug)'").Trim()
  $eventId = (& docker exec $dbContainer psql -U postgres -d postgres -Atqc "select id::text from public.events where business_id = '$businessId'::uuid and slug = '$($asset.eventSlug)'").Trim()
  if (-not $businessId -or -not $eventId) { throw "Demo event $($asset.slug)/$($asset.eventSlug) was not found. Run demo-businesses.sql first." }
  $eventDir = Join-Path $downloadRoot $asset.slug
  New-Item -ItemType Directory -Force -Path $eventDir | Out-Null
  $localFile = Join-Path $eventDir $asset.file
  Invoke-WebRequest -Uri $asset.url -OutFile $localFile -UserAgent 'SDS Local demo data seeder'
  $storagePath = "$businessId/$($asset.group)/$($asset.variant).jpg"
  Invoke-RestMethod -Uri "$supabaseUrl/storage/v1/object/business-media/$storagePath" -Method Post -Headers $headers -ContentType 'image/jpeg' -InFile $localFile | Out-Null
  $fileInfo = Get-Item -LiteralPath $localFile
  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $localFile).Hash.ToLowerInvariant()
  $sqlCaption = $asset.caption.Replace("'", "''")
  $assetSql = @"
insert into public.media_assets (
  asset_group_id, business_id, uploaded_by, storage_path, role, variant, status,
  mime_type, width, height, byte_size, content_hash, alt_text, ready_at
) values (
  '$($asset.group)'::uuid, '$businessId'::uuid, '$profileId'::uuid, '$storagePath',
  'event'::public.photo_role, '$($asset.variant)'::public.media_variant,
  'ready', 'image/jpeg', 1400, 933, $($fileInfo.Length), '$hash', '$sqlCaption', now()
)
on conflict (storage_path) do update set
  status = 'ready', byte_size = excluded.byte_size, content_hash = excluded.content_hash,
  alt_text = excluded.alt_text, ready_at = now();
"@
  & docker exec $dbContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c $assetSql | Out-Null
  $assetId = (& docker exec $dbContainer psql -U postgres -d postgres -Atqc "select id::text from public.media_assets where storage_path = '$storagePath'").Trim()
  if ($asset.kind -eq 'cover') {
    & docker exec $dbContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c "update public.events set media_asset_id = '$assetId'::uuid, updated_at = now() where id = '$eventId'::uuid;" | Out-Null
  } else {
    $photoSql = @"
insert into public.event_photos (event_id, media_asset_id, caption, display_order)
values ('$eventId'::uuid, '$assetId'::uuid, '$sqlCaption', 1)
on conflict (event_id, media_asset_id) do update set caption = excluded.caption;
"@
    & docker exec $dbContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c $photoSql | Out-Null
  }
  Write-Output "Seeded $($asset.slug) event $($asset.kind) image."
}

Remove-Item -LiteralPath $downloadRoot -Recurse -Force
Write-Output 'Demo stock media seed complete.'
