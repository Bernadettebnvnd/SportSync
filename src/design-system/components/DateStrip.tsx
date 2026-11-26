import React, { useEffect, useMemo, useRef } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  MANILA_TZ,
  addDaysToIsoDate,
  getManilaTodayISO,
  parseIsoDateToNoonManila,
} from '@/lib/datetime';

export interface DateItem {
  id: string;
  dayName: string; // 'Mon', 'Tue', 'Wed', etc.
  dateNumber: number; // 2, 3, 4, etc.
  month?: string; // 'Nov'
  year?: number;
  isToday?: boolean;
  fullDate?: string; // 'YYYY-MM-DD'
  formatted?: string; // 'Fri, Nov 27'
}

export function buildDateItemFromIso(isoString: string, todayISO?: string): DateItem {
  const effectiveToday = todayISO || getManilaTodayISO();
  const d = parseIsoDateToNoonManila(isoString) || new Date();
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TZ, weekday: 'short' }).format(d);
  const monthName = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TZ, month: 'short' }).format(d);
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
  const [yStr, , dayStr] = isoString.split('-');
  return {
    id: isoString,
    dayName,
    dateNumber: parseInt(dayStr || '1', 10),
    month: monthName,
    year: parseInt(yStr || String(d.getUTCFullYear()), 10),
    isToday: isoString === effectiveToday,
    fullDate: isoString,
    formatted,
  };
}

export function generateUpcomingDates(count: number = 14): DateItem[] {
  const todayISO = getManilaTodayISO();
  const dates: DateItem[] = [];
  for (let i = 0; i < count; i++) {
    const isoString = addDaysToIsoDate(todayISO, i);
    dates.push(buildDateItemFromIso(isoString, todayISO));
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
  onOpenCalendar?: () => void;
}

export const DateStrip: React.FC<DateStripProps> = ({
  dates: initialDates,
  selectedId,
  onSelect,
  variant = 'pill-week',
  className = '',
  showCalendarPicker = true,
  onOpenCalendar,
}) => {
  const todayISO = getManilaTodayISO();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const dates = useMemo(() => {
    const base = initialDates && initialDates.length > 0 ? [...initialDates] : generateUpcomingDates(14);
    if (
      selectedId &&
      /^\d{4}-\d{2}-\d{2}$/.test(selectedId) &&
      !base.some((d) => d.id === selectedId || d.fullDate === selectedId)
    ) {
      base.push(buildDateItemFromIso(selectedId, todayISO));
      base.sort((a, b) => (a.fullDate || a.id).localeCompare(b.fullDate || b.id));
    }
    return base;
  }, [initialDates, selectedId, todayISO]);

  // Keep the selected pill scrolled into view when changed externally (e.g. from MonthCalendarSheet)
  useEffect(() => {
    if (!stripRef.current || !selectedId) return;
    const selectedBtn = stripRef.current.querySelector<HTMLButtonElement>(`button[data-date-id="${selectedId}"]`);
    if (selectedBtn) {
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      selectedBtn.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: reduced ? 'auto' : 'smooth',
      });
    }
  }, [selectedId, dates.length]);

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value || value < todayISO) return;
    const newDateItem = buildDateItemFromIso(value, todayISO);
    onSelect(value, newDateItem);
  };

  if (variant === 'circular-booking') {
    return (
      <div ref={stripRef} className={`flex items-center gap-2.5 overflow-x-auto no-scrollbar py-2 px-1 ${className}`}>
        {dates.map((d) => {
          const isSelected = d.id === selectedId || d.fullDate === selectedId;
          return (
            <button
              key={d.id}
              data-date-id={d.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(d.id, d)}
              className={`min-w-[56px] w-14 h-18 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all press-scale shrink-0 ${
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
            {!onOpenCalendar && (
              <input
                ref={dateInputRef}
                type="date"
                min={todayISO}
                onChange={handleCustomDateChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                aria-label="Pick custom date from calendar"
              />
            )}
            <button
              type="button"
              onClick={() => (onOpenCalendar ? onOpenCalendar() : dateInputRef.current?.showPicker?.())}
              className="min-w-[56px] w-14 h-18 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all press-scale bg-[#141A15] text-[#A5B0A6] border border-dashed border-white/20 hover:border-[#C8FF2E] hover:text-[#C8FF2E]"
              title="Open monthly calendar"
              aria-label="Open monthly calendar"
            >
              <CalendarIcon className="w-5 h-5" />
              <span className="text-[10px] uppercase font-bold tracking-tight">More</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={stripRef} className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 ${className}`}>
      {dates.map((d) => {
        const isSelected = d.id === selectedId || d.fullDate === selectedId;
        return (
          <button
            key={d.id}
            data-date-id={d.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(d.id, d)}
            className={`shrink-0 min-w-[48px] min-h-[54px] px-2 py-2 rounded-full flex flex-col items-center justify-center transition-all press-scale relative ${
              isSelected
                ? 'bg-[#141A15] text-[#C8FF2E] ring-2 ring-[#C8FF2E] shadow-[0_0_16px_rgba(200,255,46,0.2)]'
                : d.isToday
                ? 'bg-[#1C241E] text-[#F4F7F0] ring-1 ring-[#C8FF2E]/60'
                : 'bg-[#1C241E] text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-[#263028]'
            }`}
          >
            <span className="text-[10px] uppercase font-medium tracking-tight opacity-75">{d.dayName}</span>
            <span className="font-display font-bold text-sm tabular-nums mt-0.5">{d.dateNumber}</span>
            {d.month && isSelected && (
              <span className="text-[9px] font-semibold opacity-80 leading-none">{d.month}</span>
            )}
            {d.isToday && !isSelected && (
              <span className="w-1 h-1 rounded-full bg-[#C8FF2E] absolute bottom-1" />
            )}
          </button>
        );
      })}

      {showCalendarPicker && (
        <div className="relative shrink-0">
          {!onOpenCalendar && (
            <input
              ref={dateInputRef}
              type="date"
              min={todayISO}
              onChange={handleCustomDateChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              aria-label="Pick date from calendar"
            />
          )}
          <button
            type="button"
            onClick={() => (onOpenCalendar ? onOpenCalendar() : dateInputRef.current?.showPicker?.())}
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center bg-[#1C241E] text-[#A5B0A6] border border-dashed border-white/20 hover:border-[#C8FF2E] hover:text-[#C8FF2E] transition-all press-scale"
            title="Open monthly calendar"
            aria-label="Open monthly calendar"
          >
            <CalendarIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
