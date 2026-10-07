import { type PropsWithChildren, type ReactNode } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { businessOperationIncluded, type BusinessFeatureOperation } from '@sds/business-logic';
import { useBusinessFeatureAccess } from '@/hooks/use-business-feature-access';
import { useTheme } from '@/hooks/use-theme';
import { featurePlanLabel } from '@/lib/business-feature-access';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';

export function BusinessFeatureGate({
  businessId,
  operation,
  children,
  recovery,
}: PropsWithChildren<{
  businessId: string;
  operation?: BusinessFeatureOperation | undefined;
  recovery?: ReactNode;
}>) {
  if (!operation) return children;
  return (
    <CheckedFeature businessId={businessId} operation={operation} recovery={recovery}>
      {children}
    </CheckedFeature>
  );
}

function CheckedFeature({
  businessId,
  operation,
  children,
  recovery,
}: PropsWithChildren<{
  businessId: string;
  operation: BusinessFeatureOperation;
  recovery?: ReactNode;
}>) {
  const { access, owner, loading, error, refresh } = useBusinessFeatureAccess(businessId);
  const colors = useTheme();
  if (businessOperationIncluded(access, operation)) return children;
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          padding: 20,
          gap: 12,
          borderRadius: 20,
          backgroundColor: colors.backgroundElement,
          borderColor: colors.border,
          borderWidth: 1,
        }}
      >
        <ThemedText type="card">
          {loading
            ? 'Checking your plan…'
            : error
              ? 'Plan check unavailable'
              : 'Your plan doesn’t include this tool'}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {loading
            ? 'We’re checking access for this business.'
            : (error ??
              `This tool needs ${featurePlanLabel(operation)}. ${owner ? 'Compare plans or restore your purchase to continue.' : 'Ask the business owner to update its plan.'}`)}
        </ThemedText>
        {!loading && owner && !error && (
          <AppButton label="View business plans" onPress={() => router.push('/listing-plans')} />
        )}
        {!loading && (
          <AppButton
            label="Check access again"
            variant="secondary"
            onPress={() => void refresh()}
          />
        )}
      </View>
      {recovery}
    </View>
  );
}
