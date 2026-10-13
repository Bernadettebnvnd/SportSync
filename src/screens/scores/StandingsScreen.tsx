import React, { useState } from 'react';
import { ArrowLeft, Trophy, Award, Flame } from 'lucide-react';
import { LEAGUES, TEAMS } from '../../mock/mockData';
import { StandingsTable } from '../../design-system/components/StandingsTable';
import { Team } from '../../mock/types';

interface StandingsScreenProps {
  onBack: () => void;
  onSelectTeam: (team: Team) => void;
}

export const StandingsScreen: React.FC<StandingsScreenProps> = ({ onBack, onSelectTeam }) => {
  const [activeLeagueId, setActiveLeagueId] = useState('premier-cup');
  const [activeTab, setActiveTab] = useState<'table' | 'scorers' | 'form'>('table');

  const league = LEAGUES.find((l) => l.id === activeLeagueId) || LEAGUES[0];

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Header */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="font-display font-black text-base text-[#F4F7F0]">
          Standings & Leagues
        </h1>

        <div className="w-10" />
      </div>

      {/* 2. League Selector Tabs */}
      <div className="px-5 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {LEAGUES.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveLeagueId(l.id)}
            className={`h-9 px-4 rounded-full text-xs font-semibold shrink-0 transition-all border ${
              activeLeagueId === l.id
                ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold shadow-sm'
                : 'bg-[#1C241E] text-[#A5B0A6] border-white/5'
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* 3. Sub Tabs (Table, Top Scorers, Form) */}
      <div className="px-5 py-2">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#141A15] border border-white/5">
          {[
            { id: 'table', label: 'League Table' },
            { id: 'scorers', label: 'Top Scorers' },
            { id: 'form', label: 'Form Guide' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-xl text-center transition-all ${
                  isActive
                    ? 'bg-[#1C241E] text-[#C8FF2E] border border-white/10 font-bold'
                    : 'text-[#A5B0A6]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Table / Content Area */}
      <div className="px-5 pt-3">
        {activeTab === 'table' && (
          <StandingsTable
            league={league}
            onSelectTeam={onSelectTeam}
          />
        )}

        {activeTab === 'scorers' && (
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
            <h3 className="font-display font-bold text-sm text-[#F4F7F0] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#C8FF2E]" />
              Golden Boot Leaderboard
            </h3>
            <div className="divide-y divide-white/5">
              {league.topScorers.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-display font-bold text-xs text-[#A5B0A6] w-5">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-semibold text-[#F4F7F0] block">{s.player}</span>
                      <span className="text-[10px] text-[#A5B0A6]">{s.team}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-black text-sm text-[#C8FF2E] tabular-nums">
                      {s.goals} Goals
                    </span>
                    <span className="text-[10px] text-[#6F7B71] block">{s.assists} Assists</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'form' && (
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2 text-xs">
            <h4 className="font-bold text-[#F4F7F0]">Weekly Streak Ratings</h4>
            <p className="text-[#A5B0A6] text-[11px]">
              Northgate FC and Riverside United lead the momentum power rankings with 4 wins in last 5 games.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
