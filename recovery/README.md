# Published preview recovery source

The 500 files in published-mobile-source-manifest.json match the frozen mobile source for preview OTA group 16899e45-ef46-427c-870a-009ff22a3caf, runtime 0.1.0. Other root files preserve the current local monorepo snapshot; they are not a claim that every web/backend file was deployed.

The deployed-functions folder preserves all 15 currently deployed Edge Function bundles, retrieved read-only on 2026-10-07, with versions, verify_jwt settings, and imported source files. These are source recovery artifacts; no deployment was performed. backend-cutover preserves the newer security/admin migration source. Never blindly replay the entire migration history against staging. Supabase remains hosted and was not reset. No account row data is included.
