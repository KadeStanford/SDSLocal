import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import {
  addStaffAction,
  removeStaffAction,
  reverseStampAction,
  saveLoyaltyProgramAction,
} from './actions';
import { LoyaltyScanner } from './loyalty-scanner';

interface ProgramRow {
  id: string;
  name: string;
  reward_description: string;
  stamps_required: number;
  terms: string;
  is_active: boolean;
}

interface StaffRow {
  member_id: string;
  display_name: string;
  is_active: boolean;
}

interface TransactionRow {
  transaction_id: string;
  transaction_type: 'stamp' | 'redemption' | 'reversal';
  customer_name: string;
  actor_name: string;
  created_at: string;
  is_reversed: boolean;
}

export const metadata = { title: 'Manage rewards' };

export default async function LoyaltyManagerPage({
  params,
  searchParams,
}: PageProps<'/account/businesses/[id]/loyalty'>) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');
  const { data: membership } = await supabase
    .from('business_members')
    .select('role, businesses(id, name, slug)')
    .eq('business_id', id)
    .eq('user_id', authData.user.id)
    .eq('is_active', true)
    .maybeSingle();
  const joined = membership?.businesses;
  const business = Array.isArray(joined) ? joined[0] : joined;
  if (!business) notFound();
  const isOwner = membership?.role === 'owner';

  const [{ data: programData }, { data: memberData }, { data: transactionData }] =
    await Promise.all([
      supabase.from('loyalty_programs').select('*').eq('business_id', id).maybeSingle(),
      supabase.rpc('list_business_loyalty_members', { p_business_id: id }),
      supabase.rpc('list_business_loyalty_transactions', { p_business_id: id, p_limit: 50 }),
    ]);
  const program = programData as ProgramRow | null;
  const members = (memberData ?? []) as {
    membership_id: string;
    customer_name: string;
    progress_stamps: number;
    stamps_required: number;
    rewards_ready: number;
  }[];
  let staff: StaffRow[] = [];
  if (isOwner) {
    const { data } = await supabase.rpc('list_business_staff', { p_business_id: id });
    staff = (data ?? []) as StaffRow[];
  }
  const transactions = (transactionData ?? []) as TransactionRow[];

  return (
    <main className="page-shell narrow-shell">
      <nav className="topbar">
        <Link className="brand" href="/account">
          ← Account
        </Link>
        <div className="nav-actions">
          <Link href="/rewards">My rewards</Link>
          <Link href={`/b/${business.slug}`}>View page</Link>
        </div>
      </nav>
      <div className="page-heading compact-heading">
        <p className="eyebrow">Rewards</p>
        <h1>{business.name}</h1>
        <p>Run a secure visit-based loyalty program and serve customers from one screen.</p>
      </div>
      {typeof query.saved === 'string' && <p className="notice-success">{query.saved}</p>}
      {typeof query.error === 'string' && <p className="notice-error">{query.error}</p>}

      {isOwner && (
        <form action={saveLoyaltyProgramAction} className="panel form-stack">
          <input type="hidden" name="businessId" value={id} />
          <div className="section-heading">
            <div>
              <p className="eyebrow">Program setup</p>
              <h2>{program ? 'Edit rewards program' : 'Create rewards program'}</h2>
            </div>
            <label className="closed-toggle">
              <input name="isActive" type="checkbox" defaultChecked={program?.is_active ?? true} />{' '}
              Active
            </label>
          </div>
          <div className="form-row two-columns">
            <label>
              Program name <span className="required-marker">Required</span>
              <input name="name" defaultValue={program?.name ?? ''} maxLength={120} required />
            </label>
            <label>
              Visits required <span className="required-marker">Required</span>
              <select name="stampsRequired" defaultValue={program?.stamps_required ?? 8}>
                {Array.from({ length: 29 }, (_, index) => index + 2).map((count) => (
                  <option value={count} key={count}>
                    {count} visits
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Reward <span className="required-marker">Required</span>
            <input
              name="rewardDescription"
              defaultValue={program?.reward_description ?? ''}
              maxLength={500}
              placeholder="One free drink"
              required
            />
          </label>
          <label>
            Terms <span className="optional-marker">Optional</span>
            <textarea name="terms" defaultValue={program?.terms ?? ''} maxLength={2000} rows={3} />
          </label>
          <button className="button">Save rewards program</button>
        </form>
      )}

      <section className="panel loyalty-scan-panel">
        <p className="eyebrow">Staff counter</p>
        <h2>Scan a customer card</h2>
        {program?.is_active ? (
          <LoyaltyScanner />
        ) : (
          <p className="muted">Activate the program before processing rewards.</p>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Customers</p>
            <h2>Rewards members</h2>
          </div>
          <span>{members.length} active</span>
        </div>
        <div className="loyalty-member-list">
          {members.map((member) => (
            <div key={member.membership_id}>
              <strong>{member.customer_name}</strong>
              <span>
                {member.rewards_ready
                  ? `${member.rewards_ready} reward ready`
                  : `${member.progress_stamps}/${member.stamps_required} visits`}
              </span>
            </div>
          ))}
          {!members.length && <p className="muted">No customers have joined yet.</p>}
        </div>
      </section>

      {isOwner && (
        <section className="panel">
          <p className="eyebrow">Access</p>
          <h2>Staff members</h2>
          <form action={addStaffAction} className="inline-create-form loyalty-staff-form">
            <input type="hidden" name="businessId" value={id} />
            <label>
              Staff account email
              <input name="email" type="email" required />
            </label>
            <button className="button button-small">Add staff</button>
          </form>
          <div className="loyalty-member-list">
            {staff.map((member) => (
              <form action={removeStaffAction} key={member.member_id}>
                <input type="hidden" name="businessId" value={id} />
                <input type="hidden" name="memberId" value={member.member_id} />
                <strong>{member.display_name}</strong>
                <span>{member.is_active ? 'Active staff' : 'Access removed'}</span>
                {member.is_active && <button className="text-button">Remove access</button>}
              </form>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <p className="eyebrow">Audit trail</p>
        <h2>Recent transactions</h2>
        <div className="loyalty-transaction-list">
          {transactions.map((transaction) => (
            <div key={transaction.transaction_id}>
              <span className={`loyalty-transaction-icon loyalty-${transaction.transaction_type}`}>
                {transaction.transaction_type === 'stamp'
                  ? '+'
                  : transaction.transaction_type === 'redemption'
                    ? '✓'
                    : '↶'}
              </span>
              <div>
                <strong>{transaction.customer_name}</strong>
                <span>
                  {transaction.transaction_type} by {transaction.actor_name} ·{' '}
                  {new Date(transaction.created_at).toLocaleString()}
                </span>
              </div>
              {isOwner && transaction.transaction_type === 'stamp' && !transaction.is_reversed && (
                <form action={reverseStampAction}>
                  <input type="hidden" name="businessId" value={id} />
                  <input type="hidden" name="transactionId" value={transaction.transaction_id} />
                  <button className="text-button">Reverse stamp</button>
                </form>
              )}
            </div>
          ))}
          {!transactions.length && (
            <p className="muted">Transactions will appear after the first scan.</p>
          )}
        </div>
      </section>
    </main>
  );
}
