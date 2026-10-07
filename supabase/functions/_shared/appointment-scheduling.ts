export interface AppointmentBusyInterval {
  startAt: string;
  endAt: string;
  units?: number;
  blocksSlot?: boolean;
}

export interface AppointmentSlot {
  startAt: string;
  endAt: string;
  localTime: string;
  utcOffsetMinutes: number;
}

function localParts(epoch: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(epoch));
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function localMatches(epoch: number, timeZone: string, date: string, hour: string, minute: string) {
  const parts = localParts(epoch, timeZone);
  return (
    parts.year === date.slice(0, 4) &&
    parts.month === date.slice(5, 7) &&
    parts.day === date.slice(8, 10) &&
    parts.hour === hour &&
    parts.minute === minute
  );
}

/**
 * Converts one wall-clock time into its possible instants. DST gaps return no
 * instant. Repeated fall-back times return both, allowing callers to choose a
 * single, documented occurrence instead of accidentally offering duplicates.
 */
export function localAppointmentInstants(date: string, time: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error('Invalid local appointment time.');
  const [year, month, day] = date.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  )
    throw new Error('Invalid local appointment date.');
  const [hour, minute] = time.split(':');
  const wallAsUtc = Date.UTC(year, month - 1, day, Number(hour), Number(minute));
  const probe = new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(wallAsUtc));
  if (!probe) throw new Error('Invalid business time zone.');

  let candidate = wallAsUtc;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = localParts(candidate, timeZone);
    const observedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const correction = wallAsUtc - observedAsUtc;
    if (!correction) break;
    candidate += correction;
  }

  const candidates: number[] = [];
  for (let delta = -4 * 60; delta <= 4 * 60; delta += 15) {
    const epoch = candidate + delta * 60_000;
    if (localMatches(epoch, timeZone, date, hour, minute)) candidates.push(epoch);
  }
  return [...new Set(candidates)].sort((a, b) => a - b);
}

function timeMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error('Invalid business hours.');
  return Number(match[1]) * 60 + Number(match[2]);
}

function utcOffsetMinutes(epoch: number, timeZone: string) {
  const parts = localParts(epoch, timeZone);
  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  );
  return Math.round((localAsUtc - Math.floor(epoch / 60_000) * 60_000) / 60_000);
}

export function generateDailyAppointmentSlots(input: {
  date: string;
  timezone: string;
  opensAt: string;
  closesAt: string;
  durationMinutes: number;
  bufferMinutes?: number;
  intervalMinutes?: number;
  minimumNoticeMinutes?: number;
  horizonDays?: number;
  capacity?: number;
  now?: number;
  busy?: readonly AppointmentBusyInterval[];
}) {
  const open = timeMinutes(input.opensAt);
  const close = timeMinutes(input.closesAt);
  const duration = input.durationMinutes;
  const buffer = input.bufferMinutes ?? 0;
  const interval = input.intervalMinutes ?? 15;
  const capacity = input.capacity ?? 1;
  if (
    close <= open ||
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 600 ||
    !Number.isInteger(buffer) ||
    buffer < 0 ||
    buffer > 240 ||
    !Number.isInteger(interval) ||
    interval < 5 ||
    interval > 60 ||
    60 % interval !== 0 ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    capacity > 100
  )
    throw new Error('Invalid appointment schedule.');

  const now = input.now ?? Date.now();
  const minimum = now + Math.max(0, input.minimumNoticeMinutes ?? 0) * 60_000;
  const horizon = now + Math.max(1, input.horizonDays ?? 90) * 86_400_000;
  const busy = (input.busy ?? []).map((item) => ({
    start: Date.parse(item.startAt),
    end: Date.parse(item.endAt),
    units: item.units ?? 1,
    blocksSlot: item.blocksSlot ?? capacity === 1,
  }));
  const slots: AppointmentSlot[] = [];

  for (let localStart = open; localStart + duration + buffer <= close; localStart += interval) {
    const time = `${String(Math.floor(localStart / 60)).padStart(2, '0')}:${String(localStart % 60).padStart(2, '0')}`;
    // During fall-back, pick the standard-time occurrence once (the later
    // instant), matching PostgreSQL's `timestamp AT TIME ZONE` resolution. The UI can show its
    // UTC offset so the customer and operator see the same unambiguous instant.
    const start = localAppointmentInstants(input.date, time, input.timezone).at(-1);
    if (start === undefined || start < minimum || start > horizon) continue;
    const end = start + duration * 60_000;
    const blockedEnd = end + buffer * 60_000;
    const overlapping = busy.filter((item) => start < item.end && blockedEnd > item.start);
    if (
      overlapping.some((item) => item.blocksSlot) ||
      overlapping.reduce((total, item) => total + item.units, 0) >= capacity
    )
      continue;
    slots.push({
      startAt: new Date(start).toISOString(),
      endAt: new Date(end).toISOString(),
      localTime: time,
      utcOffsetMinutes: utcOffsetMinutes(start, input.timezone),
    });
  }
  return slots;
}
