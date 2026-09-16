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

Run the development client separately with `pnpm dev:mobile`. Native EAS builds require the project to be linked to an Expo account first; no Expo project ID or credentials are committed.

## Provision an SDS administrator

Business approvals use the explicit `public.platform_admins` allowlist. Provision administrators
only through a trusted database administration session—never from a browser or client app:

```sql
insert into public.platform_admins (user_id)
values ('USER_PROFILE_UUID')
on conflict do nothing;
```

The local owner account created during development has already been provisioned. Staging and
production administrators must be added separately in their respective projects.

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
