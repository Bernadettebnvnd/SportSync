import React, { useRef } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

export interface DateItem {
  id: string;
  dayName: string; // 'Mon', 'Tue', 'Wed', etc.
  dateNumber: number; // 2, 3, 4, etc.
  month?: string; // 'Nov'
  year?: number;
  isToday?: boolean;
  fullDate?: string; // 'YYYY-MM-DD'
  formatted?: string; // 'Mon, Nov 2'
}

export function generateUpcomingDates(count: number = 14): DateItem[] {
  const dates: DateItem[] = [];
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const isoString = `${year}-${month}-${day}`;

    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const formatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    dates.push({
      id: isoString,
      dayName,
      dateNumber: d.getDate(),
      month: monthName,
      year,
      isToday: isoString === todayISO,
      fullDate: isoString,
      formatted,
    });
  }

  return dates;
}

export const DYNAMIC_WEEK_DATES: DateItem[] = generateUpcomingDates(14);

interface DateStripProps {
  dates?: DateItem[];
  selectedId: string;
  onSelect: (id: string, dateItem?: DateItem) => void;
  variant?: 'pill-week' | 'circular-booking';
  className?: string;
  showCalendarPicker?: boolean;
}

export const DateStrip: React.FC<DateStripProps> = ({
  dates: initialDates,
  selectedId,
  onSelect,
  variant = 'pill-week',
  className = '',
  showCalendarPicker = true,
}) => {
  const [dates, setDates] = React.useState<DateItem[]>(() => initialDates || generateUpcomingDates(14));
  const dateInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initialDates && initialDates.length > 0) {
      setDates(initialDates);
    }
  }, [initialDates]);

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;

    // Disallow past dates
    if (value < todayISO) return;

    const parts = value.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const formatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      const newDateItem: DateItem = {
        id: value,
        dayName,
        dateNumber: d.getDate(),
        month: monthName,
        year,
        isToday: value === todayISO,
        fullDate: value,
        formatted,
      };

      if (!dates.some((di) => di.id === value || di.fullDate === value)) {
        setDates((prev) => [...prev, newDateItem].sort((a, b) => (a.fullDate || a.id).localeCompare(b.fullDate || b.id)));
      }

      onSelect(value, newDateItem);
    }
  };

  if (variant === 'circular-booking') {
    return (
      <div className={`flex items-center gap-2.5 overflow-x-auto no-scrollbar py-2 px-1 ${className}`}>
        {dates.map((d) => {
          const isSelected = d.id === selectedId || d.fullDate === selectedId;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.id, d)}
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

        {showCalendarPicker && (
          <div className="relative shrink-0">
            <input
              ref={dateInputRef}
              type="date"
              min={todayISO}
              onChange={handleCustomDateChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              aria-label="Pick custom date from calendar"
            />
            <button
              type="button"
              onClick={() => dateInputRef.current?.showPicker?.()}
              className="w-14 h-18 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all press-scale bg-[#141A15] text-[#A5B0A6] border border-dashed border-white/20 hover:border-[#C8FF2E] hover:text-[#C8FF2E]"
              title="Pick a custom future date"
            >
              <CalendarIcon className="w-5 h-5" />
              <span className="text-[10px] uppercase font-bold tracking-tight">More</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Ref A: Week date strip with pill-shaped days, today highlighted with a lime ring
  return (
    <div className={`flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-1 ${className}`}>
      {dates.map((d) => {
        const isSelected = d.id === selectedId || d.fullDate === selectedId;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id, d)}
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

      {showCalendarPicker && (
        <div className="relative shrink-0">
          <input
            ref={dateInputRef}
            type="date"
            min={todayISO}
            onChange={handleCustomDateChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            aria-label="Pick date from calendar"
          />
          <button
            type="button"
            onClick={() => dateInputRef.current?.showPicker?.()}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1C241E] text-[#A5B0A6] border border-dashed border-white/20 hover:border-[#C8FF2E] hover:text-[#C8FF2E] transition-all press-scale"
            title="Pick a custom date"
          >
            <CalendarIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
