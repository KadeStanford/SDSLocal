import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  commerce,
  newOrderAccess,
  openCheckout,
  readCart,
  readOrderAccess,
  saveCart,
  saveOrderAccess,
  type OrderAccess,
} from '@/lib/square-commerce';
import {
  type Availability,
  type CartLine,
  type PickupOrder,
  type PickupSlot,
  type Product,
  type Quote,
  pollDelay,
} from '@/lib/square-commerce-core';
import {
  cartReview,
  contactIssue,
  normalizePickupPhone,
  orderingRecovery,
  quoteUsable,
  selectedPickupPlace,
  setCartLine,
  terminalPickupStates,
  type OrderStep,
} from '@/lib/pickup-order-flow';
import { pickupDiscoveryEnabled } from '@/lib/pickup-discovery';
import { supabase } from '@/lib/supabase';
import type { IdentityPhoto } from '@/lib/business-identity';
import type { BusinessHour } from '@/lib/discovery-core';
import {
  changeSimpleQuantity,
  commitCartChange,
  hasCustomization,
  refreshedProducts,
} from '@/lib/pickup-menu-controls';
import { haptics } from '@/lib/haptics';
import { useReducedMotion } from './use-reduced-motion';
export function usePickupOrder(params: { businessId?: string; orderId?: string }) {
  const [businessId, setBusinessId] = useState(params.businessId ?? '');
  const [menu, setMenu] = useState<Availability | null>(null);
  const [identity, setIdentity] = useState<{
    name: string;
    primary_color: string;
    photos: IdentityPhoto[];
    timezone: string;
    hours: BusinessHour[];
  } | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const cartRef = useRef<CartLine[]>([]);
  const reducedMotion = useReducedMotion();
  const [slot, setSlot] = useState<PickupSlot | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [step, setStep] = useState<OrderStep>('menu');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<PickupOrder | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [access, setAccess] = useState<OrderAccess | null>(null);
  const [resumeOrder, setResumeOrder] = useState<OrderAccess | null>(null);
  const [editing, setEditing] = useState<{
    product: Product;
    products?: Product[];
    index: number | null;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const initialKey = useRef('');
  const catalogVersion = useRef('');
  const run = useCallback(async (work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setError(
        code
          ? orderingRecovery(code)
          : e instanceof Error
            ? e.message
            : 'Please check your connection and retry.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);
  const refreshStatus = useCallback(async (current: OrderAccess) => {
    const result = current.orderId
      ? await commerce<{ order: PickupOrder }>('status', {
          orderId: current.orderId,
          statusToken: current.statusToken,
        })
      : await commerce<{ order: PickupOrder | null }>('resume', {
          idempotencyKey: current.idempotencyKey,
          statusToken: current.statusToken,
        });
    if (result.order) {
      const next = { ...current, orderId: result.order.id };
      await saveOrderAccess(next);
      setAccess((old) =>
        old?.orderId === next.orderId && old?.statusToken === next.statusToken ? old : next,
      );
      setOrder(result.order);
      setLastUpdated(Date.now());
      setError('');
      setBusinessId(current.businessId);
    }
    return result.order;
  }, []);
  const loadMenu = useCallback(async (id: string) => {
    let result: Availability;
    try {
      result = await commerce<Availability>('availability', { businessId: id, catalog: true });
    } catch (error) {
      setMenu((old) => ({ ...old, available: false, status: 'unavailable' }));
      setQuote(null);
      throw error;
    }
    // Keep the last menu/cart visible during temporary closures or provider failures.
    setMenu((old) => ({
      ...old,
      ...result,
      products: result.products
        ? refreshedProducts(old?.products ?? [], result.products)
        : (old?.products ?? []),
    }));
    const version = JSON.stringify([result.available, result.products, result.slots]);
    if (catalogVersion.current !== version) setQuote(null);
    catalogVersion.current = version;
    if (result.available) {
      setPlace((old) => selectedPickupPlace(result.slots ?? [], old));
      setSlot((old) =>
        old
          ? ((result.slots ?? []).find((s) => s.at === old.at && s.stopId === old.stopId) ?? null)
          : null,
      );
    }
    return result;
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (!pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV)) return;
      void run(async () => {
        const key = `${params.businessId ?? ''}:${params.orderId ?? ''}`;
        if (initialKey.current === key) {
          if (params.businessId) await loadMenu(params.businessId);
          return;
        }
        const saved = await readOrderAccess(params.orderId, params.businessId);
        if (!saved && params.businessId) {
          const previous = await readOrderAccess();
          if (previous?.orderId && previous.businessId !== params.businessId)
            setResumeOrder(previous);
        }
        if (
          saved &&
          (!params.businessId || params.orderId || saved.businessId === params.businessId)
        ) {
          setAccess(saved);
          setBusinessId(saved.businessId);
          if ((saved.orderId || saved.quoteId) && (await refreshStatus(saved))) {
            initialKey.current = key;
            return;
          }
        } else if (saved?.orderId) setResumeOrder(saved);
        if (params.orderId) {
          const result = await commerce<{ order: PickupOrder }>('status', {
            orderId: params.orderId,
          });
          setOrder(result.order);
          setBusinessId(result.order.businessId ?? '');
          setLastUpdated(Date.now());
          setError('');
          initialKey.current = key;
          return;
        }
        if (!params.businessId) throw new Error('Open a business page to start a pickup order.');
        setBusinessId(params.businessId);
        cartRef.current = readCart(params.businessId);
        setCart(cartRef.current);
        setStep('menu');
        setOrder(null);
        await loadMenu(params.businessId);
        if (!saved || saved.businessId !== params.businessId)
          setAccess(await newOrderAccess(params.businessId));
        initialKey.current = key;
      });
    }, [params.businessId, params.orderId, loadMenu, refreshStatus, run]),
  );
  useEffect(() => {
    if (!businessId || !pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV)) return;
    let active = true;
    void Promise.all([
      supabase
        .from('businesses')
        .select('name, primary_color, timezone')
        .eq('id', businessId)
        .maybeSingle(),
      supabase
        .from('business_photos')
        .select('role, media_assets(storage_path, status)')
        .eq('business_id', businessId)
        .order('display_order'),
      supabase
        .from('business_hours')
        .select('day_of_week, opens_at, closes_at, is_closed')
        .eq('business_id', businessId),
    ]).then(
      ([b, p, h]) => {
        if (active)
          setIdentity(
            b.data
              ? {
                  name: b.data.name,
                  primary_color: b.data.primary_color,
                  photos: (p.data ?? []) as IdentityPhoto[],
                  timezone: b.data.timezone,
                  hours: (h.data ?? []) as BusinessHour[],
                }
              : null,
          );
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [businessId]);
  useEffect(() => {
    if (!businessId || order || !pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV)) return;
    const refresh = () => {
      if (AppState.currentState === 'active' && !busyRef.current)
        void run(async () => {
          await loadMenu(businessId);
        });
    };
    // Refresh while browsing, not during review of an authoritative quote.
    const timer = step === 'menu' ? setInterval(refresh, 60000) : undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [businessId, order, step, loadMenu, run]);
  useEffect(() => {
    if (!quote) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [quote]);
  const orderStatus = order?.status;
  const trackingOrderId = order?.id;
  useEffect(() => {
    if (!trackingOrderId || !orderStatus || terminalPickupStates.includes(orderStatus)) return;
    let alive = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      if (access?.orderId === trackingOrderId) await refreshStatus(access);
      else {
        const result = await commerce<{ order: PickupOrder }>('status', {
          orderId: trackingOrderId,
        });
        if (alive) {
          setOrder(result.order);
          setLastUpdated(Date.now());
          setError('');
        }
      }
    };
    const poll = async () => {
      if (!alive) return;
      if (AppState.currentState === 'active' && !busyRef.current) {
        try {
          busyRef.current = true;
          try {
            await refresh();
          } finally {
            busyRef.current = false;
          }
        } catch {
          if (alive) setError('Status could not refresh. Your order is saved; retry below.');
        }
      }
      attempt++;
      if (alive)
        timer = setTimeout(() => {
          void poll();
        }, pollDelay(attempt));
    };
    timer = setTimeout(() => {
      void poll();
    }, 3000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active')
        void run(async () => {
          await refresh();
        });
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, [access, trackingOrderId, orderStatus, refreshStatus, run]);
  function updateCart(next: CartLine[]) {
    const saved = commitCartChange(
      next,
      (value) => saveCart(businessId, value),
      (value) => {
        cartRef.current = value;
        setCart(value);
        setQuote(null);
        setError('');
        if (!reducedMotion) void haptics.selection();
      },
    );
    setStorageWarning(!saved);
    return saved;
  }
  function changeQuantity(product: Product, delta: 1 | -1) {
    if (busyRef.current || !menu?.available || access?.quoteId) return;
    try {
      updateCart(changeSimpleQuantity(cartRef.current, product, delta));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update this item.');
    }
  }
  async function reviewTotal() {
    if (!menu?.available) throw new Error('Refresh pickup options before continuing.');
    if (!slot) throw new Error('Choose a pickup time first.');
    const issue = contactIssue(name, phone);
    if (issue) throw new Error(issue);
    if (!cart.length || cartReview(cart, menu?.products ?? []).issues.length)
      throw new Error('Review your cart before continuing.');
    // A failed initial menu request can precede local guest-access creation.
    // Retrying the menu must still permit review without leaving this screen.
    let current = access ?? (await newOrderAccess(businessId));
    if (!access) setAccess(current);
    if (current.quoteId && !current.orderId) {
      if (await refreshStatus(current)) return;
      if (!current.quoteExpiresAt || Date.parse(current.quoteExpiresAt) > Date.now())
        throw new Error(
          'A checkout may still be processing. Use Recover checkout status before trying again.',
        );
      current = await newOrderAccess(businessId);
      setAccess(current);
    }
    setQuote(null);
    const result = await commerce<Quote>('quote', {
      businessId,
      cart: cart.map(({ variationId, quantity, modifierIds }) => ({
        variationId,
        quantity,
        modifierIds,
      })),
      pickup: { at: slot.at, stopId: slot.stopId },
      statusToken: current.statusToken,
    });
    setQuote(result);
    setNow(Date.now());
    setStep('review');
  }
  async function checkout() {
    if (!menu?.available) throw new Error('Refresh pickup options before continuing.');
    if (!access || !quote) return;
    if (!quoteUsable(quote))
      throw Object.assign(new Error('Quote expired'), { code: 'QUOTE_EXPIRED' });
    const normalized = normalizePickupPhone(phone);
    if (!normalized) throw new Error('Enter a valid US phone number.');
    if (access.quoteId && access.quoteId !== quote.quoteId)
      throw new Error('Recover the existing checkout before creating another.');
    const customerId = (await supabase.auth.getSession()).data.session?.user.id ?? null;
    const pending = {
      ...access,
      customerId,
      quoteId: quote.quoteId,
      quoteExpiresAt: quote.expiresAt,
    };
    await saveOrderAccess(pending);
    setAccess(pending);
    let result: { order: PickupOrder };
    try {
      result = await commerce<{ order: PickupOrder }>('checkout', {
        businessId,
        quoteId: quote.quoteId,
        idempotencyKey: pending.idempotencyKey,
        statusToken: pending.statusToken,
        recipient: { name: name.trim(), phone: normalized },
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      // Only a definitive server rejection plus an empty resume permits a fresh attempt.
      // Network/timeouts keep the saved idempotency key for recovery.
      if (
        code &&
        [
          'PRICE_CHANGED',
          'INVALID_SLOT',
          'SLOT_FULL',
          'ORDERING_CLOSED',
          'QUOTE_EXPIRED',
          'ITEM_UNAVAILABLE',
          'INVALID_MODIFIERS',
          'REQUIRED_MODIFIER',
          'CONNECTION_CHANGED',
        ].includes(code)
      ) {
        if (await refreshStatus(pending)) return;
        setAccess(await newOrderAccess(businessId));
        setQuote(null);
        setStep(['INVALID_SLOT', 'SLOT_FULL'].includes(code) ? 'pickup' : 'cart');
        try {
          await loadMenu(businessId);
        } catch {
          /* The saved cart remains editable. */
        }
      }
      throw error;
    }
    const saved = { ...pending, orderId: result.order.id };
    await saveOrderAccess(saved);
    setAccess(saved);
    setOrder(result.order);
    setLastUpdated(Date.now());
    setError('');
    if (result.order.checkoutUrl) await openCheckout(result.order.checkoutUrl);
    await refreshStatus(saved);
  }
  async function recover() {
    if (!access) return;
    if (await refreshStatus(access)) return;
    if (access.quoteExpiresAt && Date.parse(access.quoteExpiresAt) <= Date.now()) {
      setAccess(await newOrderAccess(businessId));
      setQuote(null);
      setStep('cart');
      setError(
        'No order was created and that checkout has expired. Review your saved cart to try again.',
      );
    } else
      setError(
        'No confirmed order yet. Retry the same checkout, or check again after the quote expires. Do not start another payment.',
      );
  }
  async function refreshOrder() {
    if (access) await refreshStatus(access);
    else if (order) {
      const result = await commerce<{ order: PickupOrder }>('status', { orderId: order.id });
      setOrder(result.order);
      setLastUpdated(Date.now());
      setError('');
    }
  }
  async function startAnother() {
    if (!businessId || !order || !terminalPickupStates.includes(order.status)) return;
    setOrder(null);
    setQuote(null);
    setSlot(null);
    setAccess(await newOrderAccess(businessId));
    updateCart(
      ['checkout_failed', 'checkout_expired'].includes(order.status) ? readCart(businessId) : [],
    );
    setStep('menu');
    await loadMenu(businessId);
  }
  const products = menu?.products ?? [];
  const review = cartReview(cart, products);
  return {
    businessId,
    menu,
    identity,
    lastUpdated,
    cart,
    slot,
    place,
    step,
    quote,
    order,
    name,
    phone,
    error,
    storageWarning,
    busy,
    access,
    resumeOrder,
    editing,
    products,
    review,
    expired: !quoteUsable(quote, now),
    locked: Boolean(access?.quoteId && !access.orderId),
    setStep,
    setName,
    setPhone,
    setEditing,
    setError,
    run,
    updateCart,
    changeQuantity,
    removeLine: (index: number) => {
      if (!busyRef.current && !access?.quoteId)
        updateCart(cartRef.current.filter((_, i) => i !== index));
    },
    changeLineQuantity: (index: number, delta: 1 | -1) => {
      if (busyRef.current || access?.quoteId) return;
      const line = cartRef.current[index];
      const product = products.find((p) => p.id === line?.variationId);
      if (!line || !product) return;
      try {
        updateCart(
          line.quantity + delta === 0
            ? cartRef.current.filter((_, i) => i !== index)
            : setCartLine(cartRef.current, product, line.modifierIds, line.quantity + delta, index),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to update item.');
      }
    },
    quickAdd: (product: Product, variants: Product[] = [product]) => {
      if (busyRef.current || !menu?.available || access?.quoteId || product.available === false)
        return;
      if (variants.length > 1 || hasCustomization(product))
        setEditing({ product, products: variants, index: null });
      else changeQuantity(product, 1);
    },
    loadMenu,
    reviewTotal,
    checkout,
    recover,
    refreshOrder,
    startAnother,
    chooseSlot: (next: PickupSlot | null) => {
      setSlot(next);
      setQuote(null);
    },
    choosePlace: (next: string) => {
      setPlace(next);
      setSlot(null);
      setQuote(null);
    },
    saveItem: (product: Product, ids: string[], quantity: number) => {
      if (!editing) return;
      try {
        if (busyRef.current || !menu?.available || access?.quoteId)
          throw new Error('Ordering changed. Close this item and refresh pickup options.');
        const currentProduct = products.find((p) => p.id === product.id);
        if (!currentProduct) throw new Error('This item is no longer available.');
        if (!updateCart(setCartLine(cartRef.current, currentProduct, ids, quantity, editing.index)))
          return 'Your change could not be saved. Please retry.';
        setEditing(null);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unable to add item.';
      }
    },
    resume: async () => {
      if (resumeOrder) {
        await refreshStatus(resumeOrder);
        setResumeOrder(null);
      }
    },
    reopen: async () => {
      if (order?.checkoutUrl) {
        await openCheckout(order.checkoutUrl);
        await refreshOrder();
      }
    },
  };
}
