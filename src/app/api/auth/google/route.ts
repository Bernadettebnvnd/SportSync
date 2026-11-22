import { NextResponse } from 'next/server';
import { cleanEnvString, isSupabaseConfigured } from '@/lib/supabase/server';
import { serverSyncGoogleIdTokenUser } from '@/lib/auth/serverAuth';

/**
 * GET /api/auth/google
 *
 * Verifies Google OAuth availability before redirecting:
 * 1. If NEXT_PUBLIC_GOOGLE_CLIENT_ID is configured, returns official Google Accounts OAuth URL.
 * 2. If Supabase is configured, tests Supabase /auth/v1/authorize to verify if Google Provider is enabled.
 *    If enabled (returns 302/303), returns the redirect target URL (accounts.google.com).
 *    If disabled (returns 400 'Unsupported provider'), catches it gracefully and returns setup guidance
 *    so the frontend never dumps raw Supabase JSON on the user!
 */
export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const intendedRole = searchParams.get('intended_role') || searchParams.get('role') || '';
    const callbackUrl =
      searchParams.get('callback_url') ||
      `${origin}/auth/callback${intendedRole ? `?intended_role=${encodeURIComponent(intendedRole)}` : ''}`;

    const googleClientId = cleanEnvString(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
    );

    // 1. If direct Google Client ID is configured, return official Google OAuth URL
    if (googleClientId && googleClientId !== 'placeholder') {
      const directGoogleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        googleClientId
      )}&redirect_uri=${encodeURIComponent(
        callbackUrl
      )}&response_type=code&scope=${encodeURIComponent(
        'openid email profile'
      )}&access_type=offline&prompt=consent`;

      return NextResponse.json({
        ok: true,
        strategy: 'direct_google',
        clientId: googleClientId,
        authUrl: directGoogleOAuthUrl,
      });
    }

    // 2. If Supabase is configured, probe Supabase /auth/v1/authorize
    const supabaseUrl = cleanEnvString(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (isSupabaseConfigured && supabaseUrl) {
      const supabaseAuthEndpoint = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
        callbackUrl
      )}&access_type=offline&prompt=consent`;

      try {
        const probeRes = await fetch(supabaseAuthEndpoint, {
          method: 'GET',
          redirect: 'manual',
        });

        // Supabase returns 302/303 redirect directly to accounts.google.com when Google provider is enabled!
        if (probeRes.status >= 300 && probeRes.status < 400) {
          const location = probeRes.headers.get('location') || supabaseAuthEndpoint;
          return NextResponse.json({
            ok: true,
            strategy: 'supabase_oauth',
            authUrl: location,
          });
        }

        // Supabase returned 400 or other error (e.g. Unsupported provider: provider is not enabled)
        const errJson = await probeRes.json().catch(() => ({}));
        const isProviderNotEnabled =
          errJson.msg?.includes('provider is not enabled') ||
          errJson.error_description?.includes('provider is not enabled') ||
          errJson.error === 'validation_failed';

        // Extract Supabase project ref for direct dashboard link
        const projectMatch = supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/);
        const projectRef = projectMatch ? projectMatch[1] : '';
        const dashboardUrl = projectRef
          ? `https://supabase.com/dashboard/project/${projectRef}/auth/providers`
          : 'https://supabase.com/dashboard';

        return NextResponse.json({
          ok: false,
          code: isProviderNotEnabled ? 'PROVIDER_NOT_ENABLED' : 'AUTH_PROBE_FAILED',
          error:
            errJson.msg ||
            errJson.error_description ||
            'Google Sign-In is not enabled yet in your Supabase project dashboard.',
          supabaseUrl,
          dashboardUrl,
          callbackUrl: `${supabaseUrl}/auth/v1/callback`,
          instructions: [
            '1. Open Supabase Dashboard > Authentication > Providers > Google',
            '2. Turn ON "Enable Sign in with Google"',
            `3. In Google Cloud Console, add Authorized Redirect URI: ${supabaseUrl}/auth/v1/callback`,
            '4. Paste your Google Client ID and Google Client Secret into Supabase and click Save',
          ],
        });
      } catch (probeErr: unknown) {
        // Fallback: Return standard Supabase authorize endpoint if probe couldn't reach
        return NextResponse.json({
          ok: true,
          strategy: 'supabase_oauth',
          authUrl: supabaseAuthEndpoint,
        });
      }
    }

    return NextResponse.json({
      ok: false,
      code: 'AUTH_NOT_CONFIGURED',
      error: 'Google Sign-In is not configured. Please configure Supabase or NEXT_PUBLIC_GOOGLE_CLIENT_ID.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to initialize Google authentication.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/auth/google
 *
 * Direct Google Identity Services (GIS) / ID Token handler.
 * Verifies real Google credentials against Google's public tokeninfo endpoint,
 * establishes a verified session, and creates/syncs user in the database.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const credential = body.credential || body.idToken || body.token;
    const intendedRole = typeof body.intendedRole === 'string' ? body.intendedRole.trim() : undefined;

    if (!credential || typeof credential !== 'string') {
      return NextResponse.json(
        { error: 'Missing Google credential or ID token.' },
        { status: 400 }
      );
    }

    const syncResult = await serverSyncGoogleIdTokenUser({
      googleIdToken: credential.trim(),
      intendedRole,
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

    // Set secure HTTP session cookies
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
    const message = err instanceof Error ? err.message : 'Google authentication verification failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
