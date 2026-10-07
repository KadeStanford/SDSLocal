# Square Sandbox appointment staging status (September 28, 2026)

## Phase 1 payment gate

The existing Preview pickup release and staging Square flow satisfy the Phase 1
payment/refund/webhook prerequisite in the [Phase 2 work order](phase-2-square-appointments-work-order.md).
Staging order `d3a25301-58c8-45f4-9c49-427f2454a62a` has a Square payment ID,
a Square refund ID, and `refunded` status. It recorded a $3.50 USD payment at
2026-09-28 03:54 UTC and refund at 04:14 UTC. The signature-verified, processed
webhook inbox has `payment.created` (1), `payment.updated` (2), `refund.created`
(1), and `refund.updated` (1) events linked by the provider payment/refund IDs.
The Square Sandbox Default Test Account Dashboard independently shows the $3.50
cookie transaction at 10:54 p.m. and its $3.50 refund at 11:13 p.m. on
September 27, Chicago time. No production payment was used.

## Appointment release gate

The appointment schema exists in staging, but version `20260927000400` is absent
from `supabase_migrations.schema_migrations`. Connection setup now accepts the
separate appointment allowlist, while pickup availability, settings, quotes, and
checkout still require the pickup allowlist. The changed Square Edge Functions
were deployed to staging on September 28. After restoring the clean bundle from
a temporary diagnostic deployment, `square-commerce` v41 was read back as
active; `square-oauth-callback` v10, `square-webhook` v11, and
`square-maintenance` v14 remain active.

The `20260928050000_appointment_booking_rollout.sql` migration adds an explicit,
disabled rollout record. Its SQL was applied through the staging SQL Editor,
then the user approved allowing only Cypress & Co Home Care
(`22222222-2222-4222-8222-222222222222`) with `environment=staging`. The local
migration version was not added to staging migration history; a future migration
runner can apply the idempotent insert and record it. The follow-up
`20260928060000_fix_appointment_setup_scope.sql` migration was also applied
directly to staging but not added to migration history. It fixes an ambiguous
service variable in owner setup and grants `service_role` read access to
`business_hours`, both found through the live staging flow.

An isolated U.S. `SDS Local Appointment Test Seller` Sandbox account was created
with automatic app authorization off. The user approved its OAuth access to the
staging app. Cypress & Co Home Care is connected to that seller's sole location.
Its staging setup has one pay-in-person and one $2 fixed-deposit test service,
one resource, and weekly windows. The anonymous public endpoint lists the two
services, and availability returned 12 slots for September 29.

The pay-in-person guest booking confirmed without payment. Two concurrent
requests for one remaining slot produced one booking and one `SLOT_FULL`. Guest
rescheduling moved the first booking; the owner queue showed both appointments,
and owner check-in, start, and completion appeared in guest status. The extra
race booking was cancelled. The $2 deposit booking stayed `payment_pending`
until the user completed Square's hosted Sandbox testing panel. A processed
payment webhook then confirmed it. Guest cancellation moved it to
`cancellation_pending`; the owner issued a $2 Sandbox refund, and the appointment
became `cancelled/refunded` with `refunded_minor=200`. Its Square payment and
refund IDs link to five processed, signature-verified inbox events:
`payment.created` (1), `payment.updated` (2), `refund.created` (1), and
`refund.updated` (1). The dedicated seller Dashboard shows the $2 deposit and
refund on September 28. Temporarily closing booking removed the public
capability while preserving all three appointments; booking was restored.

Owner disconnect returned success; a new paid booking then returned `RECONNECT`
before reserving a slot. The owner reconnected the same Sandbox seller through
OAuth and selected its location again. The new
`20260928070000_appointment_connection_capability.sql` migration makes the public
booking capability depend on that connected, selected location, so disconnect
also removes the app CTA. It was applied directly to staging, without adding a
migration-history row. A transactional regression verified the CTA absent before
connection, present while connected, and absent after disconnect. The final
staging read shows connected location `LNHRV5ZWYJ368`, one public booking
capability, and all three test appointment records intact.

The staging backend and Square Sandbox flow passed the Preview OTA gate. The
`Add Square Sandbox appointment booking` update was published to branch/channel
and environment `preview` for Android and iOS on runtime `0.1.0`:
group `f2b397cb-8529-4d10-a937-f64185ce2afe`, Android update
`01a0e928-c2dc-7d62-8e86-fc52c7fc7d8a`, iOS update
`01a0e928-c2dc-7179-94a4-5bb5e315b3cd`. EAS read-back showed this as the
latest Preview group. No native configuration or dependencies changed.
Physical-device app verification remains a user-only check after the update.
Do not publish production.

Local focused checks passed: 65 Vitest tests across Square commerce/workspace,
appointment scheduling, and Square CSV menu import before the OAuth gate fix;
the changed Square commerce and scheduling tests passed 43/43 afterward. The
workspace test run passed all 438 mobile tests and all package test tasks. All eight workspace
typecheck tasks passed, as did Prettier on the recent menu/Stripe files. Docker
was unavailable, so the local SQL and database concurrency suites were not run
in this pass. The transactional `supabase/tests/square_appointments.sql` suite
passed against staging using confirmed fixture accounts before and after the
owner-setup and `business_hours` permission regression checks were added. Its
transaction rolled back; only the three deliberate end-to-end test appointments
remain.
