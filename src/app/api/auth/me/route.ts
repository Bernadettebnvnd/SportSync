import { NextResponse } from 'next/server';
import { verifySessionToken, serverGetUser } from '@/lib/auth/serverAuth';

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/sportsync-auth-token=([^;]+)/) || cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = match ? match[1] : null;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ user: null });
    }

    const user = await serverGetUser(payload.userId);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error('Error fetching current session user:', err);
    return NextResponse.json({ user: null });
  }
}
