export function demoConfigured() {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.PARISH_ADMIN_DEMO === '1' &&
    !['staging', 'production'].includes(process.env.NEXT_PUBLIC_APP_ENV ?? 'local') &&
    !process.env.NEXT_PUBLIC_STAGING_SUPABASE_URL &&
    !process.env.SUPABASE_INTERNAL_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}
