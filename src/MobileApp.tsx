import React, { useState, useEffect } from 'react';
import { BottomNav, NavTabId } from './design-system/components/BottomNav';
import { QuickActionSheet } from './design-system/components/QuickActionSheet';
import { Toast } from './design-system/components/SearchBar';
import { PhoneFrame } from './design-system/components/PhoneFrame';

// All 28 Screen Components
import { SplashScreen } from './screens/onboarding/SplashScreen';
import { CarouselScreen } from './screens/onboarding/CarouselScreen';
import { AuthScreen } from './screens/onboarding/AuthScreen';
import { PersonalizationScreen } from './screens/onboarding/PersonalizationScreen';
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

import { MATCHES, VENUES, COMMUNITY_GAMES, TEAMS } from './mock/mockData';
import { Match, Venue, CommunityGame, Team } from './mock/types';

export type ScreenId =
  | 'splash'
  | 'carousel'
  | 'auth'
  | 'personalization'
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
  inPhoneFrame = true,
  onScreenChange,
  isLightMode: propIsLightMode,
  onToggleTheme,
}) => {
  const bridge = useSportSyncBridge();
  const themeHook = useTheme();
  const isLightMode = propIsLightMode !== undefined ? propIsLightMode : themeHook.isLightMode;
  const toggleTheme = onToggleTheme || themeHook.toggleTheme;

  const isUserAuthenticated = (): boolean => {
    if (bridge.userProfile.id && !bridge.userProfile.isGuest && bridge.userProfile.name !== 'Guest Player') {
      return true;
    }
    if (bridge.store.currentUser.id && bridge.store.currentUser.email) {
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
        if (localStorage.getItem('sportsync_user_email')) {
          return true;
        }
      } catch {}
    }
    return false;
  };

  const resolveInitialScreen = (): ScreenId => {
    if (initialScreen) return initialScreen;
    return isUserAuthenticated() ? 'home' : 'auth';
  };

  const [currentScreen, setCurrentScreen] = useState<ScreenId>(resolveInitialScreen);
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>([resolveInitialScreen()]);
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
    sport?: string;
    totalPrice: number;
    duration?: number;
  } | null>(null);
  const [personalizationDraft, setPersonalizationDraft] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [courtSearchFilter, setCourtSearchFilter] = useState<{ query?: string; sport?: string; city?: string }>({});
  const [authInitialMode, setAuthInitialMode] = useState<'signup' | 'login'>('login');
  const [guestPrompt, setGuestPrompt] = useState<{
    isOpen: boolean;
    title?: string;
    message?: string;
    pendingAction?: () => void;
  }>({ isOpen: false });

  // Sync external initialScreen changes (e.g. from developer screen jumper)
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

    // Synchronize bottom nav tab if appropriate
    if (screen === 'home') setActiveTab('home');
    else if (screen === 'scores') setActiveTab('scores');
    else if (screen === 'social-home' || screen === 'venues-list') setActiveTab('play');
    else if (screen === 'profile') setActiveTab('profile');
  };

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
        navigateTo('auth');
      }
    }
  };

  const handleLogout = async () => {
    await bridge.logout();
    await bridge.store.logoutUser();
    setAuthInitialMode('login');
    setCurrentScreen('auth');
    setScreenHistory(['auth']);
    onScreenChange?.('auth');
    setToastMessage('Signed out successfully.');
  };

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
      // Flow 1: Onboarding & Auth
      case 'splash':
        return (
          <SplashScreen
            onGetStarted={() => {
              setAuthInitialMode('signup');
              navigateTo('auth');
            }}
            onLogIn={() => {
              setAuthInitialMode('login');
              navigateTo('auth');
            }}
            onGuest={() => {
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
        const canGoBack = screenHistory.length > 1 && isUserAuthenticated();
        return (
          <AuthScreen
            initialMode={authInitialMode}
            canGoBack={canGoBack}
            onSuccess={(role, isNewAccount) => {
              if (role === 'facility_owner') {
                if (typeof window !== 'undefined') {
                  if (isNewAccount) {
                    window.location.href = '/onboarding?role=owner';
                  } else {
                    window.location.href = '/organizer';
                  }
                }
              } else if (isNewAccount) {
                if (typeof window !== 'undefined' && !window.location.port.includes('5173')) {
                  window.location.href = '/onboarding';
                } else {
                  navigateTo('personalization');
                }
              } else {
                if (guestPrompt.pendingAction) {
                  const act = guestPrompt.pendingAction;
                  setGuestPrompt({ isOpen: false });
                  act();
                } else {
                  navigateTo('home');
                }
              }
            }}
            onBack={canGoBack ? goBack : undefined}
          />
        );
      }
      case 'personalization':
        return (
          <PersonalizationScreen
            onBack={goBack}
            initialValues={personalizationDraft || {
              displayName: bridge.userProfile.name !== 'Guest Player' ? bridge.userProfile.name : '',
              selectedSports: bridge.userProfile.preferredSports && bridge.userProfile.preferredSports.length > 0 ? bridge.userProfile.preferredSports : ['Football'],
              preferredArea: bridge.userProfile.city || 'Naga City',
              skillLevel: bridge.userProfile.skillLevel === 'Beginner' ? 0 : bridge.userProfile.skillLevel === 'Casual' ? 1 : bridge.userProfile.skillLevel === 'Competitive' ? 3 : 2,
            }}
            onDraftChange={setPersonalizationDraft}
            onComplete={async (prefs) => {
              if (prefs) {
                await bridge.completeOnboarding({
                  fullName: prefs.fullName || bridge.userProfile.name,
                  preferredSports: prefs.selectedSports,
                  skillLevel: prefs.skillLevel,
                  preferredArea: prefs.preferredArea,
                  avatarUrl: prefs.avatarUrl,
                });
                setPersonalizationDraft(null);
                setToastMessage('Preferences saved! Welcome to SportSync.');
              }
              if (guestPrompt.pendingAction) {
                const act = guestPrompt.pendingAction;
                setGuestPrompt({ isOpen: false });
                act();
              } else {
                navigateTo('home');
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
            onSelectMatch={(m) => {
              setSelectedMatch(m);
              navigateTo('match-center');
            }}
            onSelectGame={(g) => {
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
            onClose={goBack}
            onMatchCreated={async (gameData) => {
              const newGame = await bridge.createCommunityGame(gameData);
              setSelectedGame(newGame);
              setToastMessage('Match published to feed! +100 Playmaker XP');
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
            onBack={goBack}
            onSelectGame={(g) => {
              setSelectedGame(g);
              navigateTo('match-detail');
            }}
          />
        );
      case 'match-detail': {
        const activeTargetGame = selectedGame || bridge.games[0] || null;
        const isHost = bridge.isGameHost(activeTargetGame);
        return (
          <MatchDetailScreen
            game={activeTargetGame}
            onBack={goBack}
            isHost={isHost}
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
                if (result.game) setSelectedGame(result.game);
                setToastMessage(result.xpResult?.message || result.message || 'Joined game roster!');
              })) return;
              const result = await bridge.joinCommunityGame(activeTargetGame.id);
              if (result.game) setSelectedGame(result.game);
              setToastMessage(result.xpResult?.message || result.message || 'Joined game roster!');
            }}
            onOpenChat={() => {
              if (!requireAuth('Team Chat', 'Sign in to participate in the match team chat.')) return;
              navigateTo('match-chat');
            }}
          />
        );
      }
      case 'match-chat':
        return <MatchGroupChatScreen onBack={goBack} />;
      case 'post-match':
        return (
          <PostMatchScreen
            game={selectedGame || bridge.games[0]}
            onBack={goBack}
            onDone={() => navigateTo('home')}
          />
        );

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
                date: '2026-10-17',
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
              if (activeBookingDetails) {
                bridge.createReservation({
                  venue: activeBookingDetails.venue,
                  court: activeBookingDetails.court,
                  date: 'Sat, 17 Oct',
                  slot: activeBookingDetails.slot,
                  price: activeBookingDetails.totalPrice,
                  bookingReference: confirmedBooking?.bookingReference || confirmedBooking?.booking_reference,
                });
              }
              setToastMessage('Court booking confirmed! +60 Playmaker XP');
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
                    dateStr: 'Saturday, 17 Oct',
                    timeSlot: activeBookingDetails.slot,
                    totalPaid: activeBookingDetails.totalPrice,
                  }
                : undefined
            }
            onGoHome={() => navigateTo('home')}
            onViewMyBookings={() => navigateTo('my-bookings')}
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
              });
              setToastMessage('Preferences updated successfully!');
            }}
            onEditPreferences={() => navigateTo('personalization')}
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
            currentUserId={bridge.userProfile.id}
            currentUserName={bridge.userProfile.name}
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
      <div className={`flex-1 w-full no-scrollbar ${currentScreen === 'create-match' ? 'h-full flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>
        {renderScreen()}
      </div>

      {/* Floating Bottom Nav */}
      {showBottomNav && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
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
        onInviteFriends={() => {
          setIsQuickActionOpen(false);
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
