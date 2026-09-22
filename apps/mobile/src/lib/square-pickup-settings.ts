import type { OrderingSettings, OwnerConnection } from './square-commerce-core';

export type PickupSettings = Omit<OrderingSettings, 'synced_at' | 'sync_summary'>;
export const defaultPickupSettings: PickupSettings = {
  enabled: false,
  is_open: false,
  preparation_minutes: 20,
  minimum_notice_minutes: 15,
  slot_minutes: 15,
  max_orders_per_slot: 5,
  timezone: 'America/Chicago',
  allow_upcoming_stops: false,
  pickup_windows: [],
};

/** Compare only editable values, ignoring sync metadata and window array order. */
export function normalizePickupSettings(value: PickupSettings | null): PickupSettings {
  const s = value ?? defaultPickupSettings;
  return {
    enabled: s.enabled,
    is_open: s.is_open,
    preparation_minutes: s.preparation_minutes,
    minimum_notice_minutes: s.minimum_notice_minutes,
    slot_minutes: s.slot_minutes,
    max_orders_per_slot: s.max_orders_per_slot,
    timezone: s.timezone.trim(),
    allow_upcoming_stops: s.allow_upcoming_stops,
    pickup_windows: s.pickup_windows
      .map(({ day, start, end }) => ({ day, start: start.trim(), end: end.trim() }))
      .sort(
        (a, b) => a.day - b.day || a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
      ),
  };
}
export function pickupSettingsEqual(a: PickupSettings, b: PickupSettings) {
  const { pickup_windows: aw, ...av } = normalizePickupSettings(a);
  const { pickup_windows: bw, ...bv } = normalizePickupSettings(b);
  return (
    (Object.keys(av) as (keyof typeof av)[]).every((key) => Object.is(av[key], bv[key])) &&
    JSON.stringify(aw) === JSON.stringify(bw)
  );
}

export function pickupReadiness(
  owner: OwnerConnection | null,
  provider: 'square' | 'stripe' = 'square',
) {
  const connected = owner?.connection?.state === 'connected';
  // owner_status returns only currently active Square locations.
  const locationSelected =
    provider === 'stripe' ? connected : Boolean(owner?.connection?.locationId);
  const activeLocation =
    provider === 'stripe'
      ? connected
      : locationSelected &&
        Boolean(owner?.locations.some((location) => location.id === owner.connection?.locationId));
  const synced = Boolean(owner?.settings?.synced_at);
  const variations = owner?.settings?.sync_summary?.variations ?? 0;
  const hasItems = Number.isFinite(variations) && variations > 0;
  const providerName = provider === 'stripe' ? 'Stripe' : 'Square';
  const reason = !connected
    ? `Connect ${providerName} before enabling pickup ordering.`
    : !activeLocation
      ? provider === 'stripe'
        ? 'Finish Stripe account verification before enabling pickup ordering.'
        : 'Select an active Square location before enabling pickup ordering.'
      : !synced
        ? provider === 'stripe'
          ? 'Sync the SDS menu before enabling pickup ordering.'
          : 'Sync the Square catalog before enabling pickup ordering.'
        : !hasItems
          ? provider === 'stripe'
            ? 'Add at least one visible, purchasable SDS menu item, then tap Sync SDS menu before enabling ordering.'
            : `Add at least one purchasable Sandbox item, then tap Sync ${providerName} catalog before enabling ordering.`
          : null;
  return {
    connected,
    locationSelected,
    activeLocation,
    synced,
    variations,
    ready: reason === null,
    reason,
  };
}
export type PickupReadiness = ReturnType<typeof pickupReadiness>;

function pickupWindowsIssue(settings: PickupSettings, required: boolean): string | null {
  if (required && settings.pickup_windows.length === 0)
    return 'Add at least one weekly pickup window before enabling ordering.';
  if (settings.pickup_windows.length > 21) return 'Use no more than 21 weekly pickup windows.';
  if (
    settings.pickup_windows.some(
      (w) =>
        !Number.isInteger(w.day) ||
        w.day < 0 ||
        w.day > 6 ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(w.start) ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(w.end) ||
        w.start >= w.end,
    )
  )
    return 'Use HH:MM times in each pickup window. Closing must be later than opening on the same day.';
  return null;
}
export function pickupActivationIssue(
  settings: PickupSettings,
  readiness: PickupReadiness,
  control: 'enabled' | 'is_open',
  value: boolean,
): string | null {
  if (!value) return null;
  if (readiness.reason) return readiness.reason;
  if (control === 'is_open' && !settings.enabled)
    return 'Enable pickup ordering before opening orders.';
  return pickupWindowsIssue(settings, true);
}
export function pickupSettingsIssue(
  draft: PickupSettings,
  readiness: PickupReadiness,
  provider: 'square' | 'stripe' = 'square',
): string | null {
  const s = normalizePickupSettings(draft);
  if ((s.enabled || s.is_open) && !readiness.ready)
    return `${readiness.reason} Turn off pickup ordering and Ordering open to save timing changes now.`;
  if (s.is_open && !s.enabled) return 'Turn off Ordering open, or enable pickup ordering first.';
  for (const [key, min, max, label] of [
    ['preparation_minutes', 5, 240, 'Preparation time'],
    ['minimum_notice_minutes', 5, 1440, 'Minimum advance notice'],
    ['max_orders_per_slot', 1, 100, 'Maximum orders per slot'],
  ] as const) {
    if (!Number.isInteger(s[key]) || s[key] < min || s[key] > max)
      return `${label} must be a whole number from ${min} to ${max}.`;
  }
  if (![15, 30, 60].includes(s.slot_minutes))
    return 'Choose a pickup interval of 15, 30 or 60 minutes.';
  try {
    if (!s.timezone || s.timezone.length > 80) throw new Error();
    new Intl.DateTimeFormat('en-US', { timeZone: s.timezone }).format();
  } catch {
    return `The pickup location’s time zone could not be loaded. Refresh your ${provider === 'stripe' ? 'Stripe account' : 'Square connection'}.`;
  }
  return pickupWindowsIssue(s, s.enabled);
}

export interface PickupEditor {
  draft: PickupSettings;
  saved: PickupSettings;
  error: string;
  message: string;
}
export function createPickupEditor(settings: PickupSettings | null = null): PickupEditor {
  const saved = normalizePickupSettings(settings);
  return { draft: saved, saved, error: '', message: '' };
}
export function pickupEditorDirty(editor: PickupEditor) {
  return !pickupSettingsEqual(editor.draft, editor.saved);
}
export type PickupEditorEvent =
  | { type: 'edit'; patch: Partial<PickupSettings> }
  | { type: 'refresh'; settings: PickupSettings | null }
  | { type: 'saved'; settings: PickupSettings }
  | { type: 'error'; message: string }
  | { type: 'saving' };
export function updatePickupEditor(editor: PickupEditor, event: PickupEditorEvent): PickupEditor {
  switch (event.type) {
    case 'edit':
      return {
        ...editor,
        draft: normalizePickupSettings({ ...editor.draft, ...event.patch }),
        error: '',
        message: '',
      };
    case 'refresh': {
      const saved = normalizePickupSettings(event.settings);
      return { ...editor, saved, draft: pickupEditorDirty(editor) ? editor.draft : saved };
    }
    case 'saved':
      return { ...createPickupEditor(event.settings), message: 'Pickup settings saved.' };
    case 'error':
      return { ...editor, error: event.message, message: '' };
    case 'saving':
      return { ...editor, error: '', message: '' };
  }
}

/** A write acknowledgement alone cannot become the saved baseline. */
export async function persistPickupSettings(
  draft: PickupSettings,
  readiness: PickupReadiness,
  ports: {
    write: (settings: PickupSettings) => Promise<{ saved: boolean }>;
    read: () => Promise<OwnerConnection>;
  },
  provider: 'square' | 'stripe' = 'square',
): Promise<OwnerConnection> {
  const issue = pickupSettingsIssue(draft, readiness, provider);
  if (issue) throw new Error(issue);
  try {
    const result = await ports.write(normalizePickupSettings(draft));
    if (!result.saved) throw new Error();
  } catch {
    const providerName = provider === 'stripe' ? 'Stripe' : 'Square';
    throw new Error(
      `Pickup settings were not confirmed saved. Your edits are still here. Check your ${providerName} connection and menu sync, then retry.`,
    );
  }
  try {
    const owner = await ports.read();
    // The server derives the zone from the pickup location; it is not an edit.
    if (
      !owner.settings ||
      !pickupSettingsEqual({ ...draft, timezone: owner.settings.timezone }, owner.settings)
    )
      throw new Error();
    return owner;
  } catch {
    throw new Error(
      'The save was sent, but the saved settings could not be confirmed. Your edits are still here. Retry to check and save again.',
    );
  }
}
