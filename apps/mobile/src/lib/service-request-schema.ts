export type RequestFieldType =
  'text' | 'long_text' | 'number' | 'choice' | 'yes_no' | 'date' | 'email' | 'phone' | 'url';
export type RequestField = {
  id: string;
  label: string;
  type: RequestFieldType;
  required: boolean;
  options: string[];
};
export type RequestFormConfig = { revision: number; fields: RequestField[] };
export type RequestAnswer = { id: string; label: string; type: string; value: string };
export const fieldTypeLabels: Record<RequestFieldType, string> = {
  text: 'Short answer',
  long_text: 'Long answer',
  number: 'Number',
  choice: 'Choose one',
  yes_no: 'Yes or no',
  date: 'Date',
  email: 'Email address',
  phone: 'Phone number',
  url: 'Website link',
};
export function requestFormError(fields: readonly RequestField[]) {
  if (fields.length > 15) return 'Use up to 15 questions.';
  if (new Set(fields.map((f) => f.id)).size !== fields.length)
    return 'Each question needs a unique identifier.';
  for (const field of fields) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(field.id)) return 'Invalid question identifier.';
    if (!field.label.trim() || field.label.length > 120)
      return 'Give every question a label of 1–120 characters.';
    if (!(field.type in fieldTypeLabels)) return 'Choose a supported answer type.';
    if (
      field.type === 'choice' &&
      (field.options.length < 2 ||
        field.options.length > 12 ||
        field.options.some((v) => !v.trim() || v.length > 80) ||
        new Set(field.options.map((v) => v.trim())).size !== field.options.length)
    )
      return 'Choice questions need 2–12 unique options, each up to 80 characters.';
  }
  return null;
}
export function requestAnswersError(
  fields: readonly RequestField[],
  answers: Record<string, string>,
) {
  for (const f of fields) {
    const value = (answers[f.id] ?? '').trim();
    if (!value) {
      if (f.required) return `Please answer “${f.label}”.`;
      continue;
    }
    if (value.length > (f.type === 'long_text' ? 2000 : 300))
      return `Shorten your answer to “${f.label}”.`;
    if (f.type === 'choice' && !f.options.includes(value))
      return `Choose an option for “${f.label}”.`;
    if (f.type === 'yes_no' && !['Yes', 'No'].includes(value))
      return `Choose Yes or No for “${f.label}”.`;
    if (f.type === 'number' && !/^-?\d{1,10}(\.\d{1,4})?$/.test(value))
      return `Enter a number for “${f.label}”.`;
    if (f.type === 'email' && !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value))
      return `Enter a valid email address for “${f.label}”.`;
    if (
      f.type === 'phone' &&
      (!/^\+?[0-9() .-]+$/.test(value) ||
        value.replace(/[^0-9]/g, '').length < 7 ||
        value.replace(/[^0-9]/g, '').length > 15)
    )
      return `Enter a phone number with 7–15 digits for “${f.label}”.`;
    if (
      f.type === 'url' &&
      !/^https?:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:[0-9]{1,5})?([/?#][^\s]*)?$/i.test(
        value,
      )
    )
      return `Enter a website link starting with https:// or http:// for “${f.label}”.`;
    if (
      f.type === 'date' &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value + 'T00:00:00Z')) ||
        new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value)
    )
      return `Enter a valid date for “${f.label}” (YYYY-MM-DD).`;
  }
  return null;
}
export function requestAnswerSnapshot(
  fields: readonly RequestField[],
  answers: Record<string, string>,
): RequestAnswer[] {
  return fields
    .filter((f) => (answers[f.id] ?? '').trim())
    .map((f) => ({ id: f.id, label: f.label, type: f.type, value: (answers[f.id] ?? '').trim() }));
}
