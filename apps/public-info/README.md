# Parish Pass public information

Public terms, privacy, support and account deletion pages based on the app's
existing account, location, business, subscription and payment flows.

Published URL: https://parish-pass--policies.expo.app/
EAS Hosting deployment: `rdlnqe15ay`, alias `policies`, existing mobile EAS project.

Edit `content.mjs`, then run `node build.mjs` from this directory. Preview the
generated HTML and verify the internal navigation and mail links before publishing.

From this directory, publish with the installed repository CLI:

```powershell
$env:EXPO_NO_DOTENV = '1'
node ../../node_modules/eas-cli/bin/run deploy --export-dir dist --alias policies --no-source-maps --non-interactive --json
```

Do not add `.env` files here or pass an EAS environment to this static deployment;
it needs no runtime credentials. Do not deploy the mobile app's environment into
these public pages. Rebuilding these pages does not change the native runtime.

Keep the public policy text and store data-safety declarations aligned with actual
data handling when adding providers, ads or new app features. Support email is
the developer account's public contact: `stanforddevcontact@gmail.com`.
