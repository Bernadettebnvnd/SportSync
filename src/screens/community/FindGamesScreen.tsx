import React, { useState, useMemo } from 'react';
import { ArrowLeft, MapPin, Zap } from 'lucide-react';
import { SearchBar } from '../../design-system/components/SearchBar';
import { MatchCard } from '../../design-system/components/MatchCard';
import { CommunityGame } from '../../mock/types';
import { isGameExpired } from '@/lib/utils/gameExpiration';

interface FindGamesScreenProps {
  games?: CommunityGame[];
  onBack: () => void;
  onSelectGame: (game: CommunityGame) => void;
  currentUserName?: string;
  currentUserId?: string;
}

export const FindGamesScreen: React.FC<FindGamesScreenProps> = ({
  games = [],
  onBack,
  onSelectGame,
  currentUserName,
  currentUserId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'today'>('all');

  // Memoize and deduplicate games by id to guarantee unique React keys, filtering out finished/expired games
  const filteredGames = useMemo(() => {
    const seenIds = new Set<string>();
    return games.filter((g) => {
      if (!g || !g.id || seenIds.has(g.id)) return false;
      if (isGameExpired(g)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          g.title.toLowerCase().includes(q) ||
          g.sport.toLowerCase().includes(q) ||
          g.locationName.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (activeFilter === 'urgent') {
        const left = g.spotsTotal - g.spotsJoined;
        if (!(left <= 2 && left > 0)) return false;
      }
      if (activeFilter === 'today') {
        if (!g.date.toLowerCase().includes('today')) return false;
      }

      // Hide invite-only games from public search results unless host or specifically invited
      if (g.visibility === 'Invite') {
        const name = (currentUserName || '').trim().toLowerCase();
        const id = currentUserId;
        const isHost = Boolean(
          (g.hostName && name && g.hostName.trim().toLowerCase() === name) ||
          (g.hostId && id && g.hostId === id)
        );
        const isInvited = Boolean(
          g.invitedPlayers?.some(
            (ip) => (name && ip.name.trim().toLowerCase() === name) || (id && ip.id && ip.id === id)
          )
        );
        if (!isHost && !isInvited) return false;
      }

      seenIds.add(g.id);
      return true;
    });
  }, [games, searchQuery, activeFilter, currentUserName, currentUserId]);

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Header (List-only community feed) */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="font-display font-black text-base text-[#F4F7F0]">
          Find Pickup Games
        </h1>

        <div className="w-10 h-10" aria-hidden="true" />
      </div>

      {/* 2. Search & Filters */}
      <div className="px-5 py-2 space-y-2">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Filter by sport, location in Naga City..."
        />

        {/* Urgency & Timing Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`h-8 px-3 rounded-full text-xs font-semibold shrink-0 border ${
              activeFilter === 'all'
                ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                : 'bg-[#1C241E] text-[#A5B0A6] border-white/5'
            }`}
          >
            All Pickup Games
          </button>
          <button
            onClick={() => setActiveFilter('urgent')}
            className={`h-8 px-3 rounded-full text-xs font-bold shrink-0 border flex items-center gap-1.5 ${
              activeFilter === 'urgent'
                ? 'bg-[#FF8FC7] text-[#0B0F0C] border-[#FF8FC7]'
                : 'bg-[#1C241E] text-[#FF8FC7] border-[#FF8FC7]/30'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Spots Filling Fast</span>
          </button>
          <button
            onClick={() => setActiveFilter('today')}
            className={`h-8 px-3 rounded-full text-xs font-semibold shrink-0 border ${
              activeFilter === 'today'
                ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                : 'bg-[#1C241E] text-[#A5B0A6] border-white/5'
            }`}
          >
            Playing Today
          </button>
        </div>
      </div>

      {/* 3. Main Games List */}
      <div className="px-5 pt-3">
        <div className="space-y-3">
          {filteredGames.length > 0 ? (
            filteredGames.map((game) => (
              <MatchCard
                key={game.id}
                game={game}
                onClick={() => onSelectGame(game)}
              />
            ))
          ) : (
            <div className="rounded-3xl border border-white/10 bg-[#141A15] p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1C241E] text-[#C8FF2E] flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#F4F7F0]">No pickup games in Naga City right now</h3>
                <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto">
                  No community matches currently scheduled in Naga City matching your filters. Host a game or check back soon!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
