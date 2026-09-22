import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const mobileRoot = resolve(repoRoot, 'apps/mobile');
const expoCli = resolve(mobileRoot, 'node_modules/expo/bin/cli');
const result = spawnSync(process.execPath, [expoCli, 'config', '--type', 'public', '--json'], {
  cwd: mobileRoot,
  env: process.env,
  encoding: 'utf8',
});
if (result.status !== 0) throw new Error(result.stderr || 'Expo config inspection failed.');
const config = JSON.parse(result.stdout);
const eas = JSON.parse(readFileSync(resolve(mobileRoot, 'eas.json'), 'utf8'));
const locationPlugin = config.plugins?.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-location',
);
const hasNotifications = config.plugins?.some(
  (plugin) =>
    plugin === 'expo-notifications' ||
    (Array.isArray(plugin) && plugin[0] === 'expo-notifications'),
);

if (config.version !== '0.1.0') throw new Error(`Unexpected app version ${config.version}.`);
if (config.runtimeVersion?.policy !== 'appVersion')
  throw new Error('Runtime is not tied to app version.');
if (config.extra?.appEnvironment !== 'staging')
  throw new Error('Resolved preview app environment is not staging.');
if (!hasNotifications) throw new Error('Expo notifications plugin is missing.');
if (!locationPlugin?.[1]?.isIosBackgroundLocationEnabled)
  throw new Error('iOS background location is disabled.');
if (!locationPlugin?.[1]?.isAndroidBackgroundLocationEnabled)
  throw new Error('Android background location is disabled.');
if (!config.updates?.url?.startsWith('https://u.expo.dev/'))
  throw new Error('EAS Updates URL is missing.');
if (eas.build?.preview?.channel !== 'preview' || eas.build?.preview?.environment !== 'preview') {
  throw new Error('Preview build channel/environment is misconfigured.');
}

console.log(
  JSON.stringify({
    appEnvironment: config.extra.appEnvironment,
    appVersion: config.version,
    runtimePolicy: config.runtimeVersion.policy,
    easEnvironment: eas.build.preview.environment,
    channel: eas.build.preview.channel,
    notifications: true,
    iosBackgroundLocation: true,
    androidBackgroundLocation: true,
    updates: true,
  }),
);
