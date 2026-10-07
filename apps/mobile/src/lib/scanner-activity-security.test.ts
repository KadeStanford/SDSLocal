import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, it, vi } from 'vitest';
const text = fs.readFileSync(
  fileURLToPath(new URL('../app/(tabs)/staff-scan.tsx', import.meta.url)),
  'utf8',
);
const source = ts.createSourceFile(
  'staff-scan.tsx',
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let callback = '';
function visit(node: ts.Node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(source) === 'loadActivity' &&
    node.initializer &&
    ts.isCallExpression(node.initializer) &&
    node.initializer.arguments[0]
  )
    callback = node.initializer.arguments[0].getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
if (!callback) throw new Error('Actual activity callback unavailable');
const body = ts.transpileModule('return ' + callback + ';', {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
function loader() {
  const stats = vi.fn(),
    log = vi.fn(),
    loading = vi.fn(),
    rpc = vi.fn(),
    error = vi.fn();
  const identity = { current: 'owner-a' as string | null },
    selected = { current: 'business-a' as string | null },
    version = { current: 0 };
  const fn = new Function(
    'session',
    'selectedId',
    'supabase',
    'setActivityLoading',
    'setStats',
    'setLog',
    'num',
    'activityIdentity',
    'activityBusiness',
    'activityVersion',
    'setActivityError',
    'setActivityContext',
    body,
  )(
    { user: { id: 'owner-a' } },
    'business-a',
    { rpc },
    loading,
    stats,
    log,
    (v: unknown) => Number(v) || 0,
    identity,
    selected,
    version,
    error,
    vi.fn(),
  );
  return { fn, stats, log, loading, rpc, identity, selected, version, error };
}
function response(h: ReturnType<typeof loader>) {
  let finish!: (value: unknown) => void;
  const pending = new Promise((resolve) => (finish = resolve));
  h.rpc.mockReturnValue(pending);
  return () =>
    finish({
      data: [{ completed_scans: 3, customer_name: 'Customer A private name' }],
      error: null,
    });
}
it('does not publish a previous account scan log after the identity changes', async () => {
  const h = loader(),
    finish = response(h),
    pending = h.fn();
  h.identity.current = 'owner-b';
  finish();
  await pending;
  expect(h.log).not.toHaveBeenCalled();
  expect(h.stats).not.toHaveBeenCalled();
});
it('does not label the previous business activity as the newly selected business', async () => {
  const h = loader(),
    finish = response(h),
    pending = h.fn();
  h.selected.current = 'business-b';
  finish();
  await pending;
  expect(h.log).not.toHaveBeenCalled();
  expect(h.stats).not.toHaveBeenCalled();
});
it('supplies the complete RPC contract and publishes only the current context', async () => {
  const h = loader(),
    finish = response(h),
    pending = h.fn();
  finish();
  await pending;
  expect(h.rpc).toHaveBeenCalledWith(
    'list_business_scan_log',
    expect.objectContaining({
      p_business_id: 'business-a',
      p_limit: 20,
      p_from: expect.any(String),
      p_to: expect.any(String),
    }),
  );
  expect(h.log).toHaveBeenCalledOnce();
  expect(h.loading).toHaveBeenLastCalledWith(false);
});
it('settles a transport rejection without leaving activity busy', async () => {
  const h = loader();
  h.rpc.mockRejectedValue(new Error('offline'));
  await expect(h.fn()).resolves.toBeUndefined();
  expect(h.loading).toHaveBeenLastCalledWith(false);
  expect(h.error).toHaveBeenLastCalledWith(expect.stringContaining('could not load'));
});

it('keeps the newer refresh when an earlier request completes last', async () => {
  const h = loader();
  let finishFirst!: (value: unknown) => void;
  let finishSecond!: (value: unknown) => void;
  const first = new Promise((resolve) => (finishFirst = resolve));
  const second = new Promise((resolve) => (finishSecond = resolve));
  h.rpc
    .mockReturnValueOnce(first)
    .mockReturnValueOnce(first)
    .mockReturnValueOnce(second)
    .mockReturnValueOnce(second);
  const older = h.fn();
  const newer = h.fn();
  finishSecond({ data: [{ completed_scans: 42, customer_name: 'Current customer' }], error: null });
  await newer;
  finishFirst({
    data: [{ completed_scans: 1, customer_name: 'Old private customer' }],
    error: null,
  });
  await older;
  expect(h.log).toHaveBeenCalledOnce();
  expect(h.stats).toHaveBeenLastCalledWith(expect.objectContaining({ completedScans: 42 }));
});

it('drops a completed request after the scanner route is unmounted', async () => {
  const h = loader(),
    finish = response(h),
    pending = h.fn();
  h.identity.current = null;
  h.selected.current = null;
  finish();
  await pending;
  expect(h.log).not.toHaveBeenCalled();
  expect(h.stats).not.toHaveBeenCalled();
});

it('shows a safe retry message for a denied RPC without publishing partial data', async () => {
  const h = loader();
  h.rpc.mockResolvedValue({
    data: [{ customer_name: 'Do not display' }],
    error: { code: '42501', message: 'Private database detail' },
  });
  await h.fn();
  expect(h.log).toHaveBeenLastCalledWith([]);
  expect(h.stats).toHaveBeenLastCalledWith(null);
  expect(h.error).toHaveBeenLastCalledWith(
    'Scan activity could not load. Reopen activity to retry.',
  );
  expect(h.loading).toHaveBeenLastCalledWith(false);
});
