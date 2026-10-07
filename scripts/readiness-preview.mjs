import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeFile = process.env.READINESS_RUNTIME_FILE;
if (!runtimeFile)
  throw new Error(
    'Set READINESS_RUNTIME_FILE to the private runtime JSON from the isolated local stack.',
  );
const runtime = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
if (runtime.API_URL !== 'http://127.0.0.1:56321')
  throw new Error('Refusing a backend other than the isolated API on56321.');
const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_APP_ENV: 'development',
  NEXT_PUBLIC_SUPABASE_URL: runtime.API_URL,
  SUPABASE_INTERNAL_URL: runtime.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: runtime.ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: runtime.PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:4182',
  READINESS_ANON_KEY: runtime.ANON_KEY,
  READINESS_SERVICE_ROLE_KEY: runtime.SERVICE_ROLE_KEY,
};
for (const key of Object.keys(env))
  if (/STAGING|SQUARE|STRIPE|REVENUECAT|EAS_|GOOGLE|APPLE/.test(key)) delete env[key];
const isTest = process.argv.includes('--test');
const isBuild = process.argv.includes('--build');
const cli = path.join(
  root,
  isTest ? 'node_modules/@playwright/test/cli.js' : 'apps/web/node_modules/next/dist/bin/next',
);
const args = isTest
  ? ['test', '--config', 'playwright.readiness.config.ts']
  : isBuild
    ? ['build']
    : ['dev', '--hostname', '127.0.0.1', '--port', '4182'];
const child = spawn(process.execPath, [cli, ...args], {
  cwd: isTest ? root : path.join(root, 'apps/web'),
  env,
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
