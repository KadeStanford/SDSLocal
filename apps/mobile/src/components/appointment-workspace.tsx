import { BusinessFeatureGate } from '@/components/business-feature-gate';
import { BackPill } from '@/components/back-pill';
import { FlowSection, FlowIdentity } from '@/components/flow-layout';
import { BookingIntervalField } from './booking-interval-field';
import { router } from 'expo-router';
import { ChoicePicker } from './choice-picker';
import { BookingSetupOverview, BookingGroup } from './booking-setup-overview';
import { BookingTimeField } from './booking-time-field';
import { AppointmentInbox } from '@/components/appointment-inbox';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import {
  MerchantButton,
  MerchantFilters,
  MerchantRow,
  MerchantSheet,
  MerchantStatus,
} from '@/components/merchant-ui';
import { AppButton } from '@/components/app-button';
import { EmptyState, StateNotice } from '@/components/data-state';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { appointmentCommerce } from '@/lib/appointment-commerce';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';

type PaymentPolicy = 'pay_in_person' | 'fixed_deposit' | 'percentage_deposit' | 'full_prepayment';
type ServiceDraft = {
  id: string;
  offeringItemId: string | null;
  name: string;
  description: string;
  durationMinutes: number;
  durationInput: string;
  bufferMinutes: number;
  bufferInput: string;
  priceMinor: number;
  priceInput: string;
  currency: string;
  priceIsFixed: boolean;
  paymentPolicy: PaymentPolicy;
  depositMinor: number | null;
  depositInput: string;
  depositPercent: number | null;
  capacity: number;
  capacityInput: string;
  requiresResource: boolean;
  requiresApproval: boolean;
  isBookable: boolean;
  publicInstructions: string;
  internalNotes: string;
  resourceIds: string[];
};
type ResourceDraft = { id: string; userId: string | null; name: string; isActive: boolean };
type BusinessMember = { userId: string; displayName: string; role: string };
type WindowDraft = {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  serviceId: string | null;
  resourceId: string | null;
};
type OverrideDraft = {
  localDate: string;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  note: string;
  serviceId: string | null;
  resourceId: string | null;
};
type SettingsDraft = {
  enabled: boolean;
  timezone: string;
  minimumNoticeMinutes: number;
  minimumNoticeInput: string;
  bookingHorizonDays: number;
  bookingHorizonInput: string;
  slotIntervalMinutes: number;
  automaticallyConfirm: boolean;
  cancellationCutoffMinutes: number;
  cancellationCutoffInput: string;
  cancellationTerms: string;
  publicInstructions: string;
};
type Offering = {
  id: string;
  name: string;
  description: string;
  price_minor: number | null;
  currency: string;
};
type AppointmentRow = {
  id: string;
  service: { name?: string };
  resource: { name?: string };
  startAt: string;
  timezone: string;
  status: string;
  paymentStatus: string;
  amountDueMinor: number;
  refundedMinor?: number;
  refundableMinor?: number;
  disputeState?: string | null;
  currency: string;
  customerName: string;
  customerPhone: string;
  customerNotes: string;
  version: number;
};

const defaultSettings = (timezone: string): SettingsDraft => ({
  enabled: false,
  timezone: timezone || 'America/Chicago',
  minimumNoticeMinutes: 120,
  minimumNoticeInput: '120',
  bookingHorizonDays: 60,
  bookingHorizonInput: '60',
  slotIntervalMinutes: 15,
  automaticallyConfirm: true,
  cancellationCutoffMinutes: 1440,
  cancellationCutoffInput: '1440',
  cancellationTerms: '',
  publicInstructions: '',
});

function moneyText(value: number | null | undefined) {
  return value == null ? '0.00' : (value / 100).toFixed(2);
}
function parseMoney(value: string) {
  const trimmed = value.trim().replace(/[$,]/g, '');
  if (!/^\d{1,8}(?:\.\d{0,2})?$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}
function dateTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}
function localDateNow(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}
function policyLabel(policy: PaymentPolicy) {
  if (policy === 'pay_in_person') return 'Pay in person';
  if (policy === 'fixed_deposit') return 'Fixed deposit';
  if (policy === 'percentage_deposit') return 'Percentage deposit';
  return 'Full prepayment';
}
function uuid() {
  return Crypto.randomUUID();
}

export function AppointmentWorkspace({
  businessId,
  businessTimezone,
  onDirtyChange,
  view,
  onViewChange,
}: {
  businessId: string;
  businessTimezone: string;
  onDirtyChange: (dirty: boolean) => void;
  view?: 'schedule' | 'setup';
  onViewChange?: (view: 'schedule' | 'setup') => void;
}) {
  const scopeRef = useRef(businessId);
  const setupRead = useRef(0),
    scheduleRead = useRef(0),
    pendingWrite = useRef(false);
  useEffect(() => {
    scopeRef.current = businessId;
    return () => {
      scopeRef.current = '';
      setupRead.current++;
      scheduleRead.current++;
    };
  }, [businessId]);
  const theme = useTheme();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [settings, setSettings] = useState(() => defaultSettings(businessTimezone));
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [resources, setResources] = useState<ResourceDraft[]>([]);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [windows, setWindows] = useState<WindowDraft[]>([]);
  const [overrides, setOverrides] = useState<OverrideDraft[]>([]);
  const [overrideDateInput, setOverrideDateInput] = useState('');
  const [overrideNoteInput, setOverrideNoteInput] = useState('');
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [squareConnected, setSquareConnected] = useState(false);
  const [localMode, setLocalMode] = useState<'setup' | 'schedule'>('schedule');
  const mode = view ?? localMode;
  const setMode = onViewChange ?? setLocalMode;
  const [setupPanel, setSetupPanel] = useState<
    'services' | 'resources' | 'hours' | 'policy' | null
  >(null);
  const [serviceTab, setServiceTab] = useState<'details' | 'payment' | 'team'>('details');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const selectedAppointment = appointments.find((a) => a.id === selectedAppointmentId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [expandedDay, setExpandedDay] = useState<number | null>(1);

  const snapshot = useMemo(
    () => JSON.stringify({ settings, services, resources, windows, overrides }),
    [settings, services, resources, windows, overrides],
  );
  const dirty = Boolean(savedSnapshot && snapshot !== savedSnapshot);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const loadSetup = useCallback(async () => {
    const read = ++setupRead.current;
    setLoading(true);
    setError('');
    try {
      const [result, square, offeringResult, hoursResult] = await Promise.all([
        appointmentCommerce<any>('appointment_owner_setup', { businessId }),
        appointmentCommerce<any>('owner_status', { businessId, provider: 'square' }),
        supabase
          .from('offering_items')
          .select('id,name,description,price_minor,currency')
          .eq('business_id', businessId)
          .eq('is_visible', true)
          .is('archived_at', null)
          .order('display_order')
          .limit(100),
        supabase
          .from('business_hours')
          .select('day_of_week,interval_number,opens_at,closes_at,is_closed')
          .eq('business_id', businessId)
          .order('day_of_week')
          .order('interval_number'),
      ]);
      if (read !== setupRead.current || scopeRef.current !== businessId) return;
      if (offeringResult.error || hoursResult.error)
        throw offeringResult.error ?? hoursResult.error;
      setSquareConnected(
        square?.connection?.state === 'connected' && Boolean(square?.connection?.locationId),
      );
      setOfferings((offeringResult.data ?? []) as Offering[]);
      const nextSettings: SettingsDraft = result.settings
        ? {
            enabled: result.settings.enabled,
            timezone: result.settings.timezone,
            minimumNoticeMinutes: result.settings.minimum_notice_minutes,
            minimumNoticeInput: String(result.settings.minimum_notice_minutes),
            bookingHorizonDays: result.settings.booking_horizon_days,
            bookingHorizonInput: String(result.settings.booking_horizon_days),
            slotIntervalMinutes: result.settings.slot_interval_minutes,
            automaticallyConfirm: result.settings.automatically_confirm,
            cancellationCutoffMinutes: result.settings.cancellation_cutoff_minutes,
            cancellationCutoffInput: String(result.settings.cancellation_cutoff_minutes),
            cancellationTerms: result.settings.cancellation_terms,
            publicInstructions: result.settings.public_instructions,
          }
        : defaultSettings(businessTimezone);
      const nextServices = (result.services ?? []).map((row: any): ServiceDraft => ({
        id: row.id,
        offeringItemId: row.offering_item_id,
        name: row.name,
        description: row.description,
        durationMinutes: row.duration_minutes,
        durationInput: String(row.duration_minutes),
        bufferMinutes: row.buffer_minutes,
        bufferInput: String(row.buffer_minutes),
        priceMinor: row.price_minor,
        priceInput: moneyText(row.price_minor),
        currency: row.currency,
        priceIsFixed: row.price_is_fixed,
        paymentPolicy: row.payment_policy,
        depositMinor: row.deposit_minor,
        depositInput: moneyText(row.deposit_minor),
        depositPercent: row.deposit_percent,
        capacity: row.capacity,
        capacityInput: String(row.capacity),
        requiresResource: row.requires_resource,
        requiresApproval: row.requires_approval,
        isBookable: row.is_bookable,
        publicInstructions: row.public_instructions,
        internalNotes: row.internal_notes,
        resourceIds: row.resourceIds ?? [],
      }));
      const nextResources = (result.resources ?? []).map((row: any): ResourceDraft => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        isActive: row.is_active,
      }));
      let nextWindows = (result.windows ?? []).map((row: any): WindowDraft => ({
        dayOfWeek: row.day_of_week,
        opensAt: String(row.opens_at).slice(0, 5),
        closesAt: String(row.closes_at).slice(0, 5),
        serviceId: row.service_id,
        resourceId: row.resource_id,
      }));
      if (!nextWindows.length) {
        nextWindows = (hoursResult.data ?? [])
          .filter((row) => !row.is_closed && row.opens_at && row.closes_at)
          .map((row) => ({
            dayOfWeek: row.day_of_week,
            opensAt: String(row.opens_at).slice(0, 5),
            closesAt: String(row.closes_at).slice(0, 5),
            serviceId: null,
            resourceId: null,
          }));
      }
      const nextOverrides = (result.overrides ?? []).map((row: any): OverrideDraft => ({
        localDate: row.local_date,
        isClosed: row.is_closed,
        opensAt: row.opens_at ? String(row.opens_at).slice(0, 5) : null,
        closesAt: row.closes_at ? String(row.closes_at).slice(0, 5) : null,
        note: row.note,
        serviceId: row.service_id,
        resourceId: row.resource_id,
      }));
      setSettings(nextSettings);
      setServices(nextServices);
      setResources(nextResources);
      setMembers(
        (result.members ?? []).map((member: any): BusinessMember => ({
          userId: member.user_id,
          displayName: member.display_name || 'Business member',
          role: member.role,
        })),
      );
      setWindows(nextWindows);
      setOverrides(nextOverrides);
      setSavedSnapshot(
        JSON.stringify({
          settings: nextSettings,
          services: nextServices,
          resources: nextResources,
          windows: nextWindows,
          overrides: nextOverrides,
        }),
      );
    } catch (reason) {
      if (read !== setupRead.current) return;
      setError(reason instanceof Error ? reason.message : 'Appointment setup could not load.');
    } finally {
      if (read === setupRead.current) setLoading(false);
    }
  }, [businessId, businessTimezone]);

  useEffect(() => {
    const timer = setTimeout(() => void loadSetup(), 0);
    return () => clearTimeout(timer);
  }, [loadSetup]);

  const loadAppointments = useCallback(async () => {
    const read = ++scheduleRead.current;
    setLoadingAppointments(true);
    setError('');
    try {
      const result = await appointmentCommerce<{ appointments: AppointmentRow[] }>(
        'appointment_queue',
        { businessId },
      );
      if (read !== scheduleRead.current || scopeRef.current !== businessId) return;
      setAppointments(result.appointments ?? []);
    } catch (reason) {
      if (read !== scheduleRead.current) return;
      setError(reason instanceof Error ? reason.message : 'Appointments could not load.');
    } finally {
      if (read === scheduleRead.current) setLoadingAppointments(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (mode !== 'schedule') return;
    const timer = setTimeout(() => void loadAppointments(), 0);
    return () => clearTimeout(timer);
  }, [loadAppointments, mode]);

  function updateService(id: string, patch: Partial<ServiceDraft>) {
    setServices((current) =>
      current.map((service) => (service.id === id ? { ...service, ...patch } : service)),
    );
  }
  function addCustomService() {
    const newServiceId = uuid();
    setServiceTab('details');
    setSelectedServiceId(newServiceId);
    setServices((current) => [
      ...current,
      {
        id: newServiceId,
        offeringItemId: null,
        name: 'New service',
        description: '',
        durationMinutes: 60,
        durationInput: '60',
        bufferMinutes: 0,
        bufferInput: '0',
        priceMinor: 0,
        priceInput: '0.00',
        currency: 'USD',
        priceIsFixed: true,
        paymentPolicy: 'pay_in_person',
        depositMinor: null,
        depositInput: '0.00',
        depositPercent: null,
        capacity: 1,
        capacityInput: '1',
        requiresResource: false,
        requiresApproval: false,
        isBookable: false,
        publicInstructions: '',
        internalNotes: '',
        resourceIds: [],
      },
    ]);
  }
  function addOfferingService(offering: Offering) {
    const newServiceId = uuid();
    setServiceTab('details');
    setSelectedServiceId(newServiceId);
    setServices((current) => [
      ...current,
      {
        id: newServiceId,
        offeringItemId: offering.id,
        name: offering.name,
        description: offering.description,
        durationMinutes: 60,
        durationInput: '60',
        bufferMinutes: 0,
        bufferInput: '0',
        priceMinor: offering.price_minor ?? 0,
        priceInput: moneyText(offering.price_minor),
        currency: offering.currency || 'USD',
        priceIsFixed: offering.price_minor != null,
        paymentPolicy: 'pay_in_person',
        depositMinor: null,
        depositInput: '0.00',
        depositPercent: null,
        capacity: 1,
        capacityInput: '1',
        requiresResource: false,
        requiresApproval: false,
        isBookable: false,
        publicInstructions: '',
        internalNotes: '',
        resourceIds: [],
      },
    ]);
  }

  function addResource() {
    setResources((current) => [
      ...current,
      { id: uuid(), userId: null, name: `Staff ${current.length + 1}`, isActive: true },
    ]);
  }

  function addDateClosure() {
    const value = overrideDateInput.trim();
    const parsed = new Date(`${value}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value ||
      value < localDateNow(settings.timezone)
    ) {
      setError('Enter a valid closure date today or later in the business time zone.');
      return;
    }
    if (
      overrides.some(
        (item) =>
          item.localDate === value &&
          item.isClosed &&
          item.serviceId == null &&
          item.resourceId == null,
      )
    ) {
      setError('A business-wide closure already exists for that date.');
      return;
    }
    setError('');
    setOverrides((current) => [
      ...current,
      {
        localDate: value,
        isClosed: true,
        opensAt: null,
        closesAt: null,
        note: overrideNoteInput.trim(),
        serviceId: null,
        resourceId: null,
      },
    ]);
    setOverrideDateInput('');
    setOverrideNoteInput('');
  }

  async function saveSetup() {
    if (pendingWrite.current || saving) return;
    pendingWrite.current = true;
    try {
      setError('');
      setNotice('');
      const readyServices = services.filter((service) => service.isBookable);
      if (settings.enabled && (!readyServices.length || !windows.length)) {
        setError(
          'To open bookings, add a bookable service and at least one weekly appointment window.',
        );
        return;
      }
      if (
        readyServices.some((service) => service.paymentPolicy !== 'pay_in_person') &&
        !squareConnected
      ) {
        setError(
          'Connect a Square Sandbox account and choose a location before saving deposits or prepayment. Pay in person is available without Square.',
        );
        return;
      }
      const normalizedServices: ServiceDraft[] = [];
      for (const service of services) {
        const priceMinor = parseMoney(service.priceInput);
        const depositMinor =
          service.paymentPolicy === 'fixed_deposit' ? parseMoney(service.depositInput) : null;
        const duration = Number(service.durationInput);
        const buffer = Number(service.bufferInput);
        const capacity = Number(service.capacityInput);
        if (
          priceMinor == null ||
          (service.paymentPolicy === 'fixed_deposit' && depositMinor == null)
        ) {
          setError(`Check the price and deposit for ${service.name}.`);
          return;
        }
        if (
          !Number.isInteger(duration) ||
          duration < 5 ||
          duration > 600 ||
          !Number.isInteger(buffer) ||
          buffer < 0 ||
          buffer > 240 ||
          !Number.isInteger(capacity) ||
          capacity < 1 ||
          capacity > 100
        ) {
          setError(`Check the duration, buffer, and per-time capacity for ${service.name}.`);
          return;
        }
        normalizedServices.push({
          ...service,
          priceMinor,
          depositMinor,
          durationMinutes: duration,
          bufferMinutes: buffer,
          capacity,
        });
      }
      setSaving(true);
      try {
        await appointmentCommerce('appointment_owner_setup_save', {
          businessId,
          setup: {
            settings: {
              enabled: settings.enabled,
              timezone: settings.timezone,
              minimumNoticeMinutes: Number(settings.minimumNoticeInput),
              bookingHorizonDays: Number(settings.bookingHorizonInput),
              slotIntervalMinutes: settings.slotIntervalMinutes,
              automaticallyConfirm: settings.automaticallyConfirm,
              cancellationCutoffMinutes: Number(settings.cancellationCutoffInput),
              cancellationTerms: settings.cancellationTerms,
              publicInstructions: settings.publicInstructions,
            },
            services: normalizedServices.map(
              ({
                durationInput,
                bufferInput,
                priceInput,
                depositInput,
                capacityInput,
                ...service
              }) => service,
            ),
            resources,
            windows,
            overrides,
          },
        });
        if (scopeRef.current !== businessId) return;
        setServices(normalizedServices);
        const nextSnapshot = JSON.stringify({
          settings,
          services: normalizedServices,
          resources,
          windows,
          overrides,
        });
        setSavedSnapshot(nextSnapshot);
        setNotice('Appointment settings saved.');
        setSelectedServiceId(null);
        setSetupPanel(null);
      } catch (reason) {
        if (scopeRef.current === businessId)
          setError(
            reason instanceof Error ? reason.message : 'Appointment settings could not save.',
          );
      } finally {
        setSaving(false);
      }
    } finally {
      pendingWrite.current = false;
    }
  }

  async function actOnAppointment(appointment: AppointmentRow, appointmentAction: string) {
    if (pendingWrite.current || saving) return;
    pendingWrite.current = true;
    try {
      setError('');
      setSaving(true);
      try {
        await appointmentCommerce('appointment_owner_action', {
          appointmentId: appointment.id,
          version: appointment.version,
          appointmentAction,
        });
        if (scopeRef.current !== businessId) return;
        if (scopeRef.current !== businessId) return;
        await loadAppointments();
      } catch (reason) {
        if (scopeRef.current !== businessId) return;
        setError(reason instanceof Error ? reason.message : 'Appointment could not be updated.');
      } finally {
        if (scopeRef.current === businessId) setSaving(false);
      }
    } finally {
      pendingWrite.current = false;
    }
  }

  async function refundAppointment(appointment: AppointmentRow) {
    if (pendingWrite.current || saving) return;
    pendingWrite.current = true;
    try {
      setError('');
      setSaving(true);
      try {
        await appointmentCommerce('appointment_owner_refund', { appointmentId: appointment.id });
        if (scopeRef.current !== businessId) return;
        await loadAppointments();
      } catch (reason) {
        if (scopeRef.current !== businessId) return;
        setError(reason instanceof Error ? reason.message : 'Square could not confirm the refund.');
      } finally {
        if (scopeRef.current === businessId) setSaving(false);
      }
    } finally {
      pendingWrite.current = false;
    }
  }

  async function markAppointmentReimbursed(appointment: AppointmentRow) {
    if (pendingWrite.current || saving) return;
    pendingWrite.current = true;
    try {
      setError('');
      setSaving(true);
      try {
        await appointmentCommerce('appointment_owner_reimbursement', {
          appointmentId: appointment.id,
          version: appointment.version,
        });
        if (scopeRef.current !== businessId) return;
        await loadAppointments();
      } catch (reason) {
        if (scopeRef.current !== businessId) return;
        setError(
          reason instanceof Error ? reason.message : 'The reimbursement could not be recorded.',
        );
      } finally {
        if (scopeRef.current === businessId) setSaving(false);
      }
    } finally {
      pendingWrite.current = false;
    }
  }

  const input = (
    value: string,
    onChangeText: (next: string) => void,
    label: string,
    options: { keyboardType?: 'default' | 'numeric' | 'decimal-pad'; multiline?: boolean } = {},
  ) => (
    <TextInput
      accessibilityLabel={label}
      value={value}
      editable={!saving}
      onChangeText={onChangeText}
      keyboardType={options.keyboardType ?? 'default'}
      multiline={options.multiline}
      maxLength={1200}
      placeholder={label}
      placeholderTextColor={colors.textSecondary}
      style={{
        minHeight: options.multiline ? 104 : 50,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: Radius.medium,
        color: theme.text,
        backgroundColor: colors.background,
      }}
    />
  );

  if (loading) return <ThemedText>Loading appointment setup…</ThemedText>;
  return (
    <View style={{ gap: Spacing.three }}>
      {view === undefined && (
        <MerchantFilters
          brand
          value={mode}
          onChange={(value) => {
            setMode(value);
            setSetupPanel(null);
          }}
          options={[
            { value: 'schedule', label: 'Schedule' },
            { value: 'setup', label: 'Booking setup' },
          ]}
        />
      )}
      {error ? (
        <>
          <StateNotice kind="error" message={error} />
          <MerchantButton
            brand
            label={mode === 'setup' ? 'Retry booking settings' : 'Refresh schedule'}
            secondary
            disabled={saving}
            onPress={() => {
              if (mode === 'setup') {
                if (dirty) {
                  setError(
                    'Your drafts are retained. Correct the highlighted settings and try saving again.',
                  );
                } else {
                  void loadSetup();
                }
              } else {
                void loadAppointments();
              }
            }}
          />
        </>
      ) : null}
      {notice ? <StateNotice kind="success" message={notice} /> : null}

      {mode === 'setup' ? (
        <BusinessFeatureGate
          businessId={businessId}
          operation="configure_booking"
          recovery={
            <AppButton
              label="View existing appointments"
              variant="secondary"
              onPress={() => {
                setMode('schedule');
                onViewChange?.('schedule');
              }}
            />
          }
        >
          <View style={{ gap: 20 }}>
            {!setupPanel && (
              <BookingSetupOverview
                enabled={settings.enabled}
                onEnabled={(enabled) => setSettings((current) => ({ ...current, enabled }))}
                serviceCount={services.length}
                bookableCount={services.filter((s) => s.isBookable).length}
                dayCount={new Set(windows.map((w) => w.dayOfWeek)).size}
                resourceCount={resources.filter((r) => r.isActive).length}
                timezone={settings.timezone}
                disabled={saving}
                onOpen={setSetupPanel}
                onRequests={() =>
                  router.push({ pathname: '/service-requests', params: { businessId } } as never)
                }
              />
            )}
            {setupPanel && (
              <View style={{ gap: 20 }}>
                <BackPill
                  label="Back to booking setup"
                  disabled={saving}
                  onPress={() => setSetupPanel(null)}
                />
                <View style={{ gap: 6 }}>
                  <ThemedText type="card">
                    {
                      {
                        services: 'Services',
                        resources: 'Team & resources',
                        hours: 'Availability',
                        policy: 'Booking rules',
                      }[setupPanel]
                    }
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {
                      {
                        services:
                          'Choose what customers can book. Open a service to set its duration, price and booking options.',
                        resources:
                          'Add people, rooms or equipment only when a service needs an assigned resource.',
                        hours: 'Set when appointments can start, then add any days off.',
                        policy: 'Set clear expectations before customers reserve a time.',
                      }[setupPanel]
                    }
                  </ThemedText>
                </View>
                {setupPanel === 'services' && (
                  <View style={{ gap: Spacing.two }}>
                    {services.map((service) => (
                      <MerchantRow
                        key={service.id}
                        title={service.name}
                        subtitle={
                          service.durationInput +
                          ' min · ' +
                          service.priceInput +
                          ' ' +
                          service.currency
                        }
                        status={
                          <MerchantStatus
                            label={service.isBookable ? 'Bookable' : 'Not bookable'}
                            tone={service.isBookable ? 'success' : 'quiet'}
                          />
                        }
                        disabled={saving}
                        onPress={() => {
                          setServiceTab('details');
                          setSelectedServiceId(service.id);
                        }}
                      />
                    ))}
                    {!services.length ? (
                      <EmptyState
                        title="No bookable services yet"
                        message="Add a service from your existing list, or create a custom service."
                      />
                    ) : null}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                      {offerings
                        .filter(
                          (offering) =>
                            !services.some((service) => service.offeringItemId === offering.id),
                        )
                        .slice(0, 10)
                        .map((offering) => (
                          <ModeButton
                            disabled={saving}
                            key={offering.id}
                            label={`Add ${offering.name}`}
                            onPress={() => addOfferingService(offering)}
                          />
                        ))}
                      <ModeButton
                        disabled={saving}
                        label="Add custom service"
                        onPress={addCustomService}
                      />
                    </View>
                  </View>
                )}
                {setupPanel === 'resources' && (
                  <View style={{ gap: Spacing.two }}>
                    {resources.map((resource) => (
                      <View
                        key={resource.id}
                        style={{
                          padding: 18,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.backgroundElement,
                          gap: 16,
                        }}
                      >
                        <FormField label="Name">
                          {input(
                            resource.name,
                            (name) =>
                              setResources((current) =>
                                current.map((item) =>
                                  item.id === resource.id ? { ...item, name } : item,
                                ),
                              ),
                            'Staff or resource name',
                          )}
                        </FormField>
                        <ChoicePicker
                          label="Assigned team member"
                          value={resource.userId ?? 'unassigned'}
                          disabled={saving}
                          options={[
                            { value: 'unassigned', label: 'No person assigned' },
                            ...members.map((m) => ({ value: m.userId, label: m.displayName })),
                          ]}
                          onChange={(value) =>
                            setResources((current) =>
                              current.map((r) =>
                                r.id === resource.id
                                  ? { ...r, userId: value === 'unassigned' ? null : value }
                                  : r,
                              ),
                            )
                          }
                        />
                        <ToggleRow
                          disabled={saving}
                          label="Available"
                          value={resource.isActive}
                          onValueChange={(isActive) =>
                            setResources((current) =>
                              current.map((item) =>
                                item.id === resource.id ? { ...item, isActive } : item,
                              ),
                            )
                          }
                        />
                      </View>
                    ))}
                    <AppButton
                      label="Add staff or resource"
                      variant="secondary"
                      onPress={addResource}
                    />
                    <ThemedText themeColor="textSecondary" type="small">
                      Assign an existing owner or staff member when a booking needs a person. Leave
                      a room, chair, or flexible resource unassigned.
                    </ThemedText>
                  </View>
                )}
                {setupPanel === 'hours' && (
                  <>
                    <ThemedText themeColor="textSecondary" type="small">
                      Business time zone: {settings.timezone}. Appointment windows are intersected
                      with your Hours settings.
                    </ThemedText>
                    <View style={{ gap: Spacing.two }}>
                      {Array.from({ length: 7 }, (_, day) => {
                        const rows = windows.filter(
                          (window) =>
                            window.dayOfWeek === day && !window.serviceId && !window.resourceId,
                        );
                        const open = rows[0];
                        return (
                          <View
                            key={day}
                            style={{
                              gap: 14,
                              padding: 16,
                              borderRadius: 14,
                              backgroundColor: colors.backgroundElement,
                              borderWidth: 1,
                              borderColor: colors.border,
                            }}
                          >
                            <Pressable
                              accessibilityRole="button"
                              accessibilityState={{ expanded: expandedDay === day }}
                              onPress={() => setExpandedDay(expandedDay === day ? null : day)}
                              style={{
                                minHeight: 44,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                              }}
                            >
                              <View style={{ flex: 1, gap: 5 }}>
                                <ThemedText type="smallBold">
                                  {
                                    [
                                      'Sunday',
                                      'Monday',
                                      'Tuesday',
                                      'Wednesday',
                                      'Thursday',
                                      'Friday',
                                      'Saturday',
                                    ][day]
                                  }
                                </ThemedText>
                                <ThemedText type="small" themeColor="textSecondary">
                                  {rows.length
                                    ? rows
                                        .map((w) =>
                                          [w.opensAt, w.closesAt]
                                            .map((t) => {
                                              const [h = '0', m = '00'] = t.split(':');
                                              return (
                                                (Number(h) % 12 || 12) +
                                                ':' +
                                                m +
                                                ' ' +
                                                (Number(h) < 12 ? 'AM' : 'PM')
                                              );
                                            })
                                            .join('–'),
                                        )
                                        .join(' · ')
                                    : 'Unavailable'}
                                </ThemedText>
                              </View>
                              <ThemedText themeColor="textSecondary">
                                {expandedDay === day ? '⌃' : '⌄'}
                              </ThemedText>
                            </Pressable>
                            {expandedDay === day && (
                              <>
                                <ToggleRow
                                  disabled={saving}
                                  label="Available for appointments"
                                  value={Boolean(open)}
                                  onValueChange={(enabled) =>
                                    setWindows((current) =>
                                      enabled
                                        ? [
                                            ...current,
                                            {
                                              dayOfWeek: day,
                                              opensAt: '09:00',
                                              closesAt: '17:00',
                                              serviceId: null,
                                              resourceId: null,
                                            },
                                          ]
                                        : current.filter(
                                            (window) =>
                                              window.dayOfWeek !== day ||
                                              window.serviceId ||
                                              window.resourceId,
                                          ),
                                    )
                                  }
                                />
                                {rows.map((window, index) => (
                                  <View key={index} style={{ gap: 10 }}>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                      <View style={{ flex: 1 }}>
                                        <BookingTimeField
                                          label="From"
                                          value={window.opensAt}
                                          disabled={saving}
                                          onChange={(opensAt) =>
                                            setWindows((current) =>
                                              current.map((w) =>
                                                w === window ? { ...w, opensAt } : w,
                                              ),
                                            )
                                          }
                                        />
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <BookingTimeField
                                          label="Until"
                                          value={window.closesAt}
                                          disabled={saving}
                                          onChange={(closesAt) =>
                                            setWindows((current) =>
                                              current.map((w) =>
                                                w === window ? { ...w, closesAt } : w,
                                              ),
                                            )
                                          }
                                        />
                                      </View>
                                    </View>
                                    {rows.length > 1 && (
                                      <MerchantButton
                                        brand
                                        label="Remove time range"
                                        secondary
                                        disabled={saving}
                                        onPress={() =>
                                          setWindows((current) =>
                                            current.filter((w) => w !== window),
                                          )
                                        }
                                      />
                                    )}
                                  </View>
                                ))}
                                {open && (
                                  <MerchantButton
                                    brand
                                    label="Add time range"
                                    secondary
                                    disabled={saving}
                                    onPress={() =>
                                      setWindows((current) => [
                                        ...current,
                                        {
                                          dayOfWeek: day,
                                          opensAt: '13:00',
                                          closesAt: '17:00',
                                          serviceId: null,
                                          resourceId: null,
                                        },
                                      ])
                                    }
                                  />
                                )}
                              </>
                            )}
                          </View>
                        );
                      })}
                    </View>
                    <View style={{ gap: Spacing.two }}>
                      <ThemedText type="subtitle">Date closures</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        Close all appointment services for a holiday or one-off day.
                      </ThemedText>
                      <BookingTimeField
                        label="Day off"
                        mode="date"
                        value={overrideDateInput}
                        onChange={setOverrideDateInput}
                        disabled={saving}
                      />
                      <FormField label="Note for your team (optional)">
                        {input(overrideNoteInput, setOverrideNoteInput, 'Holiday or closure note')}
                      </FormField>
                      <AppButton
                        label="Add date closure"
                        variant="secondary"
                        onPress={addDateClosure}
                      />
                      {overrides.map((item, index) => (
                        <View
                          key={`${item.localDate}:${item.serviceId ?? ''}:${item.resourceId ?? ''}:${index}`}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: Spacing.two,
                            paddingVertical: Spacing.one,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                          }}
                        >
                          <ThemedText style={{ flex: 1 }} type="smallBold">
                            {item.localDate} ·{' '}
                            {item.isClosed ? 'Closed' : `${item.opensAt}–${item.closesAt}`}
                            {item.note ? ` · ${item.note}` : ''}
                          </ThemedText>
                          <ModeButton
                            disabled={saving}
                            label="Remove"
                            onPress={() =>
                              setOverrides((current) => current.filter((_, at) => at !== index))
                            }
                          />
                        </View>
                      ))}
                    </View>
                  </>
                )}
                {setupPanel === 'policy' && (
                  <>
                    <View style={{ gap: Spacing.two }}>
                      <BookingGroup
                        title="When customers can book"
                        description="Give your team enough notice and keep the calendar within a manageable window."
                      >
                        <BookingIntervalField
                          label="Minimum notice"
                          value={settings.minimumNoticeInput}
                          disabled={saving}
                          onChange={(minimumNoticeInput) =>
                            setSettings((current) => ({ ...current, minimumNoticeInput }))
                          }
                        />
                        <BookingIntervalField
                          label="How far ahead"
                          unit="days"
                          value={settings.bookingHorizonInput}
                          disabled={saving}
                          onChange={(bookingHorizonInput) =>
                            setSettings((current) => ({ ...current, bookingHorizonInput }))
                          }
                        />
                        <ChoicePicker
                          label="Show start times every"
                          value={String(settings.slotIntervalMinutes)}
                          disabled={saving}
                          options={[5, 10, 15, 20, 30, 60].map((v) => ({
                            value: String(v),
                            label: v + ' minutes',
                          }))}
                          onChange={(v) =>
                            setSettings((current) => ({
                              ...current,
                              slotIntervalMinutes: Number(v),
                            }))
                          }
                        />
                      </BookingGroup>
                      <BookingGroup
                        title="Confirmation & cancellation"
                        description="Service-specific approval settings can require manual confirmation even when automatic confirmation is on."
                      >
                        <ToggleRow
                          disabled={saving}
                          label="Confirm pay-in-person bookings automatically"
                          value={settings.automaticallyConfirm}
                          onValueChange={(automaticallyConfirm) =>
                            setSettings((current) => ({ ...current, automaticallyConfirm }))
                          }
                        />
                        <BookingIntervalField
                          label="Cancellation notice"
                          value={settings.cancellationCutoffInput}
                          disabled={saving}
                          onChange={(cancellationCutoffInput) =>
                            setSettings((current) => ({ ...current, cancellationCutoffInput }))
                          }
                        />
                        <FormField label="Cancellation terms">
                          {input(
                            settings.cancellationTerms,
                            (cancellationTerms) =>
                              setSettings((current) => ({ ...current, cancellationTerms })),
                            'Cancellation terms',
                            { multiline: true },
                          )}
                        </FormField>
                      </BookingGroup>
                      <BookingGroup title="Before the visit">
                        <FormField label="General preparation instructions">
                          {input(
                            settings.publicInstructions,
                            (publicInstructions) =>
                              setSettings((current) => ({ ...current, publicInstructions })),
                            'Preparation instructions',
                            { multiline: true },
                          )}
                        </FormField>
                      </BookingGroup>
                    </View>
                  </>
                )}
              </View>
            )}
            <View style={{ gap: 10 }}>
              <ThemedText type="small" themeColor="textSecondary">
                {dirty
                  ? 'Unsaved changes · save to update customer booking.'
                  : 'Your booking settings are saved.'}
              </ThemedText>
              <MerchantButton
                brand
                label="Save booking settings"
                loading={saving}
                disabled={!dirty}
                onPress={() => void saveSetup()}
              />
            </View>
            <MerchantSheet
              visible={!!selectedServiceId}
              title={services.find((s) => s.id === selectedServiceId)?.name || 'New service'}
              blocked={saving}
              onClose={() => setSelectedServiceId(null)}
              footer={
                <MerchantButton
                  brand
                  label="Save changes"
                  loading={saving}
                  disabled={!dirty}
                  onPress={() => void saveSetup()}
                />
              }
            >
              {error && <StateNotice kind="error" message={error} />}
              <ThemedText type="small" themeColor="textSecondary">
                Your edits apply together when you save.
              </ThemedText>
              {services
                .filter((service) => service.id === selectedServiceId)
                .map((service) => (
                  <View
                    key={service.id}
                    style={{
                      gap: 20,
                    }}
                  >
                    <MerchantFilters
                      brand
                      value={serviceTab}
                      onChange={setServiceTab}
                      options={[
                        { value: 'details', label: 'Details' },
                        { value: 'payment', label: 'Pricing' },
                        { value: 'team', label: 'Booking' },
                      ]}
                    />
                    {serviceTab === 'details' && (
                      <BookingGroup
                        title="Service details"
                        description="The name, description and length customers see."
                      >
                        <ToggleRow
                          disabled={saving}
                          label="Bookable"
                          value={service.isBookable}
                          onValueChange={(isBookable) => updateService(service.id, { isBookable })}
                        />
                        <FormField label="Service name">
                          {input(
                            service.name,
                            (name) => updateService(service.id, { name }),
                            'Service name',
                          )}
                        </FormField>
                        <FormField label="Description">
                          {input(
                            service.description,
                            (description) => updateService(service.id, { description }),
                            'Description',
                            { multiline: true },
                          )}
                        </FormField>
                        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                          <View style={{ flex: 1 }}>
                            <FormField label="Duration · min">
                              {input(
                                service.durationInput,
                                (durationInput) => updateService(service.id, { durationInput }),
                                'Duration in minutes',
                                { keyboardType: 'numeric' },
                              )}
                            </FormField>
                          </View>
                          <View style={{ flex: 1 }}>
                            <FormField label="Buffer · min">
                              {input(
                                service.bufferInput,
                                (bufferInput) => updateService(service.id, { bufferInput }),
                                'Buffer in minutes',
                                { keyboardType: 'numeric' },
                              )}
                            </FormField>
                          </View>
                        </View>
                      </BookingGroup>
                    )}
                    {serviceTab === 'payment' && (
                      <BookingGroup
                        title="Price & payment"
                        description="Choose when customers pay. Deposits and prepayment require a connected Square account."
                      >
                        <FormField label="Service price">
                          {input(
                            service.priceInput,
                            (priceInput) => updateService(service.id, { priceInput }),
                            'Price in dollars',
                            { keyboardType: 'decimal-pad' },
                          )}
                        </FormField>
                        <ChoicePicker
                          label="When customers pay"
                          value={service.paymentPolicy}
                          disabled={saving}
                          options={(
                            [
                              'pay_in_person',
                              'fixed_deposit',
                              'percentage_deposit',
                              'full_prepayment',
                            ] as const
                          ).map((value) => ({ value, label: policyLabel(value) }))}
                          onChange={(paymentPolicy) => updateService(service.id, { paymentPolicy })}
                        />
                        {!squareConnected && service.paymentPolicy !== 'pay_in_person' && (
                          <StateNotice
                            kind="info"
                            message="Connect Square in Ordering & payments before enabling deposits or prepayment."
                          />
                        )}
                        {service.paymentPolicy === 'fixed_deposit' ? (
                          <FormField label="Deposit amount">
                            {input(
                              service.depositInput,
                              (depositInput) => updateService(service.id, { depositInput }),
                              'Deposit in dollars',
                              { keyboardType: 'decimal-pad' },
                            )}
                          </FormField>
                        ) : null}
                        {service.paymentPolicy === 'percentage_deposit' ? (
                          <FormField label="Deposit percentage">
                            {input(
                              String(service.depositPercent ?? 20),
                              (value) =>
                                updateService(service.id, { depositPercent: Number(value) }),
                              'Deposit percent',
                              { keyboardType: 'numeric' },
                            )}
                          </FormField>
                        ) : null}
                      </BookingGroup>
                    )}
                    {serviceTab === 'team' && (
                      <BookingGroup
                        title="Booking options"
                        description="Control capacity, staff assignment and confirmation."
                      >
                        <FormField label="Appointments per start time">
                          {input(
                            service.capacityInput,
                            (capacityInput) => updateService(service.id, { capacityInput }),
                            'Capacity per start time (1–100)',
                            { keyboardType: 'numeric' },
                          )}
                        </FormField>
                        <ToggleRow
                          disabled={saving}
                          label="Requires a specific staff member or resource"
                          value={service.requiresResource}
                          onValueChange={(requiresResource) =>
                            updateService(service.id, { requiresResource })
                          }
                        />
                        {service.requiresResource &&
                          resources
                            .filter((resource) => resource.isActive)
                            .map((resource) => (
                              <ToggleRow
                                disabled={saving}
                                key={resource.id}
                                label={resource.name}
                                value={service.resourceIds.includes(resource.id)}
                                onValueChange={(selected) =>
                                  updateService(service.id, {
                                    resourceIds: selected
                                      ? [...service.resourceIds, resource.id]
                                      : service.resourceIds.filter((id) => id !== resource.id),
                                  })
                                }
                              />
                            ))}
                        <ToggleRow
                          disabled={saving}
                          label="Confirm bookings automatically"
                          value={!service.requiresApproval}
                          onValueChange={(automatic) =>
                            updateService(service.id, { requiresApproval: !automatic })
                          }
                        />
                        <FormField label="Instructions for customers">
                          {input(
                            service.publicInstructions,
                            (publicInstructions) =>
                              updateService(service.id, { publicInstructions }),
                            'Customer instructions',
                            { multiline: true },
                          )}
                        </FormField>
                        <FormField label="Internal notes">
                          {input(
                            service.internalNotes,
                            (internalNotes) => updateService(service.id, { internalNotes }),
                            'Internal notes',
                            { multiline: true },
                          )}
                        </FormField>
                      </BookingGroup>
                    )}
                  </View>
                ))}
            </MerchantSheet>
          </View>
        </BusinessFeatureGate>
      ) : (
        <View style={{ gap: 16 }}>
          <AppointmentInbox
            appointments={appointments.map((a) => ({
              id: a.id,
              customerName: a.customerName,
              serviceName: a.service?.name ?? 'Appointment',
              resourceName: a.resource?.name ?? '',
              startAt: a.startAt,
              timezone: a.timezone,
              status: a.status,
              paymentStatus: a.paymentStatus,
            }))}
            loading={loadingAppointments}
            blocked={saving}
            onRefresh={() => void loadAppointments()}
            onSelect={setSelectedAppointmentId}
          />
          <MerchantSheet
            visible={!!selectedAppointment}
            title="Appointment details"
            blocked={saving}
            onClose={() => setSelectedAppointmentId(null)}
          >
            {error && (
              <>
                <StateNotice kind="error" message={error} />
                <MerchantButton
                  brand
                  label="Refresh appointment"
                  secondary
                  loading={loadingAppointments}
                  onPress={() => void loadAppointments()}
                />
              </>
            )}
            {notice && <StateNotice kind="success" message={notice} />}
            {selectedAppointment &&
              ((appointment) => (
                <View
                  style={{
                    padding: 0,
                    borderRadius: Radius.medium,
                    borderWidth: 0,
                    borderColor: colors.border,
                    gap: Spacingtwo,
                  }}
                >
                  <FlowSection title="Visit details">
                    <ThemedText type="smallBold">
                      {appointment.service?.name ?? 'Appointment'} ·{' '}
                      {dateTime(appointment.startAt, appointment.timezone)}
                    </ThemedText>
                    <FlowIdentity
                      name={appointment.customerName}
                      detail={appointment.customerPhone}
                    />
                    {appointment.resource?.name ? (
                      <ThemedText themeColor="textSecondary" type="small">
                        {appointment.resource.name}
                      </ThemedText>
                    ) : null}
                    {appointment.customerNotes ? (
                      <ThemedText themeColor="textSecondary" type="small">
                        {appointment.customerNotes}
                      </ThemedText>
                    ) : null}
                  </FlowSection>
                  {appointment.paymentStatus === 'refund_pending' ? (
                    <ThemedText themeColor="textSecondary" type="small">
                      Square is processing the refund. Refresh to check its status.
                    </ThemedText>
                  ) : null}
                  {appointment.paymentStatus === 'refund_failed' ? (
                    <ThemedText themeColor="textSecondary" type="small">
                      Square could not complete the refund. Contact the customer and arrange
                      reimbursement directly.
                    </ThemedText>
                  ) : null}
                  {(appointment.refundedMinor ?? 0) > 0 ? (
                    <ThemedText type="small">
                      Refunded {moneyText(appointment.refundedMinor)} {appointment.currency};
                      remaining payment {moneyText(appointment.refundableMinor ?? 0)}.
                    </ThemedText>
                  ) : null}
                  {appointment.paymentStatus === 'review' &&
                  (!appointment.disputeState ||
                    ['WON', 'RESOLVED'].includes(appointment.disputeState)) ? (
                    <AppButton
                      label="Cancel and refund reviewed payment"
                      disabled={saving}
                      onPress={() =>
                        Alert.alert(
                          'Refund reviewed payment?',
                          `Cancel the booking and return the remaining ${moneyText(appointment.refundableMinor ?? appointment.amountDueMinor)} ${appointment.currency}.`,
                          [
                            { text: 'Keep in review', style: 'cancel' },
                            {
                              text: 'Cancel and refund',
                              style: 'destructive',
                              // Alert invokes this callback only after the user confirms.
                              // eslint-disable-next-line react-hooks/refs
                              onPress: () => void refundAppointment(appointment),
                            },
                          ],
                        )
                      }
                    />
                  ) : null}
                  <ThemedText themeColor="textSecondary" type="small">
                    {appointment.status.replaceAll('_', ' ')} ·{' '}
                    {appointment.paymentStatus.replaceAll('_', ' ')}
                  </ThemedText>
                  {appointment.status === 'requested' ? (
                    <View style={{ flexDirection: 'row', gap: Spacingtwo }}>
                      <AppButton
                        label="Confirm"
                        disabled={saving}
                        onPress={() => void actOnAppointment(appointment, 'confirm')}
                      />
                      <AppButton
                        label="Decline"
                        variant="secondary"
                        disabled={saving}
                        onPress={() => void actOnAppointment(appointment, 'decline')}
                      />
                    </View>
                  ) : null}
                  {['requested', 'confirmed', 'checked_in'].includes(appointment.status) &&
                  !['pending', 'refund_pending', 'refund_failed', 'review'].includes(
                    appointment.paymentStatus,
                  ) ? (
                    <AppButton
                      label="Cancel appointment"
                      variant="secondary"
                      disabled={saving}
                      onPress={() =>
                        Alert.alert(
                          'Cancel this appointment?',
                          appointment.paymentStatus === 'paid'
                            ? 'This marks the appointment for cancellation. Square must confirm a full refund before it is treated as cancelled.'
                            : 'This appointment will be cancelled and its time released.',
                          [
                            { text: 'Keep appointment', style: 'cancel' },
                            {
                              text: 'Cancel appointment',
                              style: 'destructive',
                              onPress: () => void actOnAppointment(appointment, 'cancel'),
                            },
                          ],
                        )
                      }
                    />
                  ) : null}
                  {appointment.status === 'cancellation_pending' &&
                  appointment.paymentStatus === 'paid' ? (
                    <AppButton
                      label={`Refund ${moneyText(appointment.amountDueMinor)} in full`}
                      disabled={saving}
                      onPress={() =>
                        Alert.alert(
                          'Issue the full refund?',
                          `Square will be asked to refund ${moneyText(appointment.amountDueMinor)} ${appointment.currency}. The appointment remains pending until Square confirms.`,
                          [
                            { text: 'Not now', style: 'cancel' },
                            {
                              text: 'Issue full refund',
                              style: 'destructive',
                              onPress: () => void refundAppointment(appointment),
                            },
                          ],
                        )
                      }
                    />
                  ) : null}
                  {appointment.status === 'cancellation_pending' &&
                  appointment.paymentStatus === 'refund_failed' ? (
                    <AppButton
                      label="Record full reimbursement outside Square"
                      variant="secondary"
                      disabled={saving}
                      onPress={() =>
                        Alert.alert(
                          'Confirm reimbursement',
                          `Confirm that you have reimbursed ${moneyText(appointment.amountDueMinor)} ${appointment.currency} outside Square. This records the result; it does not send money.`,
                          [
                            { text: 'Not yet', style: 'cancel' },
                            {
                              text: 'I have reimbursed the customer',
                              onPress: () => void markAppointmentReimbursed(appointment),
                            },
                          ],
                        )
                      }
                    />
                  ) : null}
                  {appointment.status === 'confirmed' ? (
                    <AppButton
                      label="Check in"
                      disabled={saving}
                      onPress={() => void actOnAppointment(appointment, 'check_in')}
                    />
                  ) : null}
                  {appointment.status === 'checked_in' ? (
                    <AppButton
                      label="Start service"
                      disabled={saving}
                      onPress={() => void actOnAppointment(appointment, 'start')}
                    />
                  ) : null}
                  {['checked_in', 'in_service'].includes(appointment.status) ? (
                    <AppButton
                      label="Mark completed"
                      variant="secondary"
                      disabled={saving}
                      onPress={() => void actOnAppointment(appointment, 'complete')}
                    />
                  ) : null}
                </View>
              ))(selectedAppointment)}
          </MerchantSheet>
        </View>
      )}
    </View>
  );
}

const Spacingtwo = Spacing.two;

function ToggleRow({
  label,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const colors = useTheme();
  return (
    <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
      <ThemedText style={{ flex: 1 }} type="smallBold">
        {label}
      </ThemedText>
      <Switch
        disabled={disabled}
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: Brand.primary }}
      />
    </View>
  );
}

function ModeButton({
  label,
  selected = false,
  onPress,
  disabled = false,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
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
