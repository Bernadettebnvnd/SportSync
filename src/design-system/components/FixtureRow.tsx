import React, { useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { TeamCrest } from '../../illustrations/TeamCrests';
import { Match } from '../../mock/types';

interface FixtureRowProps {
  match: Match;
  onClick?: () => void;
  className?: string;
}

export const FixtureRow: React.FC<FixtureRowProps> = ({ match, onClick, className = '' }) => {
  const [isReminderSet, setIsReminderSet] = useState(false);

  return (
    <div
      onClick={onClick}
      className={`w-full bg-[#141A15] hover:bg-[#1C241E] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all press-scale cursor-pointer flex items-center justify-between gap-3 ${className}`}
    >
      {/* Left: Teams and Match info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-[#A5B0A6] mb-2">
          <span>{match.leagueName}</span>
          <span>•</span>
          <span className="text-[#F4F7F0] font-medium">{match.date}</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#1C241E] p-0.5 flex items-center justify-center shrink-0">
              <TeamCrest id={match.homeTeam.crestId} size={16} />
            </div>
            <span className="font-display font-medium text-sm text-[#F4F7F0] truncate">
              {match.homeTeam.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#1C241E] p-0.5 flex items-center justify-center shrink-0">
              <TeamCrest id={match.awayTeam.crestId} size={16} />
            </div>
            <span className="font-display font-medium text-sm text-[#F4F7F0] truncate">
              {match.awayTeam.name}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Kickoff Time & Reminder Bell Toggle */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="bg-[#1C241E] px-3 py-1.5 rounded-xl border border-white/10 font-display font-bold text-sm text-[#C8FF2E] tabular-nums">
          {match.time}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsReminderSet(!isReminderSet);
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all press-scale border ${
            isReminderSet
              ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
              : 'bg-[#1C241E] text-[#6F7B71] border-white/10 hover:text-[#F4F7F0]'
          }`}
          title={isReminderSet ? 'Reminder Set' : 'Set Match Reminder'}
        >
          {isReminderSet ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
