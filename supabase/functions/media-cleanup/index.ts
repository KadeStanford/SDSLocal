import { createClient } from 'npm:@supabase/supabase-js@2';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

interface CleanupAsset {
  id: string;
  bucket: string;
  storage_path: string;
}

interface AccountCleanupJob {
  job_id: string;
  storage_targets: { bucket: string; path: string }[];
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceRoleKey || request.headers.get('Authorization') !== `Bearer ${serviceRoleKey}`) {
    return json(401, { error: 'Service role authorization is required.' });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error: claimError } = await admin.rpc('claim_media_cleanup', { p_limit: 100 });
  if (claimError) return json(500, { error: claimError.message });

  const assets = (data ?? []) as CleanupAsset[];
  let deleted = 0;
  let retried = 0;
  let accountJobsCompleted = 0;
  let accountJobsRetried = 0;
  const byBucket = new Map<string, CleanupAsset[]>();
  for (const asset of assets) {
    const list = byBucket.get(asset.bucket) ?? [];
    list.push(asset);
    byBucket.set(asset.bucket, list);
  }

  for (const [bucket, bucketAssets] of byBucket) {
    const { error: removeError } = await admin.storage
      .from(bucket)
      .remove(bucketAssets.map((asset) => asset.storage_path));
    if (removeError) {
      await admin
        .from('media_assets')
        .update({ cleanup_claimed_at: null })
        .in(
          'id',
          bucketAssets.map((asset) => asset.id),
        );
      retried += bucketAssets.length;
      continue;
    }

    const { error: deleteError } = await admin
      .from('media_assets')
      .delete()
      .in(
        'id',
        bucketAssets.map((asset) => asset.id),
      );
    if (deleteError) {
      await admin
        .from('media_assets')
        .update({ cleanup_claimed_at: null })
        .in(
          'id',
          bucketAssets.map((asset) => asset.id),
        );
      retried += bucketAssets.length;
      continue;
    }
    deleted += bucketAssets.length;
  }

  const { data: accountJobs, error: accountClaimError } = await admin.rpc(
    'claim_account_deletion_cleanup',
    { p_limit: 10 },
  );
  if (accountClaimError) return json(500, { error: 'Account cleanup could not be claimed.' });

  for (const job of (accountJobs ?? []) as AccountCleanupJob[]) {
    let cleanupError: string | null = null;
    try {
      const targets = Array.isArray(job.storage_targets) ? job.storage_targets : [];
      for (const bucket of ['business-media', 'media-staging']) {
        const paths = targets
          .filter((target) => target.bucket === bucket && typeof target.path === 'string')
          .map((target) => target.path);
        for (let index = 0; index < paths.length; index += 100) {
          const { error } = await admin.storage
            .from(bucket)
            .remove(paths.slice(index, index + 100));
          if (error) throw new Error('Storage cleanup failed.');
        }
      }
      accountJobsCompleted += 1;
    } catch {
      cleanupError = 'Storage cleanup will be retried.';
      accountJobsRetried += 1;
    }
    await admin.rpc('finish_account_deletion_cleanup', {
      p_job_id: job.job_id,
      p_error: cleanupError,
    });
  }

  return json(200, {
    claimed: assets.length,
    deleted,
    retried,
    accountJobsClaimed: (accountJobs ?? []).length,
    accountJobsCompleted,
    accountJobsRetried,
  });
});
