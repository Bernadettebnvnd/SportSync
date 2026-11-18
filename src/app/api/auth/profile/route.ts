import { NextResponse } from 'next/server';
import { verifySessionToken, serverUpdateUserProfile } from '@/lib/auth/serverAuth';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/sportsync-auth-token=([^;]+)/) || cookieHeader.match(/sb-access-token=([^;]+)/);
    const authHeader = request.headers.get('Authorization') || '';
    const token = (authHeader.replace(/^Bearer\s+/i, '') || (match ? match[1] : null))?.trim();

    const body = await request.json().catch(() => ({}));
    let resolvedUserId: string | null = null;

    if (token) {
      const payload = verifySessionToken(token);
      if (payload?.userId) {
        resolvedUserId = payload.userId;
      } else {
        const admin = createAdminClient() || createServerClient();
        if (admin) {
          try {
            const { data: supaAuth } = await admin.auth.getUser(token);
            if (supaAuth?.user?.id) {
              resolvedUserId = supaAuth.user.id;
            }
          } catch {}
        }
      }
    }

    if (!resolvedUserId && body?.userId) {
      resolvedUserId = body.userId;
    }

    if (!resolvedUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const updated = await serverUpdateUserProfile(resolvedUserId, body);

    return NextResponse.json({ success: true, user: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update profile';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
