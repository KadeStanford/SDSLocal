import { supabase } from '@/lib/supabase';
import {
  createBlockRow,
  customerAlertEntityKey,
  filterBlockedCustomerAlerts,
} from '@/lib/customer-safety-core';

export * from '@/lib/customer-safety-core';

export async function loadBlockedBusinessIds(customerId: string) {
  const { data, error } = await supabase
    .from('blocked_businesses')
    .select('business_id')
    .eq('customer_id', customerId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.business_id));
}

export async function blockBusiness(customerId: string, businessId: string) {
  return supabase.from('blocked_businesses').upsert(createBlockRow(customerId, businessId));
}

export async function unblockBusiness(customerId: string, businessId: string) {
  return supabase
    .from('blocked_businesses')
    .delete()
    .eq('customer_id', customerId)
    .eq('business_id', businessId);
}

export async function removeBlockedCustomerAlerts<
  T extends { readonly entity_type: string; readonly entity_id: string },
>(customerId: string, alerts: readonly T[]) {
  const blockedIds = await loadBlockedBusinessIds(customerId);
  if (!blockedIds.size || !alerts.length) return [...alerts];

  const eventIds = alerts
    .filter((alert) => alert.entity_type === 'event')
    .map((alert) => alert.entity_id);
  const updateIds = alerts
    .filter((alert) => alert.entity_type === 'business_update')
    .map((alert) => alert.entity_id);
  const membershipIds = alerts
    .filter((alert) => alert.entity_type === 'loyalty_membership')
    .map((alert) => alert.entity_id);
  const [eventResult, updateResult, membershipResult] = await Promise.all([
    eventIds.length
      ? supabase.from('events').select('id, business_id').in('id', eventIds)
      : Promise.resolve({ data: [], error: null }),
    updateIds.length
      ? supabase.from('business_updates').select('id, business_id').in('id', updateIds)
      : Promise.resolve({ data: [], error: null }),
    membershipIds.length
      ? supabase.from('loyalty_memberships').select('id, business_id').in('id', membershipIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const firstError = eventResult.error ?? updateResult.error ?? membershipResult.error;
  if (firstError) throw firstError;

  const businessIdByEntity = new Map<string, string>();
  for (const row of eventResult.data ?? [])
    businessIdByEntity.set(customerAlertEntityKey('event', row.id), row.business_id);
  for (const row of updateResult.data ?? [])
    businessIdByEntity.set(customerAlertEntityKey('business_update', row.id), row.business_id);
  for (const row of membershipResult.data ?? [])
    businessIdByEntity.set(customerAlertEntityKey('loyalty_membership', row.id), row.business_id);
  return filterBlockedCustomerAlerts(alerts, blockedIds, businessIdByEntity);
}
