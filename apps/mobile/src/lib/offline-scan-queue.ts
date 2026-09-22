export interface PendingScan {
  readonly id: number;
  readonly token: string;
  readonly action: 'auto' | 'redemption';
  readonly purchaseAmountMinor: number | null;
  readonly expectedBusinessId: string;
  readonly scanSource: 'camera' | 'manual';
  readonly idempotencyKey: string;
  readonly createdAt: string;
}

/** Web keeps the scanner online-only; the native implementation is selected by Metro. */
export async function enqueuePendingScan(_scan: Omit<PendingScan, 'id'>) {
  return null;
}

export async function listPendingScans(_businessId?: string) {
  return [] as PendingScan[];
}

export async function removePendingScan(_id: number) {
  return;
}

export async function clearPendingScans() {
  return;
}
