import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, it, vi } from 'vitest';
import { customerProfileSchema } from '@sds/validation';
// Compile the actual account callback rather than reimplementing its write.
const text = fs.readFileSync(
  fileURLToPath(new URL('../app/(tabs)/account.tsx', import.meta.url)),
  'utf8',
);
const source = ts.createSourceFile(
  'account.tsx',
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let callback = '';
function visit(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'saveProfile')
    callback = node.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
if (!callback) throw new Error('Actual saveProfile callback unavailable');
const body = ts.transpileModule(callback + '\nreturn saveProfile;', {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
async function save(name: string, session: unknown = { user: { id: 'current-user' } }) {
  const update = vi.fn(),
    eq = vi.fn().mockResolvedValue({ error: null }),
    alert = vi.fn(),
    busy = vi.fn();
  const factory = new Function(
    'customerProfileSchema',
    'supabase',
    'session',
    'displayName',
    'city',
    'regionCode',
    'postalCode',
    'setBusy',
    'Alert',
    'haptics',
    'userMessageFromError',
    body,
  );
  await factory(
    customerProfileSchema,
    {
      from: () => ({
        update: (value: unknown) => {
          update(value);
          return { eq };
        },
      }),
    },
    session,
    name,
    '',
    '',
    '',
    busy,
    { alert },
    { success: () => {}, error: () => {} },
    () => 'Safe error',
  )();
  return { update, eq, alert, busy };
}
it('clears an optional mobile profile name with NULL and only the current user ID', async () => {
  const result = await save('   ');
  expect(result.update).toHaveBeenCalledWith({
    display_name: null,
    city: null,
    region_code: null,
    postal_code: null,
  });
  expect(result.eq).toHaveBeenCalledWith('id', 'current-user');
  expect(result.alert).toHaveBeenCalledWith('Saved', 'Your profile is up to date.');
});
it('does not write a mobile profile without a session', async () => {
  const result = await save('Customer', null);
  expect(result.update).not.toHaveBeenCalled();
});
it('keeps a normalized nonempty mobile name', async () => {
  const result = await save('  Customer  ');
  expect(result.update).toHaveBeenCalledWith(expect.objectContaining({ display_name: 'Customer' }));
});
