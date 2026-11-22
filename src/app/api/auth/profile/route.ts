import { NextResponse } from 'next/server';
import { verifySessionToken, serverUpdateUserProfile } from '@/lib/auth/serverAuth';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match =
      cookieHeader.match(/sportsync-auth-token=([^;]+)/) ||
      cookieHeader.match(/sb-access-token=([^;]+)/);
    const authHeader = request.headers.get('Authorization') || '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const cookieToken = match ? decodeURIComponent(match[1]).trim() : '';
    const token = bearerToken || cookieToken;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let resolvedUserId: string | null = null;
    const payload = verifySessionToken(token);
    if (payload?.userId) {
      resolvedUserId = payload.userId;
    } else {
      const supa = createServerClient(token) || createAdminClient();
      if (supa) {
        try {
          const { data: supaAuth, error: authErr } = await supa.auth.getUser(token);
          if (!authErr && supaAuth?.user?.id) {
            resolvedUserId = supaAuth.user.id;
          }
        } catch {}
      }
    }

    if (!resolvedUserId) {
      return NextResponse.json({ error: 'Invalid or expired authentication session' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (body?.userId && body.userId !== resolvedUserId) {
      return NextResponse.json({ error: 'Forbidden: Cannot modify another user profile' }, { status: 403 });
    }

    const updated = await serverUpdateUserProfile(resolvedUserId, body);

    return NextResponse.json({ success: true, user: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update profile';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
