# One coordinated rollout decision — assessment v5

This is the current review package. It supersedes the activation and unresolved
v4 deletion sections in `admin-rollout-decision.md` and
`admin-deletion-v4-review.md`; those frozen documents remain historical evidence.
No installation, server activation, commit, push, deployment or OTA is approved
or performed by this package. The old three-migration `apply-reviewed.sql` is
not the combined privacy installation plan.

## Pinned source and independent compatibility review

Use Git anchor `79af5590270e826aae8e4219ec6e670fe57dadb5`, immutable admin v6
patch SHA256 `1b1e43df43c9f0573ddeb6b5e2d07816ebc6fa0cf281634afd9accb58048c562`,
then privacy addendum `26717b40b9351fff126b09dbc69860e1b2213c9e9983ea0556fb08e1761c22f8`.
Assessment v5 manifest SHA256 is
`5737ba0533272cb3ab749b94689a401a052b4cf7516a7e1f2806d40045aeacf0`;
all 151 frozen file hashes independently match, with exactly 11 changes from v4.
Task5 owns the separate visual integration. Its final patch and integrated
source identity remain to be frozen; no newer presentation is copied here.
The original `F:\BusinessApp` and the independent 3047/3051 synthetic previews
remain separate. OTA metadata does not establish unpublished source-byte parity.

No additional admin semantic change is needed for the reviewed v5 deletion SQL:

- Business rows are locked in ID order, then existing member rows in business/
  user order, before determining sole/shared ownership. Classification and the
  replacement-owner loop use the same retained business set. Parent FK locks
  block new memberships; row locks stabilize current co-owner state.
- After an initial review delete can wait on a moderator, Auth then profile
  parent locks prevent new customer FK writers. A fresh capture and second
  delete remove committed late reviews before identity SET NULL cascades.
- The final audit sweep matches existing admin before/after `business_id` and
  `review_id` context. It can find a late report after the report itself cascades.
  Audit/event/request/state keys survive; affected freeform copies are scrubbed.
  Unrelated shared-business history is intentionally preserved.
- The allowlisted snapshot helper and actor-anonymization trigger are unchanged
  from v4. Admin001's additive guard rejects any privacy-redacted historical
  request UUID with 22023 before writes, including the same surviving actor.
  A reduced history snapshot cannot become a complete replay result. Checked
  outcome access, notification read/dismiss grants and default-OFF push remain
  compatible. Current typed/action/server/rule contracts are unchanged.
- Admin review decisions lock report then review; deletion can lock review then
  encounter its report cascade. Other reverse orders can also produce 40P01 or
  a lock timeout. The SQL transaction aborts atomically and must retry as a whole
  with the same deletion job. The inspected local Edge path returns 409 on an
  execute RPC error; it does not implement an automatic deadlock retry loop.
  The passing interleavings establish neither universal deadlock freedom nor
  end-to-end retry transport.

Reviewed assessment receipts use the exact four migration hashes below:
7/7 local schema-clone ownership/concurrency workflows with six observed lock
waits; 4/4 combined full-rollback fixtures with original local roles; 2/2 older
baseline rollback fixtures. Source schema/roles/history were preserved. This
is independent source/receipt review, not a new execution of those tests.
Admin's reduced PGlite contract suite separately passed 43/43. Hosted managed
ownership, actual JWT/native transport and providers are outside those results.
The v5 web confirmation callback now uses a sanitized relative Location with
no-store, preserving the browser cookie origin; its auth ownership stays task2.

## Exact proposed activation

Destination is the existing PC, zero new hosting/resource cost:
`http://127.0.0.1:3050/admin`, staging `lgddhdexvwclfrnzjtly` only. Use the existing
Kade account and public staging key; the account already has admin membership.
No account grant, reset, email, fabricated credentials or new key is needed.
Port 3050 is not started by this task.

1. Finish task5's isolated integration and screen verification. Freeze the
   actual visual patch, selected assessment changes, admin v6 plus addendum,
   all protected support/auth/outcome/submission files and these four SQL files.
   Run the integrated scoped checks and production build. Record the complete
   source identity; the current package intentionally has no invented visual
   patch hash or approved integrated manifest.
2. Prepare the guarded 3050 client with demo OFF, existing public staging
   configuration and all four migrations included in its source checks. Start
   the compatible sign-in client before retiring older writes. Reconcile older
   web/mobile callers; an older caller can lose a workflow after grant changes.
3. Recompare actual staging definitions, actor FK, triggers/obligation guards,
   policies, ACLs, role edges, deletion worker version and migration history.
   Preserve original definitions/grants and current data fingerprints. Prepare
   and review one transactional installation with exact history registration:
   admin001 → outcomes002 → submission003 → corrected deletion004. Do not run
   all pending migrations or use the prepared three-only bundle.
4. The installation uses the reviewed existing-moderator ownership mechanism:
   a temporary postgres-granted SET=true/ADMIN=false/INHERIT=false edge and
   schema CREATE, assignment of the checked action, retirement of legacy writes,
   removal of both temporary privileges and assertion of original flags. It
   retires `approve_business`, `reject_business`, `resolve_platform_report`, and
   `resolve_pickup_review_report`. Earlier staging approval was full rollback
   only; committed use requires the final coordinated decision.
5. After approved installation, verify real admin/non-admin sessions, expiry,
   manual decisions, identical retry, redacted retry rejection, reversal, audit
   and current-recipient isolation using a separately approved disposable fixture
   scope. SQL-role/local fixtures do not authorize persistent staging seeds.

## Remaining owner decisions and operational limits

Choose and disclose the purpose/time limits for completed financial/contact
records, technical audit/request/resource/revision IDs, deletion-job metadata
and unrelated retained audit text. Legitimate shared-business content survives
with attribution transferred to the active remaining owner; clarify that policy
and owner-facing copy. Affected authored UGC and copied moderator reasons/private
notes are removed as described above. Do not promise complete account erasure.

Provider/storage execution remains unverified: Square/Stripe disconnection,
SIWA/provider revocation, storage object removal, cache/vendor copies and cleanup
retry need an exact plan and tests. The inspected Edge path selects provider
disconnect targets from a previously saved job impact before execute SQL performs
its locked ownership classification; a later ownership change can make those
sets differ. Confirm the deployed worker and safe current-owner/target handling
before enabling the complete deletion journey. That inspected local dependency
also differs from the clean Git anchor (appointment blocker handling); its actual
integrated/deployed identity must be pinned separately. Database locks do not make an
external provider call atomic. Full active appointment/order/payment obligation
and time-of-check changes still need verification. Worker/provider/push deployment
or activation is not included in this package.

Once those choices and technical gates are complete, ask for one decision covering
the exact integrated 3050 client, four-migration transaction/history, committed
ownership and legacy-grant retirement, and stated retention/scrubbing behavior.
No approval question is issued before the integrated identity is reviewable.
External hosting, production, OTA, store publication, paid resources, push and
persistent fixtures remain outside that decision.

If installation aborts, independently verify unchanged definitions, ACLs, roles,
history and data before retrying. After a committed UI rollback, preserve audit,
outcome and history records. Reconcile callers before restoring any captured
legacy grant/guard; use checked reversal actions for moderation decisions.
