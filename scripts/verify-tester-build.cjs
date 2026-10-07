// Run inside `eas env:exec preview` before building or publishing tester updates.
// No environment values or credentials are printed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const eas = JSON.parse(fs.readFileSync(path.join(root, 'apps/mobile/eas.json'), 'utf8'));
const profile = eas.build['tester-store'];
assert.equal(profile.extends, 'preview-store');
assert.equal(profile.channel, 'testers');
assert.equal(eas.build['preview-store'].distribution, 'store');
assert.equal(eas.build['preview-store'].android.buildType, 'app-bundle');
assert.equal(eas.build.preview.environment, 'preview');
const source = ts.transpileModule(
  fs.readFileSync(path.join(root, 'apps/mobile/app.config.ts'), 'utf8'),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  },
).outputText;
function evaluate(env) {
  const exports = {};
  vm.runInNewContext(source, { exports, process: { env }, URL });
  const config = exports.default({ config: {} });
  assert.equal(config.extra.appEnvironment, 'staging');
  assert.equal(config.extra.testerBuild, true);
  assert.equal(config.runtimeVersion.policy, 'fingerprint');
  return config;
}
if (process.argv.includes('--test')) {
  const valid = {
    ...profile.env,
    EXPO_PUBLIC_STAGING_SUPABASE_URL: 'https://lgddhdexvwclfrnzjtly.supabase.co',
    EXPO_PUBLIC_STAGING_SUPABASE_ANON_KEY: 'public-fixture-key',
  };
  evaluate(valid);
  const invalid = [
    { EXPO_PUBLIC_APP_ENV: 'production' },
    { EXPO_PUBLIC_STAGING_SUPABASE_URL: 'https://other-project.supabase.co' },
    { EXPO_PUBLIC_STAGING_SUPABASE_ANON_KEY: '' },
    ...[
      '',
      'http://example.com',
      'https://localhost',
      'https://127.0.0.1',
      'https://172.16.0.1',
      'https://[::1]',
      'https://example.com',
      'https://user:password@parishpass.app',
      'not a url',
    ].map((url) => ({ EXPO_PUBLIC_PRIVACY_URL: url })),
    { EXPO_PUBLIC_TERMS_URL: '' },
    { EXPO_PUBLIC_SUPPORT_URL: '' },
  ];
  invalid.forEach((override) => assert.throws(() => evaluate({ ...valid, ...override })));
  console.log(
    `PASS tester configuration: valid staging + ${invalid.length} rejected unsafe/missing configurations.`,
  );
} else {
  evaluate({ ...process.env, ...profile.env });
  console.log(
    'PASS tester configuration: approved staging backend, public legal URLs, store distribution, testers channel, fingerprint runtime. Native acceptance is still required.',
  );
}
