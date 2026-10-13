import React from 'react';
import { TeamCrest } from '../../illustrations/TeamCrests';
import { Match } from '../../mock/types';

interface HeroEventCardProps {
  match: Match;
  onClick?: () => void;
  className?: string;
}

export const HeroEventCard: React.FC<HeroEventCardProps> = ({ match, onClick, className = '' }) => {
  return (
    <div
      onClick={onClick}
      className={`relative w-full cursor-pointer select-none transition-all duration-200 press-scale ${className}`}
    >
      {/* Lime Flooded Main Container */}
      <div className="relative w-full bg-[#C8FF2E] text-[#0B0F0C] rounded-t-[28px] rounded-b-[20px] p-5 pb-7 shadow-[0_12px_36px_rgba(200,255,46,0.22)] overflow-hidden">
        {/* Subtle Decorative Stadium Floodlight Ring */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full border-[20px] border-black/5 pointer-events-none" />

        {/* Top Header Row: League & Status Badge */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0B0F0C]" />
            <span className="font-display font-bold text-xs uppercase tracking-wider text-[#0B0F0C]/90">
              {match.leagueName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B0F0C] text-[#C8FF2E] text-[11px] font-semibold tracking-wide">
            {match.status === 'LIVE' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-live-pulse" />
                <span>LIVE {match.minute ? `• ${match.minute}'` : ''}</span>
              </>
            ) : (
              <span>UPCOMING</span>
            )}
          </div>
        </div>

        {/* Center Face-off: Team Crests in Circular Wells & Big Tabular Score */}
        <div className="grid grid-cols-7 items-center justify-between py-1">
          {/* Home Team */}
          <div className="col-span-2 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md p-2 flex items-center justify-center shadow-inner mb-1.5 border border-black/5">
              <TeamCrest id={match.homeTeam.crestId} size={38} />
            </div>
            <span className="font-display font-bold text-sm tracking-tight text-[#0B0F0C] truncate max-w-[85px]">
              {match.homeTeam.shortName}
            </span>
            <span className="text-[10px] text-[#0B0F0C]/70 truncate max-w-[85px]">
              {match.homeTeam.city}
            </span>
          </div>

          {/* Center Meta & Score */}
          <div className="col-span-3 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-medium tracking-wide text-[#0B0F0C]/80 mb-0.5">
              {match.status === 'LIVE' ? `${match.matchday} • HT ${match.minute}'` : match.time}
            </span>

            {match.status === 'LIVE' || match.status === 'FINISHED' ? (
              <div className="flex items-center gap-2 font-display font-black text-4xl tracking-tighter tabular-nums text-[#0B0F0C]">
                <span>{match.homeScore ?? 0}</span>
                <span className="opacity-40 text-2xl font-normal">:</span>
                <span>{match.awayScore ?? 0}</span>
              </div>
            ) : (
              <div className="font-display font-bold text-xl text-[#0B0F0C] py-1">
                VS
              </div>
            )}

            <span className="text-[10px] uppercase font-semibold text-[#0B0F0C]/70 mt-1">
              {match.venueName}
            </span>
          </div>

          {/* Away Team */}
          <div className="col-span-2 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md p-2 flex items-center justify-center shadow-inner mb-1.5 border border-black/5">
              <TeamCrest id={match.awayTeam.crestId} size={38} />
            </div>
            <span className="font-display font-bold text-sm tracking-tight text-[#0B0F0C] truncate max-w-[85px]">
              {match.awayTeam.shortName}
            </span>
            <span className="text-[10px] text-[#0B0F0C]/70 truncate max-w-[85px]">
              {match.awayTeam.city}
            </span>
          </div>
        </div>

        {/* Footer Meta Row */}
        <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-xs text-[#0B0F0C]/80 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0B0F0C]" />
            {match.watchingCount} watching live
          </span>
          <span className="font-semibold underline underline-offset-2">View Match Center →</span>
        </div>
      </div>

      {/* Signature Concave Notch Cutout (Bottom Edge Arch) */}
      <div className="relative w-full -mt-2.5 flex justify-center z-10 pointer-events-none">
        <svg
          viewBox="0 0 350 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-6 text-[#0B0F0C] drop-shadow-sm"
          preserveAspectRatio="none"
        >
          {/* Concave cutout curve tucking the bottom card in */}
          <path
            d="M0 0C60 0 110 24 175 24C240 24 290 0 350 0V24H0V0Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  );
};
