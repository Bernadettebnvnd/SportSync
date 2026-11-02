import React from 'react';
import { Star } from 'lucide-react';

export const StatTile: React.FC<{
  value: string | number;
  label: string;
  trend?: string;
  trendPositive?: boolean;
  className?: string;
}> = ({ value, label, trend, trendPositive = true, className = '' }) => {
  const isStringValue = typeof value === 'string';
  const isLongValue = isStringValue && value.length > 5;

  return (
    <div
      className={`rounded-2xl bg-[#141A15] border border-white/5 p-3 flex flex-col justify-between h-[86px] min-h-[86px] shadow-sm hover:border-white/10 transition-colors ${className}`}
    >
      {/* Top Row: Label and Trend badge */}
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[#A5B0A6] truncate">
          {label}
        </span>
        {trend && (
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 truncate max-w-[55%] ${
              trendPositive
                ? 'bg-[#3DDC84]/15 text-[#3DDC84] border border-[#3DDC84]/30'
                : 'bg-white/5 text-[#A5B0A6] border border-white/10'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {/* Main Value */}
      <div className="flex items-baseline mt-auto">
        <span
          className={`font-display font-black text-[#F4F7F0] truncate ${
            isLongValue
              ? 'text-sm sm:text-base tracking-tight leading-tight'
              : 'text-xl sm:text-2xl tabular-nums leading-none'
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  );
};

export const LevelBadge: React.FC<{
  level: number;
  title: string;
  className?: string;
}> = ({ level, title, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#141A15] border border-[#C8FF2E]/40 select-none whitespace-nowrap shrink-0 ${className}`}
    >
      <div className="w-4 h-4 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-display font-black text-[9px] shrink-0">
        {level}
      </div>
      <span className="font-display font-bold text-[11px] text-[#F4F7F0] whitespace-nowrap">
        Lv.{level} <span className="text-[#A5B0A6] font-normal">• {title}</span>
      </span>
    </div>
  );
};

export const RatingChip: React.FC<{
  rating: number;
  className?: string;
}> = ({ rating, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#C8FF2E]/15 text-[#C8FF2E] border border-[#C8FF2E]/30 font-display font-bold text-xs tabular-nums ${className}`}
    >
      <Star className="w-3 h-3 fill-[#C8FF2E]" />
      <span>{rating.toFixed(1)}</span>
    </div>
  );
};

export const XpRing: React.FC<{
  currentXp: number;
  nextLevelXp: number;
  level: number;
  size?: number;
  className?: string;
}> = ({ currentXp, nextLevelXp, level, size = 64, className = '' }) => {
  const percentage = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full -rotate-90 overflow-visible"
      >
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={strokeWidth}
          fill="rgba(0, 0, 0, 0.3)"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#C8FF2E"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="font-display font-black text-xs text-[#F4F7F0] tabular-nums leading-none">
          Lv.{level}
        </span>
        <span className="text-[9px] text-[#A5B0A6] font-bold mt-0.5 leading-none tabular-nums">
          {percentage}%
        </span>
      </div>
    </div>
  );
};
