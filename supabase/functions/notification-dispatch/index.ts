import { createClient } from 'npm:@supabase/supabase-js@2';

const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
const expoReceiptsUrl = 'https://exp.host/--/api/v2/push/getReceipts';
const jsonHeaders = { 'Content-Type': 'application/json' };

interface Delivery {
  id: string;
  user_id: string;
  business_id: string | null;
  notification_type: 'events' | 'loyalty' | 'general_updates' | 'operational';
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

  const { data: deliveriesData, error: claimError } = await admin.rpc(
    'claim_notification_deliveries',
    { p_limit: 25 },
  );
  if (claimError) return response(500, { error: claimError.message });
  const deliveries = (deliveriesData ?? []) as Delivery[];
  let sent = 0;
  let skipped = 0;
  let retried = 0;

  for (const delivery of deliveries) {
    const { data: tokenData, error: tokenError } = await admin
      .from('push_tokens')
      .select('id, user_id, expo_push_token')
      .eq('user_id', delivery.user_id)
      .eq('is_active', true);
    if (tokenError) {
      await admin
        .from('notification_deliveries')
        .update({
          status: delivery.attempt_count >= 5 ? 'failed' : 'queued',
          next_attempt_at: new Date(
            Date.now() + retryDelay(delivery.attempt_count) * 1000,
          ).toISOString(),
          last_error: tokenError.message.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', delivery.id);
      retried += 1;
      continue;
    }

    const tokens = (tokenData ?? []) as PushToken[];
    if (!tokens.length) {
      await admin
        .from('notification_deliveries')
        .update({
          status: 'skipped',
          last_error: 'No active device token',
          updated_at: new Date().toISOString(),
        })
        .eq('id', delivery.id);
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
            data: { url: delivery.url, notificationType: delivery.notification_type },
            sound: 'default',
            channelId: 'updates',
            priority: 'default',
            ttl: 86400,
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
        await admin
          .from('notification_deliveries')
          .update({
            status: 'sent',
            expo_tickets: accepted,
            sent_at: new Date().toISOString(),
            last_error: permanentErrors.length ? permanentErrors.join('; ').slice(0, 500) : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', delivery.id);
        sent += 1;
      } else {
        await admin
          .from('notification_deliveries')
          .update({
            status: 'failed',
            last_error: (permanentErrors.join('; ') || 'Expo rejected every token.').slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq('id', delivery.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Push delivery failed.';
      await admin
        .from('notification_deliveries')
        .update({
          status: delivery.attempt_count >= 5 ? 'failed' : 'queued',
          next_attempt_at: new Date(
            Date.now() + retryDelay(delivery.attempt_count) * 1000,
          ).toISOString(),
          last_error: message.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', delivery.id);
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

  return response(200, { claimed: deliveries.length, sent, skipped, retried });
});
