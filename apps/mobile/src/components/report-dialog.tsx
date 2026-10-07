import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppButton } from './app-button';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';

import { ThemedText } from '@/components/themed-text';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import {
  createReportPayload,
  createSubmissionGuard,
  reportReasons,
  type ReportReasonKey,
  type ReportTarget,
} from '@/lib/customer-safety';
import { supabase } from '@/lib/supabase';

export function ReportDialog({
  target,
  reporterId,
  onClose,
  onSuccess,
  embedded = false,
}: {
  readonly target: ReportTarget | null;
  readonly embedded?: boolean;
  readonly reporterId: string | null;
  readonly onClose: () => void;
  readonly onSuccess: (message: string) => void;
}) {
  const bottomPadding = useScreenBottomPadding();
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [reason, setReason] = useState<ReportReasonKey | null>(null);
  const [details, setDetails] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitOnce = useRef(createSubmissionGuard()).current;
  const title = useMemo(() => (target ? `Report ${target.label}` : 'Report content'), [target]);

  function close() {
    setReason(null);
    setDetails('');
    setError(null);
    setPending(false);
    onClose();
  }

  async function submit() {
    if (!target || !reporterId || !reason || pending) return;
    await submitOnce(async () => {
      setPending(true);
      setError(null);
      try {
        const payload = createReportPayload(reporterId, target, reason, details);
        const { error: submitError } = await supabase.from('content_reports').insert(payload);
        if (submitError) throw submitError;
        onSuccess('Thanks. Your report was sent to Parish Pass for review.');
        close();
      } catch {
        setError('We couldn’t send your report. Please try again.');
      } finally {
        setPending(false);
      }
    });
  }

  const content = (
    <KeyboardAvoidingView
      accessibilityViewIsModal
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        embedded ? { flexGrow: 1, flexShrink: 0 } : styles.page,
        { backgroundColor: colors.surfaceElevated },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerCopy}>
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Choose a reason. Your report is sent privately to Parish Pass for review.
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={close}
          style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
        >
          <ThemedText type="smallBold">Cancel</ThemedText>
        </Pressable>
      </View>
      <ScrollView
        scrollEnabled={!embedded}
        style={embedded ? { flexGrow: 1, flexShrink: 0 } : undefined}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.reasons}>
          {reportReasons.map((item) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: reason === item.key }}
              key={item.key}
              onPress={() => setReason(item.key)}
              style={[
                styles.reason,
                { borderColor: reason === item.key ? Brand.primary : colors.border },
                reason === item.key && { backgroundColor: colors.backgroundSelected },
              ]}
            >
              <ThemedText type="smallBold">{item.label}</ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={styles.field}>
          <ThemedText type="smallBold">Optional details</ThemedText>
          <TextInput
            accessibilityLabel="Optional report details"
            maxLength={2000}
            multiline
            onChangeText={setDetails}
            placeholder="Add context that may help our review"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={details}
          />
          <ThemedText themeColor="textSecondary" type="small">
            {details.length}/2,000
          </ThemedText>
        </View>
        {error ? <ThemedText style={{ color: colors.errorText }}>{error}</ThemedText> : null}
        <AppButton
          label={pending ? 'Sending…' : 'Send report'}
          disabled={!reason}
          loading={pending}
          onPress={() => void submit()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
  if (embedded) return target ? content : null;
  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      presentationStyle="pageSheet"
      visible={Boolean(target)}
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
  },
  headerCopy: { flex: 1, gap: Spacing.one },
  content: { gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  reasons: { gap: Spacing.two },
  reason: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
  },
  field: { gap: Spacing.one },
  input: {
    minHeight: 130,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  submit: {
    minHeight: 50,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.primary,
  },
  submitText: { color: Brand.onPrimary },
  disabled: { opacity: 0.5 },
});
