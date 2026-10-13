import React, { useState } from 'react';
import { Bell, ChevronRight, Sparkles, MapPin, ArrowRight } from 'lucide-react';
import { UserAvatar } from '../../illustrations/Avatars';
import { Chip } from '../../design-system/components/Chip';
import { HeroEventCard } from '../../design-system/components/HeroEventCard';
import { LiveMatchRow } from '../../design-system/components/LiveMatchRow';
import { MatchCard } from '../../design-system/components/MatchCard';
import { VenueCard } from '../../design-system/components/VenueCard';
import { MATCHES, COMMUNITY_GAMES, VENUES, FRIENDS, CURRENT_USER } from '../../mock/mockData';
import { Match, CommunityGame, Venue } from '../../mock/types';
import { APP_CONFIG } from '../../config/appConfig';

interface DiscoverScreenProps {
  onSelectMatch: (match: Match) => void;
  onSelectGame: (game: CommunityGame) => void;
  onSelectVenue: (venue: Venue) => void;
  onOpenNotifications: () => void;
  onNavigateToScores: () => void;
  onNavigateToPlay: () => void;
  onNavigateToVenues: () => void;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  onSelectMatch,
  onSelectGame,
  onSelectVenue,
  onOpenNotifications,
  onNavigateToScores,
  onNavigateToPlay,
  onNavigateToVenues,
}) => {
  const [activeSport, setActiveSport] = useState<string>('All');
  const liveMatches = MATCHES.filter((m) => m.status === 'LIVE');
  const heroMatch = liveMatches[0] || MATCHES[0];
  const tuckingMatch = MATCHES[1]; // Second match tucking under the lime hero card!

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Header: Greeting + Avatar + Bell */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar id={CURRENT_USER.avatarId} size={42} showBadge badgeLevel={CURRENT_USER.level} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#A5B0A6]">Good morning 👋</span>
              <span className="px-2 py-0.2 rounded-full bg-[#1C241E] text-[#C8FF2E] text-[10px] font-bold border border-white/10">
                Lv.{CURRENT_USER.level}
              </span>
            </div>
            <h2 className="font-display font-black text-base text-[#F4F7F0] tracking-tight">
              {CURRENT_USER.name}
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

      {/* 2. Editorial Heading: Sora bold + Instrument Serif Italic */}
      <div className="px-5 py-3">
        <h1 className="text-3xl tracking-tight leading-tight text-[#F4F7F0]">
          <span className="font-display font-bold">Choose your </span>
          <span className="font-editorial text-[#C8FF2E] text-4xl font-normal">
            Favorite game
          </span>
        </h1>
      </div>

      {/* 3. Horizontal Sport Chips */}
      <div className="px-5 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {['All', 'Football', 'Basketball', 'Tennis', 'Padel'].map((sport) => (
          <Chip
            key={sport}
            variant="sport"
            label={sport}
            active={activeSport === sport}
            onClick={() => setActiveSport(sport)}
          />
        ))}
      </div>

      {/* 4. Top Events: Lime Notch Hero Card + Tucking Dark Card Underneath (Ref A Signature) */}
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

      {/* 5. Live Now Horizontal Rail */}
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

      {/* 6. Pickup Games Near You (Ref B Community) */}
      <section className="px-5 pt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
              Pickup Games Near You
            </h3>
            <p className="text-[11px] text-[#A5B0A6]">Join a squad and get on the pitch</p>
          </div>
          <button
            onClick={onNavigateToPlay}
            className="text-xs text-[#C8FF2E] font-semibold flex items-center gap-0.5"
          >
            <span>Explore</span>
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

      {/* 7. Friend Activity Feed (Ref B) */}
      <section className="px-5 pt-6">
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

      {/* 8. Book a Court Promo Card (Ref C Tennis Zone energy) */}
      <section className="px-5 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
            Featured Court Reservation
          </h3>
          <button
            onClick={onNavigateToVenues}
            className="text-xs text-[#C8FF2E] font-semibold"
          >
            Browse Courts
          </button>
        </div>

        <VenueCard
          venue={VENUES[0]}
          onClick={() => onSelectVenue(VENUES[0])}
        />
      </section>
    </div>
  );
};
