import { NextResponse } from 'next/server';
import { verifySessionToken, serverUpdateUserProfile } from '@/lib/auth/serverAuth';

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/sportsync-auth-token=([^;]+)/) || cookieHeader.match(/sb-access-token=([^;]+)/);
    const authHeader = request.headers.get('Authorization') || '';
    const token = (authHeader.replace(/^Bearer\s+/i, '') || (match ? match[1] : null))?.trim();

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const payload = verifySessionToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const updated = await serverUpdateUserProfile(payload.userId, body);

    return NextResponse.json({ success: true, user: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update profile';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
