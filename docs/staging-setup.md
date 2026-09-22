# SDS Local staging setup

Staging is a hosted rehearsal environment. Docker remains the fast local
workbench; staging is where OAuth providers, email, push notifications, and
share links can be tested together. Phone/SMS authentication is disabled until
it has a funded provider and a deliberate production plan.

## What is implemented in the repository

- `eas.json` maps the internal `preview` build profile to EAS's built-in
  `preview` environment. The variables in that environment set the app
  runtime to `staging`; Expo does not provide a custom environment name here.
- The web admin console at `/admin` is platform-admin-only and shows the
  connected environment, app counts, moderation work, operations health, and
  staging guardrails.
- The `SDS_STAGING_BILLING_LOCK` default is `true`. The console warns at 80%
  and treats 95% as the protective hold threshold. It never upgrades a plan or
  adds a payment method.
- Database and media observations are read through a security-definer admin
  function. Provider egress and monthly-active-user usage stay disconnected
  until a trusted provider usage feed is configured.

## Current staging state

- The hosted project has the checked-in schema applied, including the
  PostgREST grants required for the RLS-protected discovery and workspace
  tables.
- Native auth callbacks use `sdslocal://auth/callback`; no staging setting
  advertises a loopback URL.
- Expo's `preview` environment has the staging runtime variables. The current
  channel-bound iOS Preview build is
  `ddcab566-7139-4840-8068-3f31925eb496` (runtime `0.1.0`). Static artifact
  inspection confirmed Expo Notifications, Expo Location, Expo Task Manager,
  EAS Updates, the push entitlement, and the iOS `location` background mode.
  EAS has no Android Preview build artifact to inspect; Android configuration
  and OTA manifests declare background location, but an installed Android
  binary has not been physically verified.
- The five checked-in Edge Functions are deployed and active in staging:
  `finalize-business-image`, `loyalty-token`, `loyalty-transact`,
  `media-cleanup`, and `notification-dispatch`. Deployment uses a separate
  project-scoped Functions token with a seven-day expiry; it is stored only in
  the ignored root `.env` and is never committed.
- The demo fixture requires at least one staging profile. Create the first
  staging account, then apply `supabase/seed/demo-businesses.sql` so its demo
  businesses attach to that account.

## One-time provider setup

1. Create a Supabase staging project on the Free plan.
2. Record its project ref in `SDS_STAGING_SUPABASE_PROJECT_REF`.
3. Deploy the database migrations to that project. Do not point staging at the
   production project. Apply `supabase/seed/demo-businesses.sql` after the
   first staging account exists; the fixture intentionally attaches demo
   businesses to that account.
4. Deploy the web app to its generated HTTPS staging URL and set
   `SDS_STAGING_SITE_URL` to that URL.
5. Add the staging URL to Supabase Auth redirect allowlists and Google/Apple
   OAuth settings.
6. Put staging values in the hosting provider's server environment. Do not
   commit service-role keys or provider secrets.
7. Keep Stripe and phone/SMS authentication disabled, and use staging-only
   push credentials.

The `SUPABASE_ACCESS_TOKEN` created for this workflow is a management/CLI
credential. Keep it only in the ignored root `.env` or a deployment secret
store; never place it in `EXPO_PUBLIC_*`, `NEXT_PUBLIC_*`, mobile code, or a
browser bundle. Runtime clients use the staging project URL and its public
anon key instead.

The mobile `preview` build profile uses EAS's built-in `preview` environment
for the staging app. Set
`EXPO_PUBLIC_APP_ENV=staging`, `EXPO_PUBLIC_STAGING_SUPABASE_URL`, and
`EXPO_PUBLIC_STAGING_SUPABASE_ANON_KEY` in that EAS environment before making
an installable preview build. The web deployment uses the corresponding
`NEXT_PUBLIC_STAGING_*` variables.

The current staging schema was applied through the scoped Supabase Management
API token. Repeat that process with the idempotent helper when migrations
change:

```powershell
pwsh -NoProfile -File .\scripts\apply-staging-migrations.ps1
```

The helper reads the token only from the ignored root `.env`, applies files in
order, and never prints it. The API-generated migration versions are provider
timestamps, so the helper waits between submissions; do not treat a local
Docker database as staging.

Before exposing a hosted web deployment or enabling provider integrations, run
the no-write preflight from the repository root:

```powershell
pwsh -NoProfile -File .\scripts\staging-preflight.ps1
```

It requires an HTTPS staging URL and a distinct Supabase project ref, rejects
loopback URLs and payment identifiers, and refuses a disabled billing lock.
The database-only migration helper above can be used before a web host exists;
it does not create a project, change a plan, or add a payment method.

After the deployment is live, verify the public homepage and one known demo
business without putting credentials in the command:

```powershell
pnpm verify:staging-links -- --origin $env:SDS_STAGING_SITE_URL --slug <demo-slug> --business "<expected business name>"
```

The smoke check requires a public HTTPS origin, rejects local-only hosts, keeps
redirects on staging, expects an unknown business to return 404, and checks the
returned HTML for sensitive environment values available to the process. Set
`SDS_PRODUCTION_SITE_URL` when available so a redirect to that exact origin is
also rejected.

## Safety rules

- Never add a payment method or upgrade the staging Supabase organization.
- Keep `SDS_STAGING_BILLING_LOCK=true` and review the provider dashboard before
  enabling any paid integration.
- Treat the quota values in `.env.example` as configurable references, not a
  promise that provider limits cannot change.
- If the admin console says provider usage is disconnected, it is not safe to
  treat the displayed free-tier percentages as a billing guarantee.

## Account deletion release note

The mobile app includes an in-app account-deletion workflow backed by the
staging `delete-account` Edge Function. Google Play may additionally require a
public account-deletion information URL before store release. No approved
public domain exists yet, so that external URL remains a release prerequisite;
do not invent or publish one from a temporary host.

## Nearby mobile-business alerts release note

The staging-only nearby-alert phase is published on branch/channel `preview`,
runtime `0.1.0`, update group `14a34f5b-b5fa-45dd-b9a9-5b9a6eade38f`.
It uses on-device geofencing for followed mobile businesses and does not upload
a continuous customer location history. See
`docs/nearby-alerts-store-review.md` for permission disclosures, reviewer
instructions, and remaining store requirements.

## Mobile onboarding release note

The staging-only signup and business-onboarding phase is published on
branch/channel `preview`, runtime `0.1.0`, update group
`dfacf41e-021d-48f4-a0d8-dbd144b130a2`. It adds the polished guest/auth entry,
typed business-creation intent restoration, user-scoped 30-day business drafts,
four-stage fixed/service-area/mobile setup, concurrency-safe page-address
allocation, idempotent creation requests, and contextual publication readiness
inside the existing workspace. Migration
`20260919000500_resumable_business_onboarding.sql` is deployed only to staging.
