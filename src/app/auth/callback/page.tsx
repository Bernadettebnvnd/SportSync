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
        const supabase = getSupabaseClient();
        if (!supabase || !isSupabaseConfigured) {
          // If Supabase is unconfigured, redirect to home
          router.replace('/');
          return;
        }

        // Wait for Supabase to resolve the session from URL hash or PKCE code
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

          // Timeout after 6 seconds if no session found
          setTimeout(() => {
            if (!isCancelled) {
              setErrorMessage('Authentication session could not be established. Please try logging in again.');
            }
          }, 6000);
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
        localStorage.setItem('sportsync_user_id', syncResult.user.id);
        localStorage.setItem('sportsync_user_email', syncResult.user.email);
        localStorage.setItem('sportsync_user_role', syncResult.user.role || 'player');
        localStorage.setItem('sportsync_user_name', syncResult.user.full_name);

        if (!isComplete) {
          localStorage.setItem('sportsync_pending_onboarding', 'true');
          localStorage.removeItem('matchi_onboarding_completed');
          localStorage.removeItem('sportsync_onboarding_completed');
          localStorage.removeItem('sportsync_user_profile');
        } else {
          localStorage.removeItem('sportsync_pending_onboarding');
          localStorage.setItem('matchi_onboarding_completed', 'true');
          localStorage.setItem('sportsync_onboarding_completed', 'true');
        }
      }

      // STRICT ROUTING: If profile is missing or incomplete, MUST route to Profile Setup screen
      if (!isComplete) {
        const target = syncResult.user.role === 'venue_owner' ? '/onboarding?role=owner' : '/onboarding';
        router.replace(target);
      } else {
        const target = syncResult.user.role === 'venue_owner' ? '/organizer' : '/';
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
