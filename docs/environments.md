# Environments and secrets

## Isolation model

| Concern               | Local            | Staging                             | Production                   |
| --------------------- | ---------------- | ----------------------------------- | ---------------------------- |
| Database/Auth/Storage | Supabase CLI     | Dedicated Supabase project          | Dedicated Supabase project   |
| Web                   | localhost        | Preview/staging deployment          | Production deployment        |
| Mobile                | local dev client | EAS `preview`/`staging` environment | EAS `production` environment |
| Domain                | localhost        | staging subdomain                   | final public domain          |

Never point staging clients at production data. Database migrations flow local → staging → production and should not be edited after production application.

## Variable rules

- `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values are bundled into clients and are never secrets.
- `SUPABASE_SERVICE_ROLE_KEY` is available only to trusted server runtimes and administrative jobs.
- Payment keys, webhook secrets, token-signing secrets, Apple/Google credentials, and Expo access tokens live in provider secret stores.
- `.env.local` files are ignored. Each app commits only `.env.example`.
- Production builds must use explicit provider environments; they must not depend on a developer's local files.

## Rotation and access

Grant the smallest practical access scope. Rotate a secret immediately after suspected exposure and at provider-recommended intervals. Document the owner and last rotation date in the SDS password manager rather than in Git.
