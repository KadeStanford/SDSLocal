import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { SquareService } from '../_shared/square-service.ts';
import { StripeService } from '../_shared/stripe-service.ts';
import { squareConfig, stripeConfig, CommerceError } from '../_shared/square-security.ts';

import {
  bearerToken,
  deletionBlockerCode,
  customerDeletionError,
  mergeStorageTargets,
  normalizeStorageTargets,
  parseDeletionConfirmation,
  type StorageTarget,
} from '../_shared/account-deletion.ts';

const baseHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

function headers(request: Request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = Deno.env.get('ACCOUNT_DELETION_ALLOWED_ORIGIN');
  return {
    ...baseHeaders,
    ...(origin && allowedOrigin && origin === allowedOrigin
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
      : {}),
  };
}

function json(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: headers(request) });
}

function originAllowed(request: Request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = Deno.env.get('ACCOUNT_DELETION_ALLOWED_ORIGIN');
  return !origin || Boolean(allowedOrigin && origin === allowedOrigin);
}

async function listStagedFiles(
  admin: SupabaseClient,
  userId: string,
  prefix = userId,
  depth = 0,
): Promise<StorageTarget[]> {
  if (depth > 8) throw new Error('Staging cleanup exceeded the folder limit.');
  const targets: StorageTarget[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from('media-staging').list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error('Staging media could not be inspected.');
    const entries = data ?? [];
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id) targets.push({ bucket: 'media-staging', path });
      else targets.push(...(await listStagedFiles(admin, userId, path, depth + 1)));
    }
    if (entries.length < 100) break;
    offset += entries.length;
  }
  return targets;
}

async function removeTargets(admin: SupabaseClient, targets: readonly StorageTarget[]) {
  for (const bucket of ['business-media', 'media-staging'] as const) {
    const paths = targets.filter((target) => target.bucket === bucket).map((target) => target.path);
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(index, index + 100));
      if (error) throw new Error('Account media cleanup is pending.');
    }
  }
}

Deno.serve(async (request) => {
  if (!originAllowed(request))
    return json(request, 403, { error: 'This request origin is not allowed.' });
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: headers(request) });
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    return json(request, 405, { error: 'Method not allowed.' });
  }

  const token = bearerToken(request.headers.get('Authorization'));
  if (!token) return json(request, 401, { error: customerDeletionError(401) });

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!serviceRoleKey || !supabaseUrl) {
    return json(request, 503, { error: 'Account deletion is temporarily unavailable.' });
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return json(request, 401, { error: customerDeletionError(401) });
  }
  const userId = authData.user.id;

  if (request.method === 'GET') {
    const { data, error } = await admin.rpc('get_account_deletion_impact', { p_user_id: userId });
    if (error) return json(request, 500, { error: customerDeletionError(500) });
    const blockers = await admin.from('appointments').select('id').eq('customer_id', userId)
      .or('status.not.in.(cancelled,completed,no_show),payment_status.in.(pending,refund_pending,refund_failed,review)').limit(1);
    if (blockers.error) return json(request, 503, { error: 'We couldn’t check outstanding bookings. Please retry.' });
    return json(request, 200, { impact: data, blockers: blockers.data?.length ? ['appointments'] : [] });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(request, 400, { error: customerDeletionError(400) });
  }
  if (!parseDeletionConfirmation(body)) {
    return json(request, 400, { error: customerDeletionError(400) });
  }

  const { data: started, error: startError } = await admin.rpc('begin_account_deletion', {
    p_user_id: userId,
  });
  if (startError || !started) {
    const blocker = deletionBlockerCode(startError?.message);
    return json(request, 409, { error: blocker ? 'Resolve active appointments or outstanding booking payments before deleting your account.' : customerDeletionError(409), blockers: blocker ? [blocker] : [] });
  }

  const job = started as Record<string, unknown>;
  const jobId = typeof job.jobId === 'string' ? job.jobId : null;
  if (!jobId) return json(request, 409, { error: customerDeletionError(409) });

  let targets = normalizeStorageTargets(job.storageTargets, userId);
  if (job.status === 'pending') {
    try {
      targets = mergeStorageTargets(
        job.storageTargets,
        await listStagedFiles(admin, userId),
        userId,
      );
      const { error } = await admin.rpc('set_account_deletion_storage_targets', {
        p_user_id: userId,
        p_job_id: jobId,
        p_storage_targets: targets,
      });
      if (error) throw new Error('Storage targets could not be saved.');
    } catch {
      return json(request, 409, { error: customerDeletionError(409) });
    }
  }

  // Only sole-owned businesses are disconnected. Shared businesses retain the
  // remaining owner's connection. SQL also guards against deletion races.
  const impact = job.impact as { businesses?: { id: string; action: string }[] } | undefined;
  const soleBusinessIds = (impact?.businesses ?? [])
    .filter((b) => b.action === 'delete_business')
    .map((b) => b.id);
  if (soleBusinessIds.length) {
    const { data: connections, error: connectionError } = await admin
      .from('square_connections')
      .select('business_id')
      .in('business_id', soleBusinessIds)
      .eq('state', 'connected');
    if (connectionError)
      return json(request, 409, {
        error: 'Square connection cleanup could not be verified. Please retry.',
      });
    if (connections?.length) {
      try {
        const square = new SquareService(
          admin,
          squareConfig((key) => Deno.env.get(key)),
        );
        for (const connection of connections)
          await square.disconnect(connection.business_id, userId, true);
      } catch (error) {
        return json(request, 409, {
          error:
            error instanceof CommerceError
              ? error.message
              : 'Disconnect Square after settling pickup orders, then retry account deletion.',
        });
      }
    }
    const { data: stripeConnections, error: stripeConnectionError } = await admin
      .from('stripe_account_states')
      .select('business_id')
      .in('business_id', soleBusinessIds)
      .eq('state', 'connected');
    if (stripeConnectionError)
      return json(request, 409, {
        error: 'Stripe connection cleanup could not be verified. Please retry.',
      });
    if (stripeConnections?.length) {
      try {
        const stripe = new StripeService(
          admin,
          stripeConfig((key) => Deno.env.get(key)),
        );
        for (const connection of stripeConnections)
          await stripe.disconnect({ businessId: connection.business_id, confirmed: true }, userId);
      } catch (error) {
        return json(request, 409, {
          error:
            error instanceof CommerceError
              ? error.message
              : 'Disconnect Stripe after settling pickup orders, then retry account deletion.',
        });
      }
    }
  }

  const { error: deletionError } = await admin.rpc('execute_account_deletion', {
    p_user_id: userId,
    p_job_id: jobId,
  });
  if (deletionError) {
    return json(request, 409, { error: customerDeletionError(409) });
  }

  let cleanupPending = false;
  try {
    await removeTargets(admin, targets);
    await admin.rpc('finish_account_deletion_cleanup', { p_job_id: jobId, p_error: null });
  } catch {
    cleanupPending = true;
    await admin.rpc('finish_account_deletion_cleanup', {
      p_job_id: jobId,
      p_error: 'Storage cleanup will be retried.',
    });
  }

  return json(request, 200, { deleted: true, cleanupPending });
});
