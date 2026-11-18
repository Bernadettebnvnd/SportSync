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
      (!currentUser.id && !storedUserId) ||
      currentUser.id === 'usr_guest_01' ||
      (!currentUser.email && !storedEmail);

    const hasAuthIdentity = Boolean(
      (currentUser.id && currentUser.id !== 'usr_guest_01') ||
      storedUserId ||
      (currentUser.email && currentUser.email !== '') ||
      storedEmail
    );

    const isAuthenticated = !isGuest && hasAuthIdentity;

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

    const storedRole = typeof window !== 'undefined' ? (localStorage.getItem('sportsync_user_role') || localStorage.getItem('matchi_user_role')) : null;
    const isOwner =
      currentUser.role === 'venue_owner' ||
      currentUser.role === 'organizer' ||
      storedRole === 'venue_owner' ||
      storedRole === 'facility_owner';

    const isPending = hasPendingOnboarding || (typeof window !== 'undefined' && localStorage.getItem('sportsync_pending_onboarding') === 'true');

    const hasStoredCompletion = typeof window !== 'undefined' && (
      localStorage.getItem('matchi_onboarding_completed') === 'true' ||
      localStorage.getItem('sportsync_onboarding_completed') === 'true'
    );

    // If pending onboarding or explicitly incomplete, user cannot be considered complete
    let isProfileComplete = false;

    if (!isPending) {
      const hasExplicitCompletion = Boolean(
        currentUser.onboarding_completed === true ||
        currentUser.has_completed_onboarding === true ||
        hasStoredCompletion
      );

      const hasRequiredPlayerFields = !isOwner && Boolean(
        currentUser.full_name &&
        !['Guest', 'Guest Player', 'Player', 'SportSync Player', 'Google Player'].includes(currentUser.full_name.trim()) &&
        Array.isArray(currentUser.preferred_sports) &&
        currentUser.preferred_sports.length > 0 &&
        (currentUser.city || currentUser.skill_level)
      );

      isProfileComplete = hasExplicitCompletion || hasRequiredPlayerFields;
    }

    // Clean up stale pending onboarding flag only when genuinely complete
    if (isProfileComplete && isPending && typeof window !== 'undefined') {
      localStorage.removeItem('sportsync_pending_onboarding');
    }

    // CASE 1: Authenticated user with MISSING or INCOMPLETE profile attempting to access dashboard
    // STRICT ROUTING: Under no circumstances allow access to dashboard until setup is done.
    if (!isProfileComplete && !isOnboardingPath) {
      const target = isOwner ? '/onboarding?role=owner' : '/onboarding';
      router.replace(target);
      return;
    }

    // CASE 2: Already onboarded user attempting to re-visit /onboarding
    if (isProfileComplete && !isPending && isOnboardingPath) {
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
