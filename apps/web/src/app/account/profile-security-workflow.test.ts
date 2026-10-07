import { beforeEach, expect, it, vi } from 'vitest';
import { updateProfileAction } from './actions';
const h = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), user: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: h.user },
    from: () => ({
      update: (value: unknown) => {
        h.update(value);
        return { eq: h.eq };
      },
    }),
  }),
}));
const form = (name: string) => {
  const f = new FormData();
  for (const [key, value] of Object.entries({
    displayName: name,
    city: '',
    regionCode: '',
    postalCode: '',
  }))
    f.set(key, value);
  return f;
};
beforeEach(() => {
  vi.resetAllMocks();
  h.user.mockResolvedValue({ data: { user: { id: 'current-user' } }, error: null });
  h.eq.mockResolvedValue({ error: null });
});
it('clears an optional display name using SQL NULL rather than violating the deployed-source length constraint', async () => {
  const result = await updateProfileAction({}, form('   '));
  expect(result).toEqual({ success: 'Profile saved.' });
  expect(h.update).toHaveBeenCalledWith({
    display_name: null,
    city: null,
    region_code: null,
    postal_code: null,
  });
  expect(h.eq).toHaveBeenCalledWith('id', 'current-user');
});
it('keeps a supplied name and binds the write to the verified user', async () => {
  await updateProfileAction({}, form('  Local Customer  '));
  expect(h.update).toHaveBeenCalledWith(
    expect.objectContaining({ display_name: 'Local Customer' }),
  );
  expect(h.eq).toHaveBeenCalledWith('id', 'current-user');
});
it('does not write after authentication fails even if a stale user object is present', async () => {
  h.user.mockResolvedValue({ data: { user: { id: 'stale-user' } }, error: { message: 'expired' } });
  expect(await updateProfileAction({}, form('Customer'))).toEqual({
    message: 'Please sign in again.',
  });
  expect(h.update).not.toHaveBeenCalled();
});
