import {
  FocusedHeader,
  FocusedSteps,
  FocusedBookingTime,
  FocusedSection,
} from '@/components/focused-page-ui';
import { DateField } from '@/components/date-field';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { FlowSection, FlowIdentity, FlowProgress } from '@/components/flow-layout';
import { BookingFact, BookingTimeCard } from '@/components/booking-ui';
import { CustomerBrand } from '@/components/customer-brand';
import { AppIcon } from '@/components/app-icon';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MerchantButton } from '@/components/merchant-ui';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { AppButton } from '@/components/app-button';
import { AppChrome } from '@/components/app-chrome';
import { StateNotice } from '@/components/data-state';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import {
  appointmentAccess,
  appointmentCommerce,
  saveAppointmentAccess,
} from '@/lib/appointment-commerce';
import { openSquare } from '@/lib/square-commerce';
import { useTheme } from '@/hooks/use-theme';

type BookableService = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_minor: number;
  currency: string;
  price_is_fixed: boolean;
  payment_policy: 'pay_in_person' | 'fixed_deposit' | 'percentage_deposit' | 'full_prepayment';
  deposit_minor: number | null;
  deposit_percent: number | null;
  requires_resource: boolean;
  public_instructions: string;
};

type BookableBusiness = {
  business: { id: string; name: string; phone: string | null; address: string };
  settings: {
    timezone: string;
    cancellationCutoffMinutes: number;
    cancellationTerms: string;
    publicInstructions: string;
    bookingHorizonDays: number;
  };
  services: BookableService[];
};

type AppointmentSlot = {
  startAt: string;
  endAt: string;
  localTime: string;
  utcOffsetMinutes: number;
  resourceId: string | null;
  resourceName: string | null;
};

function dateForZone(timezone: string, offsetDays = 0) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return new Date(Date.UTC(year, month - 1, day + offsetDays)).toISOString().slice(0, 10);
}

function dateLabel(date: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`));
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
}

function depositLabel(service: BookableService) {
  if (service.payment_policy === 'pay_in_person') return 'Pay in person';
  if (service.payment_policy === 'full_prepayment')
    return `Pay ${money(service.price_minor, service.currency)} now`;
  const deposit =
    service.payment_policy === 'fixed_deposit'
      ? (service.deposit_minor ?? 0)
      : Math.ceil((service.price_minor * (service.deposit_percent ?? 0)) / 100);
  return `Pay ${money(deposit, service.currency)} deposit now`;
}

export default function BookAppointmentScreen() {
  const { session } = useAuth();
  const scroll = useRef<ScrollView>(null);
  const contactEdited = useRef({ name: false, phone: false, email: false });
  const nameInput = useRef<import('@/components/app-text-input').AppTextInputHandle>(null);
  const phoneInput = useRef<import('@/components/app-text-input').AppTextInputHandle>(null);
  const emailInput = useRef<import('@/components/app-text-input').AppTextInputHandle>(null);
  const { businessId } = useLocalSearchParams<{ businessId?: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const theme = useTheme();
  const bottomPadding = useScreenBottomPadding();
  const [catalogResult, setCatalogResult] = useState<{
    businessId: string;
    catalog?: BookableBusiness;
    error?: string;
  } | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [slotResult, setSlotResult] = useState<{
    key: string;
    slots: AppointmentSlot[];
    error?: string;
  } | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  useEffect(() => {
    let active = true;
    if (!session) return;
    if (!contactEdited.current.email) setCustomerEmail(session.user.email ?? '');
    void supabase
      .from('profiles')
      .select('display_name')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && !contactEdited.current.name) setCustomerName(data?.display_name ?? '');
      });
    return () => {
      active = false;
    };
  }, [session]);
  const [notes, setNotes] = useState('');
  const merchantColors = useMerchantTheme();
  const [stage, setStage] = useState<'service' | 'time' | 'contact'>('service');
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [slotAttempt, setSlotAttempt] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const visibleStep = useRef(`${stage}:${reviewing}`);
  useEffect(() => {
    const next = `${stage}:${reviewing}`;
    if (visibleStep.current === next) return;
    visibleStep.current = next;
    const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ y: 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [stage, reviewing]);
  const bookingPending = useRef(false);
  const [error, setError] = useState('');
  const routeCatalog =
    businessId && catalogResult?.businessId === businessId ? catalogResult : null;
  const catalog = routeCatalog?.catalog ?? null;
  const loading = Boolean(businessId && !routeCatalog);
  const catalogError = routeCatalog?.error ?? null;
  const slotQueryKey =
    catalog && selectedServiceId && date
      ? `${catalog.business.id}:${selectedServiceId}:${selectedResourceId ?? ''}:${date}`
      : null;
  const currentSlotResult = slotResult?.key === slotQueryKey ? slotResult : null;
  const slots = currentSlotResult?.slots ?? [];
  const loadingSlots = Boolean(slotQueryKey && !currentSlotResult);

  const [previousBusinessId, setPreviousBusinessId] = useState(businessId);
  if (previousBusinessId !== businessId) {
    setPreviousBusinessId(businessId);
    setStage('service');
    setReviewing(false);
    setSelectedSlot(null);
    setSelectedResourceId(null);
    setError('');
  }
  useEffect(() => {
    if (!businessId) return;
    let active = true;
    void appointmentCommerce<BookableBusiness>('appointment_public', { businessId })
      .then((data) => {
        if (!active) return;
        setCatalogResult({ businessId, catalog: data });
        if (data.services[0]) setSelectedServiceId(data.services[0].id);
        setDate(dateForZone(data.settings.timezone));
      })
      .catch((reason: unknown) => {
        if (active) {
          setCatalogResult({
            businessId,
            error: reason instanceof Error ? reason.message : 'Appointments could not load.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [businessId, catalogAttempt]);

  useEffect(() => {
    if (!catalog || !selectedServiceId || !date || !slotQueryKey) return;
    let active = true;
    void appointmentCommerce<{ slots: AppointmentSlot[] }>('appointment_slots', {
      businessId: catalog.business.id,
      serviceId: selectedServiceId,
      resourceId: selectedResourceId,
      date,
    })
      .then((result) => {
        if (active) setSlotResult({ key: slotQueryKey, slots: result.slots ?? [] });
      })
      .catch((reason: unknown) => {
        if (active) {
          setSlotResult({
            key: slotQueryKey,
            slots: [],
            error: reason instanceof Error ? reason.message : 'Available times could not load.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [catalog, selectedServiceId, selectedResourceId, date, slotQueryKey, slotAttempt]);

  const selectedService = useMemo(
    () => catalog?.services.find((service) => service.id === selectedServiceId) ?? null,
    [catalog?.services, selectedServiceId],
  );

  async function submitBooking() {
    if (bookingPending.current || !catalog || !selectedService || !selectedSlot || !businessId)
      return;
    if (customerName.trim().length < 2 || customerPhone.replace(/\D/g, '').length < 7) {
      setError('Enter your name and a phone number the business can use to reach you.');
      return;
    }
    bookingPending.current = true;
    setSaving(true);
    setError('');
    let access: Awaited<ReturnType<typeof appointmentAccess>> | null = null;
    try {
      access = await appointmentAccess(businessId);
      await saveAppointmentAccess(access);
      const result = await appointmentCommerce<{
        appointment: { id: string; checkoutUrl: string | null };
        statusToken?: string;
      }>('appointment_book', {
        businessId,
        serviceId: selectedService.id,
        resourceId: selectedSlot.resourceId,
        startAt: selectedSlot.startAt,
        statusToken: access.statusToken,
        idempotencyKey: access.idempotencyKey,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        notes: notes.trim(),
      });
      const savedAccess = {
        ...access,
        appointmentId: result.appointment.id,
        statusToken: result.statusToken ?? access.statusToken,
      };
      await saveAppointmentAccess(savedAccess);
      router.replace({
        pathname: '/appointment',
        params: { appointmentId: result.appointment.id },
      } as never);
      if (result.appointment.checkoutUrl) await openSquare(result.appointment.checkoutUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your appointment could not be booked.');
    } finally {
      bookingPending.current = false;
      setSaving(false);
    }
  }

  function shiftDate(amount: number) {
    if (!catalog || !date) return;
    const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
    const first = dateForZone(catalog.settings.timezone);
    if (next < first) return;
    setSelectedSlot(null);
    setError('');
    setDate(next);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={{
            gap: 20,
            padding: 20,
            paddingBottom: bottomPadding,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <FocusedHeader
            title={
              reviewing
                ? 'Review your booking'
                : stage === 'service'
                  ? 'Choose your service'
                  : stage === 'time'
                    ? 'Choose your time'
                    : 'Your contact details'
            }
            subtitle={catalog?.business.name ?? 'Book with a local business'}
            disabled={saving}
            backLabel={
              reviewing
                ? 'Back to contact details'
                : stage === 'contact'
                  ? 'Back to times'
                  : stage === 'time'
                    ? 'Back to services'
                    : 'Back to business'
            }
            onBack={() => {
              if (saving) return;
              if (reviewing) setReviewing(false);
              else if (stage === 'contact') setStage('time');
              else if (stage === 'time') setStage('service');
              else if (router.canGoBack()) router.back();
              else router.replace('/explore');
            }}
          >
            <FocusedSteps
              labels={['Service', 'Time', 'Contact', 'Review']}
              current={reviewing ? 3 : stage === 'service' ? 0 : stage === 'time' ? 1 : 2}
            />
          </FocusedHeader>
          {catalog?.business.address && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <AppIcon name="map-pin" size={18} tintColor={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                {catalog.business.address}
              </ThemedText>
            </View>
          )}
          {stage !== 'service' && selectedService && !reviewing && (
            <View
              style={{
                padding: 16,
                borderRadius: 16,
                backgroundColor: theme.backgroundElement,
                borderWidth: 1,
                borderColor: theme.divider,
                gap: 5,
              }}
            >
              <ThemedText type="smallBold">{selectedService.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {selectedService.duration_minutes} minutes · {depositLabel(selectedService)}
              </ThemedText>
            </View>
          )}
          {(catalogError || currentSlotResult?.error) && (
            <MerchantButton
              label={catalogError ? 'Retry appointment options' : 'Retry available times'}
              secondary
              onPress={() => {
                if (catalogError) {
                  setCatalogResult(null);
                  setCatalogAttempt((n) => n + 1);
                } else {
                  setSlotResult(null);
                  setSlotAttempt((n) => n + 1);
                }
              }}
            />
          )}
          {loading ? <ThemedText>Loading appointment options…</ThemedText> : null}
          {!businessId && !loading ? (
            <StateNotice kind="error" message="Choose a service business before booking." />
          ) : null}
          {(catalogError || currentSlotResult?.error || error) && (
            <StateNotice kind="error" message={catalogError || currentSlotResult?.error || error} />
          )}
          {!loading && catalog?.services.length === 0 ? (
            <StateNotice
              kind="info"
              message="This business hasn’t added any bookable services yet."
            />
          ) : null}

          {catalog && !reviewing ? (
            <>
              <View style={{ gap: 16 }}>
                {stage === 'service' && (
                  <>
                    <View style={{ gap: Spacing.two }}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Select the service that fits your visit.
                      </ThemedText>
                      {catalog.services.map((service) => {
                        const selected = selectedServiceId === service.id;
                        return (
                          <Pressable
                            key={service.id}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                            onPress={() => {
                              setSelectedSlot(null);
                              setError('');
                              setSelectedResourceId(null);
                              setSelectedServiceId(service.id);
                            }}
                            style={{
                              padding: 16,
                              borderRadius: 18,
                              borderWidth: selected ? 2 : 1,
                              borderColor: selected ? theme.accent : merchantColors.border,
                              backgroundColor: selected
                                ? theme.backgroundSelected
                                : merchantColors.surface,
                              gap: 14,
                            }}
                          >
                            <View
                              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
                            >
                              <View
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 12,
                                  backgroundColor: theme.background,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <AppIcon name="calendar" size={22} />
                              </View>
                              <ThemedText
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  fontSize: 19,
                                  lineHeight: 25,
                                  fontWeight: '700',
                                }}
                              >
                                {service.name}
                              </ThemedText>
                              <AppIcon
                                name={selected ? 'circle-check' : 'circle'}
                                size={24}
                                tintColor={selected ? theme.accent : theme.textSecondary}
                              />
                            </View>
                            {service.description ? (
                              <ThemedText themeColor="textSecondary" type="small">
                                {service.description}
                              </ThemedText>
                            ) : null}
                            <View
                              style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 10,
                              }}
                            >
                              <BookingFact icon="clock">
                                <ThemedText type="small" themeColor="textSecondary">
                                  {service.duration_minutes} minutes
                                </ThemedText>
                              </BookingFact>
                              <ThemedText
                                style={{ fontSize: 22, lineHeight: 28, fontWeight: '700' }}
                              >
                                {service.price_is_fixed
                                  ? money(service.price_minor, service.currency)
                                  : `From ${money(service.price_minor, service.currency)}`}
                              </ThemedText>
                            </View>
                            <View
                              style={{
                                paddingTop: 12,
                                borderTopWidth: 1,
                                borderColor: theme.divider,
                              }}
                            >
                              <BookingFact icon="credit-card">
                                <ThemedText type="smallBold">{depositLabel(service)}</ThemedText>
                              </BookingFact>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                    <MerchantButton
                      label="Continue to times"
                      disabled={!selectedService}
                      onPress={() => setStage('time')}
                    />
                  </>
                )}
                {stage === 'time' && (
                  <>
                    {selectedService?.requires_resource &&
                    slots.some((slot) => slot.resourceName) ? (
                      <View style={{ gap: Spacing.two }}>
                        <ThemedText type="smallBold">Staff member</ThemedText>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                          <ChoiceButton
                            selected={!selectedResourceId}
                            label="No preference"
                            onPress={() => {
                              setSelectedSlot(null);
                              setError('');
                              setSelectedResourceId(null);
                            }}
                          />
                          {Array.from(
                            new Map(
                              slots
                                .filter((slot) => slot.resourceId)
                                .map((slot) => [slot.resourceId, slot.resourceName]),
                            ).entries(),
                          ).map(([id, name]) => (
                            <ChoiceButton
                              key={id}
                              selected={selectedResourceId === id}
                              label={name ?? 'Staff'}
                              onPress={() => {
                                setSelectedSlot(null);
                                setError('');
                                setSelectedResourceId(id);
                              }}
                            />
                          ))}
                        </View>
                      </View>
                    ) : null}
                    <FocusedSection
                      title="Choose a time"
                      description={'Available appointment starts · ' + catalog.settings.timezone}
                    >
                      <DateField
                        label="Appointment date"
                        required
                        value={date}
                        minimumDate={dateForZone(catalog.settings.timezone)}
                        maximumDate={dateForZone(
                          catalog.settings.timezone,
                          catalog.settings.bookingHorizonDays ?? 60,
                        )}
                        onChange={(next) => {
                          setDate(next);
                          setSelectedSlot(null);
                        }}
                      />
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 8,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Earlier day"
                          accessibilityState={{
                            disabled: date <= dateForZone(catalog.settings.timezone),
                          }}
                          disabled={date <= dateForZone(catalog.settings.timezone)}
                          style={{
                            minWidth: 44,
                            minHeight: 44,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 12,
                            backgroundColor: theme.backgroundSelected,
                            opacity: date <= dateForZone(catalog.settings.timezone) ? 0.5 : 1,
                          }}
                          onPress={() => shiftDate(-1)}
                        >
                          <AppIcon name="chevron-left" size={20} />
                        </Pressable>
                        <ThemedText
                          type="smallBold"
                          style={{ flex: 1, minWidth: 120, textAlign: 'center' }}
                        >
                          {date && dateLabel(date, catalog.settings.timezone)}
                        </ThemedText>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Later day"
                          disabled={
                            date >=
                            dateForZone(
                              catalog.settings.timezone,
                              catalog.settings.bookingHorizonDays ?? 60,
                            )
                          }
                          style={{
                            minWidth: 44,
                            minHeight: 44,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 12,
                            backgroundColor: theme.backgroundSelected,
                          }}
                          onPress={() => shiftDate(1)}
                        >
                          <AppIcon name="chevron-right" size={20} />
                        </Pressable>
                      </View>
                      {loadingSlots ? <ThemedText>Checking availability…</ThemedText> : null}
                      {!loadingSlots && slots.length === 0 ? (
                        <ThemedText themeColor="textSecondary">
                          No available times for this day. Try another date.
                        </ThemedText>
                      ) : null}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                        {slots.map((slot) => (
                          <Pressable
                            key={slot.startAt + ':' + (slot.resourceId ?? '')}
                            accessibilityRole="radio"
                            aria-checked={
                              selectedSlot?.startAt === slot.startAt &&
                              selectedSlot?.resourceId === slot.resourceId
                            }
                            accessibilityLabel={
                              slot.localTime + (slot.resourceName ? ' · ' + slot.resourceName : '')
                            }
                            accessibilityState={{
                              checked:
                                selectedSlot?.startAt === slot.startAt &&
                                selectedSlot?.resourceId === slot.resourceId,
                            }}
                            onPress={() => setSelectedSlot(slot)}
                            style={{
                              minHeight: 56,
                              minWidth: 120,
                              flexGrow: 1,
                              paddingHorizontal: 14,
                              paddingVertical: 12,
                              borderWidth: 2,
                              borderRadius: 14,
                              borderColor:
                                selectedSlot?.startAt === slot.startAt &&
                                selectedSlot?.resourceId === slot.resourceId
                                  ? theme.accent
                                  : theme.border,
                              backgroundColor:
                                selectedSlot?.startAt === slot.startAt &&
                                selectedSlot?.resourceId === slot.resourceId
                                  ? theme.backgroundSelected
                                  : theme.backgroundElement,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                            }}
                          >
                            <AppIcon name="clock" size={18} />
                            <View style={{ flex: 1, gap: 3 }}>
                              <ThemedText type="smallBold">{slot.localTime}</ThemedText>
                              {slot.resourceName && (
                                <ThemedText type="small" themeColor="textSecondary">
                                  {slot.resourceName}
                                </ThemedText>
                              )}
                            </View>
                            {selectedSlot?.startAt === slot.startAt &&
                              selectedSlot?.resourceId === slot.resourceId && (
                                <AppIcon name="circle-check" size={20} />
                              )}
                          </Pressable>
                        ))}
                      </View>
                    </FocusedSection>
                    <MerchantButton
                      label="Continue to contact details"
                      disabled={!selectedSlot || loadingSlots || !!currentSlotResult?.error}
                      onPress={() => setStage('contact')}
                    />
                    <MerchantButton
                      label="Change service"
                      secondary
                      onPress={() => setStage('service')}
                    />
                  </>
                )}
                {stage === 'contact' && (
                  <>
                    <FocusedSection
                      title="Your contact details"
                      description="The business will use these to confirm your visit."
                    >
                      <FormField label="Name">
                        <TextInput
                          accessibilityLabel="Your name"
                          autoComplete="name"
                          maxLength={100}
                          ref={nameInput}
                          onChangeText={(value) => {
                            contactEdited.current.name = true;
                            setCustomerName(value);
                          }}
                          placeholder="Name"
                          placeholderTextColor={colors.textSecondary}
                          style={inputStyle(theme, colors)}
                          value={customerName}
                        />
                      </FormField>
                      <FormField label="Phone">
                        <TextInput
                          accessibilityLabel="Phone number"
                          autoComplete="tel"
                          keyboardType="phone-pad"
                          maxLength={32}
                          ref={phoneInput}
                          onChangeText={(value) => {
                            contactEdited.current.phone = true;
                            setCustomerPhone(value);
                          }}
                          placeholder="Phone number"
                          placeholderTextColor={colors.textSecondary}
                          style={inputStyle(theme, colors)}
                          value={customerPhone}
                        />
                      </FormField>
                      <FormField label="Email (optional)">
                        <TextInput
                          accessibilityLabel="Email address"
                          autoComplete="email"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          maxLength={254}
                          ref={emailInput}
                          onChangeText={(value) => {
                            contactEdited.current.email = true;
                            setCustomerEmail(value);
                          }}
                          placeholder="Email address"
                          placeholderTextColor={colors.textSecondary}
                          style={inputStyle(theme, colors)}
                          value={customerEmail}
                        />
                      </FormField>
                      <FormField label="Note for the business (optional)">
                        <TextInput
                          accessibilityLabel="Note for the business"
                          maxLength={1200}
                          multiline
                          onChangeText={setNotes}
                          placeholder="Anything they should know before the appointment?"
                          placeholderTextColor={colors.textSecondary}
                          style={[
                            inputStyle(theme, colors),
                            { minHeight: 96, textAlignVertical: 'top' },
                          ]}
                          value={notes}
                        />
                      </FormField>
                    </FocusedSection>
                    <MerchantButton
                      label="Review appointment"
                      disabled={!selectedService || !selectedSlot || saving}
                      onPress={() => {
                        if (customerName.trim().length < 2) {
                          setError('Enter your name using at least 2 characters.');
                          nameInput.current?.focus();
                          return;
                        }
                        if (customerPhone.replace(/\D/g, '').length < 7) {
                          setError('Enter a phone number the business can use to reach you.');
                          phoneInput.current?.focus();
                          return;
                        }
                        if (customerEmail.trim() && !/^\S+@\S+\.\S+$/.test(customerEmail.trim())) {
                          setError('Check your email address, or leave it blank.');
                          emailInput.current?.focus();
                          return;
                        }
                        setError('');
                        setReviewing(true);
                      }}
                    />
                    <MerchantButton
                      label="Change appointment time"
                      secondary
                      onPress={() => setStage('time')}
                    />
                  </>
                )}
                <ThemedText themeColor="textSecondary" type="small">
                  Booking is handled through Parish Pass. You can book without creating an account.
                </ThemedText>
              </View>
            </>
          ) : null}

          {catalog && selectedService && selectedSlot && reviewing ? (
            <View style={{ gap: Spacing.three }}>
              <ThemedText type="small" themeColor="textSecondary">
                Check your service, time and contact details. Your booking is created only when you
                confirm below.
              </ThemedText>
              <FocusedSection title={selectedService.name} description="Your appointment">
                <FocusedBookingTime
                  startAt={selectedSlot.startAt}
                  timezone={catalog.settings.timezone}
                  duration={selectedService.duration_minutes}
                />
                {selectedSlot.resourceName ? (
                  <ThemedText themeColor="textSecondary">
                    With {selectedSlot.resourceName}
                  </ThemedText>
                ) : null}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <ThemedText themeColor="textSecondary">
                    {selectedService.price_is_fixed ? 'Service total' : 'Estimated total'}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}>
                    {money(selectedService.price_minor, selectedService.currency)}
                  </ThemedText>
                </View>
                <BookingFact icon="credit-card">
                  <ThemedText type="smallBold">{depositLabel(selectedService)}</ThemedText>
                </BookingFact>
                <ThemedText themeColor="textSecondary" type="small">
                  {catalog.settings.cancellationTerms ||
                    `Changes are subject to the business policy. Contact the business at least ${catalog.settings.cancellationCutoffMinutes} minutes before your appointment.`}
                </ThemedText>
                {selectedService.public_instructions ? (
                  <ThemedText themeColor="textSecondary" type="small">
                    {selectedService.public_instructions}
                  </ThemedText>
                ) : null}
                {catalog.settings.publicInstructions ? (
                  <ThemedText themeColor="textSecondary" type="small">
                    {catalog.settings.publicInstructions}
                  </ThemedText>
                ) : null}
              </FocusedSection>
              <FocusedSection title="Your contact details">
                <BookingFact icon="user-round">
                  <ThemedText>{customerName.trim()}</ThemedText>
                </BookingFact>
                <BookingFact icon="phone">
                  <ThemedText>{customerPhone.trim()}</ThemedText>
                </BookingFact>
                {!!customerEmail.trim() && (
                  <BookingFact icon="mail">
                    <ThemedText>{customerEmail.trim()}</ThemedText>
                  </BookingFact>
                )}
                {!!notes.trim() && (
                  <BookingFact icon="message-square">
                    <ThemedText>{notes.trim()}</ThemedText>
                  </BookingFact>
                )}
              </FocusedSection>
              <AppButton
                label={
                  selectedService.payment_policy === 'pay_in_person'
                    ? 'Book appointment'
                    : 'Continue to secure Sandbox checkout'
                }
                loading={saving}
                disabled={saving}
                onPress={() => void submitBooking()}
              />
              <AppButton
                label="Edit details"
                variant="secondary"
                disabled={saving}
                onPress={() => setReviewing(false)}
              />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ChoiceButton({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? Brand.primary : colors.border,
        backgroundColor: selected ? colors.backgroundSelected : colors.backgroundElement,
      }}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

function inputStyle(
  theme: ReturnType<typeof useTheme>,
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'],
) {
  return {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.medium,
    color: theme.text,
    backgroundColor: colors.background,
  } as const;
}
