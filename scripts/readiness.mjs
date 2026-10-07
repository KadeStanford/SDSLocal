import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { renderReadiness } from './readiness-report.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, process.argv[2] ?? 'reports/readiness/latest');
fs.mkdirSync(output, { recursive: true });
const startedAt = new Date().toISOString();
const checks = [];
const env = {
  ...process.env,
  CI: '1',
  NO_COLOR: '1',
  NEXT_TELEMETRY_DISABLED: '1',
  EXPO_NO_TELEMETRY: '1',
  EXPO_OFFLINE: '1',
  NEXT_PUBLIC_APP_ENV: 'development',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-audit-placeholder-key',
  EXPO_PUBLIC_APP_ENV: 'development',
  EXPO_PUBLIC_SITE_URL: 'http://localhost:3000',
  EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'local-audit-placeholder-key',
};
for (const key of Object.keys(env)) {
  if (/SECRET|SERVICE_ROLE|ACCESS_TOKEN|REVENUECAT|SQUARE|STRIPE|GOOGLE|APPLE|EAS_/i.test(key))
    delete env[key];
}
function resolveBin(pkg, bin) {
  for (const base of [path.join(root, pkg, 'node_modules'), path.join(root, 'node_modules')]) {
    const candidate = path.join(base, bin);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Missing installed binary: ${pkg} ${bin}`);
}
async function run(id, cwd, bin, args) {
  const begin = Date.now();
  const log = path.join(output, `${id}.log`);
  const stream = fs.createWriteStream(log);
  const command = `node ${path.relative(root, bin).replaceAll('\\', '/')} ${args.join(' ')}`;
  console.log(`RUN ${id}`);
  stream.write(`Started ${new Date().toISOString()}\nCWD ${cwd}\nCOMMAND ${command}\n\n`);
  const child = spawn(process.execPath, [bin, ...args], {
    cwd: path.join(root, cwd),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(stream, { end: false });
  child.stderr.pipe(stream, { end: false });
  let error = null;
  child.on('error', (e) => {
    error = e.message;
    stream.write(e.stack ?? e.message);
  });
  const code = await new Promise((resolve) =>
    child.on('close', (code, signal) => resolve(code ?? signal ?? -1)),
  );
  await new Promise((resolve) => stream.end(`\nEXIT ${code}\n`, resolve));
  const result = {
    id,
    cwd,
    command,
    startedAt: new Date(begin).toISOString(),
    durationMs: Date.now() - begin,
    exitCode: code,
    status: code === 0 ? 'passed' : 'failed',
    log: `${id}.log`,
    ...(error ? { error } : {}),
  };
  checks.push(result);
  fs.writeFileSync(
    path.join(output, 'checks.json'),
    JSON.stringify(
      {
        startedAt,
        completedAt: new Date().toISOString(),
        node: process.version,
        scope: 'Offline snapshot; installed dependencies reused; no hosted services',
        checks,
      },
      null,
      2,
    ),
  );
  console.log(`${result.status.toUpperCase()} ${id} (${Math.round(result.durationMs / 1000)}s)`);
  return result;
}
const packages = fs.readdirSync(path.join(root, 'packages')).map((p) => `packages/${p}`);
const testPackages = [
  'apps/mobile',
  'apps/web',
  ...packages.filter(
    (p) => JSON.parse(fs.readFileSync(path.join(root, p, 'package.json'))).scripts.test,
  ),
];
for (const pkg of testPackages) {
  const id = `test-${path.basename(pkg)}`;
  await run(id, pkg, resolveBin('', 'vitest/vitest.mjs'), [
    'run',
    '--maxWorkers=2',
    '--reporter=default',
    '--reporter=json',
    `--outputFile.json=${path.join(output, `${id}.json`)}`,
  ]);
}
await run('test-backend', '', resolveBin('', 'vitest/vitest.mjs'), [
  'run',
  'supabase/functions',
  '--maxWorkers=2',
  '--reporter=default',
  '--reporter=json',
  `--outputFile.json=${path.join(output, 'test-backend.json')}`,
]);
for (const pkg of [...packages, 'apps/mobile'])
  await run(`typecheck-${path.basename(pkg)}`, pkg, resolveBin(pkg, 'typescript/bin/tsc'), [
    '--noEmit',
  ]);
const typegen = await run('typegen-web', 'apps/web', resolveBin('apps/web', 'next/dist/bin/next'), [
  'typegen',
]);
if (typegen.exitCode === 0)
  await run('typecheck-web', 'apps/web', resolveBin('apps/web', 'typescript/bin/tsc'), [
    '--noEmit',
  ]);
for (const pkg of ['apps/mobile', 'apps/web'])
  await run(`lint-${path.basename(pkg)}`, pkg, resolveBin(pkg, 'eslint/bin/eslint.js'), ['.']);
await run('format', '', resolveBin('', 'prettier/bin/prettier.cjs'), ['--check', '.']);
await run('tester-config', '', path.join(root, 'scripts/verify-tester-build.cjs'), ['--test']);
renderReadiness(output, root);
console.log(`Report: ${path.join(output, 'index.html')}`);
process.exitCode = checks.some((c) => c.status === 'failed') ? 1 : 0;
