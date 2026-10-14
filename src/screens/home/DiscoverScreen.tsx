'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell,
  ChevronRight,
  Sparkles,
  MapPin,
  ArrowRight,
  Search,
  ShieldCheck,
  Compass,
  Calendar,
  Users,
  Plus,
} from 'lucide-react';
import { UserAvatar, toAvatarId } from '../../illustrations/Avatars';
import { VenueCard } from '../../design-system/components/VenueCard';
import { MatchCard } from '../../design-system/components/MatchCard';
import { Venue, CommunityGame } from '../../mock/types';
import { APP_CONFIG } from '../../config/appConfig';
import { SportIcon } from '../../illustrations/SportIcons';
import { STANDARDIZED_SPORTS } from '../../config/sports';
import { useTimeGreeting } from '../../lib/useGreeting';

interface DiscoverScreenProps {
  venues?: Venue[];
  games?: CommunityGame[];
  onSelectGame: (game: CommunityGame) => void;
  onSelectVenue: (venue: Venue) => void;
  onOpenNotifications: () => void;
  onNavigateToScores: () => void;
  onNavigateToPlay: () => void;
  onNavigateToVenues: (filters?: { query?: string; sport?: string }) => void;
  onCreateGame?: () => void;
  onSelectMatch?: (match: any) => void;
  user?: {
    id?: string;
    name: string;
    avatarId: string;
    level: number;
    isGuest?: boolean;
  };
  isGuest?: boolean;
  onRequireAuth?: (actionName?: string) => void;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  venues = [],
  games = [],
  onSelectGame,
  onSelectVenue,
  onOpenNotifications,
  onNavigateToScores,
  onNavigateToPlay,
  onNavigateToVenues,
  onCreateGame,
  user,
  isGuest = false,
  onRequireAuth,
}) => {
  const [activeSport, setActiveSport] = useState<string>('All');
  const [courtSearchInput, setCourtSearchInput] = useState<string>('');

  const effectiveIsGuest = isGuest || !user?.id || user.isGuest;
  const userName = user?.name || (effectiveIsGuest ? 'Guest' : 'Player');

  // Time-based greeting per Phase 8
  const { salutation, fullGreeting, showName } = useTimeGreeting(userName, effectiveIsGuest);

  // Filter featured courts by active sport
  const featuredCourts = useMemo(() => {
    return venues.filter((v) => {
      if (activeSport === 'All') return true;
      const sportLower = activeSport.toLowerCase();
      const primaryMatch = v.sport.toLowerCase().includes(sportLower);
      const featuredMatch = v.featuredSports?.some((s) => s.toLowerCase().includes(sportLower));
      const courtsMatch = v.courts?.some((c: any) => c.sport?.toLowerCase().includes(sportLower));
      return primaryMatch || featuredMatch || courtsMatch;
    });
  }, [venues, activeSport]);

  // Filter upcoming games by active sport
  const upcomingGames = useMemo(() => {
    return games.filter((g) => {
      if (activeSport === 'All') return true;
      return g.sport.toLowerCase().includes(activeSport.toLowerCase());
    });
  }, [games, activeSport]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onNavigateToVenues({
      query: courtSearchInput.trim(),
      sport: activeSport !== 'All' ? activeSport : undefined,
    });
  };

  const handleNotificationsClick = () => {
    if (effectiveIsGuest && onRequireAuth) {
      onRequireAuth('view notifications');
      return;
    }
    onOpenNotifications();
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. SportSync Header: Avatar + Time-Based Greeting + Notification Bell */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar
            id={toAvatarId(user?.avatarId)}
            size={42}
            showBadge={!effectiveIsGuest}
            badgeLevel={user?.level || 1}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#A5B0A6]">{salutation}</span>
              {!effectiveIsGuest && (
                <span className="px-2 py-0.5 rounded-full bg-[#1C241E] text-[#C8FF2E] text-[10px] font-bold border border-white/10">
                  Lv.{user?.level || 1}
                </span>
              )}
            </div>
            {/* 2. Personalized Greeting */}
            <h2 className="font-display font-black text-base text-[#F4F7F0] tracking-tight">
              {showName ? userName : 'Player Hub'}
            </h2>
          </div>
        </div>

        <button
          onClick={handleNotificationsClick}
          aria-label="View notifications"
          className="relative w-10 h-10 rounded-full bg-[#1C241E] border border-white/10 flex items-center justify-center hover:bg-[#263028] transition-colors press-scale"
        >
          <Bell className="w-4 h-4 text-[#F4F7F0]" />
          {!effectiveIsGuest && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#C8FF2E] shadow-[0_0_8px_#C8FF2E]" />
          )}
        </button>
      </header>

      {/* 3. Official SportSync Tagline: Find Players. Play Together. */}
      <div className="px-5 pt-2 pb-1">
        <h1 className="text-3xl tracking-tight leading-tight text-[#F4F7F0]">
          <span className="font-display font-bold">Find Players. </span>
          <span className="font-editorial text-[#C8FF2E] text-4xl font-normal block sm:inline">
            Play Together.
          </span>
        </h1>
      </div>

      {/* 4. PROMINENT COURT SEARCH ENTRY POINT */}
      <div className="px-5 py-2.5">
        <form
          onSubmit={handleSearchSubmit}
          className="group relative flex items-center bg-[#141A15] border border-white/10 rounded-2xl p-1.5 transition-all focus-within:border-[#C8FF2E] focus-within:ring-1 focus-within:ring-[#C8FF2E]/30 shadow-lg"
        >
          <div className="pl-3 pr-2 text-[#A5B0A6] group-focus-within:text-[#C8FF2E] transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={courtSearchInput}
            onChange={(e) => setCourtSearchInput(e.target.value)}
            placeholder="Search courts by facility, court name, city, or sport..."
            className="w-full bg-transparent text-xs sm:text-sm text-[#F4F7F0] placeholder-[#6F7B71] focus:outline-none py-1"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] text-xs font-bold flex items-center gap-1 shrink-0 hover:bg-[#d4ff52] transition-colors press-scale"
          >
            <span>Search</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* 5. Standardized Sport Categories Rail (Phase 9 Ordering) */}
      <div className="px-5 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {STANDARDIZED_SPORTS.map((sport) => {
          const isActive = activeSport === sport;
          return (
            <button
              key={sport}
              onClick={() => setActiveSport(sport)}
              className={`h-9 px-3.5 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border press-scale ${
                isActive
                  ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] shadow-sm'
                  : 'bg-[#141A15] text-[#A5B0A6] border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              {sport !== 'All' ? (
                <SportIcon
                  sport={sport}
                  size={13}
                  color={isActive ? '#0B0F0C' : '#A5B0A6'}
                />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-current" />
              )}
              <span>{sport}</span>
            </button>
          );
        })}
      </div>

      {/* 6. FEATURED COURTS (APPEARS DIRECTLY ABOVE "UPCOMING FOR YOU") */}
      <section className="px-5 pt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00E599]" />
              <h3 className="font-display font-black text-base text-[#F4F7F0] tracking-tight">
                Featured Courts
              </h3>
            </div>
            <p className="text-[11px] text-[#A5B0A6]">
              Real courts registered on SportSync • Live verified availability
            </p>
          </div>

          <button
            onClick={() =>
              onNavigateToVenues({
                sport: activeSport !== 'All' ? activeSport : undefined,
              })
            }
            className="text-xs text-[#C8FF2E] font-bold flex items-center gap-0.5 hover:underline press-scale"
          >
            <span>Browse All ({venues.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Featured Courts Content: Real Cards vs Empty State */}
        {featuredCourts.length > 0 ? (
          <div className="space-y-3.5">
            {featuredCourts.slice(0, 3).map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                variant="featured"
                onClick={() => onSelectVenue(venue)}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-[#141A15] border border-white/5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1C241E] border border-white/10 flex items-center justify-center mx-auto text-[#A5B0A6]">
              <Compass className="w-5 h-5 text-[#C8FF2E]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-bold text-sm text-[#F4F7F0]">
                No courts listed yet
              </h4>
              <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto">
                {activeSport !== 'All'
                  ? `No ${activeSport} courts currently registered. Try selecting "All" or browse discovered facilities on the map.`
                  : 'Be the first facility to list courts, or explore discovered sports venues across the metro.'}
              </p>
            </div>
            <div className="pt-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateToVenues({ sport: activeSport !== 'All' ? activeSport : undefined })}
                className="px-4 py-2 rounded-xl bg-[#1C241E] hover:bg-[#263028] text-xs font-bold text-[#C8FF2E] border border-[#C8FF2E]/30 transition-all"
              >
                Find Venues
              </button>
            </div>
          </div>
        )}

        {/* Explore All Courts Quick Link Banner */}
        <div
          onClick={() => onNavigateToVenues()}
          className="mt-3.5 p-4 rounded-2xl bg-gradient-to-r from-[#141A15] to-[#1C241E] border border-white/10 flex items-center justify-between cursor-pointer hover:border-[#C8FF2E]/40 transition-all press-scale"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 flex items-center justify-center text-[#C8FF2E]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display font-bold text-xs text-[#F4F7F0]">Explore All Sports Facilities</h4>
              <p className="text-[10px] text-[#A5B0A6]">Filter by 9 sports, metro cities &amp; court availability</p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#C8FF2E]">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </section>

      {/* 7. UPCOMING FOR YOU (APPEARS DIRECTLY BELOW FEATURED COURTS) */}
      <section className="px-5 pt-7">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
              Upcoming For You
            </h3>
            <p className="text-[11px] text-[#A5B0A6]">Join an active roster and get on the pitch</p>
          </div>
          <button
            onClick={onNavigateToPlay}
            className="text-xs text-[#C8FF2E] font-semibold flex items-center gap-0.5 hover:underline"
          >
            <span>Explore Games</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Upcoming Games Content: Real Games vs Meaningful Empty State */}
        {upcomingGames.length > 0 ? (
          <div className="space-y-2.5">
            {upcomingGames.slice(0, 3).map((game) => (
              <MatchCard
                key={game.id}
                game={game}
                onClick={() => onSelectGame(game)}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-[#141A15] border border-white/5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1C241E] border border-white/10 flex items-center justify-center mx-auto text-[#A5B0A6]">
              <Users className="w-5 h-5 text-[#C8FF2E]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-bold text-sm text-[#F4F7F0]">
                No upcoming games
              </h4>
              <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto">
                {activeSport !== 'All'
                  ? `No ${activeSport} pickup matches scheduled yet. Host a session to complete your roster!`
                  : 'You haven\'t joined a game yet. Host a match or join open rosters near you.'}
              </p>
            </div>
            <div className="pt-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (effectiveIsGuest && onRequireAuth) {
                    onRequireAuth('create a game');
                  } else if (onCreateGame) {
                    onCreateGame();
                  } else {
                    onNavigateToPlay();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-[#0B0F0C] text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm press-scale"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create a Game</span>
              </button>
              <button
                type="button"
                onClick={onNavigateToPlay}
                className="px-4 py-2 rounded-xl bg-[#1C241E] hover:bg-[#263028] text-xs font-bold text-[#A5B0A6] hover:text-white transition-all"
              >
                Browse Feed
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
