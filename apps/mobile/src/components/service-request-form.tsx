import { RequestQuestions, RequestAnswers } from './request-question-fields';
import { requestAnswerSnapshot, requestAnswersError } from '@/lib/service-request-schema';
import { View } from 'react-native';
import { ChoicePicker } from './choice-picker';
import { RequestSection, RequestFieldLabel, RequestInput } from './request-form-ui';
import { AppButton } from './app-button';
import { MerchantButton } from './merchant-ui';
import { ThemedText } from './themed-text';
import type { ServiceRequestDraft } from '@/lib/service-request-draft';

export interface RequestOffering {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}
export function ServiceRequestForm({
  offerings,
  draft,
  onChange,
  onReview,
  disabled,
}: {
  offerings: readonly RequestOffering[];
  draft: ServiceRequestDraft;
  onChange: (draft: ServiceRequestDraft) => void;
  onReview: () => void;
  disabled: boolean;
}) {
  const chosen = offerings.find((offering) => offering.id === draft.offeringId);
  const fields = draft.fields ?? [];
  const customError = requestAnswersError(fields, draft.answers ?? {});
  return (
    <View style={{ gap: 20 }}>
      <RequestSection number="01" title="Your request" detail="Tell us what you have in mind.">
        {!!offerings.length && (
          <View style={{ gap: 8 }}>
            <ChoicePicker
              businessStyle
              label="Service · Optional"
              value={draft.offeringId ?? 'unspecified'}
              disabled={disabled}
              options={[
                { value: 'unspecified', label: 'Help me choose a service' },
                ...offerings.map((offering) => ({ value: offering.id, label: offering.name })),
              ]}
              onChange={(value) =>
                onChange({ ...draft, offeringId: value === 'unspecified' ? null : value })
              }
            />
            {!!chosen?.description && (
              <ThemedText type="small" themeColor="textSecondary">
                {chosen.description}
              </ThemedText>
            )}
          </View>
        )}
        <RequestFieldLabel label="What do you need?" required>
          <RequestInput
            accessibilityLabel="Service request details"
            editable={!disabled}
            multiline
            maxLength={2000}
            value={draft.message}
            onChangeText={(message) => onChange({ ...draft, message })}
            placeholder="Describe your plans, questions, or the help you need."
            style={{ minHeight: 120 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <ThemedText type="caption" themeColor="textSecondary">
              At least 10 characters
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {draft.message.length}/2000
            </ThemedText>
          </View>
        </RequestFieldLabel>
      </RequestSection>
      {!!fields.length && (
        <RequestSection
          number="02"
          title="A few more details"
          detail="Questions chosen by this business."
        >
          <RequestQuestions
            fields={fields}
            answers={draft.answers ?? {}}
            disabled={disabled}
            onChange={(answers) => onChange({ ...draft, answers })}
          />
        </RequestSection>
      )}
      <RequestSection
        number={fields.length ? '03' : '02'}
        title="Your availability"
        detail="Share a preference. No appointment is booked yet."
      >
        <RequestFieldLabel label="Preferred timing">
          <RequestInput
            accessibilityLabel="Preferred timing"
            editable={!disabled}
            maxLength={200}
            value={draft.timing}
            onChangeText={(timing) => onChange({ ...draft, timing })}
            placeholder="For example, weekday mornings"
          />
        </RequestFieldLabel>
      </RequestSection>
      <View style={{ gap: 10 }}>
        <AppButton
          label="Review request"
          disabled={disabled || draft.message.trim().length < 10 || !!customError}
          onPress={onReview}
        />
        <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          You’ll review everything before sending.
        </ThemedText>
      </View>
    </View>
  );
}

export function ServiceRequestReview({
  businessName,
  offeringName,
  draft,
  email,
  busy,
  locked,
  onEdit,
  onSend,
}: {
  businessName: string;
  offeringName: string | undefined;
  draft: ServiceRequestDraft;
  email: string | undefined;
  busy: boolean;
  locked: boolean;
  onEdit: () => void;
  onSend: () => void;
}) {
  return (
    <View style={{ gap: 20 }}>
      <RequestSection number="✓" title="Ready to send" detail={businessName}>
        <View style={{ gap: 4 }}>
          <ThemedText type="smallBold">Service</ThemedText>
          <ThemedText>{offeringName ?? 'Not specified'}</ThemedText>
        </View>
        <View style={{ gap: 4 }}>
          <ThemedText type="smallBold">Your request</ThemedText>
          <ThemedText selectable>{draft.message.trim()}</ThemedText>
        </View>
        {!!draft.timing.trim() && (
          <View style={{ gap: 4 }}>
            <ThemedText type="smallBold">Preferred timing</ThemedText>
            <ThemedText>{draft.timing.trim()}</ThemedText>
          </View>
        )}
        <RequestAnswers answers={requestAnswerSnapshot(draft.fields ?? [], draft.answers ?? {})} />
        <View style={{ gap: 4 }}>
          <ThemedText type="smallBold">Replies go to</ThemedText>
          <ThemedText selectable>{email ?? 'Your account email'}</ThemedText>
        </View>
      </RequestSection>
      <ThemedText type="small" themeColor="textSecondary">
        This is a quote or consultation request. Sending it does not confirm a booking or price.
      </ThemedText>
      <MerchantButton
        brand
        label={busy ? 'Sending request…' : locked ? 'Retry same request' : 'Send request'}
        loading={busy}
        disabled={busy}
        onPress={onSend}
      />
      {!locked && (
        <MerchantButton brand label="Edit request" secondary disabled={busy} onPress={onEdit} />
      )}
    </View>
  );
}
