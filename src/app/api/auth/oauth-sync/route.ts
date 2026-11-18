import { NextResponse } from 'next/server';
import { serverSyncOAuthUser } from '@/lib/auth/serverAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { authId, email, fullName, avatarUrl, mock } = body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email address is required for Google OAuth synchronization.' },
        { status: 400 }
      );
    }

    const syncResult = await serverSyncOAuthUser({
      authId: authId || `usr_google_${Date.now()}`,
      email: email.trim(),
      fullName: fullName?.trim(),
      avatarUrl: avatarUrl?.trim(),
      mock: Boolean(mock),
    });

    const response = NextResponse.json(
      {
        success: true,
        user: syncResult.user,
        isComplete: syncResult.isComplete,
        token: syncResult.token,
      },
      { status: 200 }
    );

    // Set HTTP session cookies for SSR and middleware compatibility
    response.cookies.set('sportsync-auth-token', syncResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    response.cookies.set('sb-access-token', syncResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to synchronize OAuth session.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
