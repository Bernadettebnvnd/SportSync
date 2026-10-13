import React from 'react';

export interface DateItem {
  id: string;
  dayName: string; // 'Mon', 'Tue', 'Wed', etc.
  dateNumber: number; // 12, 13, 14, etc.
  month?: string; // 'Oct'
  isToday?: boolean;
}

interface DateStripProps {
  dates?: DateItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  variant?: 'pill-week' | 'circular-booking';
  className?: string;
}

const DEFAULT_WEEK_DATES: DateItem[] = [
  { id: 'd1', dayName: 'Mon', dateNumber: 12 },
  { id: 'd2', dayName: 'Tue', dateNumber: 13, isToday: true },
  { id: 'd3', dayName: 'Wed', dateNumber: 14 },
  { id: 'd4', dayName: 'Thu', dateNumber: 15 },
  { id: 'd5', dayName: 'Fri', dateNumber: 16 },
  { id: 'd6', dayName: 'Sat', dateNumber: 17 },
  { id: 'd7', dayName: 'Sun', dateNumber: 18 },
];

export const DateStrip: React.FC<DateStripProps> = ({
  dates = DEFAULT_WEEK_DATES,
  selectedId,
  onSelect,
  variant = 'pill-week',
  className = '',
}) => {
  if (variant === 'circular-booking') {
    // Ref C: Circular date chips, solid lime when selected
    return (
      <div className={`flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-1 ${className}`}>
        {dates.map((d) => {
          const isSelected = d.id === selectedId;
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={`w-14 h-18 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all press-scale shrink-0 ${
                isSelected
                  ? 'bg-[#C8FF2E] text-[#0B0F0C] font-semibold shadow-[0_0_20px_rgba(200,255,46,0.3)]'
                  : 'bg-[#1C241E] text-[#A5B0A6] border border-white/5 hover:border-white/15 hover:text-[#F4F7F0]'
              }`}
            >
              <span className={`text-[11px] uppercase tracking-wider ${isSelected ? 'text-[#0B0F0C]/80' : 'text-[#6F7B71]'}`}>
                {d.dayName}
              </span>
              <span className="font-display font-bold text-lg tabular-nums">{d.dateNumber}</span>
              {d.isToday && (
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#0B0F0C]' : 'bg-[#C8FF2E]'}`} />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Ref A: Week date strip with pill-shaped days, today highlighted with a lime ring
  return (
    <div className={`flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-1 ${className}`}>
      {dates.map((d) => {
        const isSelected = d.id === selectedId;
        return (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            className={`flex-1 min-w-[44px] py-2.5 rounded-full flex flex-col items-center justify-center transition-all press-scale relative ${
              isSelected
                ? 'bg-[#141A15] text-[#C8FF2E] ring-2 ring-[#C8FF2E] shadow-[0_0_16px_rgba(200,255,46,0.2)]'
                : d.isToday
                ? 'bg-[#1C241E] text-[#F4F7F0] ring-1 ring-[#C8FF2E]/60'
                : 'bg-[#1C241E] text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-[#263028]'
            }`}
          >
            <span className="text-[10px] uppercase font-medium tracking-tight opacity-75">{d.dayName}</span>
            <span className="font-display font-bold text-sm tabular-nums mt-0.5">{d.dateNumber}</span>
            {d.isToday && !isSelected && (
              <span className="w-1 h-1 rounded-full bg-[#C8FF2E] absolute bottom-1" />
            )}
          </button>
        );
      })}
    </div>
  );
};
