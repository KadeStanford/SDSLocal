import { FlowSection, FlowIdentity, FlowProgress } from '@/components/flow-layout';
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
  const [notes, setNotes] = useState('');
  const merchantColors = useMerchantTheme();
  const [stage, setStage] = useState<'service' | 'time' | 'contact'>('service');
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [slotAttempt, setSlotAttempt] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    setStage('service');
    setReviewing(false);
    setSelectedSlot(null);
    setSelectedResourceId(null);
    setError('');
  }, [businessId]);
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
          contentContainerStyle={{
            gap: Spacing.four,
            padding: Spacing.four,
            paddingBottom: bottomPadding,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <AppChrome />
          <ThemedText type="title" style={{ paddingRight: 48 }}>
            Book an appointment
          </ThemedText>
          {catalog && (
            <>
              <FlowIdentity name={catalog.business.name} detail={catalog.business.address} />
              <FlowProgress
                labels={['Service', 'Time', 'Contact', 'Review']}
                current={reviewing ? 3 : stage === 'service' ? 0 : stage === 'time' ? 1 : 2}
              />
              {stage !== 'service' && selectedService && (
                <ThemedText type="small" themeColor="textSecondary">
                  {selectedService.name} · {selectedService.duration_minutes} min ·{' '}
                  {depositLabel(selectedService)}
                </ThemedText>
              )}
            </>
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
                      <ThemedText type="subtitle">Choose a service</ThemedText>
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
                              padding: Spacing.three,
                              borderRadius: Radius.medium,
                              borderWidth: 1,
                              borderColor: selected ? theme.accent : merchantColors.border,
                              backgroundColor: selected
                                ? theme.backgroundSelected
                                : merchantColors.surface,
                              gap: Spacing.one,
                            }}
                          >
                            <ThemedText type="smallBold">{service.name}</ThemedText>
                            {service.description ? (
                              <ThemedText themeColor="textSecondary" type="small">
                                {service.description}
                              </ThemedText>
                            ) : null}
                            <ThemedText themeColor="textSecondary" type="small">
                              {service.duration_minutes} min ·{' '}
                              {service.price_is_fixed
                                ? money(service.price_minor, service.currency)
                                : `From ${money(service.price_minor, service.currency)}`}{' '}
                              · {depositLabel(service)}
                            </ThemedText>
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
                    <View style={{ gap: Spacing.two }}>
                      <ThemedText type="subtitle">Choose a time</ThemedText>
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 8,
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <AppButton
                          label="Earlier day"
                          disabled={date <= dateForZone(catalog.settings.timezone)}
                          variant="secondary"
                          onPress={() => shiftDate(-1)}
                        />
                        <ThemedText type="smallBold">
                          {date && dateLabel(date, catalog.settings.timezone)}
                        </ThemedText>
                        <AppButton
                          label="Later day"
                          variant="secondary"
                          onPress={() => shiftDate(1)}
                        />
                      </View>
                      {loadingSlots ? <ThemedText>Checking availability…</ThemedText> : null}
                      {!loadingSlots && slots.length === 0 ? (
                        <ThemedText themeColor="textSecondary">
                          No available times for this day. Try another date.
                        </ThemedText>
                      ) : null}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                        {slots.map((slot) => (
                          <ChoiceButton
                            key={`${slot.startAt}:${slot.resourceId ?? ''}`}
                            selected={
                              selectedSlot?.startAt === slot.startAt &&
                              selectedSlot?.resourceId === slot.resourceId
                            }
                            label={`${slot.localTime}${slot.resourceName ? ` · ${slot.resourceName}` : ''}`}
                            onPress={() => setSelectedSlot(slot)}
                          />
                        ))}
                      </View>
                    </View>
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
                    <FlowSection
                      title="Your contact details"
                      description="The business will use these to confirm your visit."
                    >
                      <FormField label="Name">
                        <TextInput
                          accessibilityLabel="Your name"
                          autoComplete="name"
                          maxLength={100}
                          onChangeText={setCustomerName}
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
                          onChangeText={setCustomerPhone}
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
                          onChangeText={setCustomerEmail}
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
                    </FlowSection>
                    <MerchantButton
                      label="Review appointment"
                      disabled={!selectedService || !selectedSlot || saving}
                      onPress={() => {
                        if (
                          customerName.trim().length < 2 ||
                          customerPhone.replace(/\D/g, '').length < 7
                        ) {
                          setError(
                            'Enter your name and a phone number the business can use to reach you.',
                          );
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
              <ThemedText type="subtitle">Review your appointment</ThemedText>
              <FlowSection
                title={selectedService.name}
                description="Check the time and payment details before booking."
              >
                <ThemedText themeColor="textSecondary">
                  {dateLabel(date, catalog.settings.timezone)} · {selectedSlot.localTime} ·{' '}
                  {selectedService.duration_minutes} minutes
                </ThemedText>
                {selectedSlot.resourceName ? (
                  <ThemedText themeColor="textSecondary">
                    With {selectedSlot.resourceName}
                  </ThemedText>
                ) : null}
                <ThemedText>
                  {money(selectedService.price_minor, selectedService.currency)}
                  {selectedService.price_is_fixed ? '' : ' estimated'} ·{' '}
                  {depositLabel(selectedService)}
                </ThemedText>
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
              </FlowSection>
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
        borderRadius: Radius.pill,
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
