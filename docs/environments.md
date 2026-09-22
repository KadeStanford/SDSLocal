# Environments and secrets

## Isolation model

| Concern               | Local            | Staging                                                         | Production                   |
| --------------------- | ---------------- | --------------------------------------------------------------- | ---------------------------- |
| Database/Auth/Storage | Supabase CLI     | Dedicated Supabase project                                      | Dedicated Supabase project   |
| Web                   | localhost        | Preview/staging deployment                                      | Production deployment        |
| Mobile                | local dev client | EAS `preview` environment with `EXPO_PUBLIC_APP_ENV=staging`    | EAS `production` environment |
| Domain                | localhost        | HTTPS host when web is deployed; native auth uses `sdslocal://` | final public domain          |

Never point staging clients at production data. Database migrations flow local → staging → production and should not be edited after production application.

## Variable rules

- `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values are bundled into clients and are never secrets.
- `SUPABASE_SERVICE_ROLE_KEY` is available only to trusted server runtimes and administrative jobs.
- Payment keys, webhook secrets, token-signing secrets, Apple/Google credentials, and Expo access tokens live in provider secret stores.
- `.env.local` files are ignored. Each app commits only `.env.example`.
- Production builds must use explicit provider environments; they must not depend on a developer's local files.

## Rotation and access

Grant the smallest practical access scope. Rotate a secret immediately after suspected exposure and at provider-recommended intervals. Document the owner and last rotation date in the SDS password manager rather than in Git.

## Staging free-tier guardrails

The web admin console at `/admin` is available to platform administrators. It
shows local, staging, and production as separate environment cards, but it only
reports live application metrics for the environment to which the deployment is
connected. It never places provider credentials in the browser.

Staging defaults to a billing lock and warning/hold thresholds. The guard is
deliberately protective rather than destructive: it warns at 80% and is intended
to pause optional staging-only operations at 95%, without automatically
upgrading a provider plan or adding a payment method. Database and storage
observations come from the connected Supabase project; egress and monthly-active
user values require a trusted provider usage feed before launch and are shown as
not connected until then.

Set the `SDS_STAGING_*` values in the server environment, never in a client
bundle. Re-check the provider's current free-tier limits before deploying; the
values in `.env.example` are safe defaults, not a billing contract.

## Square Sandbox pilot

Square functions require explicit server `APP_ENV=development` or `staging`,
`SQUARE_ENVIRONMENT=sandbox`, and the pinned API version `2026-09-16`.
Production is rejected in code. Staging additionally requires
`SQUARE_COMMERCE_ENABLED=true` and the business allowlist in the private
`platform_settings.square_commerce` rollout record. On September 20, 2026 the
staging setup task enabled these controls only for Bayou & Bloom Cafe
(`11111111-1111-4111-8111-111111111111`) after deploying the Square backend.
Do not expand the pilot allowlist or apply unrelated listing-billing migrations.
The application is `SDS Local Staging`; do not create a second provider app.
Credentials belong only in staging Edge Function secrets. Client environment
files need no new keys. See [the setup and deployment runbook](square-commerce.md).
