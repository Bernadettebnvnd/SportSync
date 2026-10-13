import React from 'react';
import { Star, Award, Zap } from 'lucide-react';

export const StatTile: React.FC<{
  value: string | number;
  label: string;
  trend?: string;
  trendPositive?: boolean;
  className?: string;
}> = ({ value, label, trend, trendPositive = true, className = '' }) => {
  return (
    <div
      className={`rounded-2xl bg-[#1C241E] border border-white/5 p-3.5 flex flex-col justify-between ${className}`}
    >
      <span className="text-[11px] uppercase tracking-wider text-[#A5B0A6] font-medium">
        {label}
      </span>
      <div className="flex items-baseline justify-between mt-1">
        <span className="font-display font-black text-2xl text-[#F4F7F0] tabular-nums">
          {value}
        </span>
        {trend && (
          <span
            className={`text-[10px] font-bold ${
              trendPositive ? 'text-[#3DDC84]' : 'text-[#FF5C5C]'
            }`}
          >
            {trend}
          </span>
        )}
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
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C241E] border border-[#C8FF2E]/40 select-none ${className}`}
    >
      <div className="w-5 h-5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-display font-bold text-[10px]">
        {level}
      </div>
      <span className="font-display font-semibold text-xs text-[#F4F7F0]">
        Level {level} <span className="text-[#A5B0A6] font-normal">/ {title}</span>
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
}> = ({ currentXp, nextLevelXp, level, size = 96, className = '' }) => {
  const percentage = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
    >
      <svg className="w-full h-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
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
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display font-black text-base text-[#F4F7F0] tabular-nums leading-none">
          Lv.{level}
        </span>
        <span className="text-[10px] text-[#A5B0A6] font-medium mt-0.5">
          {percentage}%
        </span>
      </div>
    </div>
  );
};
