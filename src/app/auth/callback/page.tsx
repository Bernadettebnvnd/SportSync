'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useMatchiStore } from '@/lib/store';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setAuthenticatedUser } = useMatchiStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const processOAuthCallback = async () => {
      try {
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          let hashParams = new URLSearchParams();
          if (window.location.hash) {
            hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          }

          const oauthError = searchParams.get('error') || hashParams.get('error');
          const oauthErrorDesc =
            searchParams.get('error_description') ||
            hashParams.get('error_description') ||
            searchParams.get('error_code');

          if (oauthError) {
            const isUserCancelled =
              oauthError === 'access_denied' ||
              (oauthErrorDesc && oauthErrorDesc.toLowerCase().includes('cancel')) ||
              (oauthErrorDesc && oauthErrorDesc.toLowerCase().includes('denied'));

            const message = isUserCancelled
              ? 'Sign in with Google was cancelled. You can return to sign in or use email.'
              : (oauthErrorDesc || oauthError || 'Google authentication encountered an issue.');
            setErrorMessage(message);
            return;
          }
        }

        const supabase = getSupabaseClient();
        if (!supabase || !isSupabaseConfigured) {
          // If Supabase is unconfigured, redirect to home
          router.replace('/');
          return;
        }

        // Exchange code if PKCE code is in query params
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          const code = searchParams.get('code');
          if (code) {
            try {
              const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) {
                console.warn('[OAuth] Code exchange note:', exchangeError.message);
              }
            } catch (exErr) {
              console.warn('[OAuth] Code exchange exception:', exErr);
            }
          }
        }

        // Retrieve active session from Supabase client
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        const session = sessionData?.session;
        const authUser = session?.user;

        if (!authUser) {
          // Listen for onAuthStateChange in case session is being processed asynchronously
          const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
              if (isCancelled) return;
              if (newSession?.user) {
                authListener.subscription.unsubscribe();
                await handleUserSync(newSession.user);
              }
            }
          );

          // Timeout after 5 seconds if no session found
          setTimeout(() => {
            if (!isCancelled) {
              setErrorMessage('Google authentication session could not be established. Please try logging in again.');
            }
          }, 5000);
          return;
        }

        await handleUserSync(authUser);
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Authentication verification failed.';
          setErrorMessage(msg);
        }
      }
    };

    const handleUserSync = async (authUser: any) => {
      const meta = authUser.user_metadata || {};
      const res = await fetch('/api/auth/oauth-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authId: authUser.id,
          email: authUser.email,
          fullName: meta.full_name || meta.name || '',
          avatarUrl: meta.avatar_url || meta.picture || '',
          provider: 'google',
        }),
      });

      const syncResult = await res.json().catch(() => ({}));
      if (!res.ok || !syncResult.user) {
        throw new Error(syncResult.error || 'Failed to sync user profile.');
      }

      const isComplete = Boolean(syncResult.isComplete === true);

      // Update in-memory user store
      setAuthenticatedUser({
        ...syncResult.user,
        onboarding_completed: isComplete,
        has_completed_onboarding: isComplete,
      });

      if (typeof window !== 'undefined') {
        localStorage.removeItem('sportsync_logged_out');
        localStorage.setItem('sportsync_user_id', syncResult.user.id);
        localStorage.setItem('sportsync_user_email', syncResult.user.email);
        localStorage.setItem('sportsync_user_role', syncResult.user.role || 'player');
        localStorage.setItem('sportsync_user_name', syncResult.user.full_name);

        if (!isComplete) {
          localStorage.setItem('sportsync_pending_onboarding', 'true');
          localStorage.removeItem('matchi_onboarding_completed');
          localStorage.removeItem('sportsync_onboarding_completed');
          localStorage.removeItem('sportsync_user_profile');
          localStorage.removeItem('sportsync_user_city');
          localStorage.removeItem('sportsync_user_sports');
        } else {
          localStorage.removeItem('sportsync_pending_onboarding');
          localStorage.setItem('matchi_onboarding_completed', 'true');
          localStorage.setItem('sportsync_onboarding_completed', 'true');
          localStorage.setItem(
            'sportsync_user_profile',
            JSON.stringify({
              id: syncResult.user.id,
              name: syncResult.user.full_name,
              username: `@${syncResult.user.nickname || syncResult.user.email.split('@')[0]}`,
              role: syncResult.user.role || 'player',
              city: syncResult.user.city || 'Naga City',
              primarySport: syncResult.user.primary_sport || 'football',
              preferredSports: syncResult.user.preferred_sports || ['Football'],
              skillLevel: syncResult.user.skill_level || 'Intermediate',
              onboardingCompleted: true,
              isGuest: false,
            })
          );
        }
      }

      // STRICT ROUTING: If profile is missing or incomplete, MUST route to Profile Setup screen
      const isOwner = syncResult.user.role === 'venue_owner' || syncResult.user.role === 'organizer';
      if (!isComplete) {
        const target = isOwner ? '/onboarding?role=owner' : '/onboarding';
        router.replace(target);
      } else {
        const target = isOwner ? '/organizer' : '/';
        router.replace(target);
      }
    };

    processOAuthCallback();

    return () => {
      isCancelled = true;
    };
  }, [router, setAuthenticatedUser]);

  return (
    <div className="min-h-screen bg-[#0B0F0C] text-[#F4F7F0] flex flex-col items-center justify-center p-6 select-none">
      <div className="w-full max-w-sm p-8 rounded-3xl bg-[#141A15] border border-white/10 text-center flex flex-col items-center">
        {errorMessage ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">
              Authentication Issue
            </h3>
            <p className="text-xs text-[#A5B0A6] mb-6 leading-relaxed">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => router.replace('/')}
              className="w-full py-3 px-4 rounded-xl bg-[#C8FF2E] hover:bg-[#b5ec20] text-[#0B0F0C] font-bold text-xs transition-colors"
            >
              Return to Sign In
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 text-[#C8FF2E] flex items-center justify-center mb-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="font-display font-bold text-base text-white mb-1.5">
              Connecting with Google
            </h3>
            <p className="text-xs text-[#A5B0A6] leading-relaxed">
              Verifying your secure credentials and checking profile status...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
