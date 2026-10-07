import { describe, expect, it } from 'vitest';
import {
  requestAnswersError,
  requestAnswerSnapshot,
  requestFormError,
  type RequestField,
  type RequestFieldType,
} from './service-request-schema';

const field = (type: RequestFieldType, required = false): RequestField => ({
  id: 'contact',
  label: 'Contact',
  type,
  required,
  options: [],
});
describe('typed request answers', () => {
  it.each([
    ['email', 'person+tag@example.com'],
    ['email', 'first.last@sub.example.com'],
    ['phone', '+44 (20) 1234-5678'],
    ['phone', '0987654321'],
    ['phone', '555.123.4567'],
    ['url', 'https://example.com'],
    ['url', 'http://sub.example.com:8080/path?q=yes#info'],
    ['url', 'HTTPS://EXAMPLE.COM'],
  ] as const)('accepts %s: %s', (type, answer) => {
    expect(requestFormError([field(type)])).toBeNull();
    expect(requestAnswersError([field(type)], { contact: answer })).toBeNull();
    expect(requestAnswerSnapshot([field(type)], { contact: ` ${answer} ` })[0]?.value).toBe(answer);
  });
  it.each([
    ['email', 'no-at.example.com'],
    ['email', 'a@@example.com'],
    ['email', 'a@bad..com'],
    ['email', 'a b@example.com'],
    ['phone', '123'],
    ['phone', '1234567890123456'],
    ['phone', 'call me'],
    ['phone', '555+1234567'],
    ['url', 'javascript:alert(1)'],
    ['url', 'example.com'],
    ['url', 'https://'],
    ['url', 'https://bad host.com'],
    ['url', 'https://.example.com'],
    ['url', 'https://user@example.com'],
  ] as const)('rejects %s: %s', (type, answer) => {
    expect(requestAnswersError([field(type)], { contact: answer })).not.toBeNull();
  });
  it.each(['email', 'phone', 'url'] as const)(
    '%s supports optional blanks but enforces required answers',
    (type) => {
      expect(requestAnswersError([field(type)], { contact: ' ' })).toBeNull();
      expect(requestAnswersError([field(type, true)], {})).toContain('Please answer');
      expect(requestAnswersError([field(type)], { contact: 'a'.repeat(301) })).toContain('Shorten');
    },
  );
  it('long instructions allow more than one short line while preserving the limit', () => {
    expect(requestAnswersError([field('long_text')], { contact: 'a'.repeat(1000) })).toBeNull();
    expect(requestAnswersError([field('long_text')], { contact: 'a'.repeat(2001) })).toContain(
      'Shorten',
    );
    expect(requestAnswersError([field('text')], { contact: 'a'.repeat(301) })).toContain('Shorten');
  });
});
