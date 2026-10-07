export interface ActivitySnapshot {
  scope: string;
  keys: readonly string[];
  orders: number;
}
/** Initial loads, business/account changes and resolving work must stay silent. */
export function hasNewBusinessActivity(previous: ActivitySnapshot | null, next: ActivitySnapshot) {
  if (!previous || previous.scope !== next.scope) return false;
  const known = new Set(previous.keys);
  return next.orders > previous.orders || next.keys.some((id) => !known.has(id));
}
