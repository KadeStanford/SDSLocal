const expectedProjectRef = 'lgddhdexvwclfrnzjtly';
const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV;
const stagingUrl = process.env.EXPO_PUBLIC_STAGING_SUPABASE_URL;

if (appEnvironment !== 'staging') {
  throw new Error(
    `Expected the preview app environment to be staging, received ${appEnvironment ?? 'missing'}.`,
  );
}
if (!stagingUrl) throw new Error('The preview staging Supabase URL is missing.');
const projectRef = new URL(stagingUrl).hostname.split('.')[0];
if (projectRef !== expectedProjectRef) {
  throw new Error(`Refusing unexpected preview Supabase project ${projectRef ?? 'missing'}.`);
}

console.log(JSON.stringify({ appEnvironment, projectRef }));
