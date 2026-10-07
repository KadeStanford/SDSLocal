import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  loadConnectAndInitialize,
} from '@stripe/stripe-react-native';
import { commerce } from '@/lib/square-commerce';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
const LOAD_TIMEOUT_MS = 25_000;

export type StripeOnboardingFailure = {
  readonly reason: 'session' | 'timeout' | 'component';
  readonly code?: string;
  readonly status?: number;
  readonly providerCode?: string;
  readonly providerRequestId?: string;
};

export function isStripeEmbeddedOnboardingAvailable() {
  return (
    (Platform.OS === 'ios' || Platform.OS === 'android') &&
    /^pk_(test|live)_[A-Za-z0-9]+$/.test(publishableKey)
  );
}

export function StripeEmbeddedOnboarding({
  businessId,
  onExit,
  onError,
}: {
  readonly businessId: string;
  readonly onExit: () => void;
  readonly onError: (failure: StripeOnboardingFailure) => void;
}) {
  const hasReportedErrorRef = useRef(false);
  const onErrorRef = useRef(onError);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectInstance, setConnectInstance] = useState<ReturnType<
    typeof loadConnectAndInitialize
  > | null>(null);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const reportError = useCallback((reason: StripeOnboardingFailure['reason'], error?: unknown) => {
    if (hasReportedErrorRef.current) return;
    hasReportedErrorRef.current = true;
    const metadata =
      error && typeof error === 'object'
        ? (error as {
            code?: unknown;
            status?: unknown;
            providerCode?: unknown;
            providerRequestId?: unknown;
          })
        : {};
    onErrorRef.current({
      reason,
      ...(typeof metadata.code === 'string' ? { code: metadata.code } : {}),
      ...(typeof metadata.status === 'number' ? { status: metadata.status } : {}),
      ...(typeof metadata.providerCode === 'string' ? { providerCode: metadata.providerCode } : {}),
      ...(typeof metadata.providerRequestId === 'string'
        ? { providerRequestId: metadata.providerRequestId }
        : {}),
    });
  }, []);

  useEffect(() => {
    loadTimeoutRef.current = setTimeout(() => reportError('timeout'), LOAD_TIMEOUT_MS);
    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [reportError]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const instance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret: async () => {
            try {
              const session = await commerce<{ clientSecret?: string }>('connect_session', {
                businessId,
                provider: 'stripe',
              });
              if (typeof session.clientSecret !== 'string' || !session.clientSecret.trim())
                throw new Error('Stripe session was empty.');
              return session.clientSecret;
            } catch (error) {
              // Stripe's native wrapper catches this promise rejection but leaves
              // its loading spinner visible, so report the failure to our screen.
              reportError('session', error);
              throw error;
            }
          },
          appearance: {
            variables: {
              colorPrimary: '#13745f',
              borderRadius: '12px',
              fontSizeBase: '16px',
            },
          },
        });
        if (active) setConnectInstance(instance);
      } catch (error) {
        reportError('component', error);
      }
    });
    return () => {
      active = false;
    };
  }, [businessId, reportError]);

  if (!connectInstance)
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: Spacing.four }}>
        <ThemedText themeColor="textSecondary">Preparing secure payment setup…</ThemedText>
      </View>
    );

  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      <View style={{ flex: 1, justifyContent: 'center', padding: Spacing.four }}>
        <ThemedText themeColor="textSecondary">Loading secure payment setup…</ThemedText>
      </View>
      <ConnectAccountOnboarding
        title="Set up online payments"
        onExit={onExit}
        onPageDidLoad={() => {
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        }}
        onLoadError={() => reportError('component')}
        collectionOptions={{ fields: 'currently_due', futureRequirements: 'omit' }}
      />
    </ConnectComponentsProvider>
  );
}
