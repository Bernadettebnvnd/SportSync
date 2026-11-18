'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMatchiStore } from '@/lib/store';

/**
 * Strict Route Protection Guard for Onboarding & Profile Setup.
 *
 * Requirements enforced:
 * 1. Upon authentication (including Google SSO), if a user's database profile
 *    is missing or incomplete, they MUST be routed directly to the Profile Setup screen (/onboarding).
 * 2. Un-onboarded / incomplete users CANNOT access the main dashboard (/ or /organizer).
 * 3. Already onboarded users visiting /onboarding are redirected to their destination dashboard.
 */
export function OnboardingGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoading } = useMatchiStore();

  useEffect(() => {
    if (isLoading) return;

    // Bypass check on callback & API paths to allow OAuth handshake
    const isExemptPath =
      pathname.startsWith('/auth') ||
      pathname.startsWith('/api') ||
      pathname === '/login' ||
      pathname === '/register';

    if (isExemptPath) return;

    const isLoggedOut =
      typeof window !== 'undefined' &&
      localStorage.getItem('sportsync_logged_out') === 'true';

    const hasPendingOnboarding =
      !isLoggedOut &&
      typeof window !== 'undefined' &&
      localStorage.getItem('sportsync_pending_onboarding') === 'true';

    const storedUserId =
      !isLoggedOut && typeof window !== 'undefined'
        ? localStorage.getItem('sportsync_user_id') || localStorage.getItem('matchi_user_id')
        : null;

    const storedEmail =
      !isLoggedOut && typeof window !== 'undefined'
        ? localStorage.getItem('sportsync_user_email')
        : null;

    const isGuest =
      isLoggedOut ||
      !currentUser.id ||
      currentUser.id === '' ||
      currentUser.id === 'usr_guest_01' ||
      currentUser.full_name === 'Guest Player' ||
      !currentUser.email ||
      currentUser.email === '';

    const isAuthenticated = Boolean(
      !isGuest &&
      currentUser.id &&
      currentUser.email &&
      storedUserId &&
      storedEmail
    );

    const isOnboardingPath = pathname === '/onboarding';
    const isProtectedPath = pathname === '/organizer' || pathname === '/profile';

    // CASE 0: Unauthenticated or Logged-Out user
    // Strictly prevent access to profile setup or protected organizer/profile pages after logout
    if (!isAuthenticated) {
      if (isOnboardingPath || isProtectedPath) {
        router.replace('/');
      }
      return;
    }

    // Profile is ONLY complete if database / store explicitly marks it completed
    // and no pending onboarding flag is active.
    const isProfileComplete =
      !hasPendingOnboarding &&
      Boolean(
        currentUser.onboarding_completed === true ||
        currentUser.has_completed_onboarding === true
      );

    // CASE 1: Authenticated user with MISSING or INCOMPLETE profile attempting to access dashboard
    // STRICT ROUTING: Under no circumstances allow access to dashboard until setup is done.
    if (!isProfileComplete && !isOnboardingPath) {
      const storedRole = typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_role') : null;
      const isOwner =
        currentUser.role === 'venue_owner' ||
        currentUser.role === 'organizer' ||
        storedRole === 'venue_owner' ||
        storedRole === 'facility_owner';

      const target = isOwner ? '/onboarding?role=owner' : '/onboarding';
      router.replace(target);
      return;
    }

    // CASE 2: Already onboarded user attempting to re-visit /onboarding
    if (isProfileComplete && isOnboardingPath) {
      const storedRole = typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_role') : null;
      const isOwner =
        currentUser.role === 'venue_owner' ||
        currentUser.role === 'organizer' ||
        storedRole === 'venue_owner' ||
        storedRole === 'facility_owner';

      const target = isOwner ? '/organizer' : '/';
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
    currentUser.full_name,
    isLoading,
    router,
  ]);

  return null;
}
