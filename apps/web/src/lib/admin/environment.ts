import { getSiteUrl } from '@/lib/supabase/config';

export type AdminEnvironmentId = 'local' | 'staging' | 'production';
export type AdminEnvironmentState = 'current' | 'configured' | 'not_configured';

export interface AdminEnvironment {
  readonly id: AdminEnvironmentId;
  readonly label: string;
  readonly state: AdminEnvironmentState;
  readonly url: string | null;
  readonly projectRef: string | null;
  readonly description: string;
}

export interface StagingQuota {
  readonly databaseMb: number;
  readonly storageGb: number;
  readonly egressGb: number;
  readonly monthlyActiveUsers: number;
  readonly warnPercent: number;
  readonly holdPercent: number;
  readonly billingLocked: boolean;
}

const currentEnvironment = normalizeEnvironment(process.env.NEXT_PUBLIC_APP_ENV);

function normalizeEnvironment(value: string | undefined): AdminEnvironmentId {
  if (value === 'staging') return 'staging';
  if (value === 'production') return 'production';
  return 'local';
}

function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAdminEnvironments(): AdminEnvironment[] {
  const localUrl = process.env.NEXT_PUBLIC_SITE_URL ?? getSiteUrl();
  const stagingUrl = process.env.SDS_STAGING_SITE_URL ?? null;
  const productionUrl = process.env.SDS_PRODUCTION_SITE_URL ?? null;
  const stagingProjectRef = process.env.SDS_STAGING_SUPABASE_PROJECT_REF ?? null;
  const productionProjectRef = process.env.SDS_PRODUCTION_SUPABASE_PROJECT_REF ?? null;

  return [
    {
      id: 'local',
      label: 'Local',
      state: currentEnvironment === 'local' ? 'current' : 'configured',
      url: localUrl,
      projectRef: null,
      description: 'Docker and Supabase CLI development data.',
    },
    {
      id: 'staging',
      label: 'Staging',
      state:
        currentEnvironment === 'staging'
          ? 'current'
          : stagingProjectRef
            ? 'configured'
            : 'not_configured',
      url: stagingUrl,
      projectRef: stagingProjectRef,
      description: 'Hosted rehearsal environment with free-tier guardrails.',
    },
    {
      id: 'production',
      label: 'Production',
      state:
        currentEnvironment === 'production'
          ? 'current'
          : productionProjectRef
            ? 'configured'
            : 'not_configured',
      url: productionUrl,
      projectRef: productionProjectRef,
      description: 'Reserved for the eventual public release.',
    },
  ];
}

/**
 * These are safety defaults, not a billing API. Provider usage values should
 * be supplied by a trusted server-side usage integration before launch.
 */
export function getStagingQuota(): StagingQuota {
  return {
    databaseMb: readNumber(process.env.SDS_STAGING_DATABASE_QUOTA_MB, 500),
    storageGb: readNumber(process.env.SDS_STAGING_STORAGE_QUOTA_GB, 1),
    egressGb: readNumber(process.env.SDS_STAGING_EGRESS_QUOTA_GB, 5),
    monthlyActiveUsers: readNumber(process.env.SDS_STAGING_MAU_QUOTA, 50_000),
    warnPercent: Math.min(readNumber(process.env.SDS_STAGING_WARN_PERCENT, 80), 95),
    holdPercent: Math.min(readNumber(process.env.SDS_STAGING_HOLD_PERCENT, 95), 99),
    // Staging must never be allowed to opt into paid billing through an env
    // typo or an accidental deployment setting. Keep the legacy env var in
    // the examples for visibility, but make the safety lock unconditional.
    billingLocked: true,
  };
}

export function getCurrentEnvironmentId() {
  return currentEnvironment;
}
