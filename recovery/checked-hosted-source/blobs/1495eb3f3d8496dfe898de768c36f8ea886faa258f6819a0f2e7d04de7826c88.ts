import { fail, uuid } from './square-security.ts';

type FeatureDatabase = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ error: { details?: string; code?: string } | null }>;
};

/** Additive to caller authorization; the server resolves the business's payer. */
export async function requireBusinessFeature(
  db: FeatureDatabase,
  businessId: string,
  feature: string,
) {
  const { error } = await db.rpc('assert_business_feature', {
    p_business_id: businessId,
    p_feature: feature,
  });
  if (!error) return;
  if (error.details === 'BUSINESS_FEATURE_REQUIRED')
    fail(
      'BUSINESS_FEATURE_REQUIRED',
      'This business’s subscription does not include this feature.',
      403,
    );
  // Missing migrations and database outages must never be interpreted as access.
  fail(
    'FEATURE_CHECK_UNAVAILABLE',
    'Business availability could not be verified. Please retry.',
    503,
  );
}

export async function requireCommerceSetupFeature(
  db: FeatureDatabase,
  body: Record<string, unknown>,
) {
  const action = body.action;
  if (action === 'appointment_owner_setup_save')
    await requireBusinessFeature(db, uuid(body.businessId), 'appointments');
  else if (['connect', 'select_provider', 'location', 'sync', 'settings'].includes(String(action)))
    await requireBusinessFeature(db, uuid(body.businessId), 'pickup_ordering');
  // Existing order/appointment operations, disconnect and read-only setup remain usable.
}
