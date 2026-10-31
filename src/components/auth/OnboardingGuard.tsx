'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMatchiStore } from '@/lib/store';

/**
 * Route protection guard for onboarding state.
 * Any user who has already completed onboarding or is already registered
 * is redirected directly to their destination and never sees /onboarding.
 * Users creating a new account will see /onboarding until completed.
 */
export function OnboardingGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoading } = useMatchiStore();

  useEffect(() => {
    if (isLoading) return;

    const hasPendingOnboarding = typeof window !== 'undefined' && localStorage.getItem('sportsync_pending_onboarding') === 'true';
    if (hasPendingOnboarding) {
      // User is currently completing onboarding for their new account!
      return;
    }

    // Check localStorage status for completed onboarding
    const storedCompleted = typeof window !== 'undefined'
      ? (localStorage.getItem('matchi_onboarding_completed') === 'true' ||
         localStorage.getItem('sportsync_onboarding_completed') === 'true')
      : false;

    const isOnboarded = Boolean(
      currentUser.onboarding_completed === true ||
      currentUser.has_completed_onboarding === true ||
      (!currentUser.id && storedCompleted)
    );

    const isOnboardingPath = pathname === '/onboarding';

    // If user has already completed onboarding or is already registered, never let them see /onboarding
    if (isOnboarded && isOnboardingPath) {
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
