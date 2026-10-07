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
  program_type: string;
  progress_points: number;
  points_required: number;
  available_points: number;
}

interface Transaction {
  id: string;
  transaction_type: 'stamp' | 'redemption' | 'reversal' | 'points_earned';
  points_amount: number;
  amount: number;
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
  const [membershipResult, { data: transactions, error: historyError }] = await Promise.all([
    supabase.rpc('get_loyalty_wallet_v2').eq('membership_id', membershipId).maybeSingle(),
    supabase
      .from('loyalty_transactions')
      .select('id, transaction_type, created_at, note, points_amount, amount')
      .eq('membership_id', membershipId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  if (membershipResult.error) return <main className="page-shell"><h1>Rewards couldn’t load</h1><p>Please retry from your wallet.</p><Link href="/rewards">Back to rewards</Link></main>;
  if (!membershipResult.data) notFound();
  const membership = membershipResult.data as MembershipDetail;

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
          {membership.program_type === 'points' ? <p>{membership.available_points} points available · {membership.points_required} points per reward</p> : <div
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
          </div>}
          <strong>
            {membership.rewards_ready
              ? `${membership.rewards_ready} reward ready`
              : membership.program_type === 'points' ? `${membership.progress_points} / ${membership.points_required} points toward your next reward` : `${membership.progress_stamps} / ${membership.stamps_required} visits`}
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
                  ? `+${transaction.amount} visit${transaction.amount === 1 ? '' : 's'}`
                  : transaction.transaction_type === 'redemption'
                    ? 'Reward redeemed'
                    : transaction.transaction_type === 'points_earned' ? `+${transaction.points_amount} points` : 'Visit adjustment'}
              </span>
              <time>{new Date(transaction.created_at).toLocaleString()}</time>
            </div>
          ))}
          {historyError && <p className="notice-error">Activity couldn’t load. Refresh to retry.</p>}
          {!historyError && !transactions?.length && (
            <p className="muted">Your rewards activity will appear here after staff scan your card.</p>
          )}
        </div>
      </section>
      <form action={leaveRewardsAction.bind(null, membershipId)} className="leave-rewards-form">
        <button className="text-button">Leave this rewards program</button>
      </form>
    </main>
  );
}
