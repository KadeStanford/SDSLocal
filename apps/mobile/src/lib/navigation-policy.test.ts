import { describe, expect, it } from 'vitest';

import { guestCanOpenPath, rootDestination } from './navigation-policy';

describe('guest customer navigation', () => {
  it('routes a signed-out app launch to Explore', () => {
    expect(rootDestination(false, 'customer')).toBe('/explore');
  });

  it('allows guests to open Explore and public business pages', () => {
    expect(guestCanOpenPath('/explore')).toBe(true);
    expect(guestCanOpenPath('/calendar')).toBe(true);
    expect(guestCanOpenPath('/b/demo-bayou-bloom')).toBe(true);
  });

  it('keeps owner and customer signed-in destinations intact', () => {
    expect(rootDestination(true, 'customer')).toBe('/explore');
    expect(rootDestination(true, 'business')).toBe('/businesses');
  });
});
