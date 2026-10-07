import { PageHeader } from '@/components/page-header';
import { AppIcon } from '@/components/app-icon';

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
    <main className="page-shell rewards-page">
      <PageHeader />
      <nav className="parish-page-links" aria-label="Page links">
        <div className="nav-actions">
          <Link href="/explore">
            <AppIcon name="compass" size={18} />
            Explore
          </Link>
          <Link href="/events">
            <AppIcon name="calendar-days" size={18} />
            Events
          </Link>
          <Link href="/account">
            <AppIcon name="circle-user-round" size={18} />
            Account
          </Link>
        </div>
      </nav>
      <div className="page-heading compact-heading">
        <p className="eyebrow">Rewards wallet</p>
        <h1>Your local rewards, together.</h1>
        <p>Open a card at the counter to show its secure rotating code.</p>
      </div>
      {query.left === '1' && <p className="notice-success">You left the rewards program.</p>}
      {error && <p className="notice-error">Rewards could not be loaded: {error.message}</p>}
      <div className="wallet-summary">
        <AppIcon name="gift" size={24} />
        <span>
          {cards.length} {cards.length === 1 ? 'reward card' : 'reward cards'}
        </span>
        <Link href="/following">
          Your followed businesses <AppIcon name="chevron-right" size={18} />
        </Link>
      </div>
      {[
        { title: 'Ready to enjoy', cards: cards.filter((card) => card.rewards_ready > 0) },
        { title: 'In progress', cards: cards.filter((card) => card.rewards_ready <= 0) },
      ]
        .filter((group) => group.cards.length)
        .map((group) => (
          <section key={group.title} className="wallet-collection">
            <h2>{group.title}</h2>
            <div className="reward-card-grid">
              {group.cards.map((card) => {
                const points = card.program_type === 'points';
                const progress = points ? card.progress_points : card.progress_stamps;
                const target = points ? card.points_required : card.stamps_required;
                return (
                  <Link
                    className="wallet-card"
                    href={`/rewards/${card.membership_id}`}
                    key={card.membership_id}
                  >
                    <div className="wallet-issuer">
                      <span className="workspace-initial" aria-hidden="true">
                        {card.business_name.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{card.business_name}</strong>
                        <span>{points ? 'Points rewards' : 'Visit rewards'}</span>
                      </div>
                    </div>
                    <div className="wallet-program">
                      <h3>{card.program_name}</h3>
                      <p>{card.reward_description}</p>
                      {card.rewards_ready > 0 && (
                        <span className="wallet-ready">
                          {card.rewards_ready}{' '}
                          {card.rewards_ready === 1 ? 'reward ready' : 'rewards ready'}
                        </span>
                      )}
                      {points && <p>{card.available_points} points available</p>}
                      <div className="wallet-progress-copy">
                        <strong>
                          {progress} {target > 0 ? ' / ' + target : ''}
                        </strong>
                        <span>{points ? 'points' : 'visits'} toward your next reward</span>
                      </div>
                      {target > 0 && (
                        <progress
                          max={target}
                          value={Math.min(target, Math.max(0, progress))}
                          aria-label={`${progress} of ${target} ${points ? 'points' : 'visits'} toward your next reward`}
                        />
                      )}
                    </div>
                    <span className="wallet-open">
                      View rewards <AppIcon name="chevron-right" size={20} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

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
