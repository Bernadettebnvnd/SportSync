import { NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { serverSyncOAuthUser } from '@/lib/auth/serverAuth';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const error = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDesc || '')}`
    );
  }

  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code && isSupabaseConfigured) {
    const supabase = createServerClient();
    if (supabase) {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        return NextResponse.redirect(
          `${origin}/auth/callback?error=${encodeURIComponent(exchangeError.message)}`
        );
      }
      if (data?.user) {
        const authUser = data.user;
        const meta = authUser.user_metadata || {};

        const syncResult = await serverSyncOAuthUser({
          authId: authUser.id,
          email: authUser.email || '',
          fullName: meta.full_name || meta.name || '',
          avatarUrl: meta.avatar_url || meta.picture || '',
          provider: 'google',
        });

        // Strict Routing & Guard: If user's profile is missing or incomplete,
        // they MUST be routed directly to the Profile Setup screen (/onboarding).
        const targetPath = !syncResult.isComplete
          ? '/onboarding'
          : (next || (syncResult.user.role === 'venue_owner' ? '/organizer' : '/'));

        const response = NextResponse.redirect(`${origin}${targetPath}`);

        // Persist session tokens in HTTP cookies
        response.cookies.set('sportsync-auth-token', syncResult.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        });

        response.cookies.set('sb-access-token', syncResult.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        });

        return response;
      }
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
