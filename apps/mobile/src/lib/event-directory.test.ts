import { expect, it } from 'vitest';
import { defaultEventDirectoryFilter as defaults, eventDirectorySections, filterDirectoryEvents, upcomingEventPath, type DirectoryEvent } from './event-directory';
const now = new Date('2026-09-30T02:00:00Z'); // Tuesday evening in Louisiana.
const event = (id: string, startsAt: string, patch: Partial<DirectoryEvent> = {}): DirectoryEvent => ({ id, title: 'Coffee tasting', startsAt, timezone: 'America/Chicago', businessId: id, businessName: 'Juniper Kitchen', category: 'Food & drink', city: 'Hammond', address: 'Main Street', ...patch });

it('uses each event timezone for today instead of the UTC date', () => {
  const events = [event('tonight','2026-09-30T03:00:00Z'),event('tomorrow','2026-09-30T15:00:00Z')];
  expect(filterDirectoryEvents(events,{...defaults,when:'today'},now).map(e=>e.id)).toEqual(['tonight']);
});
it('combines text, area, category and upcoming-only constraints', () => {
  const events = [event('match','2026-10-01T15:00:00Z'), event('past','2026-09-29T15:00:00Z'), event('other-city','2026-10-01T15:00:00Z',{city:'Covington'}), event('other-type','2026-10-01T15:00:00Z',{category:'Music'})];
  expect(filterDirectoryEvents(events,{...defaults,query:'JUNIPER',city:'Hammond',category:'Food & drink'},now).map(e=>e.id)).toEqual(['match']);
});
it('keeps this weekend on the current Sunday rather than jumping forward a week', () => {
  const events=[event('sunday','2026-10-04T20:00:00Z'),event('next','2026-10-10T20:00:00Z')];
  expect(filterDirectoryEvents(events,{...defaults,when:'weekend'},new Date('2026-10-04T15:00:00Z')).map(e=>e.id)).toEqual(['sunday']);
});
it('bounds a 224-event overview and avoids repeating cards between shelves', () => {
  const events=Array.from({length:224},(_,i)=>event(String(i),new Date(+now+(i+1)*3600000).toISOString(),{category:['Food','Art','Music'][i%3]!}));
  const sections=eventDirectorySections(events,now),ids=sections.flatMap(s=>s.events.map(e=>e.id));
  expect(sections.length).toBeLessThanOrEqual(4);
  expect(sections.every(s=>s.events.length<=4)).toBe(true);
  expect(new Set(ids).size).toBe(ids.length);
  expect(filterDirectoryEvents(events,defaults,now)).toHaveLength(224);
});
it('routes an upcoming card to its exact event, not its host business', () => {
  expect(upcomingEventPath('event-one')).toBe('/calendar?scope=all-upcoming&eventId=event-one');
  expect(upcomingEventPath('id&scope=other')).toContain('eventId=id%26scope%3Dother');
});
