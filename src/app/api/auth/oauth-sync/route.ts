import { NextResponse } from 'next/server';
import { createServerClient, createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { serverSyncOAuthUser } from '@/lib/auth/serverAuth';
import { validateRealEmailWithMx } from '@/lib/validation/emailValidator';

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Supabase is not configured on the server.' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    let accessToken = match?.[1]?.trim();

    if (!accessToken) {
      const cookieHeader = request.headers.get('cookie') || '';
      const cookieMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
      if (cookieMatch?.[1]) {
        accessToken = decodeURIComponent(cookieMatch[1]).trim();
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required: Missing Bearer access token.' },
        { status: 401 }
      );
    }

    const supabase = createServerClient(accessToken) || createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Authentication service is unavailable.' },
        { status: 500 }
      );
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser(accessToken);
    if (authErr || !authData?.user || !authData.user.id || !authData.user.email) {
      return NextResponse.json(
        { error: 'Invalid or expired OAuth access token.' },
        { status: 401 }
      );
    }

    const verifiedUser = authData.user;
    const verifiedEmail = (verifiedUser.email || '').trim().toLowerCase();

    const emailValidation = await validateRealEmailWithMx(verifiedEmail);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error || 'OAuth account email address is invalid or restricted.' },
        { status: 400 }
      );
    }

    const targetMeta = (verifiedUser.user_metadata || {}) as Record<string, unknown>;
    const targetFullName =
      (targetMeta.full_name || targetMeta.name || '').toString().trim() || undefined;
    const targetAvatarUrl =
      (targetMeta.avatar_url || targetMeta.picture || '').toString().trim() || undefined;
    const targetProvider = verifiedUser.app_metadata?.provider || 'google';

    const syncResult = await serverSyncOAuthUser({
      authId: verifiedUser.id,
      email: verifiedEmail,
      fullName: targetFullName,
      avatarUrl: targetAvatarUrl,
      provider: targetProvider,
      accessToken,
      authMetadata: targetMeta,
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
    const status = msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid or expired') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
