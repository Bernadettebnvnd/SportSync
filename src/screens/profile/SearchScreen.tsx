import React, { useState } from 'react';
import { ArrowLeft, Search, TrendingUp, History, X } from 'lucide-react';
import { TEAMS, PLAYERS, VENUES, MATCHES } from '../../mock/mockData';
import { TeamCrest } from '../../illustrations/TeamCrests';
import { UserAvatar } from '../../illustrations/Avatars';

interface SearchScreenProps {
  onBack: () => void;
  onSelectItem?: (type: string, id: string) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ onBack, onSelectItem }) => {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState(['Northgate FC', 'Clay courts', 'Sunset 5v5']);

  const matchingTeams = Object.values(TEAMS).filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );
  const matchingPlayers = PLAYERS.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );
  const matchingVenues = VENUES.filter((v) =>
    v.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-28 select-none overflow-y-auto no-scrollbar">
      {/* 1. Header with Search Input */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7B71]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams, players, courts..."
            autoFocus
            className="w-full h-11 pl-10 pr-9 rounded-2xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {!query ? (
        /* Empty State: Recent & Trending Searches */
        <div className="space-y-6">
          {/* Recent */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Recent Searches
              </span>
              <button
                onClick={() => setRecentSearches([])}
                className="text-[10px] text-[#6F7B71] hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  onClick={() => setQuery(item)}
                  className="px-3 py-1.5 rounded-full bg-[#1C241E] border border-white/5 text-xs text-[#F4F7F0] hover:border-[#C8FF2E]"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Trending */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] flex items-center gap-1.5 mb-2.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#C8FF2E]" />
              Trending in Metro London
            </span>
            <div className="space-y-2">
              {[
                { label: 'Premier Cup Derby: Northgate vs Riverside', hits: '14.2K searches' },
                { label: 'Clay Court Kensington booking slots', hits: '8.4K searches' },
                { label: 'Sunset 5v5 Friday game rosters', hits: '5.1K searches' },
              ].map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(t.label.split(':')[0])}
                  className="w-full p-3 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between text-left press-scale"
                >
                  <span className="text-xs font-semibold text-[#F4F7F0]">{t.label}</span>
                  <span className="text-[10px] text-[#A5B0A6]">{t.hits}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Categorized Results */
        <div className="space-y-5">
          {/* 1. Teams */}
          {matchingTeams.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] block mb-2">
                Clubs & Teams
              </span>
              <div className="space-y-2">
                {matchingTeams.map((team) => (
                  <div
                    key={team.id}
                    className="p-3 rounded-2xl bg-[#141A15] border border-white/5 flex items-center gap-3 cursor-pointer hover:border-white/20"
                  >
                    <TeamCrest id={team.crestId} size={28} />
                    <div>
                      <h4 className="font-display font-bold text-xs text-[#F4F7F0]">{team.name}</h4>
                      <span className="text-[10px] text-[#A5B0A6]">{team.league}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Players */}
          {matchingPlayers.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] block mb-2">
                Players
              </span>
              <div className="space-y-2">
                {matchingPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="p-3 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between cursor-pointer hover:border-white/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserAvatar id={player.avatarId} size={28} />
                      <div>
                        <h4 className="font-display font-bold text-xs text-[#F4F7F0]">{player.name}</h4>
                        <span className="text-[10px] text-[#A5B0A6]">{player.position}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#C8FF2E]">{player.rating} OVR</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Venues */}
          {matchingVenues.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] block mb-2">
                Courts & Venues
              </span>
              <div className="space-y-2">
                {matchingVenues.map((venue) => (
                  <div
                    key={venue.id}
                    className="p-3 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between cursor-pointer hover:border-white/20"
                  >
                    <div>
                      <h4 className="font-display font-bold text-xs text-[#F4F7F0]">{venue.name}</h4>
                      <span className="text-[10px] text-[#A5B0A6]">{venue.surface} • {venue.city}</span>
                    </div>
                    <span className="text-xs font-bold text-[#C8FF2E]">₱{venue.pricePerHour}/hr</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
