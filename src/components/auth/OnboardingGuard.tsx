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
  const { currentUser, venues, isLoading, isInitialized } = useMatchiStore();

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

    const isExplicitPreview =
      typeof window !== 'undefined' &&
      (window.location.search.includes('preview=true') || window.location.search.includes('demo=true'));

    // CASE 0: Unauthenticated or Logged-Out user
    // Strictly prevent access to profile setup or protected organizer/profile pages after logout
    if (!isAuthenticated) {
      if ((isOnboardingPath && !isExplicitPreview) || isProtectedPath) {
        router.replace('/');
      }
      return;
    }

    const storedRole = typeof window !== 'undefined' ? (localStorage.getItem('sportsync_user_role') || localStorage.getItem('matchi_user_role')) : null;
    const isOwner =
      currentUser.role === 'venue_owner' ||
      currentUser.role === 'organizer' ||
      (currentUser.role as string) === 'facility_owner' ||
      (currentUser.role as string) === 'faculty' ||
      storedRole === 'venue_owner' ||
      storedRole === 'facility_owner' ||
      storedRole === 'organizer' ||
      storedRole === 'faculty';

    const isPending = typeof window !== 'undefined' && localStorage.getItem('sportsync_pending_onboarding') === 'true';

    // 2. Persistent Completion Check (authoritative from Supabase or verified local store)
    const hasStoredCompletion = typeof window !== 'undefined' && (
      localStorage.getItem('matchi_onboarding_completed') === 'true' ||
      localStorage.getItem('sportsync_onboarding_completed') === 'true'
    );

    const hasExplicitCompletion = Boolean(
      currentUser.onboarding_completed === true ||
      currentUser.has_completed_onboarding === true ||
      (!isPending && hasStoredCompletion)
    );

    const hasRequiredPlayerFields = !isOwner && Boolean(
      currentUser.full_name &&
      !['Guest', 'Guest Player', 'Player', 'SportSync Player', 'Google Player'].includes(currentUser.full_name.trim()) &&
      ((Array.isArray(currentUser.preferred_sports) && currentUser.preferred_sports.length > 0) || currentUser.primary_sport) &&
      (currentUser.city || currentUser.skill_level)
    );

    const activeOwnerIds = [currentUser.id, currentUser.auth_id, storedUserId].filter(
      (id): id is string => Boolean(id && id !== 'usr_guest_01')
    );
    const activeOwnerEmail = (currentUser.email || storedEmail || '').trim().toLowerCase();

    const hasOwnedVenueInStore = venues.some(
      (v) =>
        (v.owner_id && activeOwnerIds.includes(v.owner_id)) ||
        (activeOwnerEmail && v.description?.toLowerCase().includes(activeOwnerEmail))
    );

    let hasOwnedVenueInStorage = false;
    if (typeof window !== 'undefined' && (activeOwnerIds.length > 0 || activeOwnerEmail)) {
      hasOwnedVenueInStorage = activeOwnerIds.some((id) =>
        Boolean(localStorage.getItem(`sportsync_venue_id_${id}`))
      );
      if (!hasOwnedVenueInStorage) {
        try {
          const rawVenues = localStorage.getItem('sportsync_user_venues');
          if (rawVenues) {
            const parsedVenues = JSON.parse(rawVenues);
            if (Array.isArray(parsedVenues)) {
              hasOwnedVenueInStorage = parsedVenues.some(
                (v: { owner_id?: string; owner_email?: string; description?: string }) =>
                  (v?.owner_id && activeOwnerIds.includes(v.owner_id)) ||
                  (activeOwnerEmail &&
                    ((v?.owner_email && v.owner_email.toLowerCase() === activeOwnerEmail) ||
                      (v?.description && v.description.toLowerCase().includes(activeOwnerEmail))))
              );
            }
          }
        } catch {}
      }
    }

    const hasOwnedVenue = hasOwnedVenueInStore || hasOwnedVenueInStorage;

    const hasRequiredOwnerFields = isOwner && Boolean(hasExplicitCompletion || hasOwnedVenue);

    const isProfileComplete = hasExplicitCompletion || hasRequiredPlayerFields || hasRequiredOwnerFields;

    // Clean up stale pending onboarding flag when genuinely complete
    if (isProfileComplete && typeof window !== 'undefined') {
      localStorage.removeItem('sportsync_pending_onboarding');
      localStorage.setItem('sportsync_onboarding_completed', 'true');
      localStorage.setItem('matchi_onboarding_completed', 'true');
    }

    // FACULTY RESTRICTION & PORTAL GUARD:
    // Once logged in as Faculty, the user must remain in the Faculty Portal.
    // Faculty users must NEVER access the Player Dashboard (/).
    if (isOwner) {
      if (pathname === '/' || pathname === '/explore') {
        const target = isProfileComplete ? '/organizer' : '/onboarding?role=owner';
        router.replace(target);
        return;
      }
      if (pathname === '/organizer' && !isProfileComplete) {
        // If the user's role is stored as faculty/venue_owner and not explicitly pending, wait for hydration instead of prematurely ejecting to onboarding
        if (storedRole && !isPending && (!currentUser.id || currentUser.id === 'usr_guest_01')) {
          return;
        }
        router.replace('/onboarding?role=owner');
        return;
      }
      if (isOnboardingPath && isProfileComplete && !isExplicitPreview) {
        router.replace('/organizer');
        return;
      }
      return;
    }

    // PLAYER RESTRICTION & ONBOARDING GUARD:
    // Players must never access the Faculty Portal (/organizer).
    if (pathname.startsWith('/organizer')) {
      const target = isProfileComplete ? '/' : '/onboarding';
      router.replace(target);
      return;
    }

    // Incomplete Player accounts MUST go to Player Profile Setup first
    if (!isProfileComplete && !isOnboardingPath && !isExplicitPreview) {
      router.replace('/onboarding');
      return;
    }

    // Completed Player accounts visiting /onboarding go to Player Dashboard
    if (isProfileComplete && isOnboardingPath && !isExplicitPreview) {
      router.replace('/');
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
    venues.length,
    isLoading,
    isInitialized,
    router,
  ]);

  return null;
}
