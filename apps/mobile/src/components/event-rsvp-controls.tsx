import { useTheme } from '@/hooks/use-theme';
import { Pressable, View } from 'react-native';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';

export interface EventRsvpSummary {
  readonly going_count: number;
  readonly waitlist_count: number;
  readonly rsvp_limit: number | null;
  readonly my_status: 'going' | 'waitlisted' | null;
  readonly my_party_size: number | null;
  readonly my_waitlist_position: number | null;
}

export function EventRsvpControls({
  summary,
  partySize,
  loading,
  disabled = false,
  onPartySizeChange,
  onSave,
  onCancel,
}: {
  summary: EventRsvpSummary | null;
  partySize: number;
  loading: boolean;
  disabled?: boolean;
  onPartySizeChange: (size: number) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const colors = useTheme();
  const active = summary?.my_status === 'going' || summary?.my_status === 'waitlisted';
  const full =
    summary?.rsvp_limit !== null &&
    summary?.rsvp_limit !== undefined &&
    summary.going_count +
      (active && summary.my_status === 'going' ? -(summary.my_party_size ?? 1) : 0) +
      partySize >
      summary.rsvp_limit;
  const waitlistPosition = summary?.my_waitlist_position;

  return (
    <View style={{ width: '100%', alignSelf: 'stretch', gap: 12 }}>
      <ThemedText type="small" themeColor="textSecondary">
        {summary
          ? `${summary.going_count} ${summary.going_count === 1 ? 'person' : 'people'} attending${summary.rsvp_limit !== null ? ` · ${summary.rsvp_limit} seats` : ''}${summary.waitlist_count ? ` · ${summary.waitlist_count} groups waiting` : ''}`
          : 'RSVP information is loading.'}
      </ThemedText>
      <ThemedText type="smallBold">People in your group</ThemedText>
      <View
        style={{
          alignSelf: 'flex-start',
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 4,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove one person from your RSVP group"
          accessibilityState={{ disabled: partySize <= 1 || loading || disabled }}
          disabled={partySize <= 1 || loading || disabled}
          onPress={() => onPartySizeChange(Math.max(1, partySize - 1))}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: partySize <= 1 ? 0.45 : 1,
          }}
        >
          <ThemedText type="title">−</ThemedText>
        </Pressable>
        <ThemedText
          accessibilityLiveRegion="polite"
          accessibilityLabel={partySize + (partySize === 1 ? ' person' : ' people')}
          style={{ minWidth: 36, textAlign: 'center', flexShrink: 0 }}
          type="card"
        >
          {partySize}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add one person to your RSVP group"
          accessibilityState={{ disabled: partySize >= 10 || loading || disabled }}
          disabled={partySize >= 10 || loading || disabled}
          onPress={() => onPartySizeChange(Math.min(10, partySize + 1))}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: partySize >= 10 ? 0.45 : 1,
          }}
        >
          <ThemedText type="title">+</ThemedText>
        </Pressable>
      </View>
      {summary?.my_status === 'waitlisted' && (
        <ThemedText accessibilityLiveRegion="polite" type="small" themeColor="textSecondary">
          {waitlistPosition
            ? `Your group is number ${waitlistPosition} on the waitlist.`
            : 'Your waitlist position is not available right now.'}
        </ThemedText>
      )}
      <AppButton
        label={
          active
            ? 'Update group size'
            : full
              ? `Join waitlist · ${partySize} ${partySize === 1 ? 'person' : 'people'}`
              : `RSVP · ${partySize} ${partySize === 1 ? 'person' : 'people'}`
        }
        loading={loading}
        disabled={loading || disabled || !summary}
        onPress={onSave}
        variant={active ? 'secondary' : 'primary'}
      />
      {active && (
        <AppButton
          label={summary?.my_status === 'waitlisted' ? 'Leave waitlist' : 'Cancel RSVP'}
          loading={loading}
          disabled={loading || disabled}
          onPress={onCancel}
          variant="tertiary"
        />
      )}
    </View>
  );
}
