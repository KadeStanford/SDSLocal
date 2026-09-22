# Metro development server: LAN-only rule

> **STOP. Read this before every Metro-related action.**

Metro must never advertise `localhost`, `127.0.0.1`, or any other loopback
address to the Expo development client. A phone cannot use the host computer's
loopback interface, so a loopback bundle URL makes the client fail to connect.

Before starting, restarting, recreating, or testing Metro:

1. Determine the host's active LAN IPv4 address.
2. Set `EXPO_HOST_IP` to that address before invoking Docker Compose.
3. Confirm the Metro manifest's `launchAsset.url` and `extra.expoClient.hostUri`
   both use that LAN address and not `localhost`.
4. Register the `_expo._tcp` Bonjour discovery entry for the same address when
   the launcher is used.

The supported path is:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

`docker-compose.dev.yml` intentionally fails if `EXPO_HOST_IP` is missing. Do
not add a localhost fallback. If the LAN address changes, restart through the
launcher so the container environment, manifest, and discovery record are all
updated together.
