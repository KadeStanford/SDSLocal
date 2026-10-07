import { appointmentIsPast } from '@/lib/customer-commitments';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import {
  appointmentCommerce,
  readGuestAppointmentIds,
  readAppointmentAccess,
} from '@/lib/appointment-commerce';
import { CustomerBrand } from '@/components/customer-brand';
import { BackPill } from '@/components/back-pill';
import {
  MerchantButton,
  MerchantHeading,
  MerchantRow,
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
          <MerchantRow
            key={row.id}
            title={row.service_name}
            subtitle={`${row.business_name}\n${new Date(row.starts_at).toLocaleString(undefined, { timeZone: row.timezone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`}
            status={<MerchantStatus label={row.status.replaceAll('_', ' ')} tone="quiet" />}
            onPress={() => onOpen(row.id)}
          />
        ))
      ) : (
        <ThemedText themeColor="textSecondary">
          {filter === 'past'
            ? 'No past appointments yet.'
            : 'No upcoming appointments. Book a service from a business page.'}
        </ThemedText>
      )}
    </View>
  );
}
export default function MyAppointmentsScreen() {
  const { session } = useAuth();
  const owner = session?.user.id ?? null;
  const identity = useRef(owner);
  identity.current = owner;
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BackPill onPress={() => router.back()} />
          <CustomerBrand />
        </View>
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
