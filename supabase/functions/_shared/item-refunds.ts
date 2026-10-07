import { fail } from './square-security.ts';

type Row = Record<string, any>;
/** Allocate the actual paid total, including discounts and taxes, to saved lines. */
export function refundOptions(order: Row, rows: Row[]) {
  const history = order.item_refunds ?? [];
  const attributed = history
    .filter((r: Row) => r.state === 'completed')
    .reduce((n: number, r: Row) => n + r.amount, 0);
  if (attributed !== Number(order.refunded_minor ?? 0)) return null;
  const lines = rows.slice().sort((a, b) => a.id.localeCompare(b.id));
  if (
    !lines.length ||
    lines.some(
      (r) =>
        !r.id ||
        !Number.isSafeInteger(Number(r.snapshot.quantity)) ||
        Number(r.snapshot.quantity) < 1 ||
        !Number.isSafeInteger(r.snapshot.total_money?.amount) ||
        r.snapshot.total_money.amount < 0,
    )
  )
    return null;
  const weight = lines.reduce((n, r) => n + r.snapshot.total_money.amount, 0);
  const total = Number(order.total_minor);
  if (!weight || !Number.isSafeInteger(total) || total < 1 || !Number.isSafeInteger(total * weight))
    return null;
  const allocations = lines.map((r) => ({
    r,
    amount: Math.floor((total * r.snapshot.total_money.amount) / weight),
    remainder: (total * r.snapshot.total_money.amount) % weight,
  }));
  let cents = total - allocations.reduce((n, a) => n + a.amount, 0);
  for (const a of allocations
    .slice()
    .sort((a, b) => b.remainder - a.remainder || a.r.id.localeCompare(b.r.id)))
    if (cents-- > 0) a.amount++;
  return allocations.map(({ r, amount }) => {
    const quantity = Number(r.snapshot.quantity);
    const used = history
      .filter((h: Row) => h.state !== 'failed')
      .reduce(
        (n: number, h: Row) => n + (h.items.find((i: Row) => i.itemId === r.id)?.quantity ?? 0),
        0,
      );
    const unit = Math.floor(amount / quantity),
      extra = amount % quantity;
    return {
      itemId: r.id,
      name: r.snapshot.name,
      quantity,
      available: Math.max(0, quantity - used),
      used,
      unit,
      extra,
    };
  });
}

export function planItemRefund(order: Row, rows: Row[], selection: unknown, key: string) {
  const options = refundOptions(order, rows);
  if (!options)
    fail(
      'REFUND_RECONCILIATION',
      'A previous refund cannot be matched to items. Review it in the payment dashboard or refund the remaining payment.',
      409,
    );
  if (!Array.isArray(selection) || !selection.length || selection.length > rows.length)
    fail('INVALID_REFUND_ITEMS', 'Choose items to refund.');
  const seen = new Set<string>();
  const items = selection.map((input) => {
    const option = options!.find((o) => o.itemId === input?.itemId);
    if (
      !option ||
      seen.has(option.itemId) ||
      !Number.isSafeInteger(input.quantity) ||
      input.quantity < 1 ||
      input.quantity > option.available
    )
      fail('INVALID_REFUND_ITEMS', 'An item or quantity changed. Refresh before refunding.', 409);
    seen.add(option.itemId);
    const amount =
      option.unit * input.quantity +
      Math.max(0, Math.min(input.quantity, option.extra - option.used));
    return { itemId: option.itemId, quantity: input.quantity, amount };
  });
  const amount = items.reduce((n, i) => n + i.amount, 0);
  if (amount < 1 || amount > Number(order.total_minor) - Number(order.refunded_minor ?? 0))
    fail('INVALID_REFUND_ITEMS', 'These items have no remaining refundable payment.', 409);
  if ((order.item_refunds ?? []).length >= 100)
    fail('REFUND_LIMIT', 'Review further refunds in the payment dashboard.', 409);
  return {
    amount,
    history: [
      ...(order.item_refunds ?? []),
      { key, items, amount, before: Number(order.refunded_minor ?? 0), state: 'pending' },
    ],
  };
}
