import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Route protection middleware for SportSync.
 * Prevents unauthorized users from accessing facility management and ops routes.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /organizer routes
  if (pathname.startsWith('/organizer')) {
    // Check for Supabase session auth cookies
    // Supabase stores tokens in cookies like sb-<project-ref>-auth-token or sb-access-token
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(
      (c) => c.name.startsWith('sb-') && (c.name.endsWith('-auth-token') || c.name.includes('access-token') || c.name.includes('auth'))
    );

    // If no auth cookie is present, redirect to home with signin modal trigger
    if (!hasAuthCookie) {
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('auth', 'signin');
      redirectUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/organizer/:path*'],
};
