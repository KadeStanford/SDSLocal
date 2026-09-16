import type { EventTimezone } from '@sds/validation';

export const eventTimezoneOptions: readonly [EventTimezone, string][] = [
  ['America/New_York', 'Eastern Time'],
  ['America/Chicago', 'Central Time'],
  ['America/Denver', 'Mountain Time'],
  ['America/Phoenix', 'Arizona Time'],
  ['America/Los_Angeles', 'Pacific Time'],
  ['America/Anchorage', 'Alaska Time'],
  ['Pacific/Honolulu', 'Hawaii Time'],
];

function partsFor(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
}

export function localEventTimeToIso(value: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const desired = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
  let candidate = new Date(desired);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = partsFor(candidate, timezone);
    const represented = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    candidate = new Date(candidate.getTime() + desired - represented);
  }
  const confirmed = partsFor(candidate, timezone);
  if (
    confirmed.year !== Number(match[1]) ||
    confirmed.month !== Number(match[2]) ||
    confirmed.day !== Number(match[3]) ||
    confirmed.hour !== Number(match[4]) ||
    confirmed.minute !== Number(match[5])
  ) {
    return null;
  }
  return candidate.toISOString();
}

export function eventTimeInputValue(value: string | null, timezone: string) {
  if (!value) return '';
  const parts = partsFor(new Date(value), timezone);
  const pad = (item: number) => String(item).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatEventTime(value: string, timezone: string, includeYear = true) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: includeYear ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}
