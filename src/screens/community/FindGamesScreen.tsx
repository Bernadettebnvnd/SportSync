import React, { useState } from 'react';
import { ArrowLeft, MapPin, List, Map as MapIcon, SlidersHorizontal, Zap } from 'lucide-react';
import { SearchBar } from '../../design-system/components/SearchBar';
import { MatchCard } from '../../design-system/components/MatchCard';
import { COMMUNITY_GAMES } from '../../mock/mockData';
import { CommunityGame } from '../../mock/types';

interface FindGamesScreenProps {
  games?: CommunityGame[];
  onBack: () => void;
  onSelectGame: (game: CommunityGame) => void;
}

export const FindGamesScreen: React.FC<FindGamesScreenProps> = ({
  games = COMMUNITY_GAMES,
  onBack,
  onSelectGame,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'today'>('all');

  const filteredGames = games.filter((g) => {
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
      return left <= 2 && left > 0;
    }
    if (activeFilter === 'today') {
      return g.date.toLowerCase().includes('today');
    }
    return true;
  });

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Header with View Toggle (Map / List) */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="font-display font-black text-base text-[#F4F7F0]">
          Find Pickup Games
        </h1>

        {/* List / Map Toggle */}
        <div className="flex bg-[#1C241E] p-1 rounded-full border border-white/10">
          <button
            onClick={() => setViewMode('list')}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              viewMode === 'list' ? 'bg-[#C8FF2E] text-[#0B0F0C]' : 'text-[#A5B0A6]'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              viewMode === 'map' ? 'bg-[#C8FF2E] text-[#0B0F0C]' : 'text-[#A5B0A6]'
            }`}
          >
            <MapIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Search & Filters */}
      <div className="px-5 py-2 space-y-2">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Filter by sport, location..."
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

      {/* 3. Main Viewport: List or Map */}
      <div className="px-5 pt-3">
        {viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredGames.map((game) => (
              <MatchCard
                key={game.id}
                game={game}
                onClick={() => onSelectGame(game)}
              />
            ))}
          </div>
        ) : (
          /* Map View with Interactive Pins */
          <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-white/10 bg-[#1C241E]">
            <img
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80"
              alt="Map Background"
              className="w-full h-full object-cover filter brightness-50"
            />
            {/* Interactive Pins on Map */}
            {filteredGames.slice(0, 4).map((game, idx) => (
              <button
                key={game.id}
                onClick={() => onSelectGame(game)}
                style={{
                  top: `${25 + idx * 20}%`,
                  left: `${20 + (idx % 2) * 45}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-[#0B0F0C]/90 backdrop-blur-md border border-[#C8FF2E] shadow-xl flex items-center gap-1.5 press-scale group hover:scale-105"
              >
                <span className="w-2 h-2 rounded-full bg-[#FF8FC7] animate-live-pulse" />
                <span className="text-xs font-bold text-[#F4F7F0]">{game.format}</span>
                <span className="text-[10px] text-[#C8FF2E] font-semibold">
                  {game.spotsTotal - game.spotsJoined} left
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
