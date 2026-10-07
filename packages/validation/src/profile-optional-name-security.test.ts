import { expect, it } from 'vitest';
import { customerProfileSchema } from './index';

it.each(['', ' ', '   \t\n'])('permits a blank optional profile name after trimming', displayName => {
  expect(customerProfileSchema.parse({ displayName }).displayName).toBe('');
});
it.each(['A', '  A  ', 'a'.repeat(101)])('keeps invalid nonblank profile names rejected', displayName => {
  expect(customerProfileSchema.safeParse({ displayName }).success).toBe(false);
});
it('preserves a valid name and normalizes optional locality', () => {
  expect(customerProfileSchema.parse({ displayName: ' Local Customer ', city: ' ', regionCode: '', postalCode: '' })).toEqual({ displayName: 'Local Customer', city: undefined, regionCode: undefined, postalCode: undefined });
});
