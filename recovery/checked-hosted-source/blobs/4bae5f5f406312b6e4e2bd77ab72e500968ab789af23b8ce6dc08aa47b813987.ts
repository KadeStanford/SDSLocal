import { createClient } from 'npm:@supabase/supabase-js@2';

const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
const expoReceiptsUrl = 'https://exp.host/--/api/v2/push/getReceipts';
const jsonHeaders = { 'Content-Type': 'application/json' };

interface Delivery {
  id: string;
  user_id: string;
  business_id: string | null;
  notification_type: 'events' | 'loyalty' | 'general_updates' | 'operational' | 'orders';
  title: string;
  body: string;
  url: string;
  attempt_count: number;
}

interface PushToken {
  id: string;
  user_id: string;
  expo_push_token: string;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, 'Cache-Control': 'no-store' },
  });
}

function retryDelay(attempt: number) {
  return Math.min(60 * 60, 15 * 2 ** Math.max(0, attempt - 1));
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return response(405, { error: 'Method not allowed.' });
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceRoleKey || request.headers.get('Authorization') !== `Bearer ${serviceRoleKey}`) {
    return response(401, { error: 'Service role authorization is required.' });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const input = await request.json().catch(() => ({}));
  const ordersOnly = input?.scope === 'orders';

  // Keep the run table bounded while retaining enough history to diagnose a
  // missed schedule or a provider outage.
  await admin
    .from('notification_dispatch_runs')
    .delete()
    .lt('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const triggerSource = request.headers.get('x-sds-dispatch-trigger') ?? 'scheduler';
  const { data: run } = await admin
    .from('notification_dispatch_runs')
    .insert({ trigger_source: triggerSource.slice(0, 32) })
    .select('id')
    .maybeSingle();
  const runId = run?.id ?? null;
  const deliveryErrors: string[] = [];
  type DeliveryState = {
    status: 'queued' | 'sending' | 'sent' | 'failed' | 'skipped';
    nextAttemptAt?: string | null;
    lastError?: string | null;
    expoTickets?: Array<{ id: string; tokenId: string }> | null;
    sentAt?: string | null;
  };
  const updateDelivery = async (deliveryId: string, state: DeliveryState) => {
    const { error } = await admin.rpc('set_notification_delivery_state', {
      p_delivery: deliveryId,
      p_status: state.status,
      p_next_attempt_at: state.nextAttemptAt ?? null,
      p_last_error: state.lastError ?? null,
      p_expo_tickets: state.expoTickets ?? null,
      p_sent_at: state.sentAt ?? null,
    });
    if (error) {
      deliveryErrors.push(`${deliveryId}: ${error.message}`);
      return false;
    }
    return true;
  };
  const finish = async (
    result: {
      readonly status: 'succeeded' | 'failed';
      readonly claimed_count?: number;
      readonly sent_count?: number;
      readonly skipped_count?: number;
      readonly retried_count?: number;
      readonly error_message?: string;
    },
    payload: Record<string, unknown>,
  ) => {
    if (runId) {
      await admin
        .from('notification_dispatch_runs')
        .update({
          ...result,
          error_message:
            result.error_message ??
            (deliveryErrors.length ? deliveryErrors.join('; ').slice(0, 500) : null),
          finished_at: new Date().toISOString(),
        })
        .eq('id', runId);
    }
    return response(200, payload);
  };

  const { data: deliveriesData, error: claimError } = await admin.rpc(
    ordersOnly ? 'claim_pickup_notifications' : 'claim_notification_deliveries',
    { p_limit: 25 },
  );
  if (claimError) {
    if (runId) {
      await admin
        .from('notification_dispatch_runs')
        .update({
          status: 'failed',
          error_message: claimError.message.slice(0, 500),
          finished_at: new Date().toISOString(),
        })
        .eq('id', runId);
    }
    return response(500, { error: claimError.message });
  }
  const deliveries = (deliveriesData ?? []) as Delivery[];
  let sent = 0;
  let skipped = 0;
  let retried = 0;

  for (const delivery of deliveries) {
    if (delivery.notification_type === 'orders') {
      const { data: allowed, error } = await admin.rpc('pickup_notification_sendable', {
        p_delivery: delivery.id,
      });
      if (error || !allowed) {
        await updateDelivery(delivery.id, {
          status: error ? (delivery.attempt_count >= 5 ? 'failed' : 'queued') : 'skipped',
          nextAttemptAt: new Date(Date.now() + 60000).toISOString(),
          lastError: error ? 'Order access check unavailable' : 'Order changed or access removed',
        });
        skipped += 1;
        continue;
      }
    }
    if (
      delivery.url.startsWith('/service-requests?') ||
      delivery.url.startsWith('/my-service-requests?')
    ) {
      const { data: allowed, error } = await admin.rpc('service_request_notification_sendable', {
        p_delivery_id: delivery.id,
      });
      if (error || !allowed) {
        await updateDelivery(delivery.id, {
          status: error ? (delivery.attempt_count >= 5 ? 'failed' : 'queued') : 'skipped',
          nextAttemptAt: new Date(Date.now() + 60000).toISOString(),
          lastError: error
            ? 'Service request access check unavailable'
            : 'Request changed or access removed',
        });
        skipped += 1;
        continue;
      }
    }
    const { data: tokenData, error: tokenError } = await admin
      .from('push_tokens')
      .select('id, user_id, expo_push_token')
      .eq('user_id', delivery.user_id)
      .eq('is_active', true);
    if (tokenError) {
      await updateDelivery(delivery.id, {
        status: delivery.attempt_count >= 5 ? 'failed' : 'queued',
        nextAttemptAt: new Date(
          Date.now() + retryDelay(delivery.attempt_count) * 1000,
        ).toISOString(),
        lastError: tokenError.message.slice(0, 500),
      });
      retried += 1;
      continue;
    }

    const tokens = (tokenData ?? []) as PushToken[];
    if (!tokens.length) {
      await updateDelivery(delivery.id, {
        status: 'skipped',
        lastError: 'No active device token',
      });
      skipped += 1;
      continue;
    }

    try {
      const pushResponse = await fetch(expoPushUrl, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(
          tokens.map((token) => ({
            to: token.expo_push_token,
            title: delivery.title,
            body: delivery.body,
            data: {
              url: delivery.url,
              notificationType: delivery.notification_type,
              deliveryId: delivery.id,
            },
            sound: 'default',
            channelId: delivery.notification_type === 'orders' ? 'orders' : 'updates',
            priority: delivery.notification_type === 'orders' ? 'high' : 'default',
            ttl: delivery.notification_type === 'orders' ? 3600 : 86400,
          })),
        ),
      });
      if (!pushResponse.ok) {
        throw new Error(`Expo Push Service returned ${pushResponse.status}.`);
      }
      const payload = (await pushResponse.json()) as { data?: ExpoTicket | ExpoTicket[] };
      const tickets = Array.isArray(payload.data)
        ? payload.data
        : payload.data
          ? [payload.data]
          : [];
      const accepted: Array<{ id: string; tokenId: string }> = [];
      const permanentErrors: string[] = [];

      for (const [index, ticket] of tickets.entries()) {
        const token = tokens[index];
        if (!token) continue;
        if (ticket.status === 'ok' && ticket.id) {
          accepted.push({ id: ticket.id, tokenId: token.id });
          continue;
        }
        const errorCode = ticket.details?.error;
        permanentErrors.push(ticket.message ?? errorCode ?? 'Push rejected');
        if (errorCode === 'DeviceNotRegistered') {
          await admin.from('push_tokens').update({ is_active: false }).eq('id', token.id);
        }
      }

      if (accepted.length) {
        const stateUpdated = await updateDelivery(delivery.id, {
          status: 'sent',
          expoTickets: accepted,
          sentAt: new Date().toISOString(),
          lastError: permanentErrors.length ? permanentErrors.join('; ').slice(0, 500) : null,
        });
        if (stateUpdated) sent += 1;
      } else {
        await updateDelivery(delivery.id, {
          status: 'failed',
          lastError: (permanentErrors.join('; ') || 'Expo rejected every token.').slice(0, 500),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Push delivery failed.';
      await updateDelivery(delivery.id, {
        status: delivery.attempt_count >= 5 ? 'failed' : 'queued',
        nextAttemptAt: new Date(
          Date.now() + retryDelay(delivery.attempt_count) * 1000,
        ).toISOString(),
        lastError: message.slice(0, 500),
      });
      retried += 1;
    }
  }

  const receiptCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: receiptRows } = await admin
    .from('notification_deliveries')
    .select('id, expo_tickets')
    .eq('status', 'sent')
    .is('receipt_checked_at', null)
    .lte('sent_at', receiptCutoff)
    .limit(100);

  const receiptEntries = (receiptRows ?? []).flatMap((row) =>
    ((row.expo_tickets ?? []) as Array<{ id: string; tokenId: string }>).map((ticket) => ({
      deliveryId: row.id as string,
      ...ticket,
    })),
  );
  if (receiptEntries.length) {
    const receiptResponse = await fetch(expoReceiptsUrl, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ ids: receiptEntries.map((ticket) => ticket.id) }),
    });
    if (receiptResponse.ok) {
      const payload = (await receiptResponse.json()) as {
        data?: Record<string, ExpoTicket>;
      };
      for (const entry of receiptEntries) {
        const receipt = payload.data?.[entry.id];
        if (receipt?.details?.error === 'DeviceNotRegistered') {
          await admin.from('push_tokens').update({ is_active: false }).eq('id', entry.tokenId);
        }
      }
      const checkedAt = new Date().toISOString();
      for (const row of receiptRows ?? []) {
        await admin
          .from('notification_deliveries')
          .update({ receipt_checked_at: checkedAt, updated_at: checkedAt })
          .eq('id', row.id);
      }
    }
  }

  return finish(
    {
      status: 'succeeded',
      claimed_count: deliveries.length,
      sent_count: sent,
      skipped_count: skipped,
      retried_count: retried,
    },
    { claimed: deliveries.length, sent, skipped, retried },
  );
});
