# Pickup recovery and discovery filters release — 2026-09-29

User authorized publication: “okay, you can push the other stuff in an ota”. Apple subscription diagnosis remains separate and unresolved.

Included: redesigned discovery filter sheet; interrupted/processing payment feedback; eight-character customer pickup codes; camera/manual entry toggle in Staff Scan with existing order review and atomic confirmation. Existing QR codes remain compatible. Native configuration matches the previous preview update. Diagnostic alerts are disabled in normal preview exports.

Staging migration 20260929001300 and square-commerce, square-webhook, square-maintenance, stripe-webhook deployed and verified active. Short codes use cryptographic generation, business-scoped hashes, five-minute expiry and per-staff/business rate limits. Confirmation preserves the existing atomic handoff and reward protections.

Validation: 36 focused backend tests; 23 payment/pickup mobile tests; 16 billing/payment helper tests (overlapping helper coverage); mobile TypeScript passed. Hosted SQL atomic handoff, reward and authorization regression passed with rollback. Live HTTP checks returned expected 404 for unauthorized customer code access, 401 for guest scan, and 403 for unrelated customer scan; no order was modified. Previously reviewed fixtures include light/dark and 320/390/430 widths; filters apply/cancel/reset/category search passed.

Both iOS and Android exports verified staging Supabase, sandbox Stripe key, unchanged native configuration, source stability and required feature strings. No real charge or native Apple subscription success was verified. Unique seeded-photo replacements are not part of this release.


## Approved OTA published

Published 2026-09-30T02:52:24.964Z after user approval. Expo preview channel and environment; staging backend; runtime 0.1.0.

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/defb210a-f9b4-4ec6-b398-b4d8611f11ae)

- android: 01a0f03a-4204-7657-bf19-100717a6a0fc
- ios: 01a0f03a-4204-7d57-bf6a-ecfa27f0df92

Fresh iOS/Android exports verified unchanged native configuration, staging backend and test payment settings. Source hashes stayed stable during export and were rechecked before publication. Active channel readback verified both published IDs. Exact source and bundle hashes are stored in .codex-tmp/pickup-recovery-source.json and pickup-recovery-bundle-verification.json.
