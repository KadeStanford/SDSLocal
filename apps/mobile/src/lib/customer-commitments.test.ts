import { describe, it, expect } from 'vitest';
import { personalEventScope, appointmentIsPast } from './customer-commitments';
import { customerProfileSchema } from '@sds/validation';
import { workspaceOfferingTerminology, workspaceSectionLabel } from './business-workspace-config';
const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
describe('customer commitment continuity', () => {
  it('includes saved/RSVP events even without a followed business', () => expect(personalEventScope([], [a])).toBe(`id.in.(${a})`));
  it('unions both sources, deduplicates and rejects filter injection', () => expect(personalEventScope([a,a,'foo),id.neq.bar'], [b,b])).toBe(`business_id.in.(${a}),id.in.(${b})`));
  it('leaves an empty scope empty, never matching all events', () => expect(personalEventScope([], [])).toBe(''));
  it.each(['cancelled','completed','no_show'])('puts %s bookings in history even before scheduled end', status => expect(appointmentIsPast({status,ends_at:'2030-01-01'},0)).toBe(true));
  it('keeps upcoming confirmed bookings and moves elapsed bookings into history', () => {
    expect(appointmentIsPast({status:'confirmed',ends_at:'2030-01-01'},Date.parse('2026-10-01'))).toBe(false);
    expect(appointmentIsPast({status:'confirmed',ends_at:'2026-09-01'},Date.parse('2026-10-01'))).toBe(true);
  });
});
it('accepts an optional blank name but validates nonempty names', () => {
  for (const displayName of ['', '   ', 'Jo']) expect(customerProfileSchema.safeParse({ displayName }).success).toBe(true);
  for (const displayName of ['J', 'a'.repeat(101)]) expect(customerProfileSchema.safeParse({ displayName }).success).toBe(false);
});
it('uses business-specific offering labels', () => {
  expect(workspaceSectionLabel('offerings','retail')).toBe('Products');
  expect(workspaceOfferingTerminology('retail').item).toBe('product');
  expect(workspaceSectionLabel('offerings','general')).toBe('Offerings');
  expect(workspaceSectionLabel('offerings','services')).toBe('Services');
});
