import React from 'react';
import { TeamCrest } from '../../illustrations/TeamCrests';
import { Match } from '../../mock/types';
import { AvatarStack } from './AvatarStack';

interface LiveMatchRowProps {
  match: Match;
  onClick?: () => void;
  className?: string;
}

export const LiveMatchRow: React.FC<LiveMatchRowProps> = ({ match, onClick, className = '' }) => {
  return (
    <div
      onClick={onClick}
      className={`w-full bg-[#141A15] hover:bg-[#1C241E] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all press-scale cursor-pointer flex flex-col gap-3 ${className}`}
    >
      {/* Top Header: League & Status Badge */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#A5B0A6] font-medium tracking-tight truncate max-w-[200px]">
          {match.leagueName} • {match.matchday}
        </span>

        {match.status === 'LIVE' ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30 font-semibold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-live-pulse" />
            <span>LIVE {match.minute ? `${match.minute}'` : ''}</span>
          </div>
        ) : match.status === 'FINISHED' ? (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-[#A5B0A6] border border-white/10 font-bold text-[10px]">
            <span>FT</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1C241E] text-[#C8FF2E] border border-[#C8FF2E]/30 font-semibold text-[11px]">
            <span>{match.time}</span>
          </div>
        )}
      </div>

      {/* Main Scoreboard Row */}
      <div className="grid grid-cols-12 items-center gap-2">
        {/* Home Team */}
        <div className="col-span-5 flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#1C241E] p-1 flex items-center justify-center shrink-0 border border-white/10">
            <TeamCrest id={match.homeTeam.crestId} size={24} />
          </div>
          <span className="font-display font-semibold text-sm text-[#F4F7F0] truncate">
            {match.homeTeam.name}
          </span>
        </div>

        {/* Tabular Score Center */}
        <div className="col-span-2 flex items-center justify-center">
          <div className={`bg-[#1C241E] px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 font-display font-bold text-base tabular-nums ${
            match.status === 'LIVE' ? 'text-[#C8FF2E]' : 'text-[#F4F7F0]'
          }`}>
            <span>{match.homeScore ?? 0}</span>
            <span className="text-[#6F7B71] text-xs">:</span>
            <span>{match.awayScore ?? 0}</span>
          </div>
        </div>

        {/* Away Team */}
        <div className="col-span-5 flex items-center justify-end gap-2.5 min-w-0 text-right">
          <span className="font-display font-semibold text-sm text-[#F4F7F0] truncate">
            {match.awayTeam.name}
          </span>
          <div className="w-8 h-8 rounded-full bg-[#1C241E] p-1 flex items-center justify-center shrink-0 border border-white/10">
            <TeamCrest id={match.awayTeam.crestId} size={24} />
          </div>
        </div>
      </div>

      {/* Bottom Row: Watching avatars & venue */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-[#6F7B71]">
        <div className="flex items-center gap-2">
          <AvatarStack
            avatars={['martin', 'alex', 'elena']}
            size={18}
            overflowCount={parseInt(match.watchingCount)}
          />
          <span className="text-[#A5B0A6] text-[11px]">{match.watchingCount} watching</span>
        </div>
        <span className="text-[11px] truncate max-w-[130px]">{match.venueName}</span>
      </div>
    </div>
  );
};
