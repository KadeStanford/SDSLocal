import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { leaveRewardsAction } from './actions';
import { RewardsCode } from './rewards-code';

interface MembershipDetail {
  membership_id: string;
  business_name: string;
  business_slug: string;
  primary_color: string;
  program_name: string;
  reward_description: string;
  terms: string;
  available_stamps: number;
  rewards_ready: number;
  progress_stamps: number;
  stamps_required: number;
}

interface Transaction {
  id: string;
  transaction_type: 'stamp' | 'redemption' | 'reversal';
  created_at: string;
  note: string | null;
}

export default async function RewardCardPage({
  params,
  searchParams,
}: PageProps<'/rewards/[membershipId]'>) {
  const [{ membershipId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect(`/auth?next=${encodeURIComponent(`/rewards/${membershipId}`)}`);
  const [{ data }, { data: transactions }] = await Promise.all([
    supabase.rpc('get_loyalty_membership', { p_membership_id: membershipId }).maybeSingle(),
    supabase
      .from('loyalty_transactions')
      .select('id, transaction_type, created_at, note')
      .eq('membership_id', membershipId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  if (!data) notFound();
  const membership = data as MembershipDetail;

  return (
    <main className="page-shell narrow-shell">
      <nav className="topbar">
        <Link className="brand" href="/rewards">
          ← Rewards
        </Link>
        <Link href={`/b/${membership.business_slug}`}>View business</Link>
      </nav>
      {typeof query.error === 'string' && <p className="notice-error">{query.error}</p>}
      <section
        className="reward-detail-card"
        style={{ '--reward-color': membership.primary_color } as React.CSSProperties}
      >
        <div className="reward-detail-copy">
          <p className="eyebrow">{membership.business_name}</p>
          <h1>{membership.program_name}</h1>
          <p>{membership.reward_description}</p>
          <div
            className="stamp-progress"
            aria-label={`${membership.progress_stamps} of ${membership.stamps_required} visits`}
          >
            {Array.from({ length: membership.stamps_required }, (_, index) => (
              <span
                className={index < membership.progress_stamps ? 'stamp-earned' : ''}
                key={index}
                aria-hidden="true"
              />
            ))}
          </div>
          <strong>
            {membership.rewards_ready
              ? `${membership.rewards_ready} reward ready`
              : `${membership.progress_stamps} / ${membership.stamps_required} visits`}
          </strong>
          {membership.terms && <p className="field-hint">{membership.terms}</p>}
        </div>
        <RewardsCode membershipId={membership.membership_id} />
      </section>
      <section className="panel">
        <h2>Recent activity</h2>
        <div className="loyalty-history">
          {((transactions ?? []) as Transaction[]).map((transaction) => (
            <div key={transaction.id}>
              <span>
                {transaction.transaction_type === 'stamp'
                  ? '+1 visit'
                  : transaction.transaction_type === 'redemption'
                    ? 'Reward redeemed'
                    : 'Stamp reversed'}
              </span>
              <time>{new Date(transaction.created_at).toLocaleString()}</time>
            </div>
          ))}
          {!transactions?.length && (
            <p className="muted">Your visits will appear here after staff scan your card.</p>
          )}
        </div>
      </section>
      <form action={leaveRewardsAction.bind(null, membershipId)} className="leave-rewards-form">
        <button className="text-button">Leave this rewards program</button>
      </form>
    </main>
  );
}
