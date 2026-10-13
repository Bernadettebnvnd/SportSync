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
import { useSidelineBridge } from './lib/useSidelineBridge';

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
}

export const MobileApp: React.FC<MobileAppProps> = ({
  initialScreen = 'home',
  inPhoneFrame = true,
}) => {
  const bridge = useSidelineBridge();
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(initialScreen);
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>([initialScreen]);
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  // Selected Entities
  const [selectedMatch, setSelectedMatch] = useState<Match>(MATCHES[0]);
  const [selectedVenue, setSelectedVenue] = useState<Venue>(VENUES[0]);
  const [selectedGame, setSelectedGame] = useState<CommunityGame>(COMMUNITY_GAMES[0]);
  const [selectedTeam, setSelectedTeam] = useState<Team>(TEAMS.northgate);
  const [activeBookingDetails, setActiveBookingDetails] = useState<{
    venue: Venue;
    court: string;
    slot: string;
    totalPrice: number;
    duration?: number;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Navigate function with history stack
  const navigateTo = (screen: ScreenId) => {
    setScreenHistory((prev) => [...prev, screen]);
    setCurrentScreen(screen);

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
    } else {
      navigateTo('home');
    }
  };

  const handleTabChange = (tab: NavTabId) => {
    setActiveTab(tab);
    if (tab === 'home') navigateTo('home');
    else if (tab === 'play') navigateTo('social-home');
    else if (tab === 'scores') navigateTo('scores');
    else if (tab === 'profile') navigateTo('profile');
  };

  // Theme toggle
  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
    if (!isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
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
            onGetStarted={() => navigateTo('carousel')}
            onLogIn={() => navigateTo('auth')}
          />
        );
      case 'carousel':
        return (
          <CarouselScreen
            onComplete={() => navigateTo('auth')}
            onSkip={() => navigateTo('home')}
          />
        );
      case 'auth':
        return (
          <AuthScreen
            onSuccess={() => navigateTo('personalization')}
            onBack={goBack}
          />
        );
      case 'personalization':
        return (
          <PersonalizationScreen
            onComplete={async (prefs) => {
              if (prefs) {
                await bridge.completeOnboarding({
                  fullName: bridge.userProfile.name,
                  preferredSports: prefs.selectedSports,
                  skillLevel: prefs.skillLevel,
                });
                setToastMessage('Preferences saved! +150 Playmaker XP');
              }
              navigateTo('home');
            }}
          />
        );

      // Flow 2: Home
      case 'home':
        return (
          <DiscoverScreen
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
            onOpenNotifications={() => navigateTo('notifications')}
            onNavigateToScores={() => navigateTo('scores')}
            onNavigateToPlay={() => navigateTo('social-home')}
            onNavigateToVenues={() => navigateTo('venues-list')}
          />
        );

      // Flow 3: Live & Scores
      case 'scores':
        return (
          <LiveScoresHubScreen
            onSelectMatch={(m) => {
              setSelectedMatch(m);
              navigateTo('match-center');
            }}
            onOpenLeagueStandings={() => navigateTo('standings')}
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
            onWatchLive={() => navigateTo('live-video')}
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
            onCreateMatch={() => navigateTo('create-match')}
            onJoinMatch={() => navigateTo('find-games')}
            onSelectGame={(g) => {
              setSelectedGame(g);
              navigateTo('match-detail');
            }}
            onOpenNotifications={() => navigateTo('notifications')}
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
      case 'match-detail':
        return (
          <MatchDetailScreen
            game={selectedGame}
            onBack={goBack}
            onJoin={() => {
              const result = bridge.joinCommunityGame(selectedGame.id);
              if (result.game) setSelectedGame(result.game);
              setToastMessage(result.xpResult.message);
            }}
            onOpenChat={() => navigateTo('match-chat')}
          />
        );
      case 'match-chat':
        return <MatchGroupChatScreen onBack={goBack} />;
      case 'post-match':
        return (
          <PostMatchScreen
            onBack={goBack}
            onDone={() => navigateTo('home')}
          />
        );

      // Flow 5: Venues & Booking
      case 'venues-list':
        return (
          <VenuesListScreen
            venues={bridge.venues}
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
            onBookNow={() => navigateTo('booking-flow')}
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
                court: details.court,
                slot: details.slot,
                totalPrice: details.totalPrice,
                duration: details.duration,
              });
              navigateTo('payment');
            }}
          />
        );
      case 'payment':
        return (
          <PaymentScreen
            totalAmount={activeBookingDetails?.totalPrice || 54}
            bookingDetails={activeBookingDetails || undefined}
            onBack={goBack}
            onPaymentSuccess={() => {
              if (activeBookingDetails) {
                bridge.createReservation({
                  venue: activeBookingDetails.venue,
                  court: activeBookingDetails.court,
                  date: 'Sat, 17 Oct',
                  slot: activeBookingDetails.slot,
                  price: activeBookingDetails.totalPrice,
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
            onOpenSettings={() => navigateTo('settings')}
            onOpenLeaderboard={() => navigateTo('leaderboard')}
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
        return <NotificationsScreen onBack={goBack} />;
      case 'search':
        return <SearchScreen onBack={goBack} />;
      case 'settings':
        return (
          <SettingsScreen
            onBack={goBack}
            isLightMode={isLightMode}
            onToggleTheme={toggleTheme}
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
      <div className="flex-1 w-full overflow-y-auto no-scrollbar">
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
        onCreateMatch={() => navigateTo('create-match')}
        onBookCourt={() => navigateTo('venues-list')}
        onInviteFriends={() => {
          setToastMessage('Invite link copied to clipboard!');
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />
    </div>
  );

  if (!inPhoneFrame) {
    return appContent;
  }

  return <PhoneFrame>{appContent}</PhoneFrame>;
};
