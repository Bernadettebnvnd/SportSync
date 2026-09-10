'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMatchiStore } from '@/lib/store';

/**
 * Route protection guard for onboarding state.
 * Ensures first-time users or users who have NOT completed onboarding
 * are strictly routed to /onboarding.
 * Users who have completed onboarding go directly to the main dashboard.
 */
export function OnboardingGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoading } = useMatchiStore();

  useEffect(() => {
    if (isLoading) return;

    // Check localStorage status for first-time / guest users
    const storedCompleted = typeof window !== 'undefined'
      ? localStorage.getItem('matchi_onboarding_completed') === 'true'
      : false;

    const isOnboarded = Boolean(
      currentUser.onboarding_completed ||
      currentUser.has_completed_onboarding ||
      storedCompleted
    );

    const isOnboardingPath = pathname === '/onboarding';
    const isApiPath = pathname.startsWith('/api');

    // 1. Any user who has NOT completed onboarding must be routed to /onboarding
    if (!isOnboarded && !isOnboardingPath && !isApiPath) {
      router.replace('/onboarding');
      return;
    }
  }, [
    pathname,
    currentUser.onboarding_completed,
    currentUser.has_completed_onboarding,
    currentUser.role,
    currentUser.active_mode,
    isLoading,
    router,
  ]);

  return null;
}
