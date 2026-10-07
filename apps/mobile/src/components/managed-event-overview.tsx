import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { MerchantButton, MerchantStatus } from './merchant-ui';
export function ManagedEventOverview({
  title,
  startsAt,
  timezone,
  location,
  photo,
  published,
  publishAt,
  attending,
  capacity,
  waitlisted,
  canEdit,
  disabled,
  publishingControl,
  onEdit,
  onArchive,
  onAttendees,
}: {
  title: string;
  startsAt: string;
  timezone: string;
  location: string | null;
  photo: string | null;
  published: boolean;
  publishAt: string | null;
  attending: number;
  capacity: number | null;
  waitlisted: number;
  canEdit: boolean;
  disabled: boolean;
  publishingControl: React.ReactNode;
  onEdit: () => void;
  onArchive: () => void;
  onAttendees: () => void;
}) {
  const c = useTheme(),
    [more, setMore] = useState(false);
  return (
    <View style={{ gap: 20 }}>
      {photo && (
        <Image
          source={{ uri: photo }}
          contentFit="cover"
          accessibilityLabel={`${title} cover`}
          style={{ width: '100%', height: 170, borderRadius: 18 }}
        />
      )}
      <MerchantStatus
        label={published ? 'Published' : publishAt ? 'Scheduled' : 'Draft'}
        tone={published ? 'success' : 'quiet'}
      />
      <ThemedText type="subtitle">{title}</ThemedText>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <SymbolView name="calendar" tintColor={c.accent} style={{ width: 23, height: 23 }} />
        <View style={{ flex: 1, gap: 3 }}>
          <ThemedText type="smallBold">
            {new Intl.DateTimeFormat(undefined, {
              timeZone: timezone,
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(new Date(startsAt))}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {new Intl.DateTimeFormat(undefined, {
              timeZone: timezone,
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short',
            }).format(new Date(startsAt))}
          </ThemedText>
        </View>
      </View>
      {!!location && (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <SymbolView
            name="mappin.and.ellipse"
            tintColor={c.accent}
            style={{ width: 23, height: 23 }}
          />
          <ThemedText type="small" style={{ flex: 1 }}>
            {location}
          </ThemedText>
        </View>
      )}
      {publishAt && !published && (
        <ThemedText type="small" themeColor="textSecondary">
          Scheduled to publish{' '}
          {new Intl.DateTimeFormat(undefined, {
            timeZone: timezone,
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(publishAt))}
        </ThemedText>
      )}
      {publishingControl}
      <View
        style={{
          padding: 18,
          gap: 14,
          borderRadius: 18,
          backgroundColor: c.background,
          borderWidth: 1,
          borderColor: c.divider,
        }}
      >
        <ThemedText type="smallBold">Guest list</ThemedText>
        <ThemedText type="subtitle">
          {attending}
          {capacity !== null ? ` / ${capacity}` : ''}{' '}
          <ThemedText type="small" themeColor="textSecondary">
            attending
          </ThemedText>
        </ThemedText>
        {waitlisted > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            {waitlisted} groups on the waitlist
          </ThemedText>
        )}
        <MerchantButton
          brand
          secondary
          label="Manage attendees"
          disabled={disabled}
          onPress={onAttendees}
        />
      </View>
      {canEdit && (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <MerchantButton brand label="Edit event" disabled={disabled} onPress={onEdit} />
            </View>
            <MerchantButton
              secondary
              label="More"
              disabled={disabled}
              onPress={() => setMore(!more)}
            />
          </View>
          {more && (
            <MerchantButton
              label="Archive event"
              secondary
              disabled={disabled}
              onPress={onArchive}
            />
          )}
        </>
      )}
    </View>
  );
}
