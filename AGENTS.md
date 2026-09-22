# Development server guard

Before starting, restarting, testing, or changing Metro, read
`docs/metro-lan-only.md`. Metro is LAN-only for this project: never advertise
`localhost`, `127.0.0.1`, or another loopback address to the phone. Use
`scripts/start-local.ps1`, verify the manifest uses the active LAN IPv4
address, and keep Compose Watch enabled for mobile source updates.

# Hosted email safety

Never trigger a real email from hosted Supabase using a fabricated, random, or
otherwise invalid recipient address. Prefer local Supabase/Inbucket for email
delivery tests and confirmed Admin API or SQL fixtures for staging integration
tests. When an intentional staging delivery test is necessary, send it only to
`kade20413+<unique-test-alias>@gmail.com`. Do not substitute another mailbox or
remove the plus alias without explicit user approval.
