'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMatchiStore } from '@/lib/store';

/**
 * Route protection guard for onboarding state.
 * Any user who has an authenticated account or has completed onboarding
 * is redirected directly to their destination and never sees /onboarding.
 */
export function OnboardingGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoading } = useMatchiStore();

  useEffect(() => {
    if (isLoading) return;

    // Check localStorage status for authenticated or returning users
    const storedCompleted = typeof window !== 'undefined'
      ? (localStorage.getItem('matchi_onboarding_completed') === 'true' ||
         localStorage.getItem('sportsync_onboarding_completed') === 'true' ||
         Boolean(localStorage.getItem('sportsync_user_email')))
      : false;

    const isAuthenticated = Boolean(currentUser.id && currentUser.email);
    const isOnboarded = Boolean(
      isAuthenticated ||
      currentUser.onboarding_completed ||
      currentUser.has_completed_onboarding ||
      storedCompleted
    );

    const isOnboardingPath = pathname === '/onboarding';
    const isApiPath = pathname.startsWith('/api');

    // If user already has an account or completed onboarding, never let them see /onboarding
    if ((isAuthenticated || isOnboarded) && isOnboardingPath) {
      const target = currentUser.role === 'venue_owner' || currentUser.role === 'organizer' ? '/organizer' : '/';
      router.replace(target);
      return;
    }
  }, [
    pathname,
    currentUser.id,
    currentUser.email,
    currentUser.onboarding_completed,
    currentUser.has_completed_onboarding,
    currentUser.role,
    currentUser.active_mode,
    isLoading,
    router,
  ]);

  return null;
}
