import { NextResponse } from 'next/server';
import { createServerClient, createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { serverSyncOAuthUser } from '@/lib/auth/serverAuth';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const accessToken = match?.[1]?.trim();

    const body = await request.json().catch(() => ({}));
    const { authId, email, fullName, avatarUrl, provider } = body;

    let targetAuthId = authId;
    let targetEmail = email;
    let targetFullName = fullName;
    let targetAvatarUrl = avatarUrl;
    let targetProvider = provider || 'google';
    let targetMeta: Record<string, unknown> | null = null;

    if (accessToken && isSupabaseConfigured) {
      const supabase = createServerClient(accessToken) || createAdminClient();
      if (supabase) {
        const { data: authData } = await supabase.auth.getUser(accessToken);
        if (authData?.user) {
          const verifiedUser = authData.user;
          targetAuthId = verifiedUser.id;
          targetEmail = verifiedUser.email || targetEmail;
          targetMeta = (verifiedUser.user_metadata || {}) as Record<string, unknown>;
          targetFullName = (targetMeta.full_name || targetMeta.name || targetFullName || '').toString().trim() || undefined;
          targetAvatarUrl = (targetMeta.avatar_url || targetMeta.picture || targetAvatarUrl || '').toString().trim() || undefined;
          targetProvider = verifiedUser.app_metadata?.provider || targetProvider;
        }
      }
    }

    if (!targetEmail || typeof targetEmail !== 'string' || !targetEmail.trim()) {
      return NextResponse.json(
        { error: 'Email address is required for Google OAuth synchronization.' },
        { status: 400 }
      );
    }

    const syncResult = await serverSyncOAuthUser({
      authId: targetAuthId || `usr_${Date.now()}`,
      email: targetEmail.trim(),
      fullName: targetFullName?.trim() || undefined,
      avatarUrl: targetAvatarUrl?.trim() || undefined,
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

