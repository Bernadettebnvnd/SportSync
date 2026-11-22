import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, serverGetUser } from '@/lib/auth/serverAuth';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

const OWNER_ROLES = new Set(['venue_owner', 'organizer', 'admin', 'facility_owner', 'faculty']);

function extractSupabaseCookieToken(request: NextRequest): string | null {
  const direct = request.cookies.get('sb-access-token')?.value;
  if (direct) return direct;

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') && (cookie.name.endsWith('-auth-token') || cookie.name.includes('access-token'))) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookie.value));
        if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0]) {
          return parsed[0];
        }
        if (parsed && typeof parsed.access_token === 'string' && parsed.access_token) {
          return parsed.access_token;
        }
      } catch {
        if (cookie.value && cookie.value.length > 20) {
          return cookie.value;
        }
      }
    }
  }
  return null;
}

/**
 * Route protection middleware for SportSync.
 * Verifies session token validity and owner role before allowing access to /organizer.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/organizer')) {
    const redirectToSignIn = () => {
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('auth', 'signin');
      redirectUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(redirectUrl);
    };

    const customToken = request.cookies.get('sportsync-auth-token')?.value;
    const sbToken = extractSupabaseCookieToken(request);

    if (!customToken && !sbToken) {
      return redirectToSignIn();
    }

    // 1. Verify signed SportSync HMAC session token if present
    if (customToken) {
      const verified = verifySessionToken(customToken);
      if (verified) {
        if (OWNER_ROLES.has(String(verified.role))) {
          return NextResponse.next();
        }
        // Double-check database profile in case user recently upgraded to owner
        const dbUser = await serverGetUser(verified.userId);
        if (dbUser && OWNER_ROLES.has(String(dbUser.role))) {
          return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    // 2. Verify Supabase token cookie if present
    if (sbToken) {
      const verifiedHmac = verifySessionToken(sbToken);
      if (verifiedHmac) {
        if (OWNER_ROLES.has(String(verifiedHmac.role))) {
          return NextResponse.next();
        }
        const dbUser = await serverGetUser(verifiedHmac.userId);
        if (dbUser && OWNER_ROLES.has(String(dbUser.role))) {
          return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/', request.url));
      }

      if (isSupabaseConfigured) {
        const sb = createServerClient(sbToken);
        if (sb) {
          const { data, error } = await sb.auth.getUser(sbToken);
          if (!error && data?.user?.id) {
            const metaRole = String(data.user.user_metadata?.role || '');
            if (OWNER_ROLES.has(metaRole)) {
              return NextResponse.next();
            }
            const dbUser = await serverGetUser(data.user.id);
            if (dbUser && OWNER_ROLES.has(String(dbUser.role))) {
              return NextResponse.next();
            }
            return NextResponse.redirect(new URL('/', request.url));
          }
        }
      }
    }

    return redirectToSignIn();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/organizer/:path*'],
};
