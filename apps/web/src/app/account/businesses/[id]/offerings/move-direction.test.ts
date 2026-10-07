import { beforeEach, expect, it, vi } from 'vitest';
import { moveOfferingItemInDirection, moveOfferingSectionInDirection } from './actions';

const h = vi.hoisted(() => ({ client: vi.fn(), rpc: vi.fn(), user: true, owner: true }));
vi.mock('@/lib/supabase/server', () => ({ createClient: h.client }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error('Redirect:' + path); } }));
const businessId = '10000000-0000-4000-8000-000000000001';
beforeEach(() => {
  vi.clearAllMocks(); h.user = true; h.owner = true;
  h.rpc.mockResolvedValue({error:null});
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq']) chain[method] = () => chain;
  chain.maybeSingle = async () => ({data:h.owner ? {id:'owner'} : null});
  h.client.mockResolvedValue({auth:{getUser:async () => ({data:{user:h.user ? {id:'fixture-user'} : null}})},from:()=>chain,rpc:h.rpc});
});
it.each(['up','down'] as const)('preserves the bound %s item direction and identifiers', async direction => {
  const data = new FormData(); data.set('businessId',businessId); data.set('itemId','fixture-item'); data.set('direction',direction==='up'?'down':'up');
  await expect(moveOfferingItemInDirection(direction,data)).rejects.toThrow('Redirect:');
  expect(h.rpc).toHaveBeenCalledExactlyOnceWith('move_offering_item',{p_business_id:businessId,p_item_id:'fixture-item',p_direction:direction});
});
it.each(['up','down'] as const)('preserves the bound %s section direction', async direction => {
  const data = new FormData(); data.set('businessId',businessId); data.set('sectionId','fixture-section');
  await expect(moveOfferingSectionInDirection(direction,data)).rejects.toThrow('Redirect:');
  expect(h.rpc).toHaveBeenCalledExactlyOnceWith('move_offering_section',{p_business_id:businessId,p_section_id:'fixture-section',p_direction:direction});
});
it.each(['signed-out','non-owner'])('retains %s access checks before moving', async state => {
  h.user = state!=='signed-out'; h.owner = false;
  const data = new FormData(); data.set('businessId',businessId); data.set('itemId','fixture-item');
  await expect(moveOfferingItemInDirection('up',data)).rejects.toThrow('Redirect:');
  expect(h.rpc).not.toHaveBeenCalled();
});
it('rejects a forged direction without issuing a database action',async()=>{
  await expect(moveOfferingItemInDirection('other' as 'up',new FormData())).rejects.toThrow('valid move direction');
  expect(h.rpc).not.toHaveBeenCalled();
});
