import React, { useState } from 'react';
import {
  Bell,
  ChevronRight,
  Sparkles,
  MapPin,
  ArrowRight,
  Search,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { UserAvatar } from '../../illustrations/Avatars';
import { HeroEventCard } from '../../design-system/components/HeroEventCard';
import { LiveMatchRow } from '../../design-system/components/LiveMatchRow';
import { MatchCard } from '../../design-system/components/MatchCard';
import { VenueCard } from '../../design-system/components/VenueCard';
import { MATCHES, COMMUNITY_GAMES, VENUES, FRIENDS, CURRENT_USER } from '../../mock/mockData';
import { Match, CommunityGame, Venue } from '../../mock/types';
import { APP_CONFIG } from '../../config/appConfig';
import { SportIcon } from '../../illustrations/SportIcons';

interface DiscoverScreenProps {
  venues?: Venue[];
  onSelectMatch: (match: Match) => void;
  onSelectGame: (game: CommunityGame) => void;
  onSelectVenue: (venue: Venue) => void;
  onOpenNotifications: () => void;
  onNavigateToScores: () => void;
  onNavigateToPlay: () => void;
  onNavigateToVenues: (filters?: { query?: string; sport?: string }) => void;
  user?: typeof CURRENT_USER;
}

const OFFICIAL_SPORTS = [
  'All',
  'Football',
  'Basketball',
  'Tennis',
  'Pickleball',
  'Badminton',
  'Volleyball',
  'Billiards',
  'Darts',
];

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  venues = VENUES,
  onSelectMatch,
  onSelectGame,
  onSelectVenue,
  onOpenNotifications,
  onNavigateToScores,
  onNavigateToPlay,
  onNavigateToVenues,
  user,
}) => {
  const currentUser = user || CURRENT_USER;
  const [activeSport, setActiveSport] = useState<string>('All');
  const [courtSearchInput, setCourtSearchInput] = useState<string>('');

  const liveMatches = MATCHES.filter((m) => m.status === 'LIVE');
  const heroMatch = liveMatches[0] || MATCHES[0];
  const tuckingMatch = MATCHES[1]; // Second match tucking under the lime hero card

  // Filter featured courts by active sport if selected
  const featuredCourts = venues.filter((v) => {
    if (activeSport === 'All') return true;
    const sportLower = activeSport.toLowerCase();
    const primaryMatch = v.sport.toLowerCase().includes(sportLower);
    const featuredMatch = v.featuredSports?.some((s) => s.toLowerCase().includes(sportLower));
    const courtsMatch = v.courts?.some((c: any) => c.sport?.toLowerCase().includes(sportLower));
    return primaryMatch || featuredMatch || courtsMatch;
  });

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onNavigateToVenues({
      query: courtSearchInput.trim(),
      sport: activeSport !== 'All' ? activeSport : undefined,
    });
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Header: Greeting + Avatar + Bell */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar id={currentUser.avatarId} size={42} showBadge badgeLevel={currentUser.level} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#A5B0A6]">Good day 👋</span>
              <span className="px-2 py-0.2 rounded-full bg-[#1C241E] text-[#C8FF2E] text-[10px] font-bold border border-white/10">
                Lv.{currentUser.level}
              </span>
            </div>
            <h2 className="font-display font-black text-base text-[#F4F7F0] tracking-tight">
              {currentUser.name}
            </h2>
          </div>
        </div>

        <button
          onClick={onOpenNotifications}
          aria-label="View notifications"
          className="relative w-10 h-10 rounded-full bg-[#1C241E] border border-white/10 flex items-center justify-center hover:bg-[#263028] transition-colors press-scale"
        >
          <Bell className="w-4 h-4 text-[#F4F7F0]" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#C8FF2E] shadow-[0_0_8px_#C8FF2E]" />
        </button>
      </header>

      {/* 2. Official SportSync Tagline: Find Players. Play Together. */}
      <div className="px-5 pt-2 pb-1">
        <h1 className="text-3xl tracking-tight leading-tight text-[#F4F7F0]">
          <span className="font-display font-bold">Find Players. </span>
          <span className="font-editorial text-[#C8FF2E] text-4xl font-normal block sm:inline">
            Play Together.
          </span>
        </h1>
      </div>

      {/* 3. PROMINENT COURT SEARCH ENTRY POINT */}
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
            placeholder="Search courts by facility, city, or sport..."
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

      {/* 4. Horizontal Sport Chips with Vector SportIcons */}
      <div className="px-5 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {OFFICIAL_SPORTS.map((sport) => {
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
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{sport}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Top Events: Lime Notch Hero Card + Tucking Dark Card Underneath */}
      <section className="px-5 pt-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C8FF2E]" />
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
              Top Events
            </h3>
          </div>
          <button
            onClick={onNavigateToScores}
            className="text-xs text-[#C8FF2E] font-semibold flex items-center gap-1 hover:underline"
          >
            <span>All Fixtures</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lime Hero Notch Card */}
        <HeroEventCard match={heroMatch} onClick={() => onSelectMatch(heroMatch)} />

        {/* Next Dark Card Tucking In Smoothly Below The Notch */}
        {tuckingMatch && (
          <div className="-mt-3.5 relative z-0">
            <LiveMatchRow
              match={tuckingMatch}
              onClick={() => onSelectMatch(tuckingMatch)}
              className="border-t-0 shadow-lg"
            />
          </div>
        )}
      </section>

      {/* 6. Live Right Now Horizontal Rail */}
      <section className="pt-6">
        <div className="px-5 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-live-pulse" />
            <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
              Live Right Now
            </h3>
            <span className="px-2 py-0.2 rounded-full bg-[#FF3B30]/20 text-[#FF3B30] text-[10px] font-bold">
              {liveMatches.length}
            </span>
          </div>

          <button
            onClick={onNavigateToScores}
            className="text-xs text-[#A5B0A6] hover:text-[#C8FF2E] font-medium"
          >
            See all
          </button>
        </div>

        <div className="pl-5 pr-2 flex items-center gap-3 overflow-x-auto no-scrollbar">
          {liveMatches.map((m) => (
            <div key={m.id} className="w-[280px] shrink-0">
              <LiveMatchRow match={m} onClick={() => onSelectMatch(m)} />
            </div>
          ))}
        </div>
      </section>

      {/* 7. FEATURED COURTS SECTION (CRITICAL: APPEARS ABOVE "UPCOMING FOR YOU") */}
      <section className="px-5 pt-7">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00E599]" />
              <h3 className="font-display font-black text-base text-[#F4F7F0] tracking-tight">
                Featured Courts
              </h3>
            </div>
            <p className="text-[11px] text-[#A5B0A6]">
              Real courts registered on SportSync • Live verified rates
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
            <span>See All ({venues.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Featured Court Cards Rail */}
        <div className="space-y-3.5">
          {featuredCourts.slice(0, 2).map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              variant="featured"
              onClick={() => onSelectVenue(venue)}
            />
          ))}

          {/* Dedicated Search Courts Quick Link Banner */}
          <div
            onClick={() => onNavigateToVenues()}
            className="p-4 rounded-2xl bg-gradient-to-r from-[#141A15] to-[#1C241E] border border-white/10 flex items-center justify-between cursor-pointer hover:border-[#C8FF2E]/40 transition-all press-scale"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 flex items-center justify-center text-[#C8FF2E]">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-xs text-[#F4F7F0]">Explore All Sports Facilities</h4>
                <p className="text-[10px] text-[#A5B0A6]">Filter by 9 sports, metro cities & instant booking</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#C8FF2E]">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* 8. UPCOMING FOR YOU / PICKUP GAMES (APPEARS BELOW FEATURED COURTS) */}
      <section className="px-5 pt-7">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
              Upcoming For You
            </h3>
            <p className="text-[11px] text-[#A5B0A6]">Join an active squad and get on the pitch</p>
          </div>
          <button
            onClick={onNavigateToPlay}
            className="text-xs text-[#C8FF2E] font-semibold flex items-center gap-0.5 hover:underline"
          >
            <span>Explore Games</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {COMMUNITY_GAMES.slice(0, 3).map((game) => (
            <MatchCard
              key={game.id}
              game={game}
              onClick={() => onSelectGame(game)}
            />
          ))}
        </div>
      </section>

      {/* 9. Squad Activity Feed */}
      <section className="px-5 pt-7">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
            Squad Activity
          </h3>
          <span className="text-xs text-[#A5B0A6]">8 friends playing</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
          {FRIENDS.slice(0, 3).map((friend) => (
            <div key={friend.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar id={friend.avatarId} size={32} />
                <div className="min-w-0">
                  <span className="font-display font-semibold text-[#F4F7F0] truncate block">
                    {friend.name}
                  </span>
                  <span className="text-[11px] text-[#A5B0A6] truncate block">
                    {friend.activity}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#C8FF2E] bg-[#C8FF2E]/10 px-2 py-0.5 rounded-full shrink-0">
                Lv.{friend.level}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
