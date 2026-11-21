import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BottomNav, NavTabId } from './design-system/components/BottomNav';
import { QuickActionSheet } from './design-system/components/QuickActionSheet';
import { Toast } from './design-system/components/SearchBar';
import { PhoneFrame } from './design-system/components/PhoneFrame';

// All 28+ Screen Components
import { LandingPage } from './components/landing/LandingPage';
import { SplashScreen } from './screens/onboarding/SplashScreen';
import { CarouselScreen } from './screens/onboarding/CarouselScreen';
import { AuthScreen, AuthRole } from './screens/onboarding/AuthScreen';
import { ResetPasswordScreen } from './screens/onboarding/ResetPasswordScreen';
import { PersonalizationScreen } from './screens/onboarding/PersonalizationScreen';
import { FacultySetupScreen } from './screens/onboarding/FacultySetupScreen';
import { DiscoverScreen } from './screens/home/DiscoverScreen';
import { LiveScoresHubScreen } from './screens/scores/LiveScoresHubScreen';
import { MatchCenterScreen } from './screens/scores/MatchCenterScreen';
import { LiveVideoScreen } from './screens/scores/LiveVideoScreen';
import { StandingsScreen } from './screens/scores/StandingsScreen';
import { TeamPlayerProfileScreen } from './screens/scores/TeamPlayerProfileScreen';
import { SocialHomeScreen } from './screens/community/SocialHomeScreen';
import { CreateMatchWizardScreen } from './screens/community/CreateMatchWizardScreen';
import { FindGamesScreen } from './screens/community/FindGamesScreen';
import { MatchDetailScreen } from './screens/community/MatchDetailScreen';
import { MatchGroupChatScreen } from './screens/community/MatchGroupChatScreen';
import { PostMatchScreen } from './screens/community/PostMatchScreen';
import { InvitationLandingScreen } from './screens/community/InvitationLandingScreen';
import { VenuesListScreen } from './screens/venues/VenuesListScreen';
import { VenueDetailScreen } from './screens/venues/VenueDetailScreen';
import { BookingFlowScreen } from './screens/venues/BookingFlowScreen';
import { PaymentScreen } from './screens/venues/PaymentScreen';
import { BookingConfirmationScreen } from './screens/venues/BookingConfirmationScreen';
import { MyBookingsScreen } from './screens/venues/MyBookingsScreen';
import { ProfileScreen } from './screens/profile/ProfileScreen';
import { AchievementsLeaderboardScreen } from './screens/profile/AchievementsLeaderboardScreen';
import { NotificationsScreen } from './screens/profile/NotificationsScreen';
import { SearchScreen } from './screens/profile/SearchScreen';
import { SettingsScreen } from './screens/profile/SettingsScreen';
import { SystemStatesScreen } from './screens/profile/SystemStatesScreen';
import { LevelUpCelebrationModal } from './design-system/components/LevelUpCelebrationModal';
import { BadgeClaimModal } from './design-system/components/BadgeClaimModal';
import { WagerWinCelebrationModal } from './design-system/components/WagerWinCelebrationModal';
import { GuestPromptModal } from './components/auth/GuestPromptModal';
import { useSportSyncBridge } from './lib/useSportSyncBridge';
import { useTheme } from './lib/theme';
import { copyToClipboard } from './lib/shareUtils';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase';
import { useChatUnread, isUserAuthorizedForChat } from './lib/services/chat';
import { resetNotificationCache } from './lib/notifications';

import { MATCHES, VENUES, COMMUNITY_GAMES, TEAMS } from './mock/mockData';
import { Match, Venue, CommunityGame, Team } from './mock/types';

export type ScreenId =
  | 'landing'
  | 'splash'
  | 'carousel'
  | 'auth'
  | 'reset-password'
  | 'personalization'
  | 'faculty-setup'
  | 'home'
  | 'scores'
  | 'match-center'
  | 'live-video'
  | 'standings'
  | 'team-profile'
  | 'social-home'
  | 'create-match'
  | 'find-games'
  | 'match-detail'
  | 'match-chat'
  | 'post-match'
  | 'invitation-landing'
  | 'venues-list'
  | 'venue-detail'
  | 'booking-flow'
  | 'payment'
  | 'booking-confirmation'
  | 'my-bookings'
  | 'profile'
  | 'leaderboard'
  | 'notifications'
  | 'search'
  | 'settings'
  | 'system-states';

interface MobileAppProps {
  initialScreen?: ScreenId;
  inPhoneFrame?: boolean;
  onScreenChange?: (screen: ScreenId) => void;
  isLightMode?: boolean;
  onToggleTheme?: () => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({
  initialScreen,
  inPhoneFrame = false,
  onScreenChange,
  isLightMode: propIsLightMode,
  onToggleTheme,
}) => {
  const bridge = useSportSyncBridge();
  const themeHook = useTheme();
  const isLightMode = propIsLightMode !== undefined ? propIsLightMode : themeHook.isLightMode;
  const toggleTheme = onToggleTheme || themeHook.toggleTheme;

  const isLoggingOutRef = useRef<boolean>(false);

  const isUserAuthenticated = (): boolean => {
    if (isLoggingOutRef.current) return false;
    if (typeof window !== 'undefined' && localStorage.getItem('sportsync_logged_out') === 'true') {
      return false;
    }
    if (bridge.userProfile.id && !bridge.userProfile.isGuest && bridge.userProfile.name !== 'Guest Player') {
      return true;
    }
    if (bridge.store.currentUser.id && bridge.store.currentUser.email && bridge.store.currentUser.full_name !== 'Guest Player') {
      return true;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sportsync_user_profile') || localStorage.getItem('sideline_user_profile');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id && !parsed.isGuest && parsed.name !== 'Guest Player') {
            return true;
          }
        }
        const email = localStorage.getItem('sportsync_user_email');
        const id = localStorage.getItem('sportsync_user_id');
        if (email && id) {
          return true;
        }
      } catch {}
    }
    return false;
  };

  const isUserOnboarded = (): boolean => {
    if (isLoggingOutRef.current) return false;
    if (!isUserAuthenticated()) return false;

    // Check explicit profile completion flags first
    const hasStoredCompletion = typeof window !== 'undefined' && (
      localStorage.getItem('matchi_onboarding_completed') === 'true' ||
      localStorage.getItem('sportsync_onboarding_completed') === 'true'
    );

    const isExplicitlyComplete = Boolean(
      bridge.userProfile.onboardingCompleted === true ||
      bridge.store.currentUser.onboarding_completed === true ||
      bridge.store.currentUser.has_completed_onboarding === true ||
      hasStoredCompletion
    );

    if (isExplicitlyComplete) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sportsync_pending_onboarding');
        sessionStorage.removeItem('sportsync_just_registered');
        localStorage.setItem('sportsync_onboarding_completed', 'true');
        localStorage.setItem('matchi_onboarding_completed', 'true');
      }
      return true;
    }

    const isPending = typeof window !== 'undefined' && (
      localStorage.getItem('sportsync_pending_onboarding') === 'true' ||
      sessionStorage.getItem('sportsync_just_registered') === 'true'
    );
    if (isPending) return false;

    // Explicit check for incomplete onboarding
    if (bridge.store.currentUser.onboarding_completed === false) {
      return false;
    }

    const userRoleStr = (bridge.store.currentUser.role as string) || '';
    const isOwner =
      userRoleStr === 'venue_owner' ||
      userRoleStr === 'organizer' ||
      userRoleStr === 'facility_owner' ||
      userRoleStr === 'faculty' ||
      (typeof window !== 'undefined' && (
        localStorage.getItem('sportsync_user_role') === 'venue_owner' ||
        localStorage.getItem('sportsync_user_role') === 'facility_owner' ||
        localStorage.getItem('sportsync_user_role') === 'organizer' ||
        localStorage.getItem('sportsync_user_role') === 'faculty'
      ));

    const storedUserId = typeof window !== 'undefined' ? (localStorage.getItem('sportsync_user_id') || localStorage.getItem('matchi_user_id')) : null;
    const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_email') : null;
    const activeOwnerIds = [bridge.store.currentUser.id, bridge.store.currentUser.auth_id, storedUserId].filter(
      (id): id is string => Boolean(id && id !== 'usr_guest_01')
    );
    const activeOwnerEmail = (bridge.store.currentUser.email || storedEmail || '').trim().toLowerCase();

    const hasOwnedVenueInStore = bridge.store.venues.some(
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

    if (isOwner) {
      return hasOwnedVenue;
    }

    // Check whether existing profile has required setup fields filled
    const effectiveName = (bridge.store.currentUser.full_name || bridge.userProfile.name || '').trim();
    const hasValidName = Boolean(
      effectiveName &&
      !['Guest', 'Guest Player', 'Player', 'SportSync Player', 'Google Player'].includes(effectiveName)
    );
    const sports = bridge.store.currentUser.preferred_sports;
    const hasSports = Array.isArray(sports) && sports.length > 0;
    const hasLocationOrSkill = Boolean(
      bridge.store.currentUser.city ||
      bridge.store.currentUser.skill_level
    );

    const hasRequiredPlayerFields = Boolean(
      !isOwner &&
      !isPending &&
      bridge.store.currentUser.onboarding_completed === true &&
      hasValidName &&
      hasSports &&
      hasLocationOrSkill
    );

    const isComplete = hasRequiredPlayerFields;

    if (isComplete) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sportsync_pending_onboarding');
        sessionStorage.removeItem('sportsync_just_registered');
        localStorage.setItem('sportsync_onboarding_completed', 'true');
        localStorage.setItem('matchi_onboarding_completed', 'true');
      }
      return true;
    }

    return false;
  };

  const resolveInitialScreen = (): ScreenId => {
    if (initialScreen) return initialScreen;
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('screen') === 'reset-password' || searchParams.get('screen') === 'resetpassword') {
          return 'reset-password';
        }
        if (searchParams.get('screen') === 'onboarding' || searchParams.get('screen') === 'personalization') {
          return 'personalization';
        }
        if (searchParams.get('screen') === 'faculty-setup' || searchParams.get('screen') === 'owner-onboarding') {
          return 'faculty-setup';
        }
        if (
          searchParams.get('auth') === 'signin' ||
          searchParams.get('auth') === 'login' ||
          searchParams.get('auth') === 'signup' ||
          searchParams.get('auth') === 'register' ||
          searchParams.get('login') === 'true' ||
          searchParams.get('signup') === 'true'
        ) {
          return 'auth';
        }
        const isAuthRecovery = searchParams.get('type') === 'recovery' || window.location.hash.includes('type=recovery');
        if (isAuthRecovery) {
          return 'reset-password';
        }
        if (searchParams.get('invite') || searchParams.get('match')) {
          return 'invitation-landing';
        }
      } catch {}
    }
    if (!isUserAuthenticated()) {
      return 'landing';
    }

    const userRoleStr = (bridge.store.currentUser.role as string) || '';
    const isOwner =
      userRoleStr === 'venue_owner' ||
      userRoleStr === 'organizer' ||
      userRoleStr === 'facility_owner' ||
      userRoleStr === 'faculty' ||
      (typeof window !== 'undefined' && (
        localStorage.getItem('sportsync_user_role') === 'venue_owner' ||
        localStorage.getItem('sportsync_user_role') === 'facility_owner' ||
        localStorage.getItem('sportsync_user_role') === 'organizer' ||
        localStorage.getItem('sportsync_user_role') === 'faculty'
      ));

    // Faculty accounts must remain in the Faculty Portal and never access Player Dashboard
    if (isOwner) {
      const onboarded = isUserOnboarded();
      if (typeof window !== 'undefined' && !window.location.port.includes('5173')) {
        return 'splash';
      }
      return onboarded ? 'home' : 'faculty-setup';
    }

    // Players: Incomplete accounts must go to Player Profile Setup first
    if (!isUserOnboarded()) {
      return 'personalization';
    }

    return 'home';
  };

  const [currentScreen, setCurrentScreen] = useState<ScreenId>(resolveInitialScreen);
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>(() => [currentScreen]);
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  // Selected Entities
  const [selectedMatch, setSelectedMatch] = useState<Match>(MATCHES[0]);
  const [selectedVenue, setSelectedVenue] = useState<Venue>(VENUES[0]);
  const [selectedGame, setSelectedGame] = useState<CommunityGame | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team>(TEAMS.northgate);
  const [activeBookingDetails, setActiveBookingDetails] = useState<{
    venue: Venue;
    venueId?: string;
    venueName?: string;
    court: string;
    courtId?: string;
    slot: string;
    date?: string;
    formattedDate?: string;
    bookingReference?: string;
    status?: string;
    sport?: string;
    totalPrice: number;
    duration?: number;
  } | null>(null);
  const [personalizationDraft, setPersonalizationDraft] = useState<any>(null);
  const [isEditingFromProfile, setIsEditingFromProfile] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [courtSearchFilter, setCourtSearchFilter] = useState<{ query?: string; sport?: string; city?: string }>({});
  const [activeInviteCode, setActiveInviteCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('invite') || searchParams.get('code') || searchParams.get('match');
        return code ? code.trim().toUpperCase() : null;
      } catch {}
    }
    return null;
  });
  const [inviteGame, setInviteGame] = useState<CommunityGame | null>(null);
  const [isInviteLoading, setIsInviteLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        return Boolean(searchParams.get('invite') || searchParams.get('code') || searchParams.get('match'));
      } catch {}
    }
    return false;
  });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [authInitialMode, setAuthInitialMode] = useState<'signup' | 'login'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const authParam = searchParams.get('auth');
        if (authParam === 'signup' || authParam === 'register' || searchParams.get('signup') === 'true') {
          return 'signup';
        }
      } catch {}
    }
    return 'login';
  });
  const [authInitialRole, setAuthInitialRole] = useState<AuthRole>(() => {
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const roleParam = searchParams.get('role');
        if (roleParam === 'owner' || roleParam === 'facility' || roleParam === 'facility_owner') {
          return 'facility_owner';
        }
      } catch {}
    }
    return 'player';
  });
  const [guestPrompt, setGuestPrompt] = useState<{
    isOpen: boolean;
    title?: string;
    message?: string;
    pendingAction?: () => void;
  }>({ isOpen: false });

  const inviteRequestIdRef = useRef<number>(0);
  const loadingInviteCodeRef = useRef<string | null>(null);
  const resolvedInviteCodeRef = useRef<string | null>(null);
  const inviteDismissedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (inviteDismissedRef.current) return;

    let cleanCode = '';
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const inviteParam = searchParams.get('invite') || searchParams.get('match');
      if (inviteParam) {
        const trimmed = inviteParam.trim();
        const isUuidParam = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
        cleanCode = isUuidParam ? trimmed : trimmed.toUpperCase();
      }
    } catch {}

    if (!cleanCode) return;
    setActiveInviteCode(cleanCode);

    if (resolvedInviteCodeRef.current === cleanCode && inviteGame) {
      return;
    }

    if (loadingInviteCodeRef.current === cleanCode) {
      return;
    }

    loadingInviteCodeRef.current = cleanCode;
    const currentRequestId = ++inviteRequestIdRef.current;

    setIsInviteLoading(true);
    setInviteError(null);

    const resolveInvitation = async () => {
      try {
        const res = await fetch(`/api/invitations?code=${encodeURIComponent(cleanCode)}`);

        if (currentRequestId !== inviteRequestIdRef.current) return;
        loadingInviteCodeRef.current = null;

        if (res.status === 404) {
          resolvedInviteCodeRef.current = cleanCode;
          setInviteGame(null);
          setInviteError('Invitation Not Found');
          setIsInviteLoading(false);
          setCurrentScreen('invitation-landing');
          return;
        }

        if (res.status === 410) {
          resolvedInviteCodeRef.current = cleanCode;
          const data = await res.json().catch(() => ({}));
          setInviteGame(null);
          setInviteError(data.error || 'Event No Longer Available');
          setIsInviteLoading(false);
          setCurrentScreen('invitation-landing');
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (currentRequestId !== inviteRequestIdRef.current) return;

          if (data.success && data.game) {
            resolvedInviteCodeRef.current = cleanCode;
            bridge.addExternalGame(data.game);
            setInviteGame(data.game);
            setInviteError(null);
            setIsInviteLoading(false);
            setCurrentScreen('invitation-landing');
            setScreenHistory(['social-home', 'invitation-landing']);
            return;
          }

          if (data.deleted) {
            resolvedInviteCodeRef.current = cleanCode;
            setInviteGame(null);
            setInviteError('Event No Longer Available');
            setIsInviteLoading(false);
            setCurrentScreen('invitation-landing');
            return;
          }

          if (data.error) {
            resolvedInviteCodeRef.current = cleanCode;
            setInviteGame(null);
            setInviteError(data.error);
            setIsInviteLoading(false);
            setCurrentScreen('invitation-landing');
            return;
          }
        }

        resolvedInviteCodeRef.current = cleanCode;
        setInviteGame(null);
        setInviteError('Invitation Not Found');
        setIsInviteLoading(false);
        setCurrentScreen('invitation-landing');
      } catch (err: any) {
        if (currentRequestId !== inviteRequestIdRef.current) return;
        loadingInviteCodeRef.current = null;
        setInviteError('Unable to load invitation. Please check your connection and try again.');
        setIsInviteLoading(false);
        setCurrentScreen('invitation-landing');
      }
    };

    resolveInvitation();
  }, []);

  useEffect(() => {
    onScreenChange?.(currentScreen);
  }, [currentScreen, onScreenChange]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const authParam = searchParams.get('auth');
      if (authParam === 'login' || authParam === 'signin' || searchParams.get('login') === 'true') {
        setCurrentScreen('auth');
        setAuthInitialMode('login');
        setScreenHistory(['landing', 'auth']);
        onScreenChange?.('auth');
      } else if (authParam === 'signup' || authParam === 'register' || searchParams.get('signup') === 'true') {
        setCurrentScreen('auth');
        setAuthInitialMode('signup');
        const roleParam = searchParams.get('role');
        if (roleParam === 'owner' || roleParam === 'facility' || roleParam === 'facility_owner') {
          setAuthInitialRole('facility_owner');
        } else {
          setAuthInitialRole('player');
        }
        setScreenHistory(['landing', 'auth']);
        onScreenChange?.('auth');
      }
    }
  }, [onScreenChange]);

  useEffect(() => {
    if (initialScreen) {
      setCurrentScreen(initialScreen);
      setScreenHistory((prev) => (prev[prev.length - 1] === initialScreen ? prev : [...prev, initialScreen]));
      if (initialScreen === 'home') setActiveTab('home');
      else if (initialScreen === 'scores') setActiveTab('scores');
      else if (initialScreen === 'social-home' || initialScreen === 'venues-list') setActiveTab('play');
      else if (initialScreen === 'profile') setActiveTab('profile');
    }
  }, [initialScreen]);

  // Automatically route authenticated users away from the public landing page to their appropriate destination
  useEffect(() => {
    if (bridge.store.isLoading || isLoggingOutRef.current || currentScreen !== 'landing') {
      return;
    }
    if (isUserAuthenticated()) {
      const userRoleStr = (bridge.store.currentUser.role as string) || '';
      const isOwner =
        userRoleStr === 'venue_owner' ||
        userRoleStr === 'organizer' ||
        userRoleStr === 'facility_owner' ||
        userRoleStr === 'faculty' ||
        (typeof window !== 'undefined' && (
          localStorage.getItem('sportsync_user_role') === 'venue_owner' ||
          localStorage.getItem('sportsync_user_role') === 'facility_owner' ||
          localStorage.getItem('sportsync_user_role') === 'organizer' ||
          localStorage.getItem('sportsync_user_role') === 'faculty'
        ));

      // Faculty accounts must remain in the Faculty Portal
      if (isOwner) {
        const onboarded = isUserOnboarded();
        if (typeof window !== 'undefined' && !window.location.port.includes('5173')) {
          const target = onboarded ? '/organizer' : '/onboarding?role=owner';
          window.location.href = target;
          return;
        }
        if (onboarded) {
          setCurrentScreen('home');
          setScreenHistory(['home']);
        } else {
          setCurrentScreen('faculty-setup');
          setScreenHistory(['faculty-setup']);
        }
        return;
      }

      // Player accounts
      if (!isUserOnboarded()) {
        setCurrentScreen('personalization');
        setScreenHistory(['personalization']);
      } else {
        setCurrentScreen('home');
        setScreenHistory(['home']);
      }
    }
  }, [bridge.store.isLoading, bridge.store.currentUser.id, bridge.userProfile.id, currentScreen]);

  // Strict Routing: Route users with incomplete profiles to setup.
  // Existing accounts logging in with completed profiles proceed directly to their dashboard.
  useEffect(() => {
    if (bridge.store.isLoading || isLoggingOutRef.current || !isUserAuthenticated()) {
      return;
    }

    const userRoleStr = (bridge.store.currentUser.role as string) || '';
    const isOwner =
      userRoleStr === 'venue_owner' ||
      userRoleStr === 'organizer' ||
      userRoleStr === 'facility_owner' ||
      userRoleStr === 'faculty' ||
      (typeof window !== 'undefined' && (
        localStorage.getItem('sportsync_user_role') === 'venue_owner' ||
        localStorage.getItem('sportsync_user_role') === 'facility_owner' ||
        localStorage.getItem('sportsync_user_role') === 'organizer' ||
        localStorage.getItem('sportsync_user_role') === 'faculty'
      ));

    // Faculty accounts: strictly redirect to Faculty Portal or Faculty Setup
    if (isOwner) {
      const onboarded = isUserOnboarded();
      if (typeof window !== 'undefined' && !window.location.port.includes('5173')) {
        const target = onboarded ? '/organizer' : '/onboarding?role=owner';
        window.location.href = target;
        return;
      }
      if (onboarded) {
        if (currentScreen !== 'home') setCurrentScreen('home');
      } else if (currentScreen !== 'faculty-setup' && currentScreen !== 'auth' && currentScreen !== 'splash') {
        setCurrentScreen('faculty-setup');
      }
      return;
    }

    // Players: If incomplete, redirect to Player Profile Setup
    if (!isUserOnboarded()) {
      const allowedScreens: ScreenId[] = ['landing', 'personalization', 'auth', 'invitation-landing', 'splash', 'reset-password'];
      if (!allowedScreens.includes(currentScreen)) {
        setCurrentScreen('personalization');
        setScreenHistory(['personalization']);
      }
    }
  }, [bridge.store.isLoading, bridge.userProfile.onboardingCompleted, bridge.store.currentUser.onboarding_completed, bridge.store.currentUser.role, bridge.store.venues.length, currentScreen]);

  useEffect(() => {
    if (currentScreen === 'match-detail' && selectedGame) {
      const hasMatch = bridge.games.some(
        (g) =>
          g.id === selectedGame.id ||
          (selectedGame.sessionId && (g.sessionId === selectedGame.sessionId || g.id === selectedGame.sessionId)) ||
          (selectedGame.id && (g.sessionId === selectedGame.id || g.id === selectedGame.id)) ||
          (selectedGame.inviteCode && g.inviteCode && g.inviteCode.toUpperCase() === selectedGame.inviteCode.toUpperCase())
      );
      if (!hasMatch) {
        const lookupKey = selectedGame.sessionId || selectedGame.id || selectedGame.inviteCode;
        if (lookupKey) {
          fetch(`/api/invitations?code=${encodeURIComponent(lookupKey)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.success && data.game) {
                bridge.addExternalGame(data.game);
                setSelectedGame(data.game);
              }
            })
            .catch(() => {});
        }
      }
    }
  }, [currentScreen, selectedGame, bridge.games, bridge]);

  useEffect(() => {
    if (selectedGame) {
      const match = bridge.games.find(
        (g) =>
          g.id === selectedGame.id ||
          (selectedGame.sessionId && g.sessionId === selectedGame.sessionId) ||
          (selectedGame.inviteCode && g.inviteCode && g.inviteCode.toUpperCase() === selectedGame.inviteCode.toUpperCase())
      );
      if (match) {
        if ((match as any).status === 'cancelled') {
          if ((selectedGame as any).status !== 'cancelled') {
            setSelectedGame({ ...selectedGame, status: 'cancelled' } as CommunityGame);
          }
        } else if (
          match.spotsJoined !== selectedGame.spotsJoined ||
          match.members.length !== selectedGame.members.length ||
          match.hostName !== selectedGame.hostName
        ) {
          setSelectedGame(match);
        }
      }
    }
  }, [bridge.games, selectedGame]);

  useEffect(() => {
    if (inviteGame) {
      const match = bridge.games.find(
        (g) =>
          g.id === inviteGame.id ||
          (inviteGame.sessionId && g.sessionId === inviteGame.sessionId) ||
          (inviteGame.inviteCode && g.inviteCode && g.inviteCode.toUpperCase() === inviteGame.inviteCode.toUpperCase())
      );
      if (match) {
        if ((match as any).status === 'cancelled') {
          setInviteGame(null);
          setInviteError('Event No Longer Available');
        } else if (
          match.spotsJoined !== inviteGame.spotsJoined ||
          match.members.length !== inviteGame.members.length ||
          match.hostName !== inviteGame.hostName
        ) {
          setInviteGame(match);
        }
      }
    }
  }, [bridge.games, inviteGame]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleGameDeleted = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const dId = detail?.gameId || detail?.sessionId;
      if (dId) {
        setSelectedGame((prev) => {
          if (prev && (prev.id === dId || prev.sessionId === dId || (prev.inviteCode && prev.inviteCode.toUpperCase() === String(dId).toUpperCase()))) {
            return { ...prev, status: 'cancelled' } as CommunityGame;
          }
          return prev;
        });
        setInviteGame((prev) => {
          if (prev && (prev.id === dId || prev.sessionId === dId || (prev.inviteCode && prev.inviteCode.toUpperCase() === String(dId).toUpperCase()))) {
            setInviteError('This event is no longer available.');
            return null;
          }
          return prev;
        });
      }
    };
    window.addEventListener('sportsync:game-deleted', handleGameDeleted);
    return () => {
      window.removeEventListener('sportsync:game-deleted', handleGameDeleted);
    };
  }, []);

  const requireAuth = (
    title: string,
    message: string,
    action?: () => void
  ): boolean => {
    const isGuest = bridge.userProfile.isGuest || !bridge.userProfile.id || bridge.userProfile.name === 'Guest Player';
    if (isGuest) {
      setGuestPrompt({
        isOpen: true,
        title,
        message,
        pendingAction: action,
      });
      return false;
    }
    return true;
  };

  // Navigate function with history stack
  const navigateTo = (screen: ScreenId) => {
    setScreenHistory((prev) => [...prev, screen]);
    setCurrentScreen(screen);
    onScreenChange?.(screen);

    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({ screen }, '', window.location.href);
      } catch {}
    }

    // Synchronize bottom nav tab if appropriate
    if (screen === 'home') setActiveTab('home');
    else if (screen === 'scores') setActiveTab('scores');
    else if (screen === 'social-home' || screen === 'venues-list') setActiveTab('play');
    else if (screen === 'profile') setActiveTab('profile');
  };

  const handleCloseInvitation = useCallback(() => {
    inviteDismissedRef.current = true;
    loadingInviteCodeRef.current = null;
    resolvedInviteCodeRef.current = null;
    setActiveInviteCode(null);
    setInviteGame(null);
    setInviteError(null);
    setIsInviteLoading(false);

    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        url.searchParams.delete('code');
        url.searchParams.delete('match');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
      } catch {}
    }

    const fallbackScreen: ScreenId = isUserAuthenticated() ? 'social-home' : 'home';
    setActiveTab(fallbackScreen === 'social-home' ? 'play' : 'home');
    setScreenHistory([fallbackScreen]);
    setCurrentScreen(fallbackScreen);
    onScreenChange?.(fallbackScreen);
  }, [isUserAuthenticated, onScreenChange]);

  const handleSyncInvitation = useCallback(
    (code: string) => {
      bridge.syncSessionRoster(code, true);
    },
    [bridge.syncSessionRoster]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      if (currentScreen === 'invitation-landing') {
        handleCloseInvitation();
      } else if (screenHistory.length > 1) {
        setScreenHistory((prev) => {
          if (prev.length <= 1) return prev;
          const next = [...prev];
          next.pop();
          const prevScreen = next[next.length - 1];
          setCurrentScreen(prevScreen);
          onScreenChange?.(prevScreen);
          return next;
        });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentScreen, screenHistory, handleCloseInvitation, onScreenChange]);

  const goBack = () => {
    if (screenHistory.length > 1) {
      const nextHistory = [...screenHistory];
      nextHistory.pop();
      const prevScreen = nextHistory[nextHistory.length - 1];
      setScreenHistory(nextHistory);
      setCurrentScreen(prevScreen);
      onScreenChange?.(prevScreen);
    } else {
      if (isUserAuthenticated()) {
        navigateTo('home');
      } else {
        navigateTo('landing');
      }
    }
  };

  const handleLogout = async () => {
    isLoggingOutRef.current = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sportsync_logged_out', 'true');
      sessionStorage.removeItem('sportsync_just_registered');
      const keysToRemove = [
        'sportsync_pending_onboarding',
        'sportsync_skipped_onboarding',
        'sportsync_onboarding_completed',
        'matchi_onboarding_completed',
        'sportsync_user_id',
        'sportsync_user_email',
        'sportsync_user_name',
        'matchi_user_id',
        'matchi_user_name',
        'sportsync_user_profile',
        'sideline_user_profile',
        'sportsync_user_role',
        'matchi_user_role',
        'sportsync_user_city',
        'sportsync_user_location',
        'sportsync_user_sports',
        'sportsync_user_skill',
        'sportsync_user_availability',
        'sportsync_facility_venue_id',
        'sportsync_user_venues',
        'sportsync_user_sessions',
      ];
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      try {
        const venueKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sportsync_venue_id_')) {
            venueKeys.push(key);
          }
        }
        venueKeys.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
    setAuthInitialMode('login');
    setCurrentScreen('auth');
    setScreenHistory(['auth']);
    onScreenChange?.('auth');
    setToastMessage('Signed out. Please sign in to continue.');

    try {
      await Promise.all([
        bridge.logout(),
        bridge.store.logoutUser(),
      ]);
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (err) {
      console.warn('Logout error:', err);
    }

    resetNotificationCache();

    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/?auth=login';
    } else {
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 500);
    }
  };

  // Real-time unread messages tracking across authorized match chats
  const chatUnread = useChatUnread({
    games: bridge.games,
    currentUserId: bridge.userProfile.id,
    currentUserName: bridge.userProfile.name,
    activeChatGameId: currentScreen === 'match-chat' ? (selectedGame?.id || null) : null,
  });

  const handleOpenChatFromHeader = useCallback(() => {
    if (!requireAuth('Match Chat', 'Sign in to access your match chats.')) return;

    const authorizedGames = bridge.games.filter((g) =>
      isUserAuthorizedForChat(g, bridge.userProfile.id, bridge.userProfile.name)
    );

    if (authorizedGames.length === 0) {
      setToastMessage('No active match chats. Join or create a match to start chatting with your squad!');
      return;
    }

    const gameWithUnread = authorizedGames.find((g) => (chatUnread.unreadByGame[g.id] || 0) > 0);
    const targetGame = gameWithUnread || selectedGame || authorizedGames[0];

    setSelectedGame(targetGame);
    navigateTo('match-chat');
  }, [bridge.games, bridge.userProfile.id, bridge.userProfile.name, chatUnread.unreadByGame, selectedGame]);

  const handleTabChange = (tab: NavTabId) => {
    setActiveTab(tab);
    if (tab === 'home') navigateTo('home');
    else if (tab === 'play') navigateTo('social-home');
    else if (tab === 'scores') navigateTo('scores');
    else if (tab === 'profile') navigateTo('profile');
  };

  // Determine whether to show floating bottom nav
  const showBottomNav = [
    'home',
    'scores',
    'social-home',
    'venues-list',
    'profile',
  ].includes(currentScreen);

  // Render current active screen
  const renderScreen = () => {
    switch (currentScreen) {
      // Flow 1: Public Landing Page, Onboarding & Auth
      case 'landing':
        return (
          <LandingPage
            isLightMode={isLightMode}
            onToggleTheme={toggleTheme}
            onSignIn={() => {
              setAuthInitialMode('login');
              setAuthInitialRole('player');
              navigateTo('auth');
            }}
            onGetStarted={(role = 'player') => {
              setAuthInitialMode('signup');
              setAuthInitialRole(role);
              navigateTo('auth');
            }}
          />
        );
      case 'splash':
        return (
          <SplashScreen
            onFinish={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('sportsync_splash_shown', 'true');
              }
              navigateTo('landing');
            }}
            onGetStarted={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('sportsync_splash_shown', 'true');
              }
              setAuthInitialMode('signup');
              navigateTo('auth');
            }}
            onLogIn={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('sportsync_splash_shown', 'true');
              }
              setAuthInitialMode('login');
              navigateTo('auth');
            }}
            onGuest={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('sportsync_splash_shown', 'true');
              }
              bridge.setAsGuest();
              navigateTo('home');
            }}
          />
        );
      case 'carousel':
        return (
          <CarouselScreen
            onComplete={() => {
              setAuthInitialMode('signup');
              navigateTo('auth');
            }}
            onSkip={() => {
              bridge.setAsGuest();
              navigateTo('home');
            }}
          />
        );
      case 'auth': {
        const canGoBack = !isUserAuthenticated() || screenHistory.length > 1;
        const handleAuthBack = () => {
          if (!isUserAuthenticated()) {
            if (typeof window !== 'undefined') {
              try {
                const url = new URL(window.location.href);
                url.searchParams.delete('auth');
                url.searchParams.delete('login');
                url.searchParams.delete('signup');
                url.searchParams.delete('role');
                window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
              } catch {}
            }
            setScreenHistory(['landing']);
            setCurrentScreen('landing');
            onScreenChange?.('landing');
            return;
          }
          goBack();
        };
        return (
          <AuthScreen
            initialMode={authInitialMode}
            initialRole={authInitialRole}
            canGoBack={canGoBack}
            onNavigateToResetPassword={() => navigateTo('reset-password')}
            onSuccess={(role, isNewAccount, authedUser) => {
              isLoggingOutRef.current = false;
              if (typeof window !== 'undefined') {
                localStorage.removeItem('sportsync_logged_out');
              }

              const isOwner =
                role === 'facility_owner' ||
                authedUser?.role === 'venue_owner' ||
                authedUser?.role === 'facility_owner' ||
                authedUser?.role === 'faculty' ||
                authedUser?.role === 'organizer';

              // Newly registered accounts MUST go to profile setup first!
              if (isNewAccount) {
                if (isOwner) {
                  if (typeof window !== 'undefined' && !window.location.port.includes('5173')) {
                    window.location.href = '/onboarding?role=owner';
                  } else {
                    navigateTo('faculty-setup');
                  }
                } else {
                  setCurrentScreen('personalization');
                  setScreenHistory(['personalization']);
                }
                return;
              }

              // Existing accounts logging in:
              const isAlreadyComplete =
                authedUser?.onboarding_completed === true ||
                authedUser?.has_completed_onboarding === true ||
                isUserOnboarded() ||
                (isOwner && !isNewAccount && Boolean(authedUser?.full_name));

              if (isOwner) {
                if (isAlreadyComplete) {
                  if (typeof window !== 'undefined' && !window.location.port.includes('5173')) {
                    window.location.href = '/organizer';
                  } else {
                    navigateTo('home');
                  }
                } else {
                  if (typeof window !== 'undefined' && !window.location.port.includes('5173')) {
                    window.location.href = '/onboarding?role=owner';
                  } else {
                    navigateTo('faculty-setup');
                  }
                }
              } else if (!isAlreadyComplete) {
                // Existing Player account with incomplete profile -> Player Profile Setup
                if (typeof window !== 'undefined' && !window.location.port.includes('5173')) {
                  window.location.href = '/onboarding';
                } else {
                  navigateTo('personalization');
                }
              } else {
                // Existing Player account with completed profile -> Directly to Player Dashboard
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('sportsync_just_registered');
                  localStorage.removeItem('sportsync_pending_onboarding');
                  localStorage.setItem('sportsync_onboarding_completed', 'true');
                  localStorage.setItem('matchi_onboarding_completed', 'true');
                  if (!window.location.port.includes('5173') && window.location.pathname.includes('/onboarding')) {
                    window.location.href = '/';
                    return;
                  }
                }
                if (guestPrompt.pendingAction) {
                  const act = guestPrompt.pendingAction;
                  setGuestPrompt({ isOpen: false });
                  act();
                } else {
                  navigateTo('home');
                }
              }
            }}
            onBack={canGoBack ? handleAuthBack : undefined}
          />
        );
      }
      case 'reset-password': {
        return (
          <ResetPasswordScreen
            onSuccess={() => {
              setAuthInitialMode('login');
              navigateTo('auth');
            }}
            onBack={() => {
              setAuthInitialMode('login');
              navigateTo('auth');
            }}
          />
        );
      }
      case 'personalization': {
        const isEditing = isEditingFromProfile;
        const resolvedSkill = bridge.userProfile.skillLevel?.toLowerCase();
        const initialSkillIndex = resolvedSkill === 'beginner' ? 0 : (resolvedSkill === 'advanced' || resolvedSkill === 'competitive') ? 2 : 1;

        return (
          <PersonalizationScreen
            onBack={isEditing ? async () => {
              setIsEditingFromProfile(false);
              goBack();
            } : undefined}
            onSkip={undefined}
            isEditing={isEditing}
            initialValues={isEditing ? (personalizationDraft || {
              displayName: !bridge.userProfile.isGuest && bridge.userProfile.name && !['Guest', 'Guest Player', 'Player'].includes(bridge.userProfile.name)
                ? bridge.userProfile.name
                : (bridge.store.currentUser.full_name && !['Guest', 'Guest Player', 'Player'].includes(bridge.store.currentUser.full_name)
                    ? bridge.store.currentUser.full_name
                    : (typeof window !== 'undefined' ? (localStorage.getItem('sportsync_user_name') || '') : '')),
              selectedSports: bridge.userProfile.preferredSports && bridge.userProfile.preferredSports.length > 0 ? bridge.userProfile.preferredSports : [],
              preferredArea: bridge.userProfile.city || bridge.store.currentUser.city || (typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_city') || '' : ''),
              availability: bridge.userProfile.availability || '',
              skillLevel: initialSkillIndex,
            }) : {
              displayName: !bridge.userProfile.isGuest && bridge.userProfile.name && !['Guest', 'Guest Player', 'Player'].includes(bridge.userProfile.name)
                ? bridge.userProfile.name
                : (bridge.store.currentUser.full_name && !['Guest', 'Guest Player', 'Player'].includes(bridge.store.currentUser.full_name)
                    ? bridge.store.currentUser.full_name
                    : (typeof window !== 'undefined' ? (localStorage.getItem('sportsync_user_name') || '') : '')),
              selectedSports: [],
              preferredArea: '',
              availability: '',
              skillLevel: undefined,
            }}
            onDraftChange={setPersonalizationDraft}
            onComplete={async (prefs) => {
              const wasEditing = isEditingFromProfile;

              // Immediately and synchronously clear pending onboarding flags
              // and mark completed in storage to prevent any route guards bouncing back
              if (typeof window !== 'undefined') {
                localStorage.removeItem('sportsync_pending_onboarding');
                sessionStorage.removeItem('sportsync_just_registered');
                localStorage.removeItem('sportsync_skipped_onboarding');
                localStorage.setItem('sportsync_onboarding_completed', 'true');
                localStorage.setItem('matchi_onboarding_completed', 'true');
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('screen');
                  url.searchParams.delete('onboarding');
                  window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
                } catch {}
              }

              if (prefs) {
                await bridge.completeOnboarding({
                  fullName: prefs.fullName || bridge.userProfile.name,
                  preferredSports: prefs.selectedSports,
                  skillLevel: prefs.skillLevel,
                  preferredArea: prefs.preferredArea,
                  availability: prefs.availability,
                  avatarUrl: prefs.avatarUrl,
                });
                setPersonalizationDraft(null);
                setToastMessage(wasEditing ? 'Profile updated successfully!' : 'Preferences saved! Welcome to SportSync.');
              }
              setIsEditingFromProfile(false);
              if (guestPrompt.pendingAction) {
                const act = guestPrompt.pendingAction;
                setGuestPrompt({ isOpen: false });
                act();
              } else if (wasEditing) {
                navigateTo('profile');
              } else {
                setCurrentScreen('home');
                setScreenHistory(['home']);
                setActiveTab('home');
                onScreenChange?.('home');
              }
            }}
          />
        );
      }

      case 'faculty-setup':
        return (
          <FacultySetupScreen
            onBack={goBack}
            onComplete={(_data) => {
              setToastMessage('Facility profile created successfully!');
              if (typeof window !== 'undefined' && !window.location.port.includes('5173')) {
                window.location.href = '/organizer';
              } else {
                navigateTo('profile');
              }
            }}
          />
        );

      // Flow 2: Home
      case 'home':
        return (
          <DiscoverScreen
            venues={bridge.venues}
            games={bridge.games}
            user={bridge.userProfile}
            chatUnreadCount={chatUnread.totalUnread}
            onOpenChat={handleOpenChatFromHeader}
            onSelectMatch={(m) => {
              setSelectedMatch(m);
              navigateTo('match-center');
            }}
            onSelectGame={(g) => {
              bridge.addExternalGame(g);
              setSelectedGame(g);
              navigateTo('match-detail');
            }}
            onSelectVenue={(v) => {
              setSelectedVenue(v);
              navigateTo('venue-detail');
            }}
            onCreateGame={() => navigateTo('create-match')}
            onOpenNotifications={() => {
              if (!requireAuth('Notifications', 'Sign in to access your SportSync notifications.')) return;
              navigateTo('notifications');
            }}
            onNavigateToScores={() => navigateTo('scores')}
            onNavigateToPlay={() => navigateTo('social-home')}
            onNavigateToVenues={(filters) => {
              setCourtSearchFilter(filters || {});
              navigateTo('venues-list');
            }}
          />
        );

      // Flow 3: Live & Scores
      case 'scores':
        return (
          <LiveScoresHubScreen
            isGuest={bridge.userProfile.isGuest}
            onRequireAuth={(actionName) => {
              requireAuth('Match Scoring', actionName || 'Sign in to score official matches.');
            }}
            onSelectMatch={() => navigateTo('match-center')}
            onNavigateToPlay={() => navigateTo('social-home')}
          />
        );
      case 'match-center':
        return (
          <MatchCenterScreen
            match={selectedMatch}
            poll={bridge.matchPolls[selectedMatch.id]}
            userProfile={bridge.userProfile}
            userWagers={bridge.wagers}
            onBack={goBack}
            onPlaceWager={bridge.placePredictionWager}
            onResolvePoll={bridge.resolveMatchPoll}
          />
        );
      case 'live-video':
        return (
          <LiveVideoScreen
            match={selectedMatch}
            onBack={goBack}
          />
        );
      case 'standings':
        return (
          <StandingsScreen
            onBack={goBack}
            onSelectTeam={(t) => {
              setSelectedTeam(t);
              navigateTo('team-profile');
            }}
          />
        );
      case 'team-profile':
        return (
          <TeamPlayerProfileScreen
            teamId={selectedTeam.id}
            onBack={goBack}
          />
        );

      // Flow 4: Community
      case 'social-home':
        return (
          <SocialHomeScreen
            games={bridge.games}
            user={bridge.userProfile}
            chatUnreadCount={chatUnread.totalUnread}
            onOpenChat={handleOpenChatFromHeader}
            onCreateMatch={() => {
              if (!requireAuth('Create a Match', 'Join SportSync to create pickup games and recruit players.')) return;
              navigateTo('create-match');
            }}
            onJoinMatch={() => navigateTo('find-games')}
            onSelectGame={(g) => {
              setSelectedGame(g);
              navigateTo('match-detail');
            }}
            onOpenNotifications={() => {
              if (!requireAuth('Notifications', 'Sign in to access your game notifications.')) return;
              navigateTo('notifications');
            }}
          />
        );
      case 'create-match':
        return (
          <CreateMatchWizardScreen
            currentUserName={bridge.userProfile.name}
            currentUserAvatar={bridge.userProfile.avatarId}
            currentUserId={bridge.userProfile.id}
            onClose={goBack}
            onMatchCreated={async (gameData) => {
              const newGame = await bridge.createCommunityGame(gameData);
              setSelectedGame(newGame);
              setToastMessage(
                gameData.visibility === 'Invite'
                  ? 'Invite-only match created! Share link with invitees.'
                  : 'Match published to feed! +100 Playmaker XP'
              );
              return newGame;
            }}
            onFinish={() => {
              navigateTo('match-detail');
            }}
          />
        );
      case 'find-games':
        return (
          <FindGamesScreen
            games={bridge.games}
            currentUserName={bridge.userProfile.name}
            currentUserId={bridge.userProfile.id}
            onBack={goBack}
            onSelectGame={(g) => {
              setSelectedGame(g);
              navigateTo('match-detail');
            }}
          />
        );
      case 'match-detail': {
        const activeTargetGame =
          (selectedGame
            ? bridge.games.find(
                (g) =>
                  g.id === selectedGame.id ||
                  (selectedGame.sessionId && (g.sessionId === selectedGame.sessionId || g.id === selectedGame.sessionId)) ||
                  (selectedGame.id && (g.sessionId === selectedGame.id || g.id === selectedGame.id)) ||
                  (selectedGame.inviteCode && g.inviteCode && g.inviteCode.toUpperCase() === selectedGame.inviteCode.toUpperCase())
              ) || selectedGame
            : bridge.games[0]) || null;
        const isHost = bridge.isGameHost(activeTargetGame);
        return (
          <MatchDetailScreen
            game={activeTargetGame}
            onBack={goBack}
            isHost={isHost}
            currentUserName={bridge.userProfile.name}
            currentUserId={bridge.userProfile.id}
            unreadCount={activeTargetGame ? (chatUnread.unreadByGame[activeTargetGame.id] || 0) : 0}
            onEditGame={async (updatedData) => {
              if (!activeTargetGame) return;
              const res = await bridge.updateCommunityGame(activeTargetGame.id, updatedData);
              if (res.success && res.game) {
                setSelectedGame(res.game);
                setToastMessage('Game details updated successfully!');
              } else {
                setToastMessage(res.error || 'Failed to update game details.');
                throw new Error(res.error || 'Failed to update game details.');
              }
            }}
            onDeleteGame={async () => {
              if (!activeTargetGame) return;
              const res = await bridge.deleteCommunityGame(activeTargetGame.id);
              if (res.success) {
                setSelectedGame(null);
                setToastMessage('Game deleted successfully.');
                goBack();
              } else {
                setToastMessage(res.error || 'Failed to delete game.');
                throw new Error(res.error || 'Failed to delete game.');
              }
            }}
            onJoin={async () => {
              if (!activeTargetGame) return;
              if (!requireAuth('Join Game Roster', 'Create an account to join this game and reserve your roster spot.', async () => {
                const result = await bridge.joinCommunityGame(activeTargetGame.id);
                if (result.success && result.game) {
                  setSelectedGame(result.game);
                  bridge.syncSessionRoster(result.game.id, true);
                  setToastMessage(result.xpResult?.message || result.message || 'Joined game roster!');
                } else if (!result.success && !result.alreadyParticipant) {
                  setToastMessage(result.error || result.message || 'Failed to join match.');
                  throw new Error(result.error || result.message || 'Failed to join match.');
                }
              })) return;
              const result = await bridge.joinCommunityGame(activeTargetGame.id);
              if (result.success && result.game) {
                setSelectedGame(result.game);
                bridge.syncSessionRoster(result.game.id, true);
                setToastMessage(result.xpResult?.message || result.message || 'Joined game roster!');
              } else if (!result.success && !result.alreadyParticipant) {
                setToastMessage(result.error || result.message || 'Failed to join match.');
                throw new Error(result.error || result.message || 'Failed to join match.');
              }
            }}
            onOpenChat={() => {
              if (!requireAuth('Team Chat', 'Sign in to participate in the match team chat.')) return;
              navigateTo('match-chat');
            }}
            onRemovePlayer={async (player) => {
              if (!activeTargetGame) return;
              const res = await bridge.removeParticipantFromGame(activeTargetGame.id, player);
              if (res.success && res.game) {
                setSelectedGame(res.game);
                setToastMessage(`Removed ${player.name} from match lineup.`);
              } else {
                setToastMessage(res.error || 'Failed to remove player.');
                throw new Error(res.error || 'Failed to remove player.');
              }
            }}
            onToggleHostParticipation={async (participate) => {
              if (!activeTargetGame) return;
              const res = await bridge.toggleHostParticipation(activeTargetGame.id, participate);
              if (res.success && res.game) {
                setSelectedGame(res.game);
                setToastMessage(participate ? 'Joined match lineup.' : 'Left match lineup.');
              } else {
                setToastMessage(res.error || 'Failed to update participation.');
                throw new Error(res.error || 'Failed to update participation.');
              }
            }}
            onSyncRoster={(id) => bridge.syncSessionRoster(id, true)}
          />
        );
      }
      case 'match-chat': {
        const activeChatGame = selectedGame
          ? bridge.games.find(
              (g) =>
                g.id === selectedGame.id ||
                (selectedGame.sessionId && g.sessionId === selectedGame.sessionId) ||
                (selectedGame.inviteCode && g.inviteCode && g.inviteCode.toUpperCase() === selectedGame.inviteCode.toUpperCase())
            ) || selectedGame
          : null;
        return (
          <MatchGroupChatScreen
            game={activeChatGame}
            currentUserName={bridge.userProfile.name}
            currentUserId={bridge.userProfile.id}
            currentUserAvatar={bridge.userProfile.avatarId}
            onBack={goBack}
            onOpenMatchDetail={() => navigateTo('match-detail')}
            onToast={(msg) => setToastMessage(msg)}
          />
        );
      }
      case 'post-match':
        return (
          <PostMatchScreen
            game={selectedGame || bridge.games[0]}
            onBack={goBack}
            onDone={() => navigateTo('home')}
          />
        );
      case 'invitation-landing': {
        const targetGame = inviteGame || bridge.games.find(
          (g) => (g.inviteCode && activeInviteCode && g.inviteCode.toUpperCase() === activeInviteCode.toUpperCase()) ||
                 (activeInviteCode && g.id === activeInviteCode)
        ) || null;

        return (
          <InvitationLandingScreen
            inviteCode={activeInviteCode || ''}
            game={targetGame}
            isLoading={isInviteLoading}
            isError={Boolean(inviteError && !targetGame)}
            errorMessage={inviteError || undefined}
            currentUserName={bridge.userProfile.name}
            currentUserId={bridge.userProfile.id}
            isAuthenticated={isUserAuthenticated()}
            isHost={Boolean(targetGame && bridge.isGameHost(targetGame))}
            onAccept={async () => {
              if (!activeInviteCode) return;
              const result = await bridge.acceptGameInvitation(activeInviteCode);
              if (result.success && result.game) {
                if (typeof window !== 'undefined') {
                  try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('invite');
                    url.searchParams.delete('code');
                    url.searchParams.delete('match');
                    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
                  } catch {}
                }
                setSelectedGame(result.game);
                setToastMessage('Invitation accepted! You joined the roster.');
                navigateTo('match-detail');
              } else {
                setToastMessage(result.message || 'Could not accept invitation.');
              }
            }}
            onDecline={() => {
              if (activeInviteCode) {
                bridge.declineGameInvitation(activeInviteCode);
              }
              setToastMessage('Invitation declined. No roster spot reserved.');
            }}
            onRequireAuth={(title, message, pendingAction) => {
              return requireAuth(title, message, pendingAction);
            }}
            onGoHome={handleCloseInvitation}
            onClose={handleCloseInvitation}
            onBack={handleCloseInvitation}
            onOpenMatch={(g) => {
              setSelectedGame(g);
              setScreenHistory(['social-home', 'match-detail']);
              navigateTo('match-detail');
            }}
            onSyncInvitation={handleSyncInvitation}
          />
        );
      }

      // Flow 5: Venues & Booking
      case 'venues-list':
        return (
          <VenuesListScreen
            venues={bridge.venues}
            onBack={goBack}
            initialQuery={courtSearchFilter.query}
            initialSport={courtSearchFilter.sport}
            initialCity={courtSearchFilter.city}
            onSelectVenue={(v) => {
              setSelectedVenue(v);
              navigateTo('venue-detail');
            }}
          />
        );
      case 'venue-detail':
        return (
          <VenueDetailScreen
            venue={selectedVenue}
            onBack={goBack}
            onBookNow={() => {
              if (!requireAuth('Reserve Court', 'Sign in to reserve court slots and complete booking.', () => {
                navigateTo('booking-flow');
              })) return;
              navigateTo('booking-flow');
            }}
          />
        );
      case 'booking-flow':
        return (
          <BookingFlowScreen
            venue={selectedVenue}
            onBack={goBack}
            onProceedToPayment={(details) => {
              setActiveBookingDetails({
                venue: selectedVenue,
                venueId: selectedVenue.id,
                venueName: selectedVenue.name,
                court: details.court,
                courtId: `${selectedVenue.id}_c1`,
                slot: details.slot,
                totalPrice: details.totalPrice,
                duration: details.duration,
                date: details.date,
                formattedDate: details.formattedDate,
                sport: (selectedVenue as any)?.sport || 'pickleball',
              });
              navigateTo('payment');
            }}
          />
        );
      case 'payment':
        return (
          <PaymentScreen
            totalAmount={activeBookingDetails?.totalPrice || 450}
            bookingDetails={activeBookingDetails || undefined}
            onBack={goBack}
            onPaymentSuccess={(confirmedBooking) => {
              const bookingRef = confirmedBooking?.bookingReference || confirmedBooking?.booking_reference || `BK-${Math.floor(10000 + Math.random() * 90000)}`;
              if (activeBookingDetails) {
                bridge.createReservation({
                  venue: activeBookingDetails.venue,
                  court: activeBookingDetails.court,
                  date: activeBookingDetails.formattedDate || activeBookingDetails.date || 'Today',
                  slot: activeBookingDetails.slot,
                  price: activeBookingDetails.totalPrice,
                  bookingReference: bookingRef,
                  status: 'pending',
                });
                setActiveBookingDetails((prev) => prev ? { ...prev, bookingReference: bookingRef, status: 'pending' } : null);
              }
              setToastMessage('Booking request submitted! Awaiting venue confirmation.');
              navigateTo('booking-confirmation');
            }}
          />
        );
      case 'booking-confirmation':
        return (
          <BookingConfirmationScreen
            venue={activeBookingDetails?.venue || selectedVenue}
            booking={
              activeBookingDetails
                ? {
                    courtName: activeBookingDetails.court,
                    dateStr: activeBookingDetails.formattedDate || activeBookingDetails.date || 'Today',
                    timeSlot: activeBookingDetails.slot,
                    totalPaid: activeBookingDetails.totalPrice,
                    bookingId: activeBookingDetails.bookingReference,
                    status: activeBookingDetails.status || 'pending',
                  }
                : undefined
            }
            onGoHome={() => navigateTo('home')}
            onViewMyBookings={() => navigateTo('my-bookings')}
            onToast={(msg) => setToastMessage(msg)}
          />
        );
      case 'my-bookings':
        return (
          <MyBookingsScreen
            bookings={bridge.bookings}
            onBack={goBack}
            onViewPass={(bookingId) => {
              const found = bridge.bookings.find((b) => b.id === bookingId);
              if (found) {
                setActiveBookingDetails({
                  venue: found.venue,
                  court: found.court,
                  slot: found.time,
                  totalPrice: found.price,
                });
              }
              navigateTo('booking-confirmation');
            }}
            onCancelBooking={(bookingId) => {
              bridge.cancelReservation(bookingId);
              setToastMessage('Reservation cancelled. Full refund issued.');
            }}
          />
        );

      // Flow 6: Profile & Utility
      case 'profile':
        return (
          <ProfileScreen
            user={bridge.userProfile}
            hostedGames={bridge.games.filter((g) => bridge.isGameHost(g))}
            isLightMode={isLightMode}
            onToggleTheme={toggleTheme}
            onOpenNotifications={() => navigateTo('notifications')}
            onSelectGame={(g) => {
              setSelectedGame(g);
              navigateTo('match-detail');
            }}
            onOpenSettings={() => {
              if (!requireAuth('Account Settings', 'Sign in to manage your account settings.')) return;
              navigateTo('settings');
            }}
            onOpenLeaderboard={() => navigateTo('leaderboard')}
            onLogout={handleLogout}
            onRequireAuth={(title, message) => {
              requireAuth(title || 'Join SportSync', message || 'Create an account or sign in to save your progress.');
            }}
            onUpdatePreferences={async (prefs) => {
              await bridge.completeOnboarding({
                fullName: bridge.userProfile.name,
                preferredSports: prefs.preferredSports || bridge.userProfile.preferredSports,
                skillLevel: prefs.skillLevel || bridge.userProfile.skillLevel,
                preferredArea: prefs.city || bridge.userProfile.city,
                availability: prefs.availability || bridge.userProfile.availability,
              });
              setToastMessage('Preferences updated successfully!');
            }}
            onEditPreferences={() => {
              setIsEditingFromProfile(true);
              navigateTo('personalization');
            }}
          />
        );
      case 'leaderboard':
        return (
          <AchievementsLeaderboardScreen
            onBack={goBack}
            userProfile={bridge.userProfile}
            badges={bridge.badges}
            leaderboardPlayers={bridge.leaderboardPlayers}
            onClaimBadge={bridge.claimBadge}
            onAwardXp={bridge.awardXp}
          />
        );
      case 'notifications':
        return (
          <NotificationsScreen
            onBack={goBack}
            onNavigate={(screenId) => navigateTo(screenId as ScreenId)}
            currentUserId={!bridge.userProfile.isGuest && bridge.userProfile.name !== 'Guest Player' ? bridge.userProfile.id : undefined}
            currentUserName={!bridge.userProfile.isGuest && bridge.userProfile.name !== 'Guest Player' ? bridge.userProfile.name : undefined}
          />
        );
      case 'search':
        return <SearchScreen onBack={goBack} />;
      case 'settings':
        return (
          <SettingsScreen
            onBack={goBack}
            isLightMode={isLightMode}
            onToggleTheme={toggleTheme}
            onLogout={handleLogout}
            userCity={bridge.userProfile.city}
          />
        );
      case 'system-states':
        return <SystemStatesScreen onBack={goBack} />;

      default:
        return <DiscoverScreen onSelectMatch={() => {}} onSelectGame={() => {}} onSelectVenue={() => {}} onOpenNotifications={() => {}} onNavigateToScores={() => {}} onNavigateToPlay={() => {}} onNavigateToVenues={() => {}} />;
    }
  };

  const appContent = (
    <div className={`relative w-full h-full flex flex-col ${isLightMode ? 'light' : 'dark'}`}>
      {/* Toast Feedback */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          isOpen={true}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Gamification Celebration Modals */}
      {bridge.celebrationState.type === 'level_up' && (
        <LevelUpCelebrationModal
          isOpen={true}
          oldLevel={bridge.celebrationState.data.oldLevel}
          newLevel={bridge.celebrationState.data.newLevel}
          newTitle={bridge.celebrationState.data.newTitle}
          rewardReason={bridge.celebrationState.data.rewardReason}
          onClose={bridge.closeCelebration}
        />
      )}

      {bridge.celebrationState.type === 'badge_claimed' && (
        <BadgeClaimModal
          isOpen={true}
          badge={bridge.celebrationState.data.badge}
          earnedXp={bridge.celebrationState.data.earnedXp}
          multiplierBonus={bridge.celebrationState.data.multiplierBonus}
          onClose={bridge.closeCelebration}
        />
      )}

      {bridge.celebrationState.type === 'wager_won' && (
        <WagerWinCelebrationModal
          isOpen={true}
          matchTitle={bridge.celebrationState.data.matchTitle}
          optionLabel={bridge.celebrationState.data.optionLabel}
          payoutXp={bridge.celebrationState.data.payoutXp}
          stakeXp={bridge.celebrationState.data.stakeXp}
          onClose={bridge.closeCelebration}
        />
      )}

      {/* Screen Render */}
      <div className={`flex-1 w-full no-scrollbar ${currentScreen === 'create-match' ? 'h-full flex flex-col overflow-hidden' : 'overflow-y-auto'} ${showBottomNav ? 'pb-28 sm:pb-32' : ''}`}>
        {renderScreen()}
      </div>

      {/* Floating Bottom Nav */}
      {showBottomNav && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
          playBadge={chatUnread.totalUnread > 0 ? chatUnread.formattedTotal : null}
        />
      )}

      {/* Quick Action Sheet (+) */}
      <QuickActionSheet
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        onCreateMatch={() => {
          setIsQuickActionOpen(false);
          if (!requireAuth('Create a Match', 'Sign in or create an account to host games and recruit players.')) return;
          navigateTo('create-match');
        }}
        onFindPlayers={() => {
          setIsQuickActionOpen(false);
          navigateTo('find-games');
        }}
        onInviteFriends={async () => {
          setIsQuickActionOpen(false);
          const inviteUrl = typeof window !== 'undefined'
            ? `${window.location.origin}/?invite=SPORTSYNC`
            : 'https://sportsync.ph';
          await copyToClipboard(inviteUrl);
          setToastMessage('SportSync match link copied to clipboard!');
          setTimeout(() => setToastMessage(null), 3000);
        }}
        onViewMyGames={() => {
          setIsQuickActionOpen(false);
          if (!requireAuth('My Bookings', 'Sign in to view your court reservations and joined matches.')) return;
          navigateTo('my-bookings');
        }}
      />

      {/* Guest Authentication Prompt Modal */}
      <GuestPromptModal
        isOpen={guestPrompt.isOpen}
        title={guestPrompt.title}
        message={guestPrompt.message}
        onClose={() => setGuestPrompt({ isOpen: false })}
        onSignIn={() => {
          setGuestPrompt((prev) => ({ ...prev, isOpen: false }));
          setAuthInitialMode('login');
          navigateTo('auth');
        }}
        onCreateAccount={() => {
          setGuestPrompt((prev) => ({ ...prev, isOpen: false }));
          setAuthInitialMode('signup');
          navigateTo('auth');
        }}
      />
    </div>
  );

  if (!inPhoneFrame) {
    return appContent;
  }

  return <PhoneFrame>{appContent}</PhoneFrame>;
};
