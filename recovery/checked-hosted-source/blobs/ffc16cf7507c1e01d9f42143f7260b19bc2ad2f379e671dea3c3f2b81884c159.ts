import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { PickupOperations } from './pickup-operations.ts';
import type { SquareClient, SquareObject } from './square-client.ts';
import {
  canonicalJson,
  fail,
  hash,
  integer,
  opaqueToken,
  string,
  uuid,
} from './square-security.ts';
import {
  generateDailyAppointmentSlots,
  localAppointmentInstants,
} from './appointment-scheduling.ts';

type AppointmentServiceRow = {
  id: string;
  business_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  buffer_minutes: number;
  price_minor: number;
  currency: string;
  price_is_fixed: boolean;
  payment_policy: string;
  deposit_minor: number | null;
  deposit_percent: number | null;
  capacity: number;
  requires_resource: boolean;
  requires_approval: boolean;
  is_bookable: boolean;
  public_instructions: string;
};

type AppointmentRow = SquareObject & {
  id: string;
  business_id: string;
  service_id: string;
  resource_id: string | null;
  customer_id: string | null;
  guest_hash: string | null;
  status: string;
  payment_status: string;
  total_minor: number;
  amount_due_minor: number;
  currency: string;
  timezone: string;
  starts_at: string;
  ends_at: string;
  blocked_until: string;
  hold_expires_at: string | null;
  idempotency_key: string;
};

const activeAppointmentStatuses = new Set([
  'requested',
  'payment_pending',
  'confirmed',
  'checked_in',
  'in_service',
  'cancellation_pending',
  'payment_review',
]);

function appointmentDate(value: unknown) {
  const date = string(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('INVALID_DATE', 'Choose a valid date.');
  const parts = date.split('-').map(Number);
  const normalized = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (
    normalized.getUTCFullYear() !== parts[0] ||
    normalized.getUTCMonth() !== parts[1] - 1 ||
    normalized.getUTCDate() !== parts[2]
  )
    fail('INVALID_DATE', 'Choose a valid date.');
  return date;
}

function nextDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function localDayBoundary(date: string, timezone: string) {
  for (let minute = 0; minute < 1440; minute++) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    try {
      const candidate = localAppointmentInstants(date, time, timezone)[0];
      if (candidate !== undefined) return new Date(candidate).toISOString();
    } catch {
      // Continue to the first wall-clock minute that exists on this date.
    }
  }
  fail('INVALID_TIMEZONE', 'Booking hours need a valid business time zone.', 409);
}

function timeMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(value);
  if (!match) fail('INVALID_SCHEDULE', 'Review the booking hours and try again.');
  return Number(match[1]) * 60 + Number(match[2]);
}

function dateDayOfWeek(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function intersectWindows(
  appointmentWindows: readonly { opens_at: string; closes_at: string }[],
  businessWindows: readonly { opens_at: string | null; closes_at: string | null }[],
) {
  const result: { opensAt: string; closesAt: string }[] = [];
  for (const appointment of appointmentWindows) {
    for (const business of businessWindows) {
      if (!business.opens_at || !business.closes_at) continue;
      const start = Math.max(timeMinutes(appointment.opens_at), timeMinutes(business.opens_at));
      const end = Math.min(timeMinutes(appointment.closes_at), timeMinutes(business.closes_at));
      if (end > start) {
        result.push({
          opensAt: `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
          closesAt: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
        });
      }
    }
  }
  return result;
}

export abstract class AppointmentOperations extends PickupOperations {
  constructor(db: SupabaseClient) {
    super(db);
  }

  abstract provider(
    businessId: string,
  ): Promise<{ client: SquareClient; connection: SquareObject }>;

  async appointmentRollout(businessId: string) {
    const setting = await this.checked(
      this.db
        .from('platform_settings')
        .select('value')
        .eq('key', 'appointment_booking')
        .maybeSingle(),
    );
    if (
      setting?.value?.enabled !== true ||
      !setting.value.business_ids?.includes(businessId) ||
      !['development', 'staging', 'test'].includes(
        setting.value.public_environment ?? setting.value.environment,
      )
    )
      fail('APPOINTMENTS_DISABLED', 'Appointment booking is not available for this business.', 503);
  }

  async appointmentSettings(businessId: string, requireOpen = true) {
    const settings = await this.checked(
      this.db.from('appointment_settings').select('*').eq('business_id', businessId).maybeSingle(),
    );
    if (!settings || (requireOpen && !settings.enabled))
      fail('BOOKING_CLOSED', 'This business is not accepting appointments right now.', 409);
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: settings.timezone });
    } catch {
      fail(
        'INVALID_TIMEZONE',
        'The business needs to update its time zone before taking bookings.',
        409,
      );
    }
    return settings;
  }

  async publicAppointments(businessId: string) {
    await this.appointmentRollout(businessId);
    const business = await this.checked(
      this.db
        .from('businesses')
        .select(
          'id,name,business_type,status,phone,address_line_1,address_line_2,city,region_code,postal_code',
        )
        .eq('id', businessId)
        .eq('business_type', 'services')
        .eq('status', 'active')
        .maybeSingle(),
    );
    if (!business) fail('BUSINESS_UNAVAILABLE', 'This service business is not available.', 404);
    const settings = await this.appointmentSettings(businessId);
    const services = await this.checked(
      this.db
        .from('appointment_services')
        .select(
          'id,name,description,duration_minutes,price_minor,currency,price_is_fixed,payment_policy,deposit_minor,deposit_percent,requires_resource,public_instructions',
        )
        .eq('business_id', businessId)
        .eq('is_bookable', true)
        .is('archived_at', null)
        .order('name')
        .limit(50),
    );
    return {
      business: {
        id: business.id,
        name: business.name,
        phone: business.phone,
        address: [
          business.address_line_1,
          business.address_line_2,
          business.city,
          business.region_code,
        ]
          .filter(Boolean)
          .join(', '),
      },
      settings: {
        timezone: settings.timezone,
        bookingHorizonDays: settings.booking_horizon_days,
        cancellationCutoffMinutes: settings.cancellation_cutoff_minutes,
        cancellationTerms: settings.cancellation_terms,
        publicInstructions: settings.public_instructions,
      },
      services: services ?? [],
    };
  }

  async appointmentSlots(businessId: string, body: SquareObject) {
    await this.appointmentRollout(businessId);
    const settings = await this.appointmentSettings(businessId);
    const date = appointmentDate(body.date);
    const serviceId = uuid(body.serviceId);
    const requestedResourceId = body.resourceId == null ? null : uuid(body.resourceId);
    const day = dateDayOfWeek(date);
    const service = (await this.checked(
      this.db
        .from('appointment_services')
        .select('*')
        .eq('id', serviceId)
        .eq('business_id', businessId)
        .eq('is_bookable', true)
        .is('archived_at', null)
        .maybeSingle(),
    )) as AppointmentServiceRow | null;
    if (!service) fail('SERVICE_UNAVAILABLE', 'Choose a service that is currently bookable.', 409);
    const publicService = {
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.duration_minutes,
      priceMinor: service.price_minor,
      currency: service.currency,
      priceIsFixed: service.price_is_fixed,
      paymentPolicy: service.payment_policy,
      depositMinor: service.deposit_minor,
      depositPercent: service.deposit_percent,
      requiresResource: service.requires_resource,
      publicInstructions: service.public_instructions,
    };

    const eligibleResources = await this.checked(
      this.db
        .from('appointment_service_resources')
        .select('resource_id,appointment_resources(id,name,is_active)')
        .eq('business_id', businessId)
        .eq('service_id', serviceId),
    );
    const activeResources = (eligibleResources ?? [])
      .map((row: SquareObject) =>
        Array.isArray(row.appointment_resources)
          ? row.appointment_resources[0]
          : row.appointment_resources,
      )
      .filter((resource: SquareObject | null) => resource?.is_active === true);
    if (service.requires_resource && !activeResources.length)
      return {
        date,
        timezone: settings.timezone,
        service: publicService,
        resources: [],
        slots: [],
      };
    const resources: ({ id: string; name: string } | null)[] = requestedResourceId
      ? activeResources.filter((item: SquareObject) => item.id === requestedResourceId)
      : service.requires_resource
        ? activeResources
        : [null];
    if (requestedResourceId && !resources.length)
      fail('RESOURCE_UNAVAILABLE', 'Choose an available staff member or resource.', 409);

    const [weekly, overrides, businessHours] = await Promise.all([
      this.checked(
        this.db
          .from('appointment_weekly_windows')
          .select('*')
          .eq('business_id', businessId)
          .eq('day_of_week', day),
      ),
      this.checked(
        this.db
          .from('appointment_date_overrides')
          .select('*')
          .eq('business_id', businessId)
          .eq('local_date', date),
      ),
      this.checked(
        this.db
          .from('business_hours')
          .select('opens_at,closes_at,is_closed,interval_number')
          .eq('business_id', businessId)
          .eq('day_of_week', day),
      ),
    ]);
    const openBusinessHours = (businessHours ?? []).filter(
      (hours: SquareObject) => !hours.is_closed,
    );
    if (!openBusinessHours.length)
      return {
        date,
        timezone: settings.timezone,
        service: publicService,
        resources: activeResources,
        slots: [],
      };

    const from = localDayBoundary(date, settings.timezone);
    const until = localDayBoundary(nextDate(date), settings.timezone);
    const appointments = await this.checked(
      this.db
        .from('appointments')
        .select('service_id,resource_id,starts_at,blocked_until,status')
        .eq('business_id', businessId)
        .lt('starts_at', until)
        .gt('blocked_until', from)
        .not('status', 'in', '(cancelled,no_show)')
        .limit(500),
    );
    if ((appointments ?? []).length === 500)
      fail('SCHEDULE_BUSY', 'Availability is busy right now. Refresh to try again.', 503);

    const allSlots = new Map<string, SquareObject>();
    for (const resource of resources) {
      const resourceId = resource?.id ?? null;
      const matchingOverrides = (overrides ?? [])
        .filter(
          (item: SquareObject) =>
            (item.resource_id == null || item.resource_id === resourceId) &&
            (item.service_id == null || item.service_id === serviceId),
        )
        .sort(
          (a: SquareObject, b: SquareObject) =>
            Number(Boolean(b.resource_id)) - Number(Boolean(a.resource_id)) ||
            Number(Boolean(b.service_id)) - Number(Boolean(a.service_id)),
        );
      const override = matchingOverrides[0];
      if (override?.is_closed) continue;
      const resourceWindows = (weekly ?? []).filter(
        (window: SquareObject) =>
          window.resource_id === resourceId &&
          resourceId != null &&
          (window.service_id == null || window.service_id === serviceId),
      );
      const serviceWindows = (weekly ?? []).filter(
        (window: SquareObject) => window.resource_id == null && window.service_id === serviceId,
      );
      const generalWindows = (weekly ?? []).filter(
        (window: SquareObject) => window.resource_id == null && window.service_id == null,
      );
      const selectedWindows = override
        ? [{ opens_at: override.opens_at, closes_at: override.closes_at }]
        : resourceWindows.length
          ? resourceWindows
          : serviceWindows.length
            ? serviceWindows
            : generalWindows;
      const intersected = intersectWindows(selectedWindows, openBusinessHours);
      const busy = (appointments ?? [])
        .filter((appointment: SquareObject) => activeAppointmentStatuses.has(appointment.status))
        .flatMap((appointment: SquareObject) => {
          const sameService = appointment.service_id === serviceId;
          const sameResource = resourceId != null && appointment.resource_id === resourceId;
          const capacityUnits = service.capacity > 1 && sameService ? 1 : 0;
          const blocksSlot =
            service.capacity > 1
              ? sameResource
              : resourceId
                ? sameResource
                : sameService && appointment.resource_id == null;
          return capacityUnits > 0 || blocksSlot
            ? [
                {
                  startAt: appointment.starts_at,
                  endAt: appointment.blocked_until,
                  units: capacityUnits,
                  blocksSlot,
                },
              ]
            : [];
        });
      for (const window of intersected) {
        const slots = generateDailyAppointmentSlots({
          date,
          timezone: settings.timezone,
          opensAt: window.opensAt,
          closesAt: window.closesAt,
          durationMinutes: service.duration_minutes,
          bufferMinutes: service.buffer_minutes,
          intervalMinutes: settings.slot_interval_minutes,
          minimumNoticeMinutes: settings.minimum_notice_minutes,
          horizonDays: settings.booking_horizon_days,
          capacity: service.capacity,
          busy,
        });
        for (const slot of slots) {
          const key = `${slot.startAt}:${resourceId ?? ''}`;
          allSlots.set(key, { ...slot, resourceId, resourceName: resource?.name ?? null });
        }
      }
    }
    const slots = [...allSlots.values()].sort(
      (a, b) =>
        String(a.startAt).localeCompare(String(b.startAt)) ||
        String(a.resourceName).localeCompare(String(b.resourceName)),
    );
    return {
      date,
      timezone: settings.timezone,
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.duration_minutes,
        priceMinor: service.price_minor,
        currency: service.currency,
        paymentPolicy: service.payment_policy,
      },
      resources: activeResources.map((item: SquareObject) => ({ id: item.id, name: item.name })),
      slots,
    };
  }

  async bookAppointment(businessId: string, userId: string | null, body: SquareObject) {
    await this.appointmentRollout(businessId);
    const accessToken = opaqueToken(body.statusToken);
    const idempotencyKey = uuid(body.idempotencyKey);
    const business = await this.checked(
      this.db
        .from('businesses')
        .select('id,name,status,business_type')
        .eq('id', businessId)
        .maybeSingle(),
    );
    if (!business || business.status !== 'active' || business.business_type !== 'services')
      fail('BUSINESS_UNAVAILABLE', 'This service business is not available.', 404);
    const settings = await this.appointmentSettings(businessId);
    const serviceId = uuid(body.serviceId);
    const resourceId = body.resourceId == null ? null : uuid(body.resourceId);
    if (typeof body.startAt !== 'string' || !Number.isFinite(Date.parse(body.startAt)))
      fail('INVALID_SLOT', 'Choose an available appointment time.');
    const startsAt = new Date(body.startAt).toISOString();
    const customerName = string(body.customerName, 100);
    const customerPhone = string(body.customerPhone, 32);
    const customerEmail = typeof body.customerEmail === 'string' ? body.customerEmail.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (
      !/^\+?[0-9 ()-]{7,32}$/.test(customerPhone) ||
      customerEmail.length > 254 ||
      notes.length > 1200
    )
      fail('CONTACT_INVALID', 'Check the contact details and try again.');
    const guestHash = userId ? null : await hash(accessToken);
    const serviceForPayment = await this.checked(
      this.db
        .from('appointment_services')
        .select('price_minor,currency,payment_policy,deposit_minor,deposit_percent')
        .eq('id', serviceId)
        .eq('business_id', businessId)
        .eq('is_bookable', true)
        .is('archived_at', null)
        .maybeSingle(),
    );
    if (!serviceForPayment)
      fail('SERVICE_UNAVAILABLE', 'Choose a service that is currently bookable.', 409);
    const paymentDue =
      serviceForPayment.payment_policy === 'fixed_deposit'
        ? Number(serviceForPayment.deposit_minor ?? 0)
        : serviceForPayment.payment_policy === 'percentage_deposit'
          ? Math.ceil(
              (Number(serviceForPayment.price_minor) * Number(serviceForPayment.deposit_percent)) /
                100,
            )
          : serviceForPayment.payment_policy === 'full_prepayment'
            ? Number(serviceForPayment.price_minor)
            : 0;
    if (paymentDue > 0) {
      const { connection } = await this.provider(businessId);
      if (connection.location_snapshot?.currency !== serviceForPayment.currency)
        fail(
          'CURRENCY_MISMATCH',
          'The service price must use the connected Square location currency.',
          409,
        );
    }
    const requestHash = await hash(
      canonicalJson({
        businessId,
        serviceId,
        resourceId,
        startsAt,
        customerId: userId,
        customerName,
        customerPhone,
        customerEmail,
        notes,
      }),
    );
    const appointmentId = await this.checked(
      this.db.rpc('reserve_appointment_slot', {
        p_business_id: businessId,
        p_service_id: serviceId,
        p_resource_id: resourceId,
        p_start_at: startsAt,
        p_customer_id: userId,
        p_guest_hash: guestHash,
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_customer_email: customerEmail || null,
        p_notes: notes,
        p_idempotency_key: idempotencyKey,
        p_request_hash: requestHash,
      }),
    );
    const appointment = await this.appointmentById(appointmentId);
    if (appointment.guest_hash !== guestHash || appointment.customer_id !== userId)
      fail('IDEMPOTENCY_CONFLICT', 'This booking request does not match.', 409);
    const result =
      appointment.amount_due_minor > 0
        ? await this.ensureAppointmentCheckout(appointment)
        : { appointment: this.appointmentProjection(appointment) };
    return {
      ...result,
      ...(userId ? {} : { statusToken: accessToken }),
    };
  }

  async appointmentById(id: string) {
    return (
      ((await this.checked(
        this.db.from('appointments').select('*').eq('id', id).maybeSingle(),
      )) as AppointmentRow | null) ??
      fail('APPOINTMENT_NOT_FOUND', 'This appointment could not be found.', 404)
    );
  }

  appointmentProjection(appointment: AppointmentRow) {
    return {
      id: appointment.id,
      businessId: appointment.business_id,
      serviceId: appointment.service_id,
      resourceId: appointment.resource_id,
      service: appointment.service_snapshot,
      resource: appointment.resource_snapshot,
      timezone: appointment.timezone,
      startAt: appointment.starts_at,
      endAt: appointment.ends_at,
      status: appointment.status,
      paymentStatus: appointment.payment_status,
      totalMinor: appointment.total_minor,
      amountDueMinor: appointment.amount_due_minor,
      refundedMinor: Number(appointment.refunded_minor ?? 0),
      refundableMinor:
        Number(appointment.amount_due_minor) - Number(appointment.refunded_minor ?? 0),
      disputeState: appointment.dispute_state ?? null,
      balanceMinor: Math.max(0, appointment.total_minor - appointment.amount_due_minor),
      currency: appointment.currency,
      cancellationCutoffMinutes: appointment.policy_snapshot?.cancellationCutoffMinutes ?? 1440,
      checkoutUrl: appointment.checkout_url,
      version: appointment.version,
    };
  }

  async appointmentOwnerSetup(businessId: string, userId: string | null) {
    await this.owner(businessId, userId);
    const [settings, services, resources, windows, overrides, mappings, businessMembers] =
      await Promise.all([
        this.checked(
          this.db
            .from('appointment_settings')
            .select('*')
            .eq('business_id', businessId)
            .maybeSingle(),
        ),
        this.checked(
          this.db
            .from('appointment_services')
            .select('*')
            .eq('business_id', businessId)
            .is('archived_at', null)
            .order('created_at')
            .limit(100),
        ),
        this.checked(
          this.db
            .from('appointment_resources')
            .select('*')
            .eq('business_id', businessId)
            .order('name')
            .limit(100),
        ),
        this.checked(
          this.db
            .from('appointment_weekly_windows')
            .select('*')
            .eq('business_id', businessId)
            .order('day_of_week')
            .order('opens_at')
            .limit(200),
        ),
        this.checked(
          this.db
            .from('appointment_date_overrides')
            .select('*')
            .eq('business_id', businessId)
            .gte('local_date', new Date().toISOString().slice(0, 10))
            .order('local_date')
            .limit(100),
        ),
        this.checked(
          this.db
            .from('appointment_service_resources')
            .select('service_id,resource_id')
            .eq('business_id', businessId)
            .limit(500),
        ),
        this.checked(
          this.db
            .from('business_members')
            .select('user_id,role')
            .eq('business_id', businessId)
            .eq('is_active', true)
            .in('role', ['owner', 'staff'])
            .limit(100),
        ),
      ]);
    const memberIds = (businessMembers ?? []).map((member: SquareObject) => member.user_id);
    const profiles = memberIds.length
      ? await this.checked(
          this.db.from('profiles').select('id,display_name').in('id', memberIds).limit(100),
        )
      : [];
    const namesById = new Map(
      (profiles ?? []).map((profile: SquareObject) => [profile.id, profile.display_name]),
    );
    const resourceIdsByService = new Map<string, string[]>();
    for (const mapping of mappings ?? []) {
      const resourceIds = resourceIdsByService.get(mapping.service_id) ?? [];
      resourceIds.push(mapping.resource_id);
      resourceIdsByService.set(mapping.service_id, resourceIds);
    }
    return {
      settings: settings ?? null,
      services: (services ?? []).map((service: SquareObject) => ({
        ...service,
        resourceIds: resourceIdsByService.get(service.id) ?? [],
      })),
      resources: resources ?? [],
      members: (businessMembers ?? []).map((member: SquareObject) => ({
        user_id: member.user_id,
        role: member.role,
        display_name: namesById.get(member.user_id) ?? 'Business member',
      })),
      windows: windows ?? [],
      overrides: overrides ?? [],
    };
  }

  async saveAppointmentSetup(businessId: string, userId: string | null, body: SquareObject) {
    if (!userId) fail('SIGN_IN', 'Sign in as the business owner.', 401);
    await this.owner(businessId, userId);
    const setup = body.setup;
    if (!setup || typeof setup !== 'object' || Array.isArray(setup))
      fail('APPOINTMENT_SETUP_INVALID', 'Review appointment settings and try again.');
    await this.checked(
      this.db.rpc('save_appointment_setup', {
        p_business_id: businessId,
        p_actor_id: userId,
        p_setup: setup,
      }),
    );
    return { saved: true };
  }

  async appointmentQueue(businessId: string, userId: string | null, body: SquareObject) {
    await this.owner(businessId, userId);
    const from =
      typeof body.from === 'string' && Number.isFinite(Date.parse(body.from))
        ? new Date(body.from).toISOString()
        : new Date(Date.now() - 30 * 86400000).toISOString();
    const to =
      typeof body.to === 'string' && Number.isFinite(Date.parse(body.to))
        ? new Date(body.to).toISOString()
        : new Date(Date.now() + 90 * 86400000).toISOString();
    const appointments = await this.checked(
      this.db
        .from('appointments')
        .select('*')
        .eq('business_id', businessId)
        .gte('starts_at', from)
        .lt('starts_at', to)
        .order('starts_at')
        .limit(100),
    );
    return {
      appointments: (appointments ?? []).map((item: AppointmentRow) => ({
        ...this.appointmentProjection(item),
        customerName: item.customer_name,
        customerPhone: item.customer_phone,
        customerEmail: item.customer_email,
        customerNotes: item.customer_notes,
        resourceId: item.resource_id,
        policy: item.policy_snapshot,
      })),
    };
  }

  async customerAppointmentAction(id: string, userId: string | null, body: SquareObject) {
    const appointment = await this.appointmentById(id);
    const token = opaqueToken(body.statusToken);
    const guest = appointment.guest_hash != null && appointment.guest_hash === (await hash(token));
    if (!guest && (!userId || appointment.customer_id !== userId))
      fail('APPOINTMENT_ACCESS', 'This appointment link is not valid.', 403);
    const action = string(body.appointmentAction, 32);
    if (action !== 'customer_cancel')
      fail('INVALID_ACTION', 'That appointment action is unavailable.');
    const updated = await this.checked(
      this.db.rpc('transition_appointment', {
        p_appointment_id: appointment.id,
        p_business_id: appointment.business_id,
        p_actor_id: guest ? null : userId,
        p_actor_type: guest ? 'guest' : 'customer',
        p_action: action,
        p_expected_version: integer(body.version, 1, 10000000),
      }),
    );
    return {
      appointment: this.appointmentProjection(updated as AppointmentRow),
      ...(guest ? { statusToken: token } : {}),
    };
  }

  async customerAppointmentReschedule(id: string, userId: string | null, body: SquareObject) {
    const appointment = await this.appointmentById(id);
    const token = opaqueToken(body.statusToken);
    const guestHash = appointment.guest_hash == null ? null : await hash(token);
    const validGuest = guestHash != null && guestHash === appointment.guest_hash;
    if (!validGuest && (!userId || appointment.customer_id !== userId))
      fail('APPOINTMENT_ACCESS', 'This appointment link is not valid.', 403);
    if (typeof body.startAt !== 'string' || !Number.isFinite(Date.parse(body.startAt)))
      fail('INVALID_SLOT', 'Choose an available appointment time.');
    const startsAt = new Date(body.startAt).toISOString();
    const resourceId = body.resourceId == null ? null : uuid(body.resourceId);
    const idempotencyKey = uuid(body.idempotencyKey);
    const requestHash = await hash(
      canonicalJson({
        appointmentId: id,
        startAt: startsAt,
        resourceId,
        version: integer(body.version, 1, 10000000),
      }),
    );
    const updated = await this.checked(
      this.db.rpc('reschedule_appointment_slot', {
        p_appointment_id: appointment.id,
        p_business_id: appointment.business_id,
        p_actor_id: validGuest ? null : userId,
        p_guest_hash: validGuest ? guestHash : null,
        p_start_at: startsAt,
        p_resource_id: resourceId,
        p_idempotency_key: idempotencyKey,
        p_request_hash: requestHash,
        p_expected_version: integer(body.version, 1, 10000000),
      }),
    );
    return {
      appointment: this.appointmentProjection(updated as AppointmentRow),
      ...(validGuest ? { statusToken: token } : {}),
    };
  }

  async ownerAppointmentAction(id: string, userId: string | null, body: SquareObject) {
    const appointment = await this.appointmentById(id);
    await this.owner(appointment.business_id, userId);
    const action = string(body.appointmentAction, 32);
    if (
      !['confirm', 'decline', 'cancel', 'check_in', 'start', 'complete', 'no_show'].includes(action)
    )
      fail('INVALID_ACTION', 'That appointment action is unavailable.');
    const updated = await this.checked(
      this.db.rpc('transition_appointment', {
        p_appointment_id: appointment.id,
        p_business_id: appointment.business_id,
        p_actor_id: userId,
        p_actor_type: 'owner',
        p_action: action,
        p_expected_version: integer(body.version, 1, 10000000),
      }),
    );
    return { appointment: this.appointmentProjection(updated as AppointmentRow) };
  }

  async reconcileAppointmentRefunds(appointment: AppointmentRow) {
    if (!appointment.square_payment_id || appointment.payment_status === 'refunded')
      return appointment;
    const { client, connection } = await this.provider(appointment.business_id);
    const payment = (
      await client.request('/v2/payments/' + encodeURIComponent(appointment.square_payment_id))
    ).payment;
    if (
      payment?.status !== 'COMPLETED' ||
      payment.id !== appointment.square_payment_id ||
      payment.order_id !== appointment.square_order_id ||
      payment.location_id !== connection.location_id ||
      payment.total_money?.amount !== Number(appointment.amount_due_minor) ||
      payment.total_money?.currency !== appointment.currency
    )
      fail('PAYMENT_MISMATCH', 'The appointment payment needs review.', 409);
    for (const refundId of new Set([
      ...(payment.refund_ids ?? []),
      ...(appointment.square_refund_id ? [appointment.square_refund_id] : []),
    ])) {
      const refund = (await client.request('/v2/refunds/' + encodeURIComponent(refundId))).refund;
      if (
        refund?.payment_id !== payment.id ||
        refund.location_id !== connection.location_id ||
        refund.amount_money?.currency !== appointment.currency ||
        !Number.isSafeInteger(refund.amount_money?.amount) ||
        refund.amount_money.amount < 1 ||
        refund.amount_money.amount > Number(appointment.amount_due_minor) ||
        !['PENDING', 'COMPLETED', 'FAILED', 'REJECTED'].includes(refund.status)
      )
        fail('REFUND_MISMATCH', 'The appointment refund needs review.', 409);
      const attempt = await this.checked(
        this.db
          .from('appointment_refunds')
          .select('idempotency_key')
          .eq('square_refund_id', refund.id)
          .maybeSingle(),
      );
      await this.checked(
        this.db.rpc('apply_appointment_provider_refund', {
          p_appointment_id: appointment.id,
          p_square_payment_id: payment.id,
          p_square_refund_id: refund.id,
          p_idempotency_key: attempt?.idempotency_key ?? null,
          p_amount_minor: refund.amount_money.amount,
          p_currency: appointment.currency,
          p_refund_state: refund.status,
        }),
      );
    }
    return this.appointmentById(appointment.id);
  }
  async ownerAppointmentRefund(id: string, userId: string | null) {
    let appointment = await this.appointmentById(id);
    await this.owner(appointment.business_id, userId);
    appointment = await this.reconcileAppointmentRefunds(appointment);
    if (appointment.payment_status === 'review') {
      const { client, connection } = await this.provider(appointment.business_id);
      const payment = (
        await client.request(`/v2/payments/${encodeURIComponent(appointment.square_payment_id)}`)
      ).payment;
      if (
        payment?.status !== 'COMPLETED' ||
        payment.order_id !== appointment.square_order_id ||
        payment.location_id !== connection.location_id ||
        payment.total_money?.amount !== Number(appointment.amount_due_minor) ||
        payment.total_money?.currency !== appointment.currency
      )
        fail('PAYMENT_MISMATCH', 'The appointment payment needs review in Square.', 409);
      appointment = await this.checked(
        this.db.rpc('prepare_appointment_review_refund', {
          p_appointment: appointment.id,
          p_owner: userId,
          p_version: appointment.version,
        }),
      );
    }
    const updated = await this.ensureAppointmentRefund(appointment);
    return { appointment: this.appointmentProjection(updated) };
  }

  async ownerAppointmentReimbursement(id: string, userId: string | null, body: SquareObject) {
    const appointment = await this.appointmentById(id);
    await this.owner(appointment.business_id, userId);
    const updated = await this.checked(
      this.db.rpc('record_appointment_external_reimbursement', {
        p_appointment_id: appointment.id,
        p_business_id: appointment.business_id,
        p_actor_id: userId,
        p_expected_version: integer(body.version, 1, 10000000),
      }),
    );
    return { appointment: this.appointmentProjection(updated as AppointmentRow) };
  }

  async ensureAppointmentCheckout(appointment: AppointmentRow) {
    if (appointment.status !== 'payment_pending')
      return { appointment: this.appointmentProjection(appointment) };
    if (appointment.checkout_url) return { appointment: this.appointmentProjection(appointment) };
    const lease = crypto.randomUUID();
    const claimed = await this.checked(
      this.db.rpc('appointment_payment_lease', {
        p_appointment_id: appointment.id,
        p_lease: lease,
      }),
    );
    if (!claimed?.length) {
      const latest = await this.appointmentById(appointment.id);
      if (latest.checkout_url) return { appointment: this.appointmentProjection(latest) };
      fail('APPOINTMENT_BUSY', 'Your time is being reserved. Wait a moment and refresh.', 409);
    }
    const locked = claimed[0] as AppointmentRow;
    try {
      const { client, connection } = await this.provider(locked.business_id);
      if (!connection.location_id || !connection.merchant_id)
        fail('SELECT_LOCATION', 'The business needs to finish its Square Sandbox setup.', 409);
      const savedRequest = locked.provider_request as SquareObject | null;
      if (
        !Object.keys(savedRequest ?? {}).length &&
        locked.hold_expires_at &&
        Date.parse(locked.hold_expires_at) <= Date.now()
      ) {
        await this.checked(
          this.db.rpc('resolve_appointment_payment_hold', {
            p_appointment_id: locked.id,
            p_payment_confirmed: false,
          }),
        );
        return { appointment: this.appointmentProjection(await this.appointmentById(locked.id)) };
      }
      const request =
        savedRequest && Object.keys(savedRequest).length
          ? savedRequest
          : {
              idempotency_key: locked.idempotency_key,
              order: {
                location_id: connection.location_id,
                reference_id: locked.id,
                line_items: [
                  {
                    name: `Appointment deposit · ${locked.service_snapshot.name}`,
                    quantity: '1',
                    base_price_money: {
                      amount: locked.amount_due_minor,
                      currency: locked.currency,
                    },
                  },
                ],
              },
              checkout_options: {
                allow_tipping: false,
                ask_for_shipping_address: false,
                enable_coupon: false,
                enable_loyalty: false,
                redirect_url: `${this.configRedirectUrl()}?appointment=${locked.id}`,
              },
            };
      if (!Object.keys(savedRequest ?? {}).length)
        await this.checked(
          this.db
            .from('appointments')
            .update({ provider_request: request })
            .eq('id', locked.id)
            .eq('operation_lease', lease),
        );
      const response = await client.request('/v2/online-checkout/payment-links', request);
      const link = response.payment_link;
      if (!link?.id || !link.order_id || !/^https:\/\//.test(link.url))
        fail('PROVIDER_ERROR', 'Square checkout is not ready. Retry safely.', 503);
      const providerOrder =
        response.related_resources?.orders?.find((row: SquareObject) => row.id === link.order_id) ??
        (await client.request(`/v2/orders/${encodeURIComponent(link.order_id)}`)).order;
      if (
        providerOrder?.location_id !== connection.location_id ||
        providerOrder?.reference_id !== locked.id ||
        providerOrder?.total_money?.amount !== Number(locked.amount_due_minor) ||
        providerOrder?.total_money?.currency !== locked.currency
      ) {
        await client.request(
          `/v2/online-checkout/payment-links/${encodeURIComponent(link.id)}`,
          undefined,
          'DELETE',
        );
        await this.checked(
          this.db.rpc('resolve_appointment_payment_hold', {
            p_appointment_id: locked.id,
            p_payment_confirmed: true,
          }),
        );
        fail('PRICE_CHANGED', 'The payment details changed. Review the booking again.', 409);
      }
      await this.checked(
        this.db
          .from('appointments')
          .update({
            square_order_id: link.order_id,
            square_payment_link_id: link.id,
            checkout_url: link.url,
            provider_request: request,
            operation_lease: null,
            operation_lease_until: null,
          })
          .eq('id', locked.id)
          .eq('operation_lease', lease),
      );
      const updated = await this.appointmentById(locked.id);
      return { appointment: this.appointmentProjection(updated) };
    } catch (error) {
      await this.checked(
        this.db
          .from('appointments')
          .update({
            operation_lease: null,
            operation_lease_until: null,
          })
          .eq('id', locked.id)
          .eq('operation_lease', lease),
      );
      throw error;
    }
  }

  abstract configRedirectUrl(): string;

  async ensureAppointmentRefund(appointment: AppointmentRow): Promise<AppointmentRow> {
    if (appointment.payment_status === 'refunded') return appointment;
    // External pending refunds have no app request key. Poll their canonical state
    // instead of issuing a second refund against the same remaining balance.
    if (
      appointment.payment_status === 'refund_pending' &&
      (!appointment.square_refund_key || appointment.square_refund_id)
    )
      return this.reconcileAppointmentRefunds(appointment);
    if (appointment.status !== 'cancellation_pending')
      fail('REFUND_NOT_READY', 'Request cancellation before starting a refund.', 409);
    if (appointment.payment_status === 'refund_failed')
      fail(
        'REFUND_FAILED',
        'Square could not complete this refund. Contact the customer and arrange reimbursement directly.',
        409,
      );
    if (!['paid', 'refund_pending'].includes(appointment.payment_status))
      fail('REFUND_NOT_READY', 'There is no confirmed Square payment to refund.', 409);
    if (!appointment.square_payment_id || !appointment.square_order_id)
      fail('PAYMENT_PENDING', 'Square has not confirmed the payment yet.', 409);

    const lease = crypto.randomUUID();
    const nextRefundKey = crypto.randomUUID();
    const claimed = await this.checked(
      this.db.rpc('appointment_refund_lease', {
        p_appointment_id: appointment.id,
        p_lease: lease,
        p_refund_key: nextRefundKey,
      }),
    );
    if (!claimed?.length) {
      const latest = await this.appointmentById(appointment.id);
      if (latest.payment_status === 'refunded') return latest;
      if (latest.payment_status === 'refund_pending' && latest.square_refund_id) return latest;
      fail(
        'APPOINTMENT_BUSY',
        'The refund is being checked. Refresh the appointment shortly.',
        409,
      );
    }
    const locked = claimed[0] as AppointmentRow;
    try {
      const { client, connection } = await this.provider(locked.business_id);
      if (!connection.location_id || !connection.merchant_id || !locked.square_refund_key)
        fail('SELECT_LOCATION', 'The business needs to reconnect Square Sandbox.', 409);

      let refund: SquareObject;
      if (locked.square_refund_id) {
        refund = (
          await client.request(`/v2/refunds/${encodeURIComponent(locked.square_refund_id)}`)
        ).refund;
      } else {
        const payment = (
          await client.request(`/v2/payments/${encodeURIComponent(locked.square_payment_id)}`)
        ).payment;
        if (
          payment?.status !== 'COMPLETED' ||
          payment.order_id !== locked.square_order_id ||
          payment.location_id !== connection.location_id ||
          payment.total_money?.amount !== Number(locked.amount_due_minor) ||
          payment.total_money?.currency !== locked.currency
        )
          fail('PAYMENT_MISMATCH', 'Square payment needs review before refunding.', 409);
        refund = (
          await client.request('/v2/refunds', {
            idempotency_key: locked.square_refund_key,
            payment_id: locked.square_payment_id,
            amount_money: {
              amount: Number(locked.amount_due_minor) - Number(locked.refunded_minor ?? 0),
              currency: locked.currency,
            },
            reason: 'Appointment cancellation',
          })
        ).refund;
      }
      if (
        !refund?.id ||
        refund.payment_id !== locked.square_payment_id ||
        !Number.isSafeInteger(refund.amount_money?.amount) ||
        refund.amount_money.amount < 1 ||
        refund.amount_money.amount > Number(locked.amount_due_minor) ||
        refund.amount_money?.currency !== locked.currency ||
        !['PENDING', 'COMPLETED', 'FAILED', 'REJECTED'].includes(refund.status)
      )
        fail('REFUND_MISMATCH', 'Square refund needs review.', 409);
      const updated = await this.checked(
        this.db.rpc('apply_appointment_provider_refund', {
          p_appointment_id: locked.id,
          p_square_payment_id: locked.square_payment_id,
          p_square_refund_id: refund.id,
          p_idempotency_key: locked.square_refund_key,
          p_amount_minor: refund.amount_money.amount,
          p_currency: locked.currency,
          p_refund_state: refund.status,
        }),
      );
      return updated as AppointmentRow;
    } catch (error) {
      await this.checked(
        this.db
          .from('appointments')
          .update({ operation_lease: null, operation_lease_until: null })
          .eq('id', locked.id)
          .eq('operation_lease', lease),
      );
      throw error;
    }
  }

  async customerAppointmentStatus(id: string, userId: string | null, statusToken: unknown) {
    const appointment = await this.appointmentById(id);
    const token = opaqueToken(statusToken);
    const validGuest =
      appointment.guest_hash != null && appointment.guest_hash === (await hash(token));
    if (!validGuest && (!userId || appointment.customer_id !== userId))
      fail('APPOINTMENT_ACCESS', 'This appointment link is not valid.', 403);
    const current =
      appointment.status === 'payment_pending'
        ? await this.reconcileAppointmentPayment(appointment)
        : appointment.square_payment_id &&
            ['review', 'refund_pending', 'paid'].includes(appointment.payment_status) &&
            (appointment.status !== 'cancellation_pending' || !appointment.square_refund_key)
          ? await this.reconcileAppointmentRefunds(appointment)
          : appointment.payment_status === 'refund_pending' &&
              appointment.status === 'cancellation_pending'
            ? await this.ensureAppointmentRefund(appointment)
            : appointment;
    return {
      appointment: this.appointmentProjection(current),
      ...(validGuest ? { statusToken: token } : {}),
    };
  }

  async reconcileAppointmentPayment(appointment: AppointmentRow) {
    if (appointment.status !== 'payment_pending') return appointment;
    try {
      const { client, connection } = await this.provider(appointment.business_id);
      if (!appointment.square_order_id) {
        await this.ensureAppointmentCheckout(appointment);
        appointment = await this.appointmentById(appointment.id);
      }
      const order = (
        await client.request(`/v2/orders/${encodeURIComponent(appointment.square_order_id)}`)
      ).order;
      if (
        order?.location_id !== connection.location_id ||
        order?.reference_id !== appointment.id ||
        order?.total_money?.amount !== Number(appointment.amount_due_minor) ||
        order?.total_money?.currency !== appointment.currency
      )
        fail('PAYMENT_MISMATCH', 'Square payment needs review.', 409);
      let completedPayment: SquareObject | null = null;
      for (const tender of order.tenders ?? []) {
        if (!tender.payment_id) continue;
        const payment = (
          await client.request(`/v2/payments/${encodeURIComponent(tender.payment_id)}`)
        ).payment;
        if (payment?.status === 'COMPLETED') completedPayment = payment;
      }
      if (completedPayment) {
        if (
          completedPayment.amount_money?.amount !== Number(appointment.amount_due_minor) ||
          completedPayment.amount_money?.currency !== appointment.currency ||
          completedPayment.order_id !== appointment.square_order_id
        )
          fail('PAYMENT_MISMATCH', 'Square payment needs review.', 409);
        await this.checked(
          this.db.rpc('apply_appointment_provider_payment', {
            p_appointment_id: appointment.id,
            p_square_order_id: appointment.square_order_id,
            p_square_payment_id: completedPayment.id,
            p_payment_state: 'COMPLETED',
          }),
        );
      } else if (
        appointment.hold_expires_at &&
        Date.parse(appointment.hold_expires_at) <= Date.now() &&
        order.state !== 'CANCELED'
      ) {
        if (appointment.square_payment_link_id)
          await client
            .request(
              `/v2/online-checkout/payment-links/${encodeURIComponent(appointment.square_payment_link_id)}`,
              undefined,
              'DELETE',
            )
            .catch(() => ({}));
        const verified = (
          await client.request(`/v2/orders/${encodeURIComponent(appointment.square_order_id)}`)
        ).order;
        if (verified.state === 'CANCELED' && !(verified.tenders ?? []).length) {
          await this.checked(
            this.db.rpc('apply_appointment_provider_payment', {
              p_appointment_id: appointment.id,
              p_square_order_id: appointment.square_order_id,
              p_square_payment_id: null,
              p_payment_state: 'CANCELED',
            }),
          );
        }
      } else if (order.state === 'CANCELED' && !(order.tenders ?? []).length) {
        await this.checked(
          this.db.rpc('apply_appointment_provider_payment', {
            p_appointment_id: appointment.id,
            p_square_order_id: appointment.square_order_id,
            p_square_payment_id: null,
            p_payment_state: 'CANCELED',
          }),
        );
      }
    } catch {
      // Network ambiguity or a transient provider error keeps the slot reserved.
    }
    return await this.appointmentById(appointment.id);
  }
}
