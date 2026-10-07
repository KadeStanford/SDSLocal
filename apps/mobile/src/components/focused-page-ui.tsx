import { Surface, SectionHeading } from './shared-ui';
import { PageHeader } from '@/components/page-header';
import { Platform } from 'react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppIcon } from './app-icon';

import { ThemedText } from './themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const focusedFont = Platform.OS === 'web' ? 'system-ui' : Fonts.sans;

export { HeaderBack as VisibleBack } from './page-header';
export function FocusedHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  disabled,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        onBack={onBack}
        backLabel={backLabel ?? 'Back'}
        backDisabled={disabled ?? false}
      />
      <View style={{ gap: 7 }}>
        <ThemedText
          accessibilityRole="header"
          style={{ fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 }}
        >
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText themeColor="textSecondary" style={{ fontSize: 15, lineHeight: 22 }}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {children}
    </View>
  );
}
export function FocusedSteps({ labels, current }: { labels: readonly string[]; current: number }) {
  const c = useTheme();
  return (
    <View
      accessibilityLabel={`Step ${current + 1} of ${labels.length}: ${labels[current]}`}
      style={{ gap: 10 }}
    >
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {labels.map((label, i) => (
          <View
            key={label}
            style={{
              height: 5,
              flex: 1,
              borderRadius: 3,
              backgroundColor: i <= current ? c.accent : c.divider,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <ThemedText type="smallBold">{labels[current]}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {current + 1} of {labels.length}
        </ThemedText>
      </View>
    </View>
  );
}
export function ReviewStars({ rating }: { rating: number }) {
  const c = useTheme();
  return (
    <View
      accessibilityLabel={`${rating} out of 5 stars`}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}
    >
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <AppIcon
            key={i}
            name="star"
            size={20}
            fill={i < Math.round(rating)}
            tintColor={i < Math.round(rating) ? c.accent : c.textSecondary}
          />
        ))}
      </View>
      <ThemedText type="smallBold">{rating.toFixed(1)} / 5</ThemedText>
    </View>
  );
}
export function FocusedSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Surface>
      <SectionHeading title={title} description={description} />
      {children}
    </Surface>
  );
}

export function FocusedBookingTime({
  startAt,
  timezone,
  duration,
}: {
  startAt: string;
  timezone: string;
  duration: number;
}) {
  const c = useTheme(),
    date = new Date(startAt),
    format = (options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(undefined, { timeZone: timezone, ...options }).format(date);
  return (
    <View style={{ gap: 14, padding: 18, borderRadius: 16, backgroundColor: c.backgroundSelected }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <AppIcon name="calendar-days" size={22} />
        <ThemedText type="smallBold" style={{ fontFamily: focusedFont, flex: 1 }}>
          {format({ weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
        </ThemedText>
      </View>
      <ThemedText
        style={{ fontFamily: focusedFont, fontSize: 28, lineHeight: 34, fontWeight: '700' }}
      >
        {format({ hour: 'numeric', minute: '2-digit' })}
      </ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <ThemedText type="small" themeColor="textSecondary">
          {format({ timeZoneName: 'short' }).split(' ').pop()} · {timezone}
        </ThemedText>
        <ThemedText type="smallBold">{duration} minutes</ThemedText>
      </View>
    </View>
  );
}
