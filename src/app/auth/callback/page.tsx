'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useMatchiStore } from '@/lib/store';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setAuthenticatedUser } = useMatchiStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let didSync = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let subscription: { unsubscribe: () => void } | null = null;

    const handleUserSync = async (session: Session) => {
      if (isCancelled || didSync) return;
      didSync = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Do not sync or route to onboarding if user is in password recovery mode
      if (typeof window !== 'undefined' && sessionStorage.getItem('sportsync_recovery_mode') === 'true') {
        router.replace('/reset-password');
        return;
      }

      if (!session?.access_token || !session?.user) {
        throw new Error('Verified Google authentication session is missing.');
      }

      let intendedRole: string | undefined;
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        intendedRole =
          searchParams.get('intended_role') ||
          searchParams.get('role') ||
          sessionStorage.getItem('sportsync_intended_role') ||
          localStorage.getItem('sportsync_intended_role') ||
          undefined;
        sessionStorage.removeItem('sportsync_intended_role');
        localStorage.removeItem('sportsync_intended_role');
      }

      const res = await fetch('/api/auth/oauth-sync', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ intendedRole }),
      });

      const syncResult = await res.json().catch(() => ({}));
      if (!res.ok || !syncResult.user) {
        throw new Error(syncResult.error || 'Failed to sync user profile.');
      }

      const isComplete = Boolean(syncResult.isComplete === true);
      const isOwner = syncResult.user.role === 'venue_owner' || syncResult.user.role === 'organizer';

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
        localStorage.setItem('sportsync_user_name', syncResult.user.full_name || '');
        localStorage.setItem('matchi_user_name', syncResult.user.full_name || '');

        if (!isComplete) {
          localStorage.setItem('sportsync_pending_onboarding', 'true');
          localStorage.removeItem('matchi_onboarding_completed');
          localStorage.removeItem('sportsync_onboarding_completed');
          localStorage.removeItem('sportsync_user_profile');
          localStorage.removeItem('sportsync_user_city');
          localStorage.removeItem('sportsync_user_sports');
        } else {
          sessionStorage.removeItem('sportsync_just_registered');
          localStorage.removeItem('sportsync_pending_onboarding');
          localStorage.setItem('matchi_onboarding_completed', 'true');
          localStorage.setItem('sportsync_onboarding_completed', 'true');
          if (syncResult.user.city) {
            localStorage.setItem('sportsync_user_city', syncResult.user.city);
          }

          const rawSports =
            Array.isArray(syncResult.user.preferred_sports) && syncResult.user.preferred_sports.length > 0
              ? syncResult.user.preferred_sports
              : (syncResult.user.primary_sport ? [syncResult.user.primary_sport] : ['football']);
          const formattedSports = rawSports.map(
            (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
          );
          const rawSkill = syncResult.user.skill_level || 'intermediate';
          const formattedSkill = rawSkill.charAt(0).toUpperCase() + rawSkill.slice(1);

          localStorage.setItem(
            'sportsync_user_profile',
            JSON.stringify({
              id: syncResult.user.id,
              name: syncResult.user.full_name,
              username: `@${syncResult.user.nickname || syncResult.user.email.split('@')[0]}`,
              role: syncResult.user.role || 'player',
              city: syncResult.user.city || 'Naga City',
              primarySport: syncResult.user.primary_sport || rawSports[0] || 'football',
              preferredSports: formattedSports,
              skillLevel: formattedSkill,
              onboardingCompleted: true,
              isGuest: false,
            })
          );
        }

        // If running in an OAuth popup window, signal the opener window and close
        if (typeof window !== 'undefined' && window.opener && window.opener !== window) {
          try {
            window.opener.postMessage(
              {
                type: 'GOOGLE_AUTH_SUCCESS',
                user: syncResult.user,
                isComplete,
                token: syncResult.token,
              },
              window.location.origin
            );
            window.close();
            return;
          } catch (e) {
            console.warn('[OAuth Callback] Opener postMessage error:', e);
          }
        }

        const target = !isComplete
          ? (isOwner ? '/onboarding?role=owner' : '/onboarding')
          : (isOwner ? '/organizer' : '/');
        window.location.replace(target);
      }
    };

    const processOAuthCallback = async () => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sportsync_logged_out');

          const searchParams = new URLSearchParams(window.location.search);
          let hashParams = new URLSearchParams();
          if (window.location.hash) {
            hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          }

          const type = searchParams.get('type') || hashParams.get('type');
          const next = searchParams.get('next');
          const isRecovery =
            type === 'recovery' ||
            next === '/reset-password' ||
            (window.location.hash && window.location.hash.includes('type=recovery'));

          if (isRecovery) {
            sessionStorage.setItem('sportsync_recovery_mode', 'true');
            const code = searchParams.get('code');
            const supabase = getSupabaseClient();
            if (code && supabase) {
              try {
                await supabase.auth.exchangeCodeForSession(code);
              } catch (exErr) {
                console.warn('[Recovery] Code exchange note:', exErr);
              }
            }
            router.replace('/reset-password' + (window.location.hash || ''));
            return;
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

            if (typeof window !== 'undefined' && window.opener && window.opener !== window) {
              try {
                window.opener.postMessage(
                  {
                    type: 'GOOGLE_AUTH_ERROR',
                    error: message,
                  },
                  window.location.origin
                );
                window.close();
                return;
              } catch (e) {
                console.warn('[OAuth Callback] Opener postMessage error:', e);
              }
            }

            setErrorMessage(message);
            return;
          }
        }

        const supabase = getSupabaseClient();
        if (!supabase || !isSupabaseConfigured) {
          router.replace('/');
          return;
        }

        // 1. Check whether detectSessionInUrl already established the session
        const { data: initialData, error: initialError } = await supabase.auth.getSession();
        if (initialError) {
          throw initialError;
        }

        let activeSession: Session | null = initialData?.session ?? null;

        // 2. If no session yet and PKCE code is in query params, exchange it explicitly
        if (!activeSession && typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          const code = searchParams.get('code');
          if (code) {
            try {
              const { data: exchangedData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangedData?.session) {
                activeSession = exchangedData.session;
              } else {
                if (exchangeError) {
                  console.warn('[OAuth] Code exchange note:', exchangeError.message);
                }
                const { data: retrySessionData } = await supabase.auth.getSession();
                activeSession = retrySessionData?.session ?? null;
              }
            } catch (exErr) {
              console.warn('[OAuth] Code exchange exception:', exErr);
              const { data: retrySessionData } = await supabase.auth.getSession();
              activeSession = retrySessionData?.session ?? null;
            }
          }
        }

        if (activeSession?.user) {
          await handleUserSync(activeSession);
          return;
        }

        // 3. Fallback: wait for asynchronous auth state completion
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (isCancelled) return;
            if (event === 'PASSWORD_RECOVERY') {
              authListener.subscription.unsubscribe();
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('sportsync_recovery_mode', 'true');
              }
              router.replace('/reset-password');
              return;
            }
            if (newSession?.user && newSession?.access_token) {
              authListener.subscription.unsubscribe();
              try {
                await handleUserSync(newSession);
              } catch (syncErr: unknown) {
                if (!isCancelled) {
                  const msg = syncErr instanceof Error ? syncErr.message : 'Authentication verification failed.';
                  setErrorMessage(msg);
                }
              }
            }
          }
        );
        subscription = authListener.subscription;

        timeoutId = setTimeout(() => {
          if (!isCancelled && !didSync) {
            subscription?.unsubscribe();
            setErrorMessage('Google authentication session could not be established. Please try logging in again.');
          }
        }, 5000);
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Authentication verification failed.';
          setErrorMessage(msg);
        }
      }
    };

    processOAuthCallback();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (subscription) subscription.unsubscribe();
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
            <h3 className="font-display font-bold text-lg text-[#F4F7F0] mb-2">
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
            <h3 className="font-display font-bold text-base text-[#F4F7F0] mb-1.5">
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
