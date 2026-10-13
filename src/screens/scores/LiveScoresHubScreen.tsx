import React, { useState } from 'react';
import { SearchBar } from '../../design-system/components/SearchBar';
import { DateStrip } from '../../design-system/components/DateStrip';
import { Chip } from '../../design-system/components/Chip';
import { LiveMatchRow } from '../../design-system/components/LiveMatchRow';
import { FixtureRow } from '../../design-system/components/FixtureRow';
import { MATCHES, LEAGUES } from '../../mock/mockData';
import { Match, SportType } from '../../mock/types';
import { Trophy, Filter, ArrowUpDown } from 'lucide-react';

interface LiveScoresHubScreenProps {
  onSelectMatch: (match: Match) => void;
  onOpenLeagueStandings: (leagueId: string) => void;
}

export const LiveScoresHubScreen: React.FC<LiveScoresHubScreenProps> = ({
  onSelectMatch,
  onOpenLeagueStandings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('d2'); // Tue 13 (Today)
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [activeSport, setActiveSport] = useState<SportType | 'All'>('All');

  const filteredMatches = MATCHES.filter((m) => {
    if (activeSport !== 'All' && m.sport !== activeSport) return false;
    if (selectedLeague !== 'all' && m.leagueId !== selectedLeague) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.homeTeam.name.toLowerCase().includes(q) ||
        m.awayTeam.name.toLowerCase().includes(q) ||
        m.leagueName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const liveMatches = filteredMatches.filter((m) => m.status === 'LIVE');
  const upcomingMatches = filteredMatches.filter((m) => m.status === 'UPCOMING');
  const finishedMatches = filteredMatches.filter((m) => m.status === 'FINISHED');

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Top Header */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl tracking-tight text-[#F4F7F0]">
            Scores Hub
          </h1>
          <p className="text-xs text-[#A5B0A6]">Live matches, fixtures & standings</p>
        </div>

        <button
          onClick={() => onOpenLeagueStandings('premier-cup')}
          className="h-9 px-3 rounded-full bg-[#1C241E] border border-white/10 text-xs font-semibold text-[#C8FF2E] flex items-center gap-1.5 press-scale hover:bg-[#263028]"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Tables</span>
        </button>
      </div>

      {/* 2. Global Search Bar */}
      <div className="px-5 py-2">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Filter matches by team or league..."
        />
      </div>

      {/* 3. Week Date Strip (Ref A Pill Days, Today Lime Ring) */}
      <div className="px-5 py-2">
        <DateStrip
          selectedId={selectedDate}
          onSelect={setSelectedDate}
          variant="pill-week"
        />
      </div>

      {/* 4. League & Sport Chips */}
      <div className="px-5 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSelectedLeague('all')}
          className={`h-8 px-3 rounded-full text-xs font-semibold shrink-0 transition-all border ${
            selectedLeague === 'all'
              ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
              : 'bg-[#1C241E] text-[#A5B0A6] border-white/5'
          }`}
        >
          All Competitions
        </button>
        {LEAGUES.map((l) => (
          <button
            key={l.id}
            onClick={() => setSelectedLeague(l.id)}
            className={`h-8 px-3 rounded-full text-xs font-semibold shrink-0 transition-all border ${
              selectedLeague === l.id
                ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                : 'bg-[#1C241E] text-[#A5B0A6] border-white/5'
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* 5. Sticky Match Sections */}
      <div className="px-5 pt-3 space-y-6">
        {/* Section A: LIVE MATCHES */}
        {liveMatches.length > 0 && (
          <div>
            <div className="sticky top-0 bg-[#0B0F0C]/95 backdrop-blur-md py-2 z-10 flex items-center justify-between border-b border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30] animate-live-pulse" />
                <h3 className="font-display font-black text-xs uppercase tracking-wider text-[#FF3B30]">
                  Live Matches
                </h3>
              </div>
              <span className="text-xs font-mono text-[#A5B0A6]">{liveMatches.length} Ongoing</span>
            </div>

            <div className="space-y-3">
              {liveMatches.map((m) => (
                <LiveMatchRow
                  key={m.id}
                  match={m}
                  onClick={() => onSelectMatch(m)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section B: UPCOMING FIXTURES */}
        {upcomingMatches.length > 0 && (
          <div>
            <div className="sticky top-0 bg-[#0B0F0C]/95 backdrop-blur-md py-2 z-10 flex items-center justify-between border-b border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C8FF2E]" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#F4F7F0]">
                  Upcoming Fixtures
                </h3>
              </div>
              <span className="text-xs text-[#A5B0A6]">{upcomingMatches.length} Games</span>
            </div>

            <div className="space-y-3">
              {upcomingMatches.map((m) => (
                <FixtureRow
                  key={m.id}
                  match={m}
                  onClick={() => onSelectMatch(m)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section C: FINISHED RESULTS */}
        {finishedMatches.length > 0 && (
          <div>
            <div className="sticky top-0 bg-[#0B0F0C]/95 backdrop-blur-md py-2 z-10 flex items-center justify-between border-b border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6F7B71]" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
                  Recent Results
                </h3>
              </div>
              <span className="text-xs text-[#6F7B71]">FT</span>
            </div>

            <div className="space-y-3">
              {finishedMatches.map((m) => (
                <LiveMatchRow
                  key={m.id}
                  match={m}
                  onClick={() => onSelectMatch(m)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
