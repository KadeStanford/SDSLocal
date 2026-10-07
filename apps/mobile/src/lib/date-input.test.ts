import { describe, expect, it } from 'vitest';
import { dateInputValue, parseDateInput } from './date-input';

describe('date-only form values', () => {
  it.each(['2024-02-29', '2026-01-01', '2026-12-31', '0099-06-15'])(
    'round-trips %s without a UTC date shift',
    (value) => {
      const date = parseDateInput(value)!;
      expect(dateInputValue(date)).toBe(value);
      expect(date.getHours()).toBe(12);
    },
  );
  it.each([
    '',
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-01-00',
    '10/3/2026',
    '2026-1-1',
  ])('rejects invalid or ambiguous date %s', (value) => expect(parseDateInput(value)).toBeNull());
});
