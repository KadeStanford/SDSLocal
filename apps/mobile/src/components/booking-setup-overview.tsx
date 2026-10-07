import { Brand } from '@/constants/theme';
import { type ReactNode } from 'react';
import { Switch, View } from 'react-native';
import { MerchantButton, MerchantRow, MerchantStatus } from './merchant-ui';
import { ThemedText } from './themed-text';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
export type BookingPanel = 'services' | 'hours' | 'resources' | 'policy';
export function BookingGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const c = useMerchantTheme();
  return (
    <View
      style={{
        padding: 18,
        gap: 16,
        borderWidth: 0,
        borderColor: c.border,
        borderRadius: 18,
        backgroundColor: c.surface,
      }}
    >
      <View style={{ gap: 5 }}>
        <ThemedText type="card">{title}</ThemedText>
        {description && (
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        )}
      </View>
      {children}
    </View>
  );
}
export function BookingSetupOverview({
  enabled,
  onEnabled,
  serviceCount,
  bookableCount,
  dayCount,
  resourceCount,
  timezone,
  disabled,
  onOpen,
  onRequests,
}: {
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  serviceCount: number;
  bookableCount: number;
  dayCount: number;
  resourceCount: number;
  timezone: string;
  disabled: boolean;
  onOpen: (panel: BookingPanel) => void;
  onRequests?: () => void;
}) {
  const c = useMerchantTheme();
  const ready = bookableCount > 0 && dayCount > 0;
  const cards: [BookingPanel, string, string, string][] = [
    [
      'services',
      'Services',
      `${serviceCount} services · ${bookableCount} available to book`,
      'Set duration, price and payment for each service.',
    ],
    [
      'hours',
      'Availability',
      `${dayCount} days configured`,
      'Choose appointment hours and days off.',
    ],
    [
      'policy',
      'Booking rules',
      'Confirmation & cancellation',
      'Decide how far ahead customers can book.',
    ],
    [
      'resources',
      'Team & resources',
      `${resourceCount} active · optional`,
      'Assign people, rooms or equipment.',
    ],
  ];
  return (
    <View style={{ gap: 20 }}>
      <BookingGroup
        title="Online booking"
        description="Let customers reserve a time from your business page."
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 7 }}>
            <MerchantStatus
              label={enabled ? 'Accepting appointments' : 'Bookings paused'}
              tone={enabled ? 'success' : 'quiet'}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {ready
                ? 'Your services and hours are ready.'
                : 'Add a bookable service and availability to get started.'}
            </ThemedText>
          </View>
          <Switch
            trackColor={{ false: c.border, true: Brand.primary }}
            accessibilityLabel="Accept appointments"
            value={enabled}
            disabled={disabled || (!ready && !enabled)}
            onValueChange={onEnabled}
          />
        </View>
      </BookingGroup>
      <View style={{ gap: 10 }}>
        {cards.map(([key, title, subtitle, detail], index) => (
          <View
            key={key}
            style={{
              borderWidth: 0,
              borderColor: c.border,
              borderRadius: 12,
              backgroundColor: c.surface,
              overflow: 'hidden',
            }}
          >
            <MerchantRow
              title={title}
              subtitle={subtitle}
              detail={detail}
              disabled={disabled}
              leading={
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: c.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ThemedText type="smallBold">{index + 1}</ThemedText>
                </View>
              }
              onPress={() => onOpen(key)}
            />
          </View>
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Times follow {timezone.replaceAll('_', ' ')}. Appointment availability also respects your
        business hours.
      </ThemedText>
      {onRequests && (
        <BookingGroup
          title="Need details before booking?"
          description="Estimates and service enquiries live in a separate inbox. Customize the questions customers answer there."
        >
          <MerchantButton brand label="Requests & estimates" secondary onPress={onRequests} />
        </BookingGroup>
      )}
    </View>
  );
}
