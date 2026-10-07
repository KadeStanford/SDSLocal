# Dedicated staging workflow execution handoff

Task-4 is the sole hosted writer. The parent's latest grant permits controlled staging fixtures; no additional approval is requested here. Task-2 has performed only anonymous GET requests. Do not reapply the two category/history migrations: actual receipts already exist.

Exact project: `lgddhdexvwclfrnzjtly`, sds-local-staging. Use dedicated confirmed fixture accounts through the approved authenticated route; do not send signup/reset messages to invented addresses. If intentional delivery is required, the repository permits only `kade20413+<unique-test-alias>@gmail.com`. Keep passwords, sessions and keys outside source/reports.

Create realistic ordinary-flow fixtures: an owner, active staff member, two unrelated customers, a complete **draft** business and appointments associated with each customer. Record exact fixture IDs, creation path and baseline fields. Use the normal owner creation/service/booking APIs wherever available; record any Admin/SQL setup separately. Suppress real emails, push and payments; preserve global billing settings and use a fixture with actual feature eligibility. Do not convert an existing real business to a fixture or force pending review by direct insertion.

Before category writes, capture actual `business_feature_snapshot(uuid)` definition/owner/ACL and the fixture entitlement result using the supplemental read-only preflight. `assert_business_feature(uuid,text)` matches the reviewed baseline. Both new functions are postgres-owned; staging grants are postgres/authenticated only, not service_role. A service-role successful call is not owner-path proof.

Execute and record these API/SQL checks under the corresponding confirmed user's JWT/role:

1. Owner saves a valid compatible category set; verify rows, primary category and category_summary. Repeat the same save; ensure no duplicates. Keep the fixture draft throughout so existing moderation-reset triggers do not affect a real pending business.
2. Duplicate, inactive, wrong-business-type and more-than-five category input each fail with SQL 22023; verify the complete prior category/summary state is unchanged after every rejection. Supply actual known fixture category IDs, not guessed IDs.
3. Active staff, unrelated customer, inactive owner and signed-out caller each fail with SQL 42501; verify no changes. Restore the exact known original category order/summary under the confirmed owner in a finally/cleanup step.
4. Each customer reads its actual ordinary-flow appointment history. Verify the known appointment IDs, descending starts_at, all nine reviewed summary fields, absence of payment/provider/guest secrets and exclusion of the other customer's records. Repeat the read and verify stable results.
5. Capture API status, SQL error code, actor category, target IDs and UTC time. Keep sensitive payloads private. Record cleanup of only designated fixture IDs, with residual counts and any incomplete cleanup.

The read-only executable `scripts/readiness-staging-history.mjs` is ready for step 4. Set `READINESS_STAGING_FIXTURE_FILE` to a private JSON file outside source, then run `node scripts/readiness-staging-history.mjs`. Required shape:

```json
{
  "backend": "https://lgddhdexvwclfrnzjtly.supabase.co",
  "confirmedDedicatedFixtures": true,
  "anonKey": "PRIVATE_VALUE",
  "customers": [
    {
      "userId": "ACTUAL_UUID_A",
      "accessToken": "PRIVATE_SESSION_A",
      "expectedAppointmentIds": ["ACTUAL_APPOINTMENT_A"]
    },
    {
      "userId": "ACTUAL_UUID_B",
      "accessToken": "PRIVATE_SESSION_B",
      "expectedAppointmentIds": ["ACTUAL_APPOINTMENT_B"]
    }
  ]
}
```

The runner creates no accounts/sessions/data and exports no token, email or response body. It requires nonempty known fixture results, verifies token ownership/confirmation and fails on any unexpected history row or payload field. It has **not been executed on staging** because fixture sessions/IDs are not available to task-2. Category positive/negative checks likewise remain Not Tested; no unrun script is counted as success.

API fixture checks alone do not complete normal-preview app journeys. Native sign-in, interrupted/repeated onboarding/navigation, OTP/deep links and offline cases require the actual installed preview device and applied build/update IDs. No native driver is currently available in task-2.
