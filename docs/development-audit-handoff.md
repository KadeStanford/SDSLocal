# SDS Local development and environment handoff

**Snapshot date:** 2026-09-18  
**Purpose:** factual orientation for an independent repository and deployment audit.

This document describes what is present in the repository and the environment model that has
been used during development. It is not an architectural approval or a claim that every listed
integration is production-ready. Provider dashboards, deployed artifacts, and runtime logs should
be treated as authoritative when they disagree with this document or another repository document.

## Repository in brief

SDS Local is a QR-oriented local-business platform in a pnpm monorepo.

- `apps/mobile` is an Expo SDK 57 / Expo Router iOS and Android application.
- `apps/web` is a Next.js App Router application for public business/event pages, account flows,
  and business administration.
- `packages/*` contains shared TypeScript types, validation, business logic, API helpers, design
  tokens, and image-processing policy.
- `supabase` contains local Supabase configuration, PostgreSQL migrations, seed data, Auth
  configuration, Edge Functions, email templates, and database tests.
- `docker` and `docker-compose.dev.yml` run the web and Metro development containers.
- `scripts` contains the Windows launcher, staging migration helper, staging preflight, local
  notification dispatcher, and local media seeding helper.
- `docs` contains architecture, environment, cost, native-capability, provider, and operational
  notes.

The intended data path is:

```text
Web or mobile client -> Supabase Auth/Postgres/Storage
                     -> RLS and trusted server code / Edge Functions
```

The repository supports separate local, staging, and production configurations. It does not
contain production credentials.

## Development timeline

The Git history begins on 2026-09-16. Events before the first commit are not represented in Git.
Dates below that are not commit dates are derived from repository configuration and deployment
records and should be independently verified.

| Period                          | Environment or change                                                                      | Resulting state                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-16                      | Repository initialized, then baseline established (`0912d13`, `449216b`).                  | Monorepo structure, Expo mobile app, Next.js web app, Supabase schema/migrations, local tooling, CI, and EAS configuration were added.                                                                                                                                                                                                                                                                      |
| 2026-09-16                      | Native business-management work committed (`6628546`).                                     | Mobile business workspace, business creation/editing, public pages, events, offerings, media, loyalty, staff, and account surfaces were expanded.                                                                                                                                                                                                                                                           |
| Initial development phase       | Local-first development.                                                                   | Supabase CLI/Docker supplied local Auth, Postgres, Storage, Studio, and SMTP. Next.js ran on the developer machine/container at port 3000. Expo Metro served a development client. Local seed files supplied development data.                                                                                                                                                                              |
| Feature and provider phase      | Auth and native capabilities were added.                                                   | Email/password and email-code flows, native Apple and Google paths, notifications, QR/share surfaces, media, calendar, camera, location, contacts, SQLite/NetInfo queue foundations, haptics, biometrics package support, printing, and other Expo packages were added at different times. Package presence does not mean every provider or product flow is enabled.                                        |
| Staging transition              | A hosted Supabase project was introduced for rehearsal testing.                            | The staging project reference currently recorded in the admin view is `lgddhdexvwclfrnzjtly`. Migrations and staging configuration were applied separately from the local Supabase stack. Auth/provider testing moved toward the hosted project.                                                                                                                                                            |
| Staging mobile delivery         | EAS `preview` became the mobile staging profile.                                           | `apps/mobile/eas.json` maps `preview` to the EAS `preview` environment and the preview environment is intended to set `EXPO_PUBLIC_APP_ENV=staging` plus staging Supabase variables. `expo-updates` is configured with runtime version policy `appVersion` and an EAS Update URL.                                                                                                                           |
| Local development after staging | Docker web and Metro remain the local source workbench while clients can use staging data. | The browser URL remains `http://localhost:3000` because the browser is on the development computer. The phone-facing Metro endpoint must use the active LAN address, not localhost. The current launcher has observed `192.168.1.63:8081`; this address is dynamic.                                                                                                                                         |
| Current snapshot                | UI-only mobile changes are delivered through EAS OTA.                                      | Nearby mobile-business alerts and the 1–25 mile distance slider were published to EAS channel/branch `preview`, environment `preview`/app environment `staging`, runtime `0.1.0`, latest update group `14a34f5b-b5fa-45dd-b9a9-5b9a6eade38f`. The current channel-bound iOS Preview build is `ddcab566-7139-4840-8068-3f31925eb496`; no Android Preview build artifact exists in EAS to physically inspect. |

## Environment and server inventory

“Active” means the component is currently used by the documented launcher/configuration or was
observed during the latest development session. “Configured but not deployed” means source/config
exists but there is no evidence here of a live deployment. “Not used” means intentionally disabled
or no longer the selected path.

| Component                          | Local development                                                                                                | Staging / preview                                                                                                                                                                                   | Production                                                                                            | Status and audit notes                                                                                                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Supabase API/Auth/Postgres/Storage | Supabase CLI/Docker; API `54321`, DB `54322`, Studio `54323`, local SMTP `54324`.                                | Hosted Supabase project `lgddhdexvwclfrnzjtly`; public client URL/key are supplied through staging environment variables.                                                                           | Separate project is planned but no project reference is recorded in the checked-in examples.          | **Local active; staging active; production not connected.** Keep data and migrations isolated.                                                                                                                                                   |
| Next.js web                        | Docker Compose `web` service on host port `3000`; browser commonly opens `http://localhost:3000`.                | The local web process can query staging when its app environment is staging. A hosted HTTPS staging web deployment is not recorded as connected; the admin card currently shows no staging web URL. | No production deployment URL is recorded.                                                             | **Local active; staging web deployment not verified; production inactive.** `localhost` is acceptable for the browser on the development computer, not for phone links.                                                                          |
| Expo Metro                         | Docker Compose `mobile` service on port `8081` (plus Expo ports `19000–19002`).                                  | Not a hosted server; it is a local development transport for a development client.                                                                                                                  | Not used.                                                                                             | **Local active for development only.** `scripts/start-local.ps1` reads `docs/metro-lan-only.md`, requires `EXPO_HOST_IP`, verifies the manifest, starts Compose Watch, and registers Bonjour discovery. Phone URL must be `exp://<LAN-IP>:8081`. |
| Docker Compose Watch               | Syncs mobile source, assets, shared package source, and restarts/rebuilds for selected config/package changes.   | Not a staging deployment mechanism.                                                                                                                                                                 | Not used.                                                                                             | **Local active.** It provides source updates to Metro; it does not update an installed EAS binary.                                                                                                                                               |
| EAS native builds                  | Build profiles are defined in `apps/mobile/eas.json`.                                                            | `preview` profile is the intended installable staging build profile.                                                                                                                                | `production` profile exists in configuration.                                                         | **Preview configured and used; production profile configured but not used in the recorded work.** Native package/config changes require a new native build.                                                                                      |
| EAS Update / OTA                   | Not the local Metro transport.                                                                                   | `expo-updates` points at the EAS project and checks on load. The `preview` channel is the intended OTA channel for the preview build.                                                               | A `production` channel is configured in the mobile EAS file but no production deployment is recorded. | **Preview OTA active; production OTA not used.** An installed build must have the matching channel and runtime to receive an update.                                                                                                             |
| Supabase Edge Functions            | Function source is present; local invocation/deployment depends on the local Supabase stack or a trusted job.    | The documented active functions are `finalize-business-image`, `loyalty-token`, `loyalty-transact`, `media-cleanup`, and `notification-dispatch`.                                                   | No production function deployment is recorded.                                                        | **Staging functions reported active; verify each function and schedule independently.**                                                                                                                                                          |
| Supabase migrations                | Applied by `supabase db reset`/local CLI.                                                                        | Applied by `scripts/apply-staging-migrations.ps1` using a project-scoped management token kept outside Git.                                                                                         | Intended to flow after staging review; not recorded as applied.                                       | **Local and staging paths exist; production not verified.** Migration history and PostgREST schema cache should be audited.                                                                                                                      |
| Supabase seed data                 | `supabase/seed/seed.sql` is the automatic local seed. `supabase/seed/demo-businesses.sql` is a separate fixture. | Demo fixture attaches businesses to an existing staging profile and must be applied deliberately.                                                                                                   | Not used.                                                                                             | **Local seed active; staging demo fixture optional; production seed not used.**                                                                                                                                                                  |
| Admin console                      | Next.js `/admin` route served by the local web service.                                                          | Reads staging metrics when the connected environment is staging; access is checked against `public.platform_admins`.                                                                                | No connected production deployment.                                                                   | **Local UI active; staging data path active through local UI; hosted admin deployment not verified.**                                                                                                                                            |
| Local SMTP                         | Supabase local SMTP on port `54324`; local auth email links/codes can be inspected there.                        | Hosted provider email is used instead.                                                                                                                                                              | Provider email not documented as connected.                                                           | **Local active; staging/provider delivery must be audited separately.**                                                                                                                                                                          |

## Auth and provider status

| Capability                    | Current repository/config status                                                                                                                                                                                                      | Classification                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Email/password and email code | Implemented in web and mobile through Supabase Auth.                                                                                                                                                                                  | **Active path; test local and staging separately.**                                                                                 |
| Native Sign in with Apple     | `expo-apple-authentication` and the iOS capability are configured. The native flow uses the app bundle ID as the accepted audience. Browser Apple OAuth additionally needs a Services ID/client secret.                               | **Native staging path reported working; browser path requires separate provider settings. Verify in Apple Developer and Supabase.** |
| Native Google sign-in/linking | `@react-native-google-signin/google-signin` is installed and native client IDs/scheme are read from environment variables. Supabase uses the Google web client ID/secret for provider exchange.                                       | **Configured and exercised in preview; verify client IDs, signing certificates, channel, and provider settings.**                   |
| Phone/SMS authentication      | Phone auth is explicitly disabled in `supabase/config.toml` and staging notes. Twilio is not a configured runtime provider. Business records still have phone fields and public phone-call links; those are unrelated to phone login. | **Not used / disabled for authentication.**                                                                                         |
| Biometrics                    | `expo-local-authentication` is installed for native capability support. The current product flow intentionally does not expose an app lock, workspace lock, scanner prompt, or biometric sign-in control.                             | **Package present; product flow disabled.**                                                                                         |
| Push notifications            | `expo-notifications` and notification Edge Function/source are present. Provider credentials, device-token delivery, and staging scheduling need independent verification.                                                            | **Code/config present; delivery readiness not established by this handoff.**                                                        |
| Stripe                        | `@stripe/stripe-react-native` is included and native-ready. Publishable key, PaymentIntent/webhook server flow, merchant settings, and payment UI are not configured in the checked-in examples.                                      | **Installed but disabled / not a payment system yet.**                                                                              |
| Audio/video                   | `expo-audio` and `expo-video` are installed for planned media work. No complete media schema/product flow is documented as active.                                                                                                    | **Installed for planned work; not an active feature.**                                                                              |
| Printing / QR poster          | `expo-print`, sharing, clipboard, QR rendering, and branded poster code are present. Share/print URLs must not use loopback addresses; a deployed HTTPS or reachable LAN base URL is required.                                        | **Code present; external URL/deployment readiness must be audited.**                                                                |
| NetInfo/offline scan queue    | NetInfo and SQLite are installed; native queue foundations exist. The queue must not grant rewards locally and should submit only when the server is reachable.                                                                       | **Foundation present; production workflow not verified.**                                                                           |
| Store review                  | `expo-store-review` is installed.                                                                                                                                                                                                     | **Available for later use; no active prompt policy recorded.**                                                                      |

## Current URLs and address rules

- Browser development UI: `http://localhost:3000` (host-computer-only).
- Local Supabase Studio: `http://localhost:54323` (host-computer-only).
- Phone-facing Metro: `exp://<active-LAN-IP>:8081`; the launcher currently detects the LAN address.
- Native auth callback: `sdslocal://auth/callback`.
- Public business/share URLs: should be HTTPS or another reachable non-loopback address. QR/share
  code intentionally rejects `localhost`, `127.0.0.1`, `0.0.0.0`, and `::1`.

The LAN-only rule is in `docs/metro-lan-only.md`. It is an operational constraint, not an
indication that the browser web server must be hosted remotely.

## Known audit points and possible inconsistencies

These are items to verify, not conclusions about defects:

1. `apps/mobile/eas.json` gives the preview profile an explicit `preview` channel, while the
   root `eas.json` preview profile does not. Confirm which file is used for every EAS command.
2. `docs/staging-setup.md` contains historical build/deployment wording. Confirm current EAS build
   IDs, update channel, runtime version, and remote environment variables in Expo rather than
   relying on that document.
3. The repository currently uses a local web process as the visible admin/browser surface. Confirm
   whether a real hosted HTTPS staging web deployment exists; the admin environment card has
   historically shown no connected staging web URL.
4. `.env.local`, the ignored root `.env`, and EAS environment variables are not represented by the
   checked-in examples. Audit their actual values without copying secrets into Git or this document.
5. Local Supabase config enables local Apple/Google provider blocks for development, while hosted
   staging provider settings are managed in the Supabase dashboard. Verify them separately.
6. The staging admin overview depends on a security-definer SQL function and PostgREST schema
   visibility. Verify migration history, grants, and schema-cache reload behavior after migrations.
7. The working tree contains many changes and generated/untracked files beyond the three recorded
   baseline commits. Use `git status`, the diff, and build artifacts to establish the intended
   release set before production work.
8. `expo-updates` can deliver JavaScript/assets only when the installed native binary has the
   matching update URL, channel, and runtime. Native package/config changes require a new build.
9. Staging free-tier guardrails display configured reference quotas, but provider egress and MAU
   feeds are not connected in the documented admin console. Do not treat displayed percentages as
   a provider billing guarantee until the usage source is verified.

## Suggested audit entry points

An independent audit can start with:

1. `package.json`, `pnpm-workspace.yaml`, `apps/mobile/package.json`, and `apps/web/package.json`.
2. `apps/mobile/app.config.ts`, `apps/mobile/eas.json`, and the EAS project/channel/runtime data.
3. `apps/mobile/src/lib/supabase.ts` and `apps/web/src/lib/supabase/config.ts` for environment
   selection.
4. `docker-compose.dev.yml`, `scripts/start-local.ps1`, and `docs/metro-lan-only.md` for local
   server behavior and phone reachability.
5. `supabase/config.toml`, all migrations, RLS policies, Edge Functions, and staging migration
   history.
6. Auth provider configuration in the Supabase staging dashboard, Apple Developer, Google Cloud,
   and EAS environment variables.
7. Admin access checks, staging quota logic, notification delivery, and the absence of secrets in
   client bundles.
8. An end-to-end test matrix covering local backend, staging backend, local Metro, preview EAS
   binary, OTA receipt, email verification callback, Apple/Google linking, business submission,
   public business links, and disabled phone authentication.
