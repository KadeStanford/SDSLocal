import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

interface WalletCard {
  membership_id: string;
  business_name: string;
  business_slug: string;
  primary_color: string;
  program_name: string;
  reward_description: string;
  rewards_ready: number;
  progress_stamps: number;
  stamps_required: number;
  program_type: string;
  progress_points: number;
  points_required: number;
  available_points: number;
}

export const metadata = { title: 'Your rewards' };

export default async function RewardsPage({ searchParams }: PageProps<'/rewards'>) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth?next=/rewards');
  const { data, error } = await supabase.rpc('get_loyalty_wallet_v2');
  const cards = (data ?? []) as WalletCard[];

  return (
    <main className="page-shell">
      <nav className="topbar">
        <Link className="brand" href="/">
          Parish Pass
        </Link>
        <div className="nav-actions">
          <Link href="/explore">Explore</Link>
          <Link href="/events">Events</Link>
          <Link href="/account">Account</Link>
        </div>
      </nav>
      <div className="page-heading compact-heading">
        <p className="eyebrow">Rewards wallet</p>
        <h1>Your local rewards, together.</h1>
        <p>Open a card at the counter to show its secure rotating code.</p>
      </div>
      {query.left === '1' && <p className="notice-success">You left the rewards program.</p>}
      {error && <p className="notice-error">Rewards could not be loaded: {error.message}</p>}
      <section className="reward-card-grid">
        {cards.map((card) => (
          <Link
            className="reward-wallet-card"
            href={`/rewards/${card.membership_id}`}
            key={card.membership_id}
            style={{ '--reward-color': card.primary_color } as React.CSSProperties}
          >
            <p>{card.business_name}</p>
            <h2>{card.program_name}</h2>
            <span>{card.reward_description}</span>
            {card.program_type === 'points' ? <p>{card.available_points} points available · {card.points_required} points per reward</p> : <div className="stamp-progress" aria-hidden="true">
              {Array.from({ length: card.stamps_required }, (_, index) => (
                <i className={index < card.progress_stamps ? 'stamp-earned' : ''} key={index} />
              ))}
            </div>}
            <strong>
              {card.rewards_ready
                ? `${card.rewards_ready} reward ready`
                : card.program_type === 'points' ? `${card.progress_points} / ${card.points_required} points toward your next reward` : `${card.progress_stamps} / ${card.stamps_required} visits`}
            </strong>
          </Link>
        ))}
      </section>
      {!error && !cards.length && (
        <div className="empty-state">
          <strong>No rewards cards yet</strong>
          <span>Join an active program from a business page.</span>
          <Link className="button button-small" href="/explore?loyalty=on">
            Find businesses with rewards
          </Link>
        </div>
      )}
    </main>
  );
}
