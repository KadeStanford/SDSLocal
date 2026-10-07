import { FocusedHeader, FocusedBookingTime } from '@/components/focused-page-ui';
import { AppIcon } from '@/components/app-icon';
import { DateField } from '@/components/date-field';
import { BackPill } from '@/components/back-pill';
import { CustomerBrand } from '@/components/customer-brand';
import { FlowIdentity } from '@/components/flow-layout';
import { BookingTimeCard } from '@/components/booking-ui';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MerchantButton, MerchantHeading, MerchantSheet } from '@/components/merchant-ui';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { AppButton } from '@/components/app-button';
import { AppChrome } from '@/components/app-chrome';
import { StateNotice } from '@/components/data-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { useTheme } from '@/hooks/use-theme';
import {
  appointmentCommerce,
  readAppointmentAccess,
  saveAppointmentAccess,
  type AppointmentAccess,
} from '@/lib/appointment-commerce';
import { useAuth } from '@/providers/auth-provider';

type AppointmentStatus = {
  id: string;
  businessId: string;
  serviceId: string;
  resourceId: string | null;
  service: { name: string; durationMinutes: number; publicInstructions?: string };
  resource: { name?: string };
  timezone: string;
  startAt: string;
  endAt: string;
  status: string;
  paymentStatus: string;
  refundedMinor: number;
  refundableMinor: number;
  disputeState: string | null;
  totalMinor: number;
  amountDueMinor: number;
  balanceMinor: number;
  currency: string;
  cancellationCutoffMinutes: number;
  checkoutUrl: string | null;
  version: number;
};

type AppointmentSlot = {
  startAt: string;
  endAt: string;
  resourceId: string | null;
  resourceName: string | null;
};

function localDateAtZone(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addDays(date: string, days: number) {
  const [year = 2000, month = 1, day = 1] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

function dateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    requested: 'Waiting for the business to confirm',
    payment_pending: 'Confirming payment',
    confirmed: 'Confirmed',
    checked_in: 'Checked in',
    in_service: 'In service',
    completed: 'Completed',
    cancellation_pending: 'Cancellation requested',
    cancelled: 'Cancelled',
    no_show: 'Marked as a no-show',
    declined: 'Declined by the business',
    expired: 'Booking expired',
    payment_review: 'Payment needs the business to review it',
  };
  return labels[status] ?? 'Appointment status unavailable';
}

export default function AppointmentScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const { session } = useAuth();
  const signedInUserId = session?.user.id;
  const colors = useTheme();
  const merchantColors = useMerchantTheme();
  const [changesOpen, setChangesOpen] = useState(false);
  const bottomPadding = useScreenBottomPadding();
  const [access, setAccess] = useState<AppointmentAccess | null>(null);
  const [appointment, setAppointment] = useState<AppointmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [pendingRequest, setPendingRequest] = useState<{ target: string; key: string } | null>(
    null,
  );

  useEffect(() => {
    const initialTimer = setTimeout(() => setCurrentTime(Date.now()), 0);
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!appointmentId) {
      setError('This appointment link is missing its booking ID.');
      setLoading(false);
      return;
    }
    setError('');
    try {
      let saved = await readAppointmentAccess(appointmentId);
      if (!saved && signedInUserId) {
        const bytes = await Crypto.getRandomBytesAsync(32);
        saved = {
          appointmentId,
          businessId: '',
          idempotencyKey: '00000000-0000-4000-8000-000000000000',
          statusToken: [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
        };
      }
      if (!saved)
        throw new Error('This guest appointment can only be opened on the device used to book it.');
      setAccess(saved);
      const result = await appointmentCommerce<{
        appointment: AppointmentStatus;
        statusToken?: string;
      }>('appointment_status', { appointmentId, statusToken: saved.statusToken });
      setAppointment(result.appointment);
      if (result.statusToken) {
        const next = { ...saved, statusToken: result.statusToken };
        await saveAppointmentAccess(next);
        setAccess(next);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Appointment status could not load.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId, signedInUserId]);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const paymentNeedsPolling =
    appointment?.status === 'payment_pending' || appointment?.paymentStatus === 'refund_pending';

  useEffect(() => {
    if (!paymentNeedsPolling) return;
    const timer = setInterval(() => void refresh(), 12000);
    return () => clearInterval(timer);
  }, [paymentNeedsPolling, refresh]);

  const appointmentBusinessId = appointment?.businessId;
  const appointmentServiceId = appointment?.serviceId;

  useEffect(() => {
    if (!rescheduling || !appointmentBusinessId || !appointmentServiceId) return;
    let active = true;
    void appointmentCommerce<{ slots: AppointmentSlot[] }>('appointment_slots', {
      businessId: appointmentBusinessId,
      serviceId: appointmentServiceId,
      date: scheduleDate,
    })
      .then((result) => {
        if (active) setSlots(result.slots ?? []);
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Available times could not load.');
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [appointmentBusinessId, appointmentServiceId, rescheduling, scheduleDate]);

  async function cancelAppointment() {
    if (!appointment || !access) return;
    setBusy(true);
    setError('');
    try {
      const result = await appointmentCommerce<{
        appointment: AppointmentStatus;
        statusToken?: string;
      }>('appointment_customer_action', {
        appointmentId: appointment.id,
        statusToken: access.statusToken,
        version: appointment.version,
        appointmentAction: 'customer_cancel',
      });
      setAppointment(result.appointment);
      if (result.statusToken) {
        const next = { ...access, statusToken: result.statusToken };
        await saveAppointmentAccess(next);
        setAccess(next);
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Your cancellation request could not be sent.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function rescheduleAppointment(slot: AppointmentSlot) {
    if (!appointment || !access) return;
    setBusy(true);
    setError('');
    setNotice('');
    const target = `${slot.startAt}:${slot.resourceId ?? ''}`;
    let key = pendingRequest?.target === target ? pendingRequest.key : '';
    try {
      if (!key) {
        const bytes = await Crypto.getRandomBytesAsync(16);
        const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
        key = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
        setPendingRequest({ target, key });
      }
      const result = await appointmentCommerce<{
        appointment: AppointmentStatus;
        statusToken?: string;
      }>('appointment_customer_reschedule', {
        appointmentId: appointment.id,
        statusToken: access.statusToken,
        version: appointment.version,
        startAt: slot.startAt,
        resourceId: slot.resourceId,
        idempotencyKey: key,
      });
      setAppointment(result.appointment);
      setRescheduling(false);
      setPendingRequest(null);
      setNotice('Your appointment time has been updated.');
      if (result.statusToken) {
        const next = { ...access, statusToken: result.statusToken };
        await saveAppointmentAccess(next);
        setAccess(next);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your appointment could not be moved.');
    } finally {
      setBusy(false);
    }
  }

  const canCancel =
    appointment &&
    ['requested', 'confirmed', 'checked_in', 'in_service'].includes(appointment.status) &&
    currentTime != null &&
    Date.parse(appointment.startAt) - currentTime >= appointment.cancellationCutoffMinutes * 60000;
  const canReschedule =
    appointment &&
    ['requested', 'confirmed'].includes(appointment.status) &&
    ['none', 'paid'].includes(appointment.paymentStatus) &&
    currentTime != null &&
    Date.parse(appointment.startAt) - currentTime >= appointment.cancellationCutoffMinutes * 60000;
  const today =
    appointment && currentTime != null
      ? localDateAtZone(new Date(currentTime), appointment.timezone)
      : '';
  const dates = today ? Array.from({ length: 14 }, (_, index) => addDays(today, index + 1)) : [];

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
            paddingBottom: bottomPadding,
            gap: 20,
          }}
        >
          <View
            style={{
              flex: 1,
              gap: 20,
            }}
          >
            <FocusedHeader
              title="Your appointment"
              subtitle={appointment?.service.name ?? 'Checking your booking'}
              onBack={() =>
                router.canGoBack() ? router.back() : router.replace('/my-appointments')
              }
              backLabel="Back to appointments"
            />
            {loading ? <ThemedText>Checking appointment status…</ThemedText> : null}
            {!!error && <StateNotice kind="error" message={error} />}
            {!!notice && <StateNotice kind="success" message={notice} />}
            {appointment ? (
              <View
                style={{
                  gap: 16,
                  padding: 20,
                  backgroundColor: merchantColors.surface,
                  borderWidth: 1,
                  borderColor: merchantColors.border,
                  borderRadius: 22,
                }}
              >
                <View
                  accessibilityLiveRegion="polite"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: colors.backgroundSelected,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppIcon
                      name={
                        ['confirmed', 'checked_in', 'in_service', 'completed'].includes(
                          appointment.status,
                        )
                          ? 'circle-check'
                          : 'calendar-days'
                      }
                      size={26}
                    />
                  </View>
                  <ThemedText
                    accessibilityRole="header"
                    style={{ flex: 1, fontSize: 23, lineHeight: 29, fontWeight: '700' }}
                  >
                    {statusLabel(appointment.status)}
                  </ThemedText>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <ThemedText type="smallBold" style={{ flex: 1 }}>
                    Appointment details
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {appointment.service.durationMinutes} min
                  </ThemedText>
                </View>
                <FocusedBookingTime
                  startAt={appointment.startAt}
                  timezone={appointment.timezone}
                  duration={appointment.service.durationMinutes}
                />
                {appointment.resource?.name ? (
                  <ThemedText themeColor="textSecondary">
                    With {appointment.resource.name}
                  </ThemedText>
                ) : null}

                {appointment.paymentStatus === 'pending' ? (
                  <ThemedText themeColor="textSecondary">
                    We’ll keep this time reserved while Square Sandbox confirms payment. Returning
                    from checkout does not confirm it.
                  </ThemedText>
                ) : null}
                {appointment.paymentStatus === 'refund_pending' ? (
                  <ThemedText themeColor="textSecondary">
                    Square is processing a refund. This page will show the confirmed result when
                    Square updates it.
                  </ThemedText>
                ) : null}
                {appointment.refundedMinor > 0 ? (
                  <ThemedText themeColor="textSecondary">
                    Refunded {money(appointment.refundedMinor, appointment.currency)} · remaining
                    payment {money(appointment.refundableMinor, appointment.currency)}
                  </ThemedText>
                ) : null}
                {appointment.paymentStatus === 'review' ||
                appointment.paymentStatus === 'dispute_lost' ? (
                  <ThemedText themeColor="textSecondary">
                    The payment needs review. Contact the business for help with your appointment
                    and any remaining refund.
                  </ThemedText>
                ) : null}
                {appointment.paymentStatus === 'refund_failed' ? (
                  <ThemedText themeColor="textSecondary">
                    The business needs to review the refund with Square. Your appointment remains
                    under cancellation review.
                  </ThemedText>
                ) : null}
                {appointment.paymentStatus === 'reimbursed_external' ? (
                  <ThemedText themeColor="textSecondary">
                    The business confirmed that it reimbursed you directly. No Square refund was
                    processed.
                  </ThemedText>
                ) : null}
                {appointment.paymentStatus === 'paid' ? (
                  <ThemedText themeColor="textSecondary">
                    Paid {money(appointment.amountDueMinor, appointment.currency)} · remaining
                    balance {money(appointment.balanceMinor, appointment.currency)}
                  </ThemedText>
                ) : null}
                {appointment.paymentStatus === 'none' && appointment.totalMinor > 0 ? (
                  <View
                    style={{
                      paddingTop: 16,
                      borderTopWidth: 1,
                      borderColor: colors.divider,
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <ThemedText themeColor="textSecondary">Estimated service total</ThemedText>
                      <ThemedText style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}>
                        {money(appointment.totalMinor, appointment.currency)}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      Pay the business in person.
                    </ThemedText>
                  </View>
                ) : null}
                {appointment.service.publicInstructions ? (
                  <ThemedText themeColor="textSecondary">
                    {appointment.service.publicInstructions}
                  </ThemedText>
                ) : null}
              </View>
            ) : null}
            <View style={{ gap: 12 }}>
              {(canCancel || canReschedule) && (
                <MerchantButton
                  label="Change appointment"

                  disabled={busy || loading}
                  onPress={() => setChangesOpen(true)}
                />
              )}
              <MerchantButton
                label="Refresh status"
                secondary
                disabled={busy}
                onPress={() => {
                  setLoading(true);
                  void refresh();
                }}
              />
              <MerchantButton
                label="All my appointments"
                secondary
                onPress={() => router.replace('/my-appointments' as never)}
              />
            </View>
            <MerchantSheet
              visible={changesOpen}
              title="Change appointment"
              blocked={busy}
              onClose={() => {
                setChangesOpen(false);
                setRescheduling(false);
              }}
            >
              {error && <StateNotice kind="error" message={error} />}
              {notice && <StateNotice kind="success" message={notice} />}
              {canCancel ? (
                <AppButton
                  label="Request cancellation"
                  variant="secondary"
                  loading={busy}
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      'Request cancellation?',
                      'The business will review the request. Any refund will remain pending until Square confirms it.',
                      [
                        { text: 'Keep appointment', style: 'cancel' },
                        {
                          text: 'Request cancellation',
                          style: 'destructive',
                          onPress: () => void cancelAppointment(),
                        },
                      ],
                    )
                  }
                />
              ) : null}
              {canReschedule ? (
                <AppButton
                  label={rescheduling ? 'Hide available times' : 'Reschedule'}
                  variant="secondary"
                  disabled={busy}
                  onPress={() => {
                    const nextDate = addDays(localDateAtZone(new Date(), appointment.timezone), 1);
                    setLoadingSlots(true);
                    setError('');
                    setScheduleDate(nextDate);
                    setSlots([]);
                    setRescheduling((value) => !value);
                  }}
                />
              ) : null}
              {rescheduling && appointment ? (
                <View style={{ gap: Spacing.two }}>
                  <ThemedText type="subtitle">Choose a new time</ThemedText>
                  <DateField
                    label="New appointment date"
                    required
                    value={scheduleDate}
                    minimumDate={localDateAtZone(new Date(), appointment.timezone)}
                    onChange={(next) => {
                      setLoadingSlots(true);
                      setError('');
                      setSlots([]);
                      setScheduleDate(next);
                    }}
                  />
                  <ThemedText themeColor="textSecondary" type="small">
                    Times are shown in {appointment.timezone}. Your current appointment stays
                    reserved until a new time is confirmed.
                  </ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flexGrow: 0 }}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {dates.map((date) => {
                      const selected = date === scheduleDate;
                      return (
                        <Pressable
                          key={date}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={dayLabel(date)}
                          onPress={() => {
                            setLoadingSlots(true);
                            setError('');
                            setSlots([]);
                            setScheduleDate(date);
                          }}
                          style={{
                            minHeight: 48,
                            minWidth: 106,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: Spacing.two,
                            borderRadius: Radius.medium,
                            borderWidth: 1,
                            borderColor: selected ? colors.actionPrimary : colors.border,
                            backgroundColor: selected
                              ? colors.backgroundSelected
                              : colors.backgroundElement,
                          }}
                        >
                          <ThemedText type="smallBold">{dayLabel(date)}</ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  {loadingSlots ? <ThemedText>Checking available times…</ThemedText> : null}
                  {!loadingSlots && !slots.length ? (
                    <ThemedText themeColor="textSecondary">
                      No available times on this date.
                    </ThemedText>
                  ) : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one }}>
                    {slots.map((slot) => (
                      <Pressable
                        key={`${slot.startAt}:${slot.resourceId ?? ''}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Reschedule to ${dateTime(slot.startAt, appointment.timezone)}${slot.resourceName ? ` with ${slot.resourceName}` : ''}`}
                        disabled={busy || loadingSlots}
                        onPress={() =>
                          Alert.alert(
                            'Change appointment time?',
                            `Move your appointment to ${dateTime(slot.startAt, appointment.timezone)}?`,
                            [
                              { text: 'Keep current time', style: 'cancel' },
                              {
                                text: 'Confirm new time',
                                onPress: () => void rescheduleAppointment(slot),
                              },
                            ],
                          )
                        }
                        style={{
                          minHeight: 48,
                          minWidth: '30%',
                          flexGrow: 1,
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingHorizontal: Spacing.two,
                          borderRadius: Radius.medium,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.backgroundElement,
                          opacity: busy || loadingSlots ? 0.55 : 1,
                        }}
                      >
                        <ThemedText type="smallBold">
                          {new Intl.DateTimeFormat(undefined, {
                            timeZone: appointment.timezone,
                            hour: 'numeric',
                            minute: '2-digit',
                          }).format(new Date(slot.startAt))}
                        </ThemedText>
                        {slot.resourceName ? (
                          <ThemedText themeColor="textSecondary" type="small">
                            {slot.resourceName}
                          </ThemedText>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </MerchantSheet>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
