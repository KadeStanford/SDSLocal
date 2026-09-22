# SDS Local Business Platform

SDS Local is a QR-first local-business platform with a public Next.js web experience, an Expo mobile app, and a Supabase backend.

## Prerequisites

- Node.js 24 LTS
- pnpm 11
- Docker Desktop for the local Supabase stack
- An Expo account only when running EAS builds

## Start locally

```bash
pnpm install
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/mobile/.env.example apps/mobile/.env.local
pnpm db:start
pnpm dev:web
```

For a one-click startup on Windows, double-click `Start-SDSLocal.cmd` (or run
`pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1`). It starts Docker Desktop,
waits for the local Supabase containers, then builds and starts the Next.js and Expo Metro containers
in LAN mode. All three application layers are visible in Docker Desktop under the `sds-local-dev`
Compose project. It also handles Docker Desktop's Windows stale-socket failure by quarantining only
the two runtime socket directories; Docker images, containers, volumes, and project files are not
touched. Source code is bind-mounted for hot reload, and dependencies live in Docker-managed named
volumes. Because Docker Desktop's Linux VM does not forward Bonjour multicast to the Windows LAN,
the launcher also keeps a small Windows Bonjour proxy registration for `_expo._tcp` while Metro is
running. This is discovery plumbing only; Metro, Next.js, and Supabase remain containerized. The
registration is refreshed on every launch using the current LAN address. If an iPhone still does not
show `SDS Local`, confirm that the SDS Local development build has Local Network access enabled in
iOS Settings, then refresh its development-server list. Native EAS builds require the project to be
linked to an Expo account first; no Expo project ID or credentials are committed.

## Provision an SDS administrator

Business approvals use the explicit `public.platform_admins` allowlist. Provision administrators
only through a trusted database administration session—never from a browser or client app:

```sql
insert into public.platform_admins (user_id)
values ('USER_PROFILE_UUID')
on conflict do nothing;
```

Provision the local owner after the account exists, then repeat the same trusted step for staging
and production administrators in their respective projects. The seed file does not guess a user
ID or grant administrator access automatically.

## Repository map

- `apps/web` — public and business-facing Next.js application
- `apps/mobile` — iOS/Android Expo Router application
- `packages/*` — platform-neutral types, validation, logic, API helpers, tokens, and media policy
- `supabase` — local configuration, migrations, seed data, and Edge Functions
- `docs` — architecture, environment, cost, data, and operational decisions

## Quality gates

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

See `docs/phase-0-foundation.md` for the decisions and remaining account-linked setup.
