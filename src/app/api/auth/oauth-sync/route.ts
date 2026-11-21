import { NextResponse } from 'next/server';
import { createServerClient, createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { serverSyncOAuthUser } from '@/lib/auth/serverAuth';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const accessToken = match?.[1]?.trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authorization Bearer token is required for OAuth synchronization.' },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Supabase authentication is not configured.' },
        { status: 500 }
      );
    }

    const supabase = createServerClient(accessToken) || createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Authentication client unavailable.' },
        { status: 500 }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication session.' },
        { status: 401 }
      );
    }

    const verifiedUser = authData.user;
    if (!verifiedUser.email) {
      return NextResponse.json(
        { error: 'Email address is required for Google OAuth synchronization.' },
        { status: 400 }
      );
    }

    const meta = verifiedUser.user_metadata || {};
    const syncResult = await serverSyncOAuthUser({
      authId: verifiedUser.id,
      email: verifiedUser.email,
      fullName: (meta.full_name || meta.name || '').trim() || undefined,
      avatarUrl: (meta.avatar_url || meta.picture || '').trim() || undefined,
      provider: verifiedUser.app_metadata?.provider || 'google',
      accessToken,
      authMetadata: meta,
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
