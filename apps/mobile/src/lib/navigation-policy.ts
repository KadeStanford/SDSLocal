export function rootDestination(signedIn: boolean, mode: 'customer' | 'business') {
  if (!signedIn) return '/explore' as const;
  return mode === 'business' ? ('/businesses' as const) : ('/explore' as const);
}

export function guestCanOpenPath(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/explore' ||
    pathname === '/calendar' ||
    pathname === '/order' ||
    pathname === '/orders' ||
    pathname === '/my-appointments' ||
    pathname === '/book-appointment' ||
    pathname === '/appointment' ||
    pathname === '/book-appointment' ||
    pathname === '/appointment' ||
    pathname === '/account' ||
    pathname === '/staff-invite' ||
    pathname === '/auth/callback' ||
    pathname === '/b' ||
    pathname.startsWith('/b/')
  );
}
