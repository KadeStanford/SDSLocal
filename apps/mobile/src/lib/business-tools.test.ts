import { expect, it } from 'vitest';
import { hexToHsv, hsvToHex, colorText } from './brand-color';
import {
  requestFormError,
  requestAnswersError,
  requestAnswerSnapshot,
  type RequestField,
} from './service-request-schema';
it.each(['#000000', '#FFFFFF', '#176B4D', '#F08030', '#19A1CE'])(
  'round trips %s for the color picker',
  (hex) => {
    const c = hexToHsv(hex);
    expect(hsvToHex(c.h, c.s, c.v)).toBe(hex);
  },
);
it('chooses readable preview text', () => {
  expect(colorText('#FFFFFF')).toBe('#10271E');
  expect(colorText('#122F27')).toBe('#FFFFFF');
});
const fields: RequestField[] = [
  {
    id: 'job',
    label: 'Type of work',
    type: 'choice',
    required: true,
    options: ['Repair', 'Install'],
  },
  { id: 'day', label: 'Date', type: 'date', required: false, options: [] },
  { id: 'size', label: 'Size', type: 'number', required: false, options: [] },
];
it('validates custom question definitions', () => {
  expect(requestFormError(fields)).toBeNull();
  expect(requestFormError([...fields, fields[0]!])).toContain('unique');
  expect(requestFormError([{ ...fields[0]!, options: ['Same', 'Same'] }])).toContain('unique');
});
it('requires configured choices and validates dates/numbers', () => {
  expect(requestAnswersError(fields, {})).toContain('Type of work');
  expect(requestAnswersError(fields, { job: 'Other' })).toContain('Choose');
  expect(requestAnswersError(fields, { job: 'Repair', day: '2026-02-30' })).toContain('valid date');
  expect(requestAnswersError(fields, { job: 'Repair', size: '1e10' })).toContain('number');
  expect(
    requestAnswersError(fields, { job: 'Repair', day: '2026-10-02', size: '2500' }),
  ).toBeNull();
});
it('freezes a labelled answer copy and omits empty or unrelated answers', () => {
  const answers = { job: 'Repair', unknown: 'ignore' };
  const snapshot = requestAnswerSnapshot(fields, answers);
  answers.job = 'Install';
  expect(snapshot).toEqual([{ id: 'job', label: 'Type of work', type: 'choice', value: 'Repair' }]);
});
