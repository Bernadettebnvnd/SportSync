import React from 'react';
import { League, Team } from '../../mock/types';
import { TeamCrest } from '../../illustrations/TeamCrests';

interface StandingsTableProps {
  league: League;
  highlightTeamId?: string;
  onSelectTeam?: (team: Team) => void;
  className?: string;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({
  league,
  highlightTeamId = 'northgate',
  onSelectTeam,
  className = '',
}) => {
  return (
    <div className={`w-full rounded-2xl bg-[#141A15] border border-white/5 overflow-hidden select-none ${className}`}>
      {/* Table Header */}
      <div className="grid grid-cols-12 px-3 py-2.5 bg-[#1C241E] text-[10px] font-bold text-[#6F7B71] uppercase tracking-wider border-b border-white/5">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-5">Club</div>
        <div className="col-span-1 text-center">PL</div>
        <div className="col-span-1 text-center">GD</div>
        <div className="col-span-1 text-center font-bold text-[#F4F7F0]">PTS</div>
        <div className="col-span-3 text-right pr-1">Form</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/5">
        {league.standings.map((row) => {
          const isHighlighted = row.team.id === highlightTeamId;

          // Qualification zone colored left bar
          let zoneBar = 'border-l-2 border-transparent';
          if (row.zone === 'champions') {
            zoneBar = 'border-l-2 border-[#C8FF2E]';
          } else if (row.zone === 'europa') {
            zoneBar = 'border-l-2 border-[#FF8FC7]';
          } else if (row.zone === 'relegation') {
            zoneBar = 'border-l-2 border-[#FF5C5C]';
          }

          return (
            <div
              key={row.team.id}
              onClick={() => onSelectTeam?.(row.team)}
              className={`grid grid-cols-12 items-center px-3 py-3 transition-colors press-scale cursor-pointer ${zoneBar} ${
                isHighlighted ? 'bg-[#C8FF2E]/10' : 'hover:bg-white/5'
              }`}
            >
              {/* Rank */}
              <div className="col-span-1 text-center font-display font-bold text-xs tabular-nums text-[#A5B0A6]">
                {row.rank}
              </div>

              {/* Club */}
              <div className="col-span-5 flex items-center gap-2 min-w-0">
                <TeamCrest id={row.team.crestId} size={20} />
                <span
                  className={`font-display text-xs truncate ${
                    isHighlighted ? 'font-bold text-[#C8FF2E]' : 'font-semibold text-[#F4F7F0]'
                  }`}
                >
                  {row.team.name}
                </span>
              </div>

              {/* Played */}
              <div className="col-span-1 text-center text-xs tabular-nums text-[#A5B0A6]">
                {row.played}
              </div>

              {/* GD */}
              <div className="col-span-1 text-center text-xs tabular-nums text-[#A5B0A6]">
                {row.gd > 0 ? `+${row.gd}` : row.gd}
              </div>

              {/* Points */}
              <div className="col-span-1 text-center font-display font-bold text-xs tabular-nums text-[#F4F7F0]">
                {row.points}
              </div>

              {/* Form Dots */}
              <div className="col-span-3 flex items-center justify-end gap-1 pr-1">
                {row.form.slice(-4).map((f, fIdx) => {
                  const formColors = {
                    W: 'bg-[#3DDC84] text-[#0B0F0C]',
                    D: 'bg-[#FFC247] text-[#0B0F0C]',
                    L: 'bg-[#FF5C5C] text-white',
                  }[f];

                  return (
                    <span
                      key={fIdx}
                      className={`w-4 h-4 rounded-full flex items-center justify-center font-display font-black text-[9px] ${formColors}`}
                    >
                      {f}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="px-3 py-2 bg-[#0B0F0C] border-t border-white/5 flex items-center gap-3 text-[10px] text-[#6F7B71]">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF2E]" /> Champions Zone
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF8FC7]" /> Continental
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C5C]" /> Relegation
        </span>
      </div>
    </div>
  );
};
