/** Proposed v1 UI contract. Backend installation is a separate assessment change. */
export interface StaffInvitePreviewV1 {
  readonly schema_version: 1;
  readonly business_id: string;
  readonly business_name: string;
  readonly logo_path: string | null;
  readonly location_label: string | null;
  readonly role: 'staff';
  readonly invite_status: 'pending';
  readonly expires_at: string;
}

/** Fail closed; never turn private fields or an arbitrary URL into invitation UI. */
export function parseStaffInvitePreview(
  value: unknown,
  now = Date.now(),
): StaffInvitePreviewV1 | null {
  const raw = Array.isArray(value) ? (value.length === 1 ? value[0] : null) : value;
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (
    row.schema_version !== 1 ||
    row.role !== 'staff' ||
    row.invite_status !== 'pending' ||
    typeof row.business_id !== 'string' ||
    !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(row.business_id) ||
    typeof row.business_name !== 'string' ||
    !row.business_name.trim() ||
    row.business_name.length > 200 ||
    typeof row.expires_at !== 'string' ||
    !Number.isFinite(Date.parse(row.expires_at)) ||
    Date.parse(row.expires_at) <= now ||
    !(
      row.location_label === null ||
      (typeof row.location_label === 'string' && row.location_label.length <= 300)
    )
  )
    return null;
  const logo = row.logo_path;
  if (!(
    logo === null ||
    (typeof logo === 'string' &&
      logo.length > 0 &&
      logo.length <= 500 &&
      !/[:%?#\\\x00-\x20]/.test(logo) &&
      !logo.startsWith('/') &&
      !logo.split('/').some((part) => part === '..' || part === '.'))
  ))
    return null;
  return {
    schema_version: 1,
    business_id: row.business_id,
    business_name: row.business_name.trim(),
    logo_path: logo,
    location_label: row.location_label,
    role: 'staff',
    invite_status: 'pending',
    expires_at: row.expires_at,
  };
}
