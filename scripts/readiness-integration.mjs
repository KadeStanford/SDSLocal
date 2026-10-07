import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = JSON.parse(fs.readFileSync(process.env.READINESS_RUNTIME_FILE, 'utf8'));
if (runtime.API_URL !== 'http://127.0.0.1:56321')
  throw new Error('Only the isolated readiness API is permitted.');
const env = {
  ...process.env,
  LOCAL_SUPABASE_URL: 'http://host.docker.internal:56321',
  LOCAL_SUPABASE_SERVICE_ROLE_KEY: runtime.SERVICE_ROLE_KEY,
};
const container = 'supabase_db_parish-pass-readiness-audit';
const identity = spawnSync(
  'docker',
  ['--context', 'desktop-linux', 'inspect', container, '--format', '{{.Name}}'],
  { encoding: 'utf8' },
);
if (identity.status || identity.stdout.trim() !== '/' + container)
  throw new Error('Isolated container identity mismatch.');
const cache = path.join(root, '.codex-tmp/deno-cache');
const output = path.join(root, 'reports/readiness/integration');
fs.mkdirSync(cache, { recursive: true });
fs.mkdirSync(output, { recursive: true });
const startedAtUtc = new Date().toISOString();
const args = [
  '--context',
  'desktop-linux',
  'run',
  '--rm',
  '--name',
  'parish-pass-readiness-commerce',
  '--add-host',
  'host.docker.internal:host-gateway',
  '--mount',
  `type=bind,source=${root},target=/app,readonly`,
  '--mount',
  `type=bind,source=${cache},target=/deno-dir`,
  '--workdir',
  '/app',
  '--env',
  'DENO_DIR=/deno-dir',
  '--env',
  'LOCAL_SUPABASE_URL',
  '--env',
  'LOCAL_SUPABASE_SERVICE_ROLE_KEY',
  'denoland/deno:latest',
  'run',
  '--no-config',
  '--node-modules-dir=none',
  '--no-check',
  '--allow-net=host.docker.internal:56321',
  '--allow-env=LOCAL_SUPABASE_URL,LOCAL_SUPABASE_SERVICE_ROLE_KEY',
  'supabase/tests/square-local-integration.ts',
];
const result = spawnSync('docker', args, { env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const redact = (text) =>
  String(text ?? '').replace(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    '[local credential redacted]',
  );
fs.writeFileSync(path.join(output, 'commerce.log'), redact(result.stdout) + redact(result.stderr));
fs.writeFileSync(
  path.join(output, 'commerce.json'),
  JSON.stringify(
    {
      startedAtUtc,
      completedAtUtc: new Date().toISOString(),
      status: result.status === 0 ? 'passed' : 'failed',
      exitCode: result.status,
      scope:
        'Actual SquareService orchestration and local PostgreSQL/Supabase API; provider HTTP transport is an in-memory fixture; no Square request or payment',
      command:
        'docker run denoland/deno:latest run --allow-net=host.docker.internal:56321 supabase/tests/square-local-integration.ts',
      log: 'commerce.log',
    },
    null,
    2,
  ),
);
console.log(
  `Commerce integration ${result.status === 0 ? 'PASS' : 'FAIL'} (exit${result.status}); provider transport fixture.`,
);
process.exitCode = result.status ?? 1;
