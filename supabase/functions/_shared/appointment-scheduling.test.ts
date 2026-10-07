import { describe, expect, it } from 'vitest';
import {
  generateDailyAppointmentSlots,
  localAppointmentInstants,
} from './appointment-scheduling.ts';

describe('appointment local-time scheduling', () => {
  it('rejects the spring-forward gap and resolves the fall-back overlap without duplicate slots', () => {
    expect(localAppointmentInstants('2026-03-08', '02:30', 'America/Chicago')).toEqual([]);
    const repeated = localAppointmentInstants('2026-11-01', '01:30', 'America/Chicago');
    expect(repeated).toHaveLength(2);
    const slots = generateDailyAppointmentSlots({
      date: '2026-11-01',
      timezone: 'America/Chicago',
      opensAt: '01:00',
      closesAt: '02:00',
      durationMinutes: 15,
      now: Date.parse('2026-10-01T00:00:00Z'),
    });
    expect(slots.map((slot) => slot.localTime)).toEqual(['01:00', '01:15', '01:30', '01:45']);
    expect(new Set(slots.map((slot) => slot.localTime)).size).toBe(slots.length);
    expect(slots.find((slot) => slot.localTime === '01:30')?.startAt).toBe(
      '2026-11-01T07:30:00.000Z',
    );
  });

  it('applies business windows, duration, buffers, notice, horizon, and busy intervals', () => {
    const slots = generateDailyAppointmentSlots({
      date: '2026-10-01',
      timezone: 'America/Chicago',
      opensAt: '09:00',
      closesAt: '11:00',
      durationMinutes: 30,
      bufferMinutes: 15,
      intervalMinutes: 15,
      minimumNoticeMinutes: 45,
      horizonDays: 30,
      now: Date.parse('2026-10-01T13:00:00Z'),
      busy: [{ startAt: '2026-10-01T14:30:00Z', endAt: '2026-10-01T15:00:00Z' }],
    });
    expect(slots.map((slot) => slot.localTime)).toEqual(['10:00', '10:15']);
    expect(slots[0].startAt).toBe('2026-10-01T15:00:00.000Z');
    expect(slots[0].endAt).toBe('2026-10-01T15:30:00.000Z');
  });

  it('keeps group sessions available until capacity is full while still blocking an assigned resource', () => {
    const slots = generateDailyAppointmentSlots({
      date: '2026-10-01',
      timezone: 'America/Chicago',
      opensAt: '09:00',
      closesAt: '10:00',
      durationMinutes: 30,
      intervalMinutes: 30,
      capacity: 2,
      now: Date.parse('2026-09-30T12:00:00Z'),
      busy: [
        { startAt: '2026-10-01T14:00:00Z', endAt: '2026-10-01T14:30:00Z', units: 1 },
        {
          startAt: '2026-10-01T14:30:00Z',
          endAt: '2026-10-01T15:00:00Z',
          units: 0,
          blocksSlot: true,
        },
      ],
    });
    expect(slots.map((slot) => slot.localTime)).toEqual(['09:00']);
  });
});
