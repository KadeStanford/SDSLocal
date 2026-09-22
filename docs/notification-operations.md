# Notification operations

SDS Local queues event, loyalty, and follower-update notifications in
`public.notification_deliveries`. The `notification-dispatch` Edge Function claims
those rows, sends them through Expo Push Service, records tickets/receipts, and
retries transient provider failures.

For local development, run `pnpm dev:dispatch` while the local Supabase stack is
running. It invokes the notification dispatcher every five minutes. Use
`pnpm dev:dispatch -- -Once` for an immediate one-shot run. The script reads the
local service-role key from `supabase status` at runtime; it never writes that
key to the repository. After the Edge Runtime has been recreated so it loads the
new cleanup function, add `--IncludeMediaCleanup` to run media cleanup hourly.

For hosted development or production, use Supabase Scheduler or another trusted
server-side scheduler. The hosted scheduler should keep the service-role key in
Supabase Vault rather than in the app or repository.

Never expose the service-role key to a mobile app, browser, or client-visible
environment variable.

Replaced media is handled separately by the same local runner when
`--IncludeMediaCleanup` is enabled. It claims only unreferenced assets whose grace
period has elapsed, removes their storage object, and then deletes the metadata
row.
