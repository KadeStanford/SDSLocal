# Phase 0 foundation

## Decisions

- One pnpm workspace contains the Expo mobile app, Next.js web app, shared TypeScript packages, and Supabase source.
- Node 24 LTS and pnpm 11 are the supported local and CI toolchain.
- Expo uses SDK 57, Expo Router, continuous native generation, and `expo-dev-client`; EAS is configured but intentionally not linked to an account in source control.
- Next.js uses the App Router. Workspace packages ship TypeScript source and are compiled by the app bundlers.
- Supabase owns authentication, PostgreSQL/PostGIS data, storage metadata, RLS, and server-validated privileged operations.
- Staging and production use separate Supabase projects, Expo/EAS environments, web deployments, and secrets.
- Client applications receive only public URL/anon-key values. Service-role, payment, signing, and webhook secrets are server-only.
- Images are preprocessed into a small fixed variant set. Originals are temporary and are not retained during normal operation.
- Analytics use short-retention recent events plus durable daily aggregates.

## Account-linked work intentionally deferred

These steps require SDS-owned accounts or irreversible external choices and are not guessed in source control:

1. Create and link staging and production Supabase projects.
2. Run `eas init` to attach the mobile app to the SDS Expo organization.
3. Replace provisional iOS/Android identifiers if SDS selects a different registered namespace.
4. Configure the final domain, Apple associated-domain file, and Android Digital Asset Links file.
5. Add deployment secrets in Supabase, EAS, and the web host.
6. Enable provider billing alerts and quota caps described in `cost-and-storage-budgets.md`.

## Definition of done for Phase 0

- Root install produces one lockfile.
- `pnpm validate` passes.
- `pnpm db:start` and `pnpm db:reset` apply all migrations on a machine with Docker.
- The mobile app passes Expo Doctor and can start in a development client.
- The web app produces a production build.
- Staging and production configuration is documented and no secret is committed.
