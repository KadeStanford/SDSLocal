import { HelpPolicyLinks } from './help-policy-links';
import { MerchantButton } from './merchant-ui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import {
  accountDeletionAccessibility,
  accountDeletionPhrase,
  canConfirmAccountDeletion,
  completeDeletedAccount,
  parseAccountDeletionImpact,
  type AccountDeletionImpact,
} from '@/lib/account-deletion';
import { clearPendingAuthIntent } from '@/lib/auth-intents';
import { clearStoredAuthSession } from '@/lib/auth-storage';
import { clearBiometricSignInRefreshToken } from '@/lib/biometric-auth';
import { clearBusinessOnboardingDraft } from '@/lib/business-onboarding';
import { haptics } from '@/lib/haptics';
import { clearPendingScans } from '@/lib/offline-scan-queue';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useAppMode } from '@/providers/app-mode-provider';
import { useNearbyAlerts } from '@/providers/nearby-alerts-provider';
import { useListingBilling } from '@/providers/listing-billing-provider';

interface DeleteAccountResponse {
  readonly deleted?: boolean;
  readonly cleanupPending?: boolean;
}

export function AccountDataPanel() {
  const { session } = useAuth();
  const { setMode } = useAppMode();
  const nearbyAlerts = useNearbyAlerts();
  const listingBilling = useListingBilling();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [impact, setImpact] = useState<AccountDeletionImpact | null>(null);
  const [bookingBlocker, setBookingBlocker] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDataDetails, setShowDataDetails] = useState(false);

  async function loadImpact() {
    setLoadingImpact(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', { method: 'GET' });
      if (error) throw error;
      const parsed = parseAccountDeletionImpact(
        data && typeof data === 'object' ? (data as { impact?: unknown }).impact : null,
      );
      if (!parsed) throw new Error('Invalid deletion impact response.');
      setBookingBlocker(Array.isArray(data?.blockers) && data.blockers.includes('appointments'));
      setImpact(parsed);
    } catch {
      setErrorMessage('We could not check what deletion would affect. Please try again.');
    } finally {
      setLoadingImpact(false);
    }
  }

  function beginConfirmation() {
    const subscriptionWarning = listingBilling.summary?.canPublish
      ? ' Your store subscription is billed by Apple or Google and is not automatically cancelled when this account is deleted. Manage or cancel it in the store first if you do not want it to renew.'
      : '';
    Alert.alert(
      'Delete this account?',
      `Your profile and private account data will be removed. Businesses you own alone will also be deleted. Shared businesses will remain with another owner.${subscriptionWarning}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Review impact',
          style: 'destructive',
          onPress: () => void loadImpact(),
        },
      ],
    );
  }

  async function deleteAccount() {
    if (!session || bookingBlocker || !canConfirmAccountDeletion(confirmation, deleting)) return;
    setDeleting(true);
    setErrorMessage(null);
    const userId = session.user.id;
    try {
      await completeDeletedAccount(async () => {
        const { data, error } = await supabase.functions.invoke<DeleteAccountResponse>(
          'delete-account',
          { method: 'DELETE', body: { confirmation } },
        );
        if (error) {
          try { const detail = await error.context?.json(); if (detail?.blockers?.includes('appointments')) { setBookingBlocker(true); throw new Error('BOOKING_BLOCKER'); } } catch (cause) { if (cause instanceof Error && cause.message === 'BOOKING_BLOCKER') throw cause; }
          throw error;
        }
        return { deleted: data?.deleted === true };
      }, [
        () => Notifications.dismissAllNotificationsAsync(),
        () => nearbyAlerts.clearForAccount(userId),
        () => clearBiometricSignInRefreshToken(),
        () => clearStoredAuthSession(userId),
        () => clearPendingScans(),
        async () => clearBusinessOnboardingDraft(userId),
        async () => clearPendingAuthIntent(),
        () => supabase.auth.signOut({ scope: 'local' }),
      ]);
      setMode('customer');
      router.replace('/explore');
      void haptics.success();
      Alert.alert('Account deleted', 'Your Parish Pass account has been deleted.');
    } catch (cause) {
      void haptics.error();
      setErrorMessage(
        cause instanceof Error && cause.message === 'BOOKING_BLOCKER' ? 'Resolve your active appointments or outstanding booking payments first.' : 'Account deletion did not complete. Your account is still available. Use support if retrying does not help.',
      );
      setDeleting(false);
    }
  }

  function cancelFinalConfirmation() {
    if (deleting) return;
    setImpact(null);
    setConfirmation('');
    setErrorMessage(null);
  }

  return (
    <View style={styles.root}>
      {errorMessage && (
        <View accessibilityLiveRegion="polite" style={styles.error}>
          <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
        </View>
      )}

      {bookingBlocker && <View style={{ gap: 12 }}><ThemedText type="subtitle">Finish your appointments first</ThemedText><ThemedText>Cancel or complete active bookings and resolve outstanding payments or refunds. Contact the business about payment issues.</ThemedText><MerchantButton label="Open my appointments" onPress={() => router.push('/my-appointments' as never)} /><MerchantButton label="Recheck deletion eligibility" secondary onPress={() => void loadImpact()} /><HelpPolicyLinks /></View>}
      {impact && !bookingBlocker && (
        <View style={styles.impactCard}>
          <ThemedText type="subtitle">What will happen</ThemedText>
          {listingBilling.summary?.canPublish ? (
            <View style={styles.subscriptionWarning}>
              <ThemedText type="smallBold">Store subscription stays separate</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                Deleting Parish Pass cannot cancel billing controlled by Apple or Google. Cancel it
                through your store account first if you do not want it to renew.
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => void listingBilling.manage()}
                style={styles.manageSubscription}
              >
                <ThemedText type="smallBold">Manage store subscription</ThemedText>
              </Pressable>
            </View>
          ) : null}
          {impact.businesses.length === 0 ? (
            <ThemedText themeColor="textSecondary">
              No business pages will be changed. Your personal account data will be removed.
            </ThemedText>
          ) : (
            impact.businesses.map((business) => (
              <View key={business.id} style={styles.impactRow}>
                <ThemedText type="smallBold">{business.name}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {business.action === 'delete_business'
                    ? 'You are its only active owner. This business and its content will be deleted.'
                    : business.action === 'preserve_and_transfer'
                      ? 'Another active owner will keep this business. Your access will be removed.'
                      : 'This business will remain. Your staff access will be removed.'}
                </ThemedText>
              </View>
            ))
          )}
          <View style={styles.field}>
            <ThemedText type="smallBold">Type DELETE to confirm</ThemedText>
            <TextInput
              accessibilityLabel="Type DELETE to confirm account deletion"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
              onChangeText={setConfirmation}
              placeholder={accountDeletionPhrase}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={confirmation}
            />
          </View>
          <Pressable
            {...accountDeletionAccessibility(confirmation, deleting)}
            onPress={() => void deleteAccount()}
            style={[
              styles.deleteButton,
              !canConfirmAccountDeletion(confirmation, deleting) && styles.disabled,
            ]}
          >
            {deleting ? (
              <View style={styles.progress}>
                <ActivityIndicator color="#FFFFFF" />
                <ThemedText style={styles.deleteText} type="smallBold">
                  Deleting account…
                </ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.deleteText} type="smallBold">
                Permanently delete account
              </ThemedText>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel account deletion"
            disabled={deleting}
            onPress={cancelFinalConfirmation}
            style={styles.cancelButton}
          >
            <ThemedText type="smallBold">Cancel</ThemedText>
          </Pressable>
        </View>
      )}

      {!impact && (
        <View style={styles.dangerZone}>
          <ThemedText type="subtitle">Delete account</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Permanently remove your account. Review what’s affected before confirming.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Review account deletion"
            accessibilityHint="Reviews the permanent effects before deletion"
            accessibilityState={{ disabled: loadingImpact, busy: loadingImpact }}
            disabled={loadingImpact}
            onPress={beginConfirmation}
            style={[styles.outlineDeleteButton, loadingImpact && styles.disabled]}
          >
            {loadingImpact ? (
              <ActivityIndicator color="#B83B3B" />
            ) : (
              <ThemedText style={styles.outlineDeleteText} type="smallBold">
                Review deletion
              </ThemedText>
            )}
          </Pressable>
        </View>
      )}
      {!impact && (
        <View style={[styles.details, { backgroundColor: colors.backgroundElement }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showDataDetails }}
            accessibilityLabel="What gets deleted?"
            onPress={() => setShowDataDetails((current) => !current)}
            style={styles.detailsTrigger}
          >
            <ThemedText type="smallBold" style={{ flex: 1 }}>
              What gets deleted?
            </ThemedText>
            <ThemedText themeColor="textSecondary">{showDataDetails ? '−' : '+'}</ThemedText>
          </Pressable>
          {showDataDetails && (
            <View style={styles.detailsBody}>
              <ThemedText themeColor="textSecondary" type="small">
                Your profile, saved businesses, rewards memberships, reminders, notification
                registrations, and business access are removed.
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                Businesses you own alone are deleted. Shared businesses stay with another owner.
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three },
  details: { borderRadius: 16, overflow: 'hidden' },
  detailsTrigger: {
    minHeight: 56,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  detailsBody: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.two },
  error: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B83B3B',
    backgroundColor: '#F8E6E6',
    padding: Spacing.three,
  },
  errorText: { color: '#761F1F' },
  dangerZone: {
    gap: Spacing.two,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A44A4A',
    padding: Spacing.three,
    backgroundColor: 'rgba(184,59,59,0.08)',
  },
  impactCard: {
    gap: Spacing.three,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A44A4A',
    padding: Spacing.three,
    backgroundColor: 'rgba(184,59,59,0.08)',
  },
  impactRow: {
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#A44A4A',
    paddingBottom: Spacing.two,
  },
  subscriptionWarning: {
    gap: Spacing.one,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A06A16',
    padding: Spacing.three,
    backgroundColor: 'rgba(240,174,58,0.10)',
  },
  manageSubscription: { minHeight: 44, justifyContent: 'center' },
  field: { gap: Spacing.one },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  outlineDeleteButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B83B3B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  outlineDeleteText: { color: '#D16464' },
  deleteButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    backgroundColor: '#B83B3B',
  },
  deleteText: { color: '#FFFFFF' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cancelButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
});
