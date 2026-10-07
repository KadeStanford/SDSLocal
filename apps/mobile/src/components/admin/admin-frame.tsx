import { PageHeader } from '@/components/page-header';
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';

import { useTheme } from '@/hooks/use-theme';
import type { PlatformAdminAccess } from '@/hooks/use-platform-admin-access';
import { useAdminStyles } from './mobile-admin.styles';
export function AdminText({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  const s = useAdminStyles();
  return <ThemedText style={muted ? s.muted : s.body}>{children}</ThemedText>;
}
export function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  const s = useAdminStyles();
  return (
    <View style={s.section}>
      <ThemedText accessibilityRole="header" style={s.title}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}
export function AdminFrame({
  title,
  backLabel = 'Account',
  backText,
  onBack,
  children,
}: {
  title: string;
  backLabel?: string;
  backText?: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  const s = useAdminStyles(),
    c = useTheme();
  return (
    <SafeAreaView style={s.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <View style={s.top}>
          <PageHeader
            onBack={onBack ?? (() => router.replace('/account'))}
            backLabel={`Back to ${backLabel}`}
          />
          <ThemedText accessibilityRole="header" style={s.header}>
            {title}
          </ThemedText>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function AdminAccessGate({
  access,
  children,
}: {
  access: PlatformAdminAccess;
  children: ReactNode;
}) {
  const s = useAdminStyles(),
    c = useTheme();
  if (access.status === 'allowed') return children;
  if (access.status === 'checking')
    return (
      <View style={s.section}>
        <ActivityIndicator color={c.accent} accessibilityLabel="Checking administrator access" />
        <AdminText>Checking administrator access…</AdminText>
      </View>
    );
  return (
    <AdminSection
      title={
        access.status === 'denied'
          ? 'Administrator access required'
          : access.status === 'signed_out'
            ? 'Sign in to continue'
            : 'Access could not be checked'
      }
    >
      <AdminText>
        {access.message ??
          (access.status === 'signed_out'
            ? 'Use your existing account sign-in in Account.'
            : 'This workspace is available to platform administrators.')}
      </AdminText>
      {access.status === 'error' && (
        <AppButton label="Try access check again" onPress={() => void access.verify()} />
      )}
      <AppButton
        label="Return to Account"
        variant="secondary"
        onPress={() => router.replace('/account')}
      />
    </AdminSection>
  );
}
export function formatAdminDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}
