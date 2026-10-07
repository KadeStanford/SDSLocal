const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, 'supabase/seed/discovery-retail.json'), 'utf8'),
);
const env = (p) =>
  Object.fromEntries(
    fs
      .readFileSync(p, 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_0-9]+=/.test(l))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i), l.slice(i + 1).replace(/^['"]|['"]$/g, '')];
      }),
  );
const sqlString = (value) => "'" + String(value).replace(/'/g, "''") + "'";
const owner = '90000000-0000-4000-8000-000000000001';
const categorySlugs = {
  Boutiques: 'boutiques',
  'Clothing shops': 'clothing',
  'Gift shops': 'gift-shops',
  Florists: 'florists',
};
const rows = catalog.map((b) => ({ ...b, category_slug: categorySlugs[b.category] }));
const records = `jsonb_to_recordset(${sqlString(JSON.stringify(rows))}::jsonb) as d(id uuid,slug text,name text,category text,description text,latitude double precision,longitude double precision,color text,category_slug text)`;
const ids = catalog.map((b) => sqlString(b.id) + '::uuid').join(',');
const sql = `begin;
do $$ begin
 if not exists(select 1 from public.profiles where id='${owner}') then raise exception 'Existing staging demo owner required'; end if;
 if exists(select 1 from public.businesses where id in (${ids}) and slug not like 'demo-discovery-%') then raise exception 'Fixture ID collision'; end if;
end $$;
insert into public.categories(slug,name,business_type,display_order)
values ${Object.entries(categorySlugs)
  .map(([name, slug], i) => `(${sqlString(slug)},${sqlString(name)},'retail',${60 + i})`)
  .join(',')}
on conflict(slug) do nothing;
insert into public.businesses(id,created_by,slug,name,business_type,status,description,category_summary,city,region_code,postal_code,service_area_type,location,timezone,primary_color,accent_color,approved_at)
select d.id,'${owner}',d.slug,d.name,'retail','active',d.description || ' Demo business for staging discovery testing.',d.category,'Hammond','LA','70401','at_location',extensions.st_setsrid(extensions.st_makepoint(d.longitude,d.latitude),4326)::extensions.geography,'America/Chicago',d.color,'#176B4D',now() from ${records}
on conflict(id) do nothing;
insert into public.business_members(business_id,user_id,role,is_active) select d.id,'${owner}','owner',true from ${records} on conflict(business_id,user_id) do nothing;
insert into public.business_categories(business_id,category_id,is_primary) select d.id,c.id,true from ${records} join public.categories c on c.slug=d.category_slug on conflict(business_id,category_id) do nothing;
insert into public.business_hours(business_id,day_of_week,interval_number,opens_at,closes_at,is_closed) select d.id,day,1,'09:00'::time,'19:00'::time,false from ${records} cross join generate_series(0,6) day on conflict(business_id,day_of_week,interval_number) do nothing;
commit;`;
const output = path.join(root, '.codex-tmp/discovery-retail-seed');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'seed.sql'), sql);
async function main() {
  if (!process.argv.includes('--apply')) {
    console.log(
      `Prepared ${catalog.length} staging fixtures; use --apply to seed the configured staging project.`,
    );
    return;
  }
  const config = env(path.join(root, '.env')),
    mobile = env(path.join(root, 'apps/mobile/.env.local'));
  const ref = config.SDS_STAGING_SUPABASE_PROJECT_REF;
  if (
    !/^[a-z0-9]{8,40}$/.test(ref) ||
    config.SDS_STAGING_BILLING_LOCK !== 'true' ||
    mobile.EXPO_PUBLIC_SUPABASE_URL !== `https://${ref}.supabase.co`
  )
    throw Error('Staging environment guard failed');
  const api = `https://api.supabase.com/v1/projects/${ref}`;
  const headers = {
    Authorization: `Bearer ${config.SUPABASE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
  async function request(url, options) {
    const r = await fetch(url, { ...options, signal: AbortSignal.timeout(90000) });
    if (!r.ok) {
      const body = await r.text();
      throw Error(`Request failed HTTP ${r.status}: ${body.slice(0, 500)}`);
    }
    return r;
  }
  async function query(query) {
    return (
      await request(api + '/database/query', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
      })
    ).json();
  }
  const verify = async () => {
    const verification = await query(
      `select category_summary as category,count(*)::int as businesses,(select count(*)::int from public.business_photos where business_id in (${ids})) as photos from public.businesses where id in (${ids}) group by category_summary order by category_summary`,
    );
    console.log(JSON.stringify(verification));
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(verification, null, 2));
  };
  if (process.argv.includes('--verify')) {
    await verify();
    return;
  }
  await query(sql);
  const publicKey =
    mobile.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || mobile.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const session = await (
    await request(`https://${ref}.supabase.co/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: publicKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@demo.sdslocal.test',
        password: config.SDS_STAGING_DEMO_PASSWORD,
      }),
    })
  ).json();
  if (session.user?.id !== owner) throw Error('Unexpected demo owner');
  const storageHeaders = { Authorization: `Bearer ${session.access_token}`, apikey: publicKey };
  const sharp = require(process.env.SDS_FIXTURE_SHARP_MODULE || 'sharp');
  for (const b of catalog) {
    const monogram = b.name
      .split(/\s+/)
      .filter((s) => /^[A-Za-z]/.test(s))
      .slice(0, 2)
      .map((s) => s[0])
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="48" fill="${b.color}"/><rect x="16" y="16" width="224" height="224" rx="38" fill="none" stroke="#F4F2E9" stroke-opacity=".45" stroke-width="2"/><text x="128" y="145" text-anchor="middle" font-family="Georgia,serif" font-size="75" fill="#F4F2E9">${monogram}</text><text x="128" y="193" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" letter-spacing="3" fill="#F4F2E9">HAMMOND</text></svg>`;
    const cover = Buffer.from(
      await (
        await request(
          `https://images.unsplash.com/${b.photo}?fm=webp&fit=crop&w=1000&h=500&q=75`,
          {},
        )
      ).arrayBuffer(),
    );
    if (cover.length > 1000000 || cover.toString('ascii', 8, 12) !== 'WEBP')
      throw Error('Unexpected cover format');
    for (const role of ['cover', 'logo']) {
      const existing = await query(
        `select id from public.business_photos where business_id='${b.id}' and role='${role}'`,
      );
      if (existing.length) continue;
      const group = crypto.randomUUID();
      // Administrative fixture upload uses the same bounded intent function; no policy changes.
      await query(
        `select public.create_business_media_staging_intent('${owner}','${b.id}','${group}','${role}',null)`,
      );
      const variants = [];
      const definitions =
        role === 'cover'
          ? [{ name: 'cover', bytes: cover }]
          : await Promise.all(
              [
                ['logo_small', 128],
                ['logo_standard', 256],
                ['logo_high_density', 512],
              ].map(async ([name, size]) => ({
                name,
                bytes: await sharp(Buffer.from(svg))
                  .resize(size, size)
                  .webp({ quality: 88 })
                  .toBuffer(),
              })),
            );
      for (const variant of definitions) {
        const storagePath = `${owner}/${b.id}/${group}/${variant.name}.webp`;
        await request(`https://${ref}.supabase.co/storage/v1/object/media-staging/${storagePath}`, {
          method: 'POST',
          headers: { ...storageHeaders, 'Content-Type': 'image/webp' },
          body: variant.bytes,
        });
        variants.push({ path: storagePath, variant: variant.name });
      }
      await request(`https://${ref}.supabase.co/functions/v1/finalize-business-image`, {
        method: 'POST',
        headers: { ...storageHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: b.id,
          assetGroupId: group,
          role,
          altText: b.name + ' demo ' + role,
          variants,
        }),
      });
    }
    console.log(`Seeded ${b.name}: category, hours, cover, logo`);
  }
  await verify();
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
