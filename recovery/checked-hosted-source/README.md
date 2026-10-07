# Checked hosted source recovery

This archive preserves all 15 currently deployed Supabase Edge Function source bundles: 130 file references and 46 unique TypeScript sources. Shared modules differ between deployed function versions, so do not collapse them by filename or deploy one arbitrary shared version to every function. The manifest maps each deployed function/version/verify_jwt setting to exact source hashes. The seven included security/admin migrations are source definitions, not database data or a command to replay them against staging.

Inspection found no literal credential assignments. Credentials are obtained at runtime from environment variables, request authorization, or stored encrypted provider credentials; their values are absent from this archive. Known local secret values, PAT/private-key/JWT patterns and credential URLs were also scanned. Raw hosted API receipts, database inventory and private configuration remain excluded. This archive is separate from shipped routes and has no automatic deployment hook.

Reconstruct one bundle by writing each referenced blobs/<sha256>.ts to the manifest file path in a fresh directory for that function. Preserve source/ and _shared/ layout. Verify bytes against SHA-256 before using it. Hosted secret settings must be restored through the provider UI, not source control.
