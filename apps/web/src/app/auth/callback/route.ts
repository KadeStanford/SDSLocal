import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { safeAuthNext } from '@/lib/auth-next';

function redirectOnCurrentOrigin(path: string) {
  // Next's server URL can use a different hostname from the incoming browser
  // request. A relative Location keeps the session on its cookie's origin.
  return new NextResponse(null, {
    status: 307,
    headers: { Location: path, 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeAuthNext(request.nextUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectOnCurrentOrigin(next);
  }

  return redirectOnCurrentOrigin('/auth?error=confirmation');
}
