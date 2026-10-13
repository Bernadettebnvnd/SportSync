import React from 'react';

interface PlayerDot {
  name: string;
  num: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  role: string;
}

interface PitchLineupProps {
  formation?: string; // e.g. "4-3-3"
  teamName?: string;
  players?: PlayerDot[];
  className?: string;
}

const DEFAULT_LINEUP: PlayerDot[] = [
  { name: 'R. Ramos (GK)', num: 1, x: 50, y: 88, role: 'GK' },
  { name: 'T. Cole', num: 2, x: 18, y: 70, role: 'RB' },
  { name: 'K. Moore', num: 4, x: 38, y: 72, role: 'CB' },
  { name: 'A. Silva', num: 5, x: 62, y: 72, role: 'CB' },
  { name: 'M. Shaw', num: 3, x: 82, y: 70, role: 'LB' },
  { name: 'D. Rice', num: 6, x: 35, y: 50, role: 'CM' },
  { name: 'L. Varga (C)', num: 10, x: 65, y: 48, role: 'CAM' },
  { name: 'S. Gnabry', num: 7, x: 20, y: 28, role: 'RW' },
  { name: 'E. Palmer', num: 8, x: 50, y: 34, role: 'CM' },
  { name: 'H. Barnes', num: 11, x: 80, y: 28, role: 'LW' },
  { name: 'O. Watkins', num: 9, x: 50, y: 14, role: 'ST' },
];

export const PitchLineup: React.FC<PitchLineupProps> = ({
  formation = '4-3-3 Attacking',
  teamName = 'Northgate FC',
  players = DEFAULT_LINEUP,
  className = '',
}) => {
  return (
    <div className={`p-4 rounded-2xl bg-[#141A15] border border-white/5 select-none ${className}`}>
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="font-display font-bold text-[#F4F7F0]">{teamName}</span>
        <span className="px-2.5 py-0.5 rounded-full bg-[#1C241E] text-[#C8FF2E] font-display font-semibold text-[11px] border border-white/10">
          {formation}
        </span>
      </div>

      {/* Illustrated Pitch Canvas (Ref B color palette: Deep Forest #0F2A22 & Clay #C8432B) */}
      <div className="relative w-full h-[360px] rounded-2xl bg-[#0F2A22] border-2 border-white/10 overflow-hidden shadow-inner">
        {/* Pitch Lines */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {/* Halfway line */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          {/* Center Circle */}
          <circle cx="50" cy="50" r="14" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
          <circle cx="50" cy="50" r="1.5" fill="rgba(255,255,255,0.4)" />
          {/* Top Penalty Box */}
          <rect x="24" y="0" width="52" height="20" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
          <rect x="36" y="0" width="28" height="8" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
          {/* Bottom Penalty Box */}
          <rect x="24" y="80" width="52" height="20" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
          <rect x="36" y="92" width="28" height="8" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
        </svg>

        {/* Player Dots */}
        {players.map((p, idx) => (
          <div
            key={idx}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-transform hover:scale-110"
          >
            <div className="w-7 h-7 rounded-full bg-[#141A15] border-2 border-[#C8FF2E] flex items-center justify-center font-display font-bold text-[11px] text-[#C8FF2E] shadow-[0_0_12px_rgba(200,255,46,0.3)]">
              {p.num}
            </div>
            <span className="text-[10px] font-semibold text-white bg-[#0B0F0C]/85 px-1.5 py-0.2 rounded-full whitespace-nowrap mt-0.5 border border-white/10">
              {p.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
