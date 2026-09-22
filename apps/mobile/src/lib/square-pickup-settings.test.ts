import { describe, expect, it, vi } from 'vitest';
import type { OwnerConnection } from './square-commerce-core';
import {
  createPickupEditor,
  defaultPickupSettings,
  normalizePickupSettings,
  persistPickupSettings,
  pickupActivationIssue,
  pickupEditorDirty,
  pickupReadiness,
  pickupSettingsEqual,
  pickupSettingsIssue,
  updatePickupEditor,
  type PickupSettings,
} from './square-pickup-settings';

const settings: PickupSettings = {
  ...defaultPickupSettings,
  pickup_windows: [{ day: 1, start: '09:00', end: '17:00' }],
};
function owner(variations = 0): OwnerConnection {
  return {
    connection: {
      state: 'connected',
      merchantName: 'Sandbox seller',
      locationId: 'location',
      location: { name: 'Test location', address: 'Test address' },
      lastError: null,
    },
    locations: [{ id: 'location', name: 'Test location' }],
    settings: {
      ...settings,
      synced_at: '2026-09-20T00:00:00Z',
      sync_summary: { variations, excluded: 0 },
    },
  };
}

describe('pickup setup and activation', () => {
  it('requires purchasable variations even with a connected, selected, synced location', () => {
    expect(pickupReadiness(owner())).toMatchObject({
      connected: true,
      activeLocation: true,
      synced: true,
      variations: 0,
      ready: false,
    });
    expect(pickupActivationIssue(settings, pickupReadiness(owner()), 'enabled', true)).toContain(
      'purchasable',
    );
    expect(pickupActivationIssue(settings, pickupReadiness(owner()), 'is_open', true)).toContain(
      'purchasable',
    );
  });
  it('requires the selected location to remain in the authoritative active location list', () => {
    expect(pickupReadiness({ ...owner(2), locations: [] })).toMatchObject({
      locationSelected: true,
      activeLocation: false,
      ready: false,
    });
    expect(pickupReadiness({ ...owner(2), connection: null }).ready).toBe(false);
    expect(pickupReadiness({ ...owner(2), settings }).ready).toBe(false);
  });
  it('treats Stripe payment readiness and SDS sync independently of Square locations', () => {
    const stripeOwner = {
      connection: { state: 'connected', locationId: null },
      locations: [],
      settings: {
        ...settings,
        synced_at: '2026-09-21T00:00:00Z',
        sync_summary: { provider: 'stripe', variations: 15 },
      },
    } as unknown as OwnerConnection;
    expect(pickupReadiness(stripeOwner, 'stripe')).toMatchObject({
      connected: true,
      locationSelected: true,
      activeLocation: true,
      synced: true,
      variations: 15,
      ready: true,
    });
    expect(
      pickupReadiness(
        {
          ...stripeOwner,
          settings: { ...stripeOwner.settings!, synced_at: null },
        },
        'stripe',
      ).reason,
    ).toContain('SDS menu');
  });
  it('allows valid timing/windows to save with activation off and an empty catalog', () => {
    const draft = {
      ...settings,
      preparation_minutes: 35,
      minimum_notice_minutes: 40,
      max_orders_per_slot: 8,
      slot_minutes: 30,
      timezone: 'America/New_York',
      allow_upcoming_stops: true,
    };
    expect(pickupSettingsIssue(draft, pickupReadiness(owner()))).toBeNull();
    expect(
      pickupSettingsIssue({ ...draft, pickup_windows: [] }, pickupReadiness(owner())),
    ).toBeNull();
  });
  it('permits activation with positive catalog count and valid windows', () => {
    const ready = pickupReadiness(owner(2));
    expect(ready.ready).toBe(true);
    expect(pickupActivationIssue(settings, ready, 'enabled', true)).toBeNull();
    expect(
      pickupActivationIssue({ ...settings, enabled: true }, ready, 'is_open', true),
    ).toBeNull();
    expect(pickupSettingsIssue({ ...settings, enabled: true, is_open: true }, ready)).toBeNull();
  });
  it('blocks opening orders while pickup ordering is disabled', () => {
    expect(pickupActivationIssue(settings, pickupReadiness(owner(2)), 'is_open', true)).toContain(
      'Enable pickup',
    );
    expect(
      pickupSettingsIssue({ ...settings, is_open: true }, pickupReadiness(owner(2))),
    ).toContain('Turn off Ordering open');
  });
  it('always permits turning activation off if setup becomes incomplete', () => {
    const draft = { ...settings, enabled: true, is_open: true };
    expect(pickupActivationIssue(draft, pickupReadiness(null), 'enabled', false)).toBeNull();
    expect(pickupActivationIssue(draft, pickupReadiness(null), 'is_open', false)).toBeNull();
  });
  it('explains missing windows and invalid time ranges', () => {
    expect(
      pickupSettingsIssue(
        { ...settings, enabled: true, pickup_windows: [] },
        pickupReadiness(owner(2)),
      ),
    ).toContain('weekly pickup window');
    for (const window of [
      { day: 1, start: '17:00', end: '09:00' },
      { day: 1, start: '09:75', end: '17:00' },
    ]) {
      expect(
        pickupSettingsIssue({ ...settings, pickup_windows: [window] }, pickupReadiness(owner())),
      ).toContain('Closing must be later');
    }
  });
  it.each([
    ['preparation_minutes', NaN, 'Preparation time'],
    ['preparation_minutes', 0, 'Preparation time'],
    ['minimum_notice_minutes', 1441, 'Minimum advance notice'],
    ['max_orders_per_slot', 1.5, 'Maximum orders'],
    ['slot_minutes', 20, 'pickup interval'],
  ] as const)('explains invalid %s values', (key, value, message) => {
    expect(pickupSettingsIssue({ ...settings, [key]: value }, pickupReadiness(owner()))).toContain(
      message,
    );
  });
  it('explains invalid timezone', () => {
    expect(
      pickupSettingsIssue({ ...settings, timezone: 'Not/A_Timezone' }, pickupReadiness(owner())),
    ).toContain('Refresh your Square connection');
  });
});

describe('authoritative pickup settings editor', () => {
  it('normalizes stable window order and ignores sync metadata without changing activation', () => {
    const first = {
      ...owner().settings!,
      pickup_windows: [{ day: 5, start: '10:00', end: '12:00' }, ...settings.pickup_windows],
    };
    const second = {
      ...first,
      synced_at: 'later',
      pickup_windows: [...first.pickup_windows].reverse(),
    };
    expect(pickupSettingsEqual(first, second)).toBe(true);
    expect(normalizePickupSettings(first)).not.toHaveProperty('synced_at');
    expect(normalizePickupSettings({ ...first, enabled: true }).enabled).toBe(true);
  });
  it('becomes clean when a user changes then reverts a value or window', () => {
    const saved = createPickupEditor(settings);
    const edited = updatePickupEditor(saved, { type: 'edit', patch: { preparation_minutes: 45 } });
    expect(pickupEditorDirty(edited)).toBe(true);
    expect(
      pickupEditorDirty(
        updatePickupEditor(edited, {
          type: 'edit',
          patch: { preparation_minutes: settings.preparation_minutes },
        }),
      ),
    ).toBe(false);
    const windowEdit = updatePickupEditor(saved, { type: 'edit', patch: { pickup_windows: [] } });
    expect(
      pickupEditorDirty(
        updatePickupEditor(windowEdit, {
          type: 'edit',
          patch: { pickup_windows: settings.pickup_windows },
        }),
      ),
    ).toBe(false);
  });
  it('preserves dirty drafts on background owner refresh; unrelated queue data is separate', () => {
    const edited = updatePickupEditor(createPickupEditor(settings), {
      type: 'edit',
      patch: { preparation_minutes: 45 },
    });
    const refreshed = updatePickupEditor(edited, {
      type: 'refresh',
      settings: { ...settings, max_orders_per_slot: 9 },
    });
    expect(refreshed.draft).toEqual(edited.draft);
    expect(refreshed.saved.max_orders_per_slot).toBe(9);
    expect(pickupEditorDirty(refreshed)).toBe(true);
  });
  it('reads authoritative settings after saving and clears dirty with contextual confirmation', async () => {
    const edited = updatePickupEditor(createPickupEditor(settings), {
      type: 'edit',
      patch: { preparation_minutes: 45 },
    });
    const write = vi.fn(async () => ({ saved: true }));
    const read = vi.fn(async () => ({
      ...owner(),
      settings: { ...owner().settings!, ...edited.draft },
    }));
    const result = await persistPickupSettings(edited.draft, pickupReadiness(owner()), {
      write,
      read,
    });
    const confirmed = updatePickupEditor(edited, { type: 'saved', settings: result.settings! });
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({ preparation_minutes: 45, enabled: false, is_open: false }),
    );
    expect(read).toHaveBeenCalledOnce();
    expect(confirmed.draft).toEqual(confirmed.saved);
    expect(pickupEditorDirty(confirmed)).toBe(false);
    expect(confirmed.message).toBe('Pickup settings saved.');
    expect(confirmed.error).toBe('');
  });
  it('retains genuinely dirty edits and safe contextual feedback on rejection', async () => {
    const edited = updatePickupEditor(createPickupEditor(settings), {
      type: 'edit',
      patch: { preparation_minutes: 45 },
    });
    const read = vi.fn(async () => owner());
    let message = '';
    try {
      await persistPickupSettings(edited.draft, pickupReadiness(owner()), {
        write: async () => {
          throw new Error('private provider payload');
        },
        read,
      });
    } catch (error) {
      message = (error as Error).message;
    }
    const failed = updatePickupEditor(edited, { type: 'error', message });
    expect(pickupEditorDirty(failed)).toBe(true);
    expect(failed.error).toContain('Your edits are still here');
    expect(failed.error).not.toContain('private');
    expect(failed.message).toBe('');
    expect(read).not.toHaveBeenCalled();
    expect(
      pickupEditorDirty(
        updatePickupEditor(createPickupEditor(settings), { type: 'error', message }),
      ),
    ).toBe(false);
  });
  it('rejects stale true activation before any request rather than silently turning it off', async () => {
    const draft = { ...settings, enabled: true, is_open: true };
    const write = vi.fn(async () => ({ saved: true }));
    await expect(
      persistPickupSettings(draft, pickupReadiness(owner()), { write, read: async () => owner() }),
    ).rejects.toThrow('Turn off');
    expect(write).not.toHaveBeenCalled();
    expect(draft.enabled).toBe(true);
  });
  it('does not claim success when server acknowledgement or read-back disagrees', async () => {
    const draft = { ...settings, preparation_minutes: 45 };
    await expect(
      persistPickupSettings(draft, pickupReadiness(owner()), {
        write: async () => ({ saved: false }),
        read: async () => owner(),
      }),
    ).rejects.toThrow('not confirmed saved');
    await expect(
      persistPickupSettings(draft, pickupReadiness(owner()), {
        write: async () => ({ saved: true }),
        read: async () => owner(),
      }),
    ).rejects.toThrow('could not be confirmed');
  });
  it('accepts an automatically resolved location zone while still verifying edited hours', async () => {
    const resolved = { ...owner(), settings: { ...settings, timezone: 'America/New_York' } };
    const result = await persistPickupSettings(settings, pickupReadiness(owner()), {
      write: async () => ({ saved: true }),
      read: async () => resolved,
    });
    expect(result.settings?.timezone).toBe('America/New_York');
    await expect(
      persistPickupSettings(settings, pickupReadiness(owner()), {
        write: async () => ({ saved: true }),
        read: async () => ({ ...resolved, settings: { ...resolved.settings, pickup_windows: [] } }),
      }),
    ).rejects.toThrow('could not be confirmed');
  });
});
