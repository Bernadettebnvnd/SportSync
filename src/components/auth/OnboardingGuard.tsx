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
  const { currentUser, isLoading, isInitialized } = useMatchiStore();

  useEffect(() => {
    // 1. Do not evaluate or make redirect decisions while profile data is loading or uninitialized!
    if (isLoading || !isInitialized) return;

    // Bypass check on callback & API paths to allow OAuth handshake & password reset
    const isExemptPath =
      pathname.startsWith('/auth') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/reset-password') ||
      pathname === '/login' ||
      pathname === '/register';

    if (isExemptPath) return;

    // Never hijack a password recovery flow or redirect to onboarding
    if (
      typeof window !== 'undefined' &&
      (sessionStorage.getItem('sportsync_recovery_mode') === 'true' ||
        window.location.hash.includes('type=recovery') ||
        window.location.search.includes('type=recovery') ||
        window.location.search.includes('reset-password'))
    ) {
      return;
    }

    const isLoggedOut =
      typeof window !== 'undefined' &&
      localStorage.getItem('sportsync_logged_out') === 'true';

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

    const isLocalDevOrPreview =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.search.includes('preview=true') ||
        window.location.search.includes('demo=true'));

    // CASE 0: Unauthenticated or Logged-Out user
    // Strictly prevent access to profile setup or protected organizer/profile pages after logout
    if (!isAuthenticated) {
      if ((isOnboardingPath && !isLocalDevOrPreview) || isProtectedPath) {
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

    // 2. Persistent Completion Check (authoritative from Supabase or verified local store)
    const hasStoredCompletion = typeof window !== 'undefined' && (
      localStorage.getItem('matchi_onboarding_completed') === 'true' ||
      localStorage.getItem('sportsync_onboarding_completed') === 'true'
    );

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

    const isProfileComplete = hasExplicitCompletion || hasRequiredPlayerFields;

    // Clean up stale pending onboarding flag when genuinely complete
    if (isProfileComplete && typeof window !== 'undefined') {
      localStorage.removeItem('sportsync_pending_onboarding');
      localStorage.setItem('sportsync_onboarding_completed', 'true');
    }

    // CASE 1: Already completed user visiting /onboarding -> Redirect to Dashboard
    if (isProfileComplete && isOnboardingPath && !isLocalDevOrPreview) {
      const target = isOwner ? '/organizer' : '/';
      router.replace(target);
      return;
    }

    // CASE 2: Incomplete profile access preservation
    // Users who previously skipped or exited onboarding must NOT be trapped in an onboarding redirect loop.
    // Only redirect to /onboarding if user just registered in this session AND has not explicitly skipped.
    const hasSkipped = typeof window !== 'undefined' && localStorage.getItem('sportsync_skipped_onboarding') === 'true';
    const isJustRegistered = typeof window !== 'undefined' && sessionStorage.getItem('sportsync_just_registered') === 'true';

    if (!isProfileComplete && !hasSkipped && isJustRegistered && !isOnboardingPath) {
      const target = isOwner ? '/onboarding?role=owner' : '/onboarding';
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
    isInitialized,
    router,
  ]);

  return null;
}
