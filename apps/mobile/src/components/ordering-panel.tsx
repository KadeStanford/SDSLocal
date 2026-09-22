import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { commerce } from '@/lib/square-commerce';
import { SquareOrderingPanel } from './square-ordering-panel';
import { StripeOrderingPanel } from './stripe-ordering-panel';
import { AppButton } from './app-button';
import { ListLoading } from './data-state';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

type OrderingProvider = 'square' | 'stripe';

function hasConfiguredProvider(snapshot: any, provider: OrderingProvider) {
  if (!snapshot) return false;
  if (snapshot.settings?.provider === provider) return true;
  if (snapshot.connection?.provider === provider) return true;
  if (provider === 'square' && snapshot.connection && snapshot.provider !== 'stripe') return true;
  return provider === 'stripe' && Boolean(snapshot.connection || snapshot.account);
}

function providerStatus(snapshot: any, provider: OrderingProvider) {
  if (provider === 'square') {
    return snapshot?.connection?.state === 'connected' ? 'Connected' : 'Not connected';
  }
  if (snapshot?.connection?.state === 'connected' && snapshot?.account?.chargesEnabled)
    return 'Connected';
  if (hasConfiguredProvider(snapshot, 'stripe')) return 'Finish setup';
  return 'Not connected';
}

export function OrderingPanel({
  businessId,
  isMobile,
  onDirtyChange,
  initialProvider,
}: {
  readonly businessId: string;
  readonly isMobile: boolean;
  readonly onDirtyChange: (value: boolean) => void;
  readonly initialProvider?: 'square' | 'stripe';
}) {
  const colors = useTheme();
  const [provider, setProvider] = useState<OrderingProvider | null>(initialProvider ?? null);
  const [snapshots, setSnapshots] = useState<{ square: any; stripe: any }>({
    square: null,
    stripe: null,
  });
  const [resolving, setResolving] = useState(true);
  const [selectionError, setSelectionError] = useState('');
  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      commerce<any>('owner_status', { businessId, provider: 'square' }),
      commerce<any>('owner_status', { businessId, provider: 'stripe' }),
    ])
      .then(([squareResult, stripeResult]) => {
        if (!active) return;
        const square = squareResult.status === 'fulfilled' ? squareResult.value : null;
        const stripe = stripeResult.status === 'fulfilled' ? stripeResult.value : null;
        setSnapshots({ square, stripe });
        if (initialProvider) return;
        const selected = stripe?.activeProvider ?? square?.activeProvider;
        if (selected === 'stripe' || selected === 'square') setProvider(selected);
        else if (square?.connection?.state === 'connected') setProvider('square');
        else if (hasConfiguredProvider(stripe, 'stripe')) setProvider('stripe');
      })
      .finally(() => {
        if (active) setResolving(false);
      });
    return () => {
      active = false;
    };
  }, [businessId, initialProvider]);
  const chooseProvider = async (next: OrderingProvider) => {
    setSelectionError('');
    try {
      await commerce('select_provider', { businessId, provider: next });
      setProvider(next);
    } catch (error) {
      setSelectionError(
        error instanceof Error ? error.message : 'The ordering provider could not be selected.',
      );
    }
  };
  if (resolving) return <ListLoading label="Checking online ordering setup" rows={2} />;
  if (!provider)
    return (
      <View style={{ gap: 16, paddingBottom: 40 }}>
        <View style={{ gap: 6 }}>
          <ThemedText type="title">Set up online ordering</ThemedText>
          <ThemedText themeColor="textSecondary">
            Choose where customers will pay. You can connect either provider later if your needs
            change.
          </ThemedText>
        </View>
        <View
          style={{
            gap: 12,
            padding: 18,
            borderRadius: 18,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <ThemedText type="card">Stripe</ThemedText>
          <ThemedText themeColor="textSecondary">
            Best for businesses without Square. Customers pay directly into the business Stripe
            account.
          </ThemedText>
          <AppButton label="Set up Stripe" onPress={() => void chooseProvider('stripe')} />
        </View>
        <View
          style={{
            gap: 12,
            padding: 18,
            borderRadius: 18,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <ThemedText type="card">Square</ThemedText>
          <ThemedText themeColor="textSecondary">
            Connect a Square Sandbox seller and sync its catalog and pickup settings.
          </ThemedText>
          <AppButton
            label="Set up Square"
            variant="secondary"
            onPress={() => void chooseProvider('square')}
          />
        </View>
      </View>
    );
  if (provider) {
    return (
      <View style={{ gap: 16 }}>
        <View
          style={{
            gap: 10,
            padding: 14,
            borderRadius: 16,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <ThemedText type="card">Payment provider</ThemedText>
          <ThemedText themeColor="textSecondary">
            Choose which connected account powers pickup ordering for this business.
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <AppButton
              label={`Square · ${providerStatus(snapshots.square, 'square')}`}
              style={{ flex: 1 }}
              variant={provider === 'square' ? 'primary' : 'secondary'}
              onPress={() => void chooseProvider('square')}
            />
            <AppButton
              label={`Stripe · ${providerStatus(snapshots.stripe, 'stripe')}`}
              style={{ flex: 1 }}
              variant={provider === 'stripe' ? 'primary' : 'secondary'}
              onPress={() => void chooseProvider('stripe')}
            />
          </View>
          {selectionError ? (
            <ThemedText style={{ color: colors.errorText }}>{selectionError}</ThemedText>
          ) : null}
        </View>
        {provider === 'stripe' ? (
          <StripeOrderingPanel
            businessId={businessId}
            isMobile={isMobile}
            onDirtyChange={onDirtyChange}
          />
        ) : (
          <SquareOrderingPanel
            businessId={businessId}
            isMobile={isMobile}
            onDirtyChange={onDirtyChange}
          />
        )}
      </View>
    );
  }
  return null;
}
