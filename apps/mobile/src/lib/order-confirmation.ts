import { paymentNeedsCustomer } from './pending-payment';
/** SDK success is a submission signal; only server state confirms the order. */
export async function waitForOrderConfirmation<
  T extends { status: string; providerStatus?: string | null },
>(
  read: () => Promise<T | null>,
  options: {
    active?: () => boolean;
    attempts?: number;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
    budgetMs?: number;
  } = {},
) {
  const active = options.active ?? (() => true);
  const sleep = options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const deadline = now() + (options.budgetMs ?? 10000);
  let latest: T | null = null;
  for (let attempt = 0; attempt < (options.attempts ?? 6) && active(); attempt++) {
    if (attempt) await sleep(2000);
    if (!active() || now() >= deadline) break;
    try {
      latest = await read();
      if (latest && (latest.status !== 'checkout_pending' || paymentNeedsCustomer(latest)))
        return latest;
    } catch {
      // A lost response never turns a submitted payment into a failed payment.
    }
  }
  return latest;
}
