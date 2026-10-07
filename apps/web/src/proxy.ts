import { NextResponse,type NextRequest } from 'next/server';
import { demoConfigured } from '@/lib/admin/demo-guard';

import { updateSession } from '@/lib/supabase/update-session';

export async function proxy(request: NextRequest) {
  if(process.env.PARISH_ADMIN_LOGIN_ONLY==='1'&&!['/admin','/admin/login','/admin/demo','/auth/callback'].includes(request.nextUrl.pathname))
    return NextResponse.redirect(new URL('/admin/login',request.url),{status:307,headers:{'Cache-Control':'no-store'}});
  if(demoConfigured()&&request.nextUrl.pathname.startsWith('/admin')) return NextResponse.next({request});
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
