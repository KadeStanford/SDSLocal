import { FlowSection } from '@/components/flow-layout';
import { BusinessFeatureGate } from './business-feature-gate';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { commerce } from '@/lib/square-commerce';
import { SquareOrderingPanel } from './square-ordering-panel';
import { StripeOrderingPanel } from './stripe-ordering-panel';
import { AppButton } from './app-button';
import { ListLoading } from './data-state';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

type OrderingProvider = 'square' | 'stripe';

export function OrderingPanel(props: Parameters<typeof OrderingPanelContent>[0]) {
  return (
    <BusinessFeatureGate
      businessId={props.businessId}
      operation="configure_pickup"
      recovery={<OrderingRecovery businessId={props.businessId} />}
    >
      <OrderingPanelContent {...props} />
    </BusinessFeatureGate>
  );
}

function OrderingRecovery({ businessId }: { businessId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function disconnect() {
    setBusy(true);
    setMessage('');
    try {
      const status = await commerce<{ activeProvider?: string }>('owner_status', {
        businessId,
        provider: 'square',
      });
      if (status.activeProvider !== 'square' && status.activeProvider !== 'stripe') {
        setMessage('No active payment provider is selected.');
        return;
      }
      await commerce('disconnect', {
        businessId,
        provider: status.activeProvider,
        confirmed: true,
      });
      setMessage('Payment provider disconnected.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Disconnect failed. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <AppButton
        label="View existing orders"
        variant="secondary"
        onPress={() => router.push({ pathname: '/pickup-orders', params: { businessId } })}
      />
      <AppButton
        label="Disconnect payments"
        variant="secondary"
        loading={busy}
        onPress={() =>
          Alert.alert(
            'Disconnect payments?',
            'Complete or refund existing orders first. This stops new payments for this business.',
            [
              { text: 'Keep connected', style: 'cancel' },
              { text: 'Disconnect', style: 'destructive', onPress: () => void disconnect() },
            ],
          )
        }
      />
      {!!message && <ThemedText accessibilityRole="alert">{message}</ThemedText>}
    </View>
  );
}

function OrderingPanelContent({
  businessId,
  isMobile,
  onDirtyChange,
  initialProvider,
}: {
  readonly businessId: string;
  readonly isMobile: boolean;
  readonly onDirtyChange: (value: boolean) => void;
  readonly initialProvider?: OrderingProvider;
}) {
  const colors = useTheme();
  const [provider, setProvider] = useState<OrderingProvider | null>(initialProvider ?? null);
  const [resolving, setResolving] = useState(true);
  const [selectionError, setSelectionError] = useState('');

  useEffect(() => {
    let active = true;
    async function resolveProvider() {
      try {
        const [squareResult, stripeResult] = await Promise.allSettled([
          commerce<any>('owner_status', { businessId, provider: 'square' }),
          commerce<any>('owner_status', { businessId, provider: 'stripe' }),
        ]);
        if (!active) return;
        const square = squareResult.status === 'fulfilled' ? squareResult.value : null;
        const stripe = stripeResult.status === 'fulfilled' ? stripeResult.value : null;
        const savedProvider = stripe?.activeProvider ?? square?.activeProvider;
        const current = initialProvider ?? savedProvider;
        const next: OrderingProvider =
          current === 'stripe' || current === 'square'
            ? current
            : square?.connection?.state === 'connected'
              ? 'square'
              : 'stripe';

        if (initialProvider && initialProvider !== savedProvider) {
          try {
            await commerce('select_provider', { businessId, provider: next });
          } catch (error) {
            if (active)
              setSelectionError(
                error instanceof Error
                  ? error.message
                  : 'Online ordering setup could not be saved. Please retry.',
              );
          }
        }
        if (active) setProvider(next);
      } catch (error) {
        if (active) {
          setProvider(initialProvider ?? 'stripe');
          setSelectionError(
            error instanceof Error
              ? error.message
              : 'Online ordering setup could not be loaded. Please retry.',
          );
        }
      } finally {
        if (active) setResolving(false);
      }
    }
    void resolveProvider();
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
        error instanceof Error ? error.message : 'The ordering setup could not be changed.',
      );
    }
  };

  if (resolving) return <ListLoading label="Checking online ordering setup" rows={2} />;

  return (
    <View style={{ gap: 16, paddingBottom: 40 }}>
      {selectionError ? (
        <View
          style={{
            padding: 14,
            borderRadius: 14,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 8,
          }}
        >
          <ThemedText accessibilityRole="alert" style={{ color: colors.errorText }}>
            {selectionError}
          </ThemedText>
          <AppButton
            label="Retry"
            variant="secondary"
            onPress={() => void chooseProvider(provider ?? 'stripe')}
          />
        </View>
      ) : null}
      {provider === 'square' ? (
        <>
          <View style={{ gap: 8 }}>
            <ThemedText type="smallBold">Square · test mode</ThemedText>
            <ThemedText themeColor="textSecondary">
              Square provides checkout for this business.
            </ThemedText>
            <FlowSection title="Change payment provider" collapsible>
              <AppButton
                label="Use Parish Pass online payments"
                variant="secondary"
                onPress={() => void chooseProvider('stripe')}
              />
            </FlowSection>
          </View>
          <SquareOrderingPanel
            businessId={businessId}
            isMobile={isMobile}
            onDirtyChange={onDirtyChange}
          />
        </>
      ) : (
        <StripeOrderingPanel
          businessId={businessId}
          isMobile={isMobile}
          onDirtyChange={onDirtyChange}
          onConnectSquare={() => void chooseProvider('square')}
        />
      )}
    </View>
  );
}
