import React, { useState } from 'react';
import { ArrowLeft, Play, Share2, Star, MessageSquare } from 'lucide-react';
import { TeamCrest } from '../../illustrations/TeamCrests';
import { Match } from '../../mock/types';
import { MomentumChart } from '../../design-system/components/MomentumChart';
import { PitchLineup } from '../../design-system/components/PitchLineup';
import { Button } from '../../design-system/components/Button';
import { ChatBubble, ChatMessage } from '../../design-system/components/ChatBubble';

interface MatchCenterScreenProps {
  match: Match;
  onBack: () => void;
  onWatchLive: () => void;
}

export const MatchCenterScreen: React.FC<MatchCenterScreenProps> = ({
  match,
  onBack,
  onWatchLive,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'lineups' | 'timeline' | 'chat'>('overview');

  const matchChatMessages: ChatMessage[] = [
    { id: 'c1', senderName: 'Marcus Bell', avatarId: 'marcus', text: 'What a strike by Varga into the top bin!', time: '14\'' },
    { id: 'c2', senderName: 'Elena Rostova', avatarId: 'elena', text: 'Riverside pressing hard down the right wing now.', time: '28\'' },
    { id: 'c3', senderName: 'Alex Rivera', avatarId: 'alex', text: 'Second half momentum is completely shifting.', time: '55\'', isMe: true },
  ];

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Header with back button & stream action */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
          {match.leagueName}
        </span>

        <button
          onClick={onWatchLive}
          className="h-9 px-3 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-display font-bold text-xs flex items-center gap-1.5 shadow-[0_0_16px_rgba(200,255,46,0.3)] press-scale"
        >
          <Play className="w-3.5 h-3.5 fill-[#0B0F0C]" />
          <span>Stream</span>
        </button>
      </div>

      {/* 2. Hero Scoreboard Container */}
      <div className="mx-5 my-2 p-5 rounded-3xl bg-[#141A15] border border-white/10 shadow-xl">
        <div className="flex items-center justify-between text-xs text-[#A5B0A6] mb-3">
          <span>{match.matchday} • {match.venueName}</span>
          {match.status === 'LIVE' && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30 font-bold text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-live-pulse" />
              LIVE {match.minute}'
            </span>
          )}
        </div>

        <div className="grid grid-cols-7 items-center justify-between">
          {/* Home */}
          <div className="col-span-2 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#1C241E] p-2 flex items-center justify-center mb-1.5 border border-white/10 shadow-sm">
              <TeamCrest id={match.homeTeam.crestId} size={36} />
            </div>
            <span className="font-display font-bold text-sm text-[#F4F7F0] truncate max-w-[85px]">
              {match.homeTeam.shortName}
            </span>
          </div>

          {/* Score */}
          <div className="col-span-3 flex flex-col items-center text-center">
            <div className="font-display font-black text-4xl text-[#C8FF2E] tabular-nums tracking-tighter">
              {match.homeScore ?? 0} : {match.awayScore ?? 0}
            </div>
            <span className="text-[11px] text-[#A5B0A6] mt-0.5 font-medium">HT 45' (+3)</span>
          </div>

          {/* Away */}
          <div className="col-span-2 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#1C241E] p-2 flex items-center justify-center mb-1.5 border border-white/10 shadow-sm">
              <TeamCrest id={match.awayTeam.crestId} size={36} />
            </div>
            <span className="font-display font-bold text-sm text-[#F4F7F0] truncate max-w-[85px]">
              {match.awayTeam.shortName}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs (Overview, Stats, Lineups, Timeline, Chat) */}
      <div className="px-5 py-2">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#141A15] border border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'stats', label: 'Stats' },
            { id: 'lineups', label: 'Lineups' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'chat', label: 'Fan Chat' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[70px] py-2 px-2 text-xs font-semibold rounded-xl text-center transition-all ${
                  isActive
                    ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm'
                    : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Content */}
      <div className="px-5 pt-3">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Smooth Lime Momentum Chart (Ref A) */}
            <MomentumChart
              data={match.momentumData}
              homeName={match.homeTeam.shortName}
              awayName={match.awayTeam.shortName}
            />

            {/* Match Possession Bar */}
            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-[#C8FF2E]">{match.possession?.home ?? 56}%</span>
                <span className="text-[#A5B0A6] uppercase tracking-wider text-[10px]">Possession</span>
                <span className="text-[#FF8FC7]">{match.possession?.away ?? 44}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
                <div
                  style={{ width: `${match.possession?.home ?? 56}%` }}
                  className="h-full bg-[#C8FF2E]"
                />
                <div
                  style={{ width: `${match.possession?.away ?? 44}%` }}
                  className="h-full bg-[#FF8FC7]"
                />
              </div>
            </div>

            {/* Shots & Targets Comparison */}
            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A5B0A6]">
                Key Metrics
              </h4>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#F4F7F0]">{match.shots?.home ?? 13}</span>
                <span className="text-[#6F7B71]">Total Shots</span>
                <span className="font-bold text-[#F4F7F0]">{match.shots?.away ?? 8}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#F4F7F0]">{match.shotsOnTarget?.home ?? 6}</span>
                <span className="text-[#6F7B71]">Shots on Target</span>
                <span className="font-bold text-[#F4F7F0]">{match.shotsOnTarget?.away ?? 4}</span>
              </div>
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3 text-xs">
            <h4 className="font-bold text-[#F4F7F0]">Detailed Match Statistics</h4>
            <div className="divide-y divide-white/5 space-y-2">
              <div className="flex justify-between py-1">
                <span>Pass Accuracy</span>
                <span className="text-[#C8FF2E] font-bold">88% vs 82%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Fouls Committed</span>
                <span className="text-[#A5B0A6]">8 vs 11</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Corner Kicks</span>
                <span className="text-[#A5B0A6]">6 vs 3</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Offsides</span>
                <span className="text-[#A5B0A6]">2 vs 1</span>
              </div>
            </div>
          </div>
        )}

        {/* LINEUPS TAB */}
        {activeTab === 'lineups' && (
          <div className="space-y-4">
            <PitchLineup teamName={match.homeTeam.name} />
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A5B0A6]">
              Key Match Events
            </h4>
            {match.events?.map((ev, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs py-1.5 border-b border-white/5 last:border-none">
                <span className="font-display font-bold text-[#C8FF2E] tabular-nums w-8">
                  {ev.minute}'
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] uppercase font-bold text-[#F4F7F0]">
                  {ev.type.replace('_', ' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-[#F4F7F0] block truncate">{ev.player}</span>
                  {ev.detail && <span className="text-[11px] text-[#A5B0A6]">{ev.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="space-y-2">
            {matchChatMessages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
