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
    else if (tab === 'scores') navigateTo('scores');
    else if (tab === 'play') navigateTo('social-home');
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
            onComplete={() => navigateTo('home')}
          />
        );

      // Flow 2: Home
      case 'home':
        return (
          <DiscoverScreen
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
            onBack={goBack}
            onWatchLive={() => navigateTo('live-video')}
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
            onMatchCreated={(gId) => navigateTo('match-detail')}
          />
        );
      case 'find-games':
        return (
          <FindGamesScreen
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
              setToastMessage('Spot confirmed in match roster!');
              setTimeout(() => setToastMessage(null), 3000);
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
            onProceedToPayment={() => navigateTo('payment')}
          />
        );
      case 'payment':
        return (
          <PaymentScreen
            totalAmount={54}
            onBack={goBack}
            onPaymentSuccess={() => navigateTo('booking-confirmation')}
          />
        );
      case 'booking-confirmation':
        return (
          <BookingConfirmationScreen
            venue={selectedVenue}
            onGoHome={() => navigateTo('home')}
            onViewMyBookings={() => navigateTo('my-bookings')}
          />
        );
      case 'my-bookings':
        return (
          <MyBookingsScreen
            onBack={goBack}
            onViewPass={() => navigateTo('booking-confirmation')}
          />
        );

      // Flow 6: Profile & Utility
      case 'profile':
        return (
          <ProfileScreen
            onOpenSettings={() => navigateTo('settings')}
            onOpenLeaderboard={() => navigateTo('leaderboard')}
          />
        );
      case 'leaderboard':
        return <AchievementsLeaderboardScreen onBack={goBack} />;
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
