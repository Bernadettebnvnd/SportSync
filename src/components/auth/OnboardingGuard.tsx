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
    const isPrototypePath = pathname.startsWith('/prototype');
    const isPublicPreviewPath = pathname === '/' || pathname === '/explore';

    // If user has an authenticated account but has not completed onboarding, strictly enforce /onboarding
    const isAuthenticated = Boolean(currentUser.id && currentUser.email);
    if (isAuthenticated && !isOnboarded && !isOnboardingPath && !isApiPath) {
      router.replace('/onboarding');
      return;
    }

    // For unauthenticated users, protect private player routes (/bookings, /profile)
    const isPrivatePlayerRoute = pathname.startsWith('/bookings') || pathname.startsWith('/profile');
    if (!isOnboarded && isPrivatePlayerRoute) {
      router.replace('/onboarding');
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
