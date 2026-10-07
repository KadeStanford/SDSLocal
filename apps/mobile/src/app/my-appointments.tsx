import { PageHeader } from '@/components/page-header';
import { appointmentIsPast } from '@/lib/customer-commitments';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppIcon } from '@/components/app-icon';
import { EmptyState } from '@/components/data-state';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import {
  appointmentCommerce,
  readGuestAppointmentIds,
  readAppointmentAccess,
} from '@/lib/appointment-commerce';

import {
  MerchantButton,
  MerchantHeading,
  MerchantStatus,
  merchantStyles,
} from '@/components/merchant-ui';
import { CustomerTabs } from '@/components/customer-ui';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
export type CustomerAppointment = {
  id: string;
  business_name: string;
  service_name: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: string;
  payment_status: string;
};
export function AppointmentHistoryList({
  rows,
  filter,
  onOpen,
}: {
  rows: CustomerAppointment[];
  filter: 'upcoming' | 'past';
  onOpen: (id: string) => void;
}) {
  const c = useTheme();
  const visible = rows
    .filter((row) => appointmentIsPast(row) === (filter === 'past'))
    .sort((a, b) =>
      filter === 'past'
        ? b.starts_at.localeCompare(a.starts_at)
        : a.starts_at.localeCompare(b.starts_at),
    );
  return (
    <View style={{ gap: 12 }}>
      {visible.length ? (
        visible.map((row) => (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            accessibilityLabel={`View ${row.service_name} at ${row.business_name}, ${row.status.replaceAll('_', ' ')}`}
            onPress={() => onOpen(row.id)}
            style={({ pressed }) => ({
              borderWidth: 1,
              borderColor: c.divider,
              borderRadius: 20,
              overflow: 'hidden',
              backgroundColor: c.backgroundElement,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View style={{ padding: 18, gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                <View
                  style={{
                    width: 66,
                    paddingVertical: 12,
                    borderRadius: 14,
                    backgroundColor: c.backgroundSelected,
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ThemedText type="smallBold">
                    {new Date(row.starts_at).toLocaleDateString(undefined, {
                      timeZone: row.timezone,
                      month: 'short',
                    })}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 26, lineHeight: 32, fontWeight: '700' }}>
                    {new Date(row.starts_at).toLocaleDateString(undefined, {
                      timeZone: row.timezone,
                      day: 'numeric',
                    })}
                  </ThemedText>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <ThemedText type="card">{row.service_name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {row.business_name}
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {new Date(row.starts_at).toLocaleTimeString(undefined, {
                      timeZone: row.timezone,
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZoneName: 'short',
                    })}
                  </ThemedText>
                </View>
              </View>
              <MerchantStatus label={row.status.replaceAll('_', ' ')} tone="quiet" />
            </View>
            <View
              style={{
                minHeight: 48,
                paddingHorizontal: 18,
                paddingVertical: 13,
                backgroundColor: c.accent,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <ThemedText type="smallBold" style={{ color: c.onAccent }}>
                View appointment
              </ThemedText>
              <AppIcon name="chevron-right" size={20} tintColor={c.onAccent} />
            </View>
          </Pressable>
        ))
      ) : (
        <EmptyState
          title={filter === 'past' ? 'No past appointments yet' : 'No upcoming appointments'}
          message={
            filter === 'past'
              ? 'Completed and cancelled bookings appear here.'
              : 'Book a service from a business page.'
          }
        />
      )}
    </View>
  );
}
export default function MyAppointmentsScreen() {
  const { session } = useAuth();
  const owner = session?.user.id ?? null;
  const identity = useRef(owner);
  useLayoutEffect(() => {
    identity.current = owner;
    return () => {
      identity.current = null;
    };
  }, [owner]);
  const version = useRef(0);
  const c = useTheme();
  const bottom = useScreenBottomPadding();
  const [snapshot, setSnapshot] = useState<{
    owner: string | null;
    rows: CustomerAppointment[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const load = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    setError('');
    try {
      let rows: CustomerAppointment[];
      if (owner) {
        const result = await supabase.rpc('get_customer_appointments');
        if (result.error) throw result.error;
        rows = result.data ?? [];
      } else {
        const results = await Promise.allSettled(
          (await readGuestAppointmentIds()).map(async (id) => {
            const access = await readAppointmentAccess(id);
            if (!access) throw new Error('Unavailable');
            const result = await appointmentCommerce<any>('appointment_status', {
              appointmentId: id,
              statusToken: access.statusToken,
            });
            const detail = result.appointment;
            return {
              id,
              business_name: 'Guest booking',
              service_name: detail.service.name,
              starts_at: detail.startAt,
              ends_at: detail.endAt,
              timezone: detail.timezone,
              status: detail.status,
              payment_status: detail.paymentStatus,
            } as CustomerAppointment;
          }),
        );
        rows = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
        if (
          results.some((result) => result.status === 'rejected') &&
          current === version.current &&
          identity.current === owner
        )
          setError('Some guest bookings couldn’t load. Retry to check their status.');
      }
      if (current === version.current && identity.current === owner) setSnapshot({ owner, rows });
    } catch {
      if (current === version.current && identity.current === owner)
        setError('Your appointments couldn’t load. Retry to check your bookings.');
    } finally {
      if (current === version.current && identity.current === owner) setLoading(false);
    }
  }, [owner]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        version.current++;
      };
    }, [load]),
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={[merchantStyles.content, { paddingBottom: bottom }]}>
        <PageHeader onBack={() => router.back()} />
        <MerchantHeading
          title="My appointments"
          subtitle="View, reschedule or cancel your bookings."
        />
        {!owner && (
          <ThemedText themeColor="textSecondary">
            Guest bookings saved on this device appear here. Sign in to see bookings made with your
            account.
          </ThemedText>
        )}
        {!owner && (
          <MerchantButton label="Sign in" secondary onPress={() => router.push('/account')} />
        )}
        <CustomerTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
        />
        {error ? (
          <View style={{ gap: 12 }}>
            <ThemedText>{error}</ThemedText>
            <MerchantButton label="Retry appointments" secondary onPress={() => void load()} />
          </View>
        ) : null}
        {loading ? (
          <ThemedText>Loading appointments…</ThemedText>
        ) : (
          snapshot?.owner === owner && (
            <AppointmentHistoryList
              rows={snapshot.rows}
              filter={filter}
              onOpen={(id) =>
                router.push({ pathname: '/appointment', params: { appointmentId: id } } as never)
              }
            />
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
