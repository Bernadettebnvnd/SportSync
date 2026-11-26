'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  MAX_BOOKING_HORIZON_DAYS,
  addDaysToIsoDate,
  getManilaTodayISO,
  getMaxBookingDateISO,
  parseIsoDateToNoonManila,
} from '@/lib/datetime';

export interface MonthCalendarSheetProps {
  isOpen: boolean;
  selectedDateISO: string;
  onSelect: (isoDate: string) => void;
  onClose: () => void;
  maxHorizonDays?: number;
  title?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getMonthGrid(year: number, monthIndex: number): Array<{ iso: string; day: number; inMonth: boolean }> {
  const firstDayUtc = new Date(Date.UTC(year, monthIndex, 1));
  const startWeekday = firstDayUtc.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();

  const cells: Array<{ iso: string; day: number; inMonth: boolean }> = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const dt = new Date(Date.UTC(year, monthIndex - 1, d));
    cells.push({
      iso: `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`,
      day: d,
      inMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(Date.UTC(year, monthIndex, d));
    cells.push({
      iso: `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`,
      day: d,
      inMonth: true,
    });
  }

  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const dt = new Date(Date.UTC(year, monthIndex + 1, d));
    cells.push({
      iso: `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`,
      day: d,
      inMonth: false,
    });
  }

  return cells;
}

export const MonthCalendarSheet: React.FC<MonthCalendarSheetProps> = (props) => {
  if (!props.isOpen) return null;
  return <MonthCalendarSheetInner {...props} />;
};

const MonthCalendarSheetInner: React.FC<MonthCalendarSheetProps> = ({
  selectedDateISO,
  onSelect,
  onClose,
  maxHorizonDays = MAX_BOOKING_HORIZON_DAYS,
  title = 'Select Match Date',
}) => {
  const todayISO = getManilaTodayISO();
  const maxISO = getMaxBookingDateISO(maxHorizonDays);

  const initialBase = /^\d{4}-\d{2}-\d{2}$/.test(selectedDateISO) ? selectedDateISO : todayISO;
  const [initY, initM] = initialBase.split('-').map(Number);

  const [viewYear, setViewYear] = useState(initY);
  const [viewMonth, setViewMonth] = useState(initM - 1);
  const [focusedISO, setFocusedISO] = useState(initialBase);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Restore focus on unmount + Focus trap + Escape handler
  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (prevActive) {
        try {
          prevActive.focus();
        } catch {}
      }
    };
  }, [onClose]);

  const [todayY, todayM] = todayISO.split('-').map(Number);
  const [maxY, maxM] = maxISO.split('-').map(Number);
  const canGoPrev = viewYear > todayY || (viewYear === todayY && viewMonth > todayM - 1);
  const canGoNext = viewYear < maxY || (viewYear === maxY && viewMonth < maxM - 1);

  const goPrevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const cells = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const rows = useMemo(() => {
    const out: Array<typeof cells> = [];
    for (let i = 0; i < cells.length; i += 7) {
      out.push(cells.slice(i, i + 7));
    }
    return out;
  }, [cells]);

  const monthLabel = useMemo(() => {
    const d = new Date(Date.UTC(viewYear, viewMonth, 15));
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'long',
      year: 'numeric',
    }).format(d);
  }, [viewYear, viewMonth]);

  const handleGridKeyDown = (e: React.KeyboardEvent, cellIso: string) => {
    let delta = 0;
    if (e.key === 'ArrowRight') delta = 1;
    else if (e.key === 'ArrowLeft') delta = -1;
    else if (e.key === 'ArrowDown') delta = 7;
    else if (e.key === 'ArrowUp') delta = -7;
    else if (e.key === 'PageUp') {
      e.preventDefault();
      goPrevMonth();
      return;
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      goNextMonth();
      return;
    } else {
      return;
    }

    e.preventDefault();
    const nextIso = addDaysToIsoDate(cellIso, delta);
    if (nextIso < todayISO || nextIso > maxISO) return;
    setFocusedISO(nextIso);
    const [ny, nm] = nextIso.split('-').map(Number);
    if (ny !== viewYear || nm - 1 !== viewMonth) {
      setViewYear(ny);
      setViewMonth(nm - 1);
    }
    requestAnimationFrame(() => {
      const btn = sheetRef.current?.querySelector<HTMLButtonElement>(`button[data-iso="${nextIso}"]`);
      btn?.focus();
    });
  };

  return (
    <div
      className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#0B0F0C] border-t sm:border border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.85)] overflow-hidden text-[#F4F7F0] select-none safe-area-bottom-12"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
          touchStartY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || touchStartY.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          const dy = e.changedTouches[0].clientY - touchStartY.current;
          touchStartX.current = null;
          touchStartY.current = null;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            if (dx < 0) goNextMonth();
            else goPrevMonth();
          }
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Sheet Header */}
        <div className="px-4 pt-2 pb-3 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-[#F4F7F0]">{title}</h3>
            <p className="text-[11px] text-[#A5B0A6]">Philippine Time (PHT) · Up to {maxHorizonDays} days ahead</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calendar"
            className="w-11 h-11 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrevMonth}
            disabled={!canGoPrev}
            aria-label="Previous month"
            className="w-11 h-11 rounded-xl bg-[#141A15] border border-white/10 text-[#F4F7F0] hover:border-[#C8FF2E]/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-display font-bold text-sm text-[#F4F7F0] tracking-tight">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={goNextMonth}
            disabled={!canGoNext}
            aria-label="Next month"
            className="w-11 h-11 rounded-xl bg-[#141A15] border border-white/10 text-[#F4F7F0] hover:border-[#C8FF2E]/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="px-3 pb-4" role="grid" aria-label={monthLabel}>
          <div className="grid grid-cols-7 mb-1" role="row">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                role="columnheader"
                className="h-8 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-[#6F7B71]"
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {rows.map((week, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-7 gap-1" role="row">
                {week.map((cell) => {
                  const isDisabled = cell.iso < todayISO || cell.iso > maxISO;
                  const isSelected = cell.iso === selectedDateISO;
                  const isToday = cell.iso === todayISO;
                  const parsedNoon = parseIsoDateToNoonManila(cell.iso);
                  const ariaDateLabel = parsedNoon
                    ? new Intl.DateTimeFormat('en-US', {
                        timeZone: 'Asia/Manila',
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      }).format(parsedNoon)
                    : cell.iso;

                  return (
                    <div key={cell.iso} role="gridcell" className="flex items-center justify-center">
                      <button
                        type="button"
                        data-iso={cell.iso}
                        disabled={isDisabled}
                        aria-label={ariaDateLabel}
                        aria-selected={isSelected}
                        aria-disabled={isDisabled}
                        tabIndex={cell.iso === focusedISO ? 0 : -1}
                        onKeyDown={(e) => handleGridKeyDown(e, cell.iso)}
                        onClick={() => {
                          if (isDisabled) return;
                          onSelect(cell.iso);
                          onClose();
                        }}
                        className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center text-sm font-display font-bold tabular-nums transition-all relative ${
                          isSelected
                            ? 'bg-[#C8FF2E] text-[#0B0F0C] shadow-[0_0_16px_rgba(200,255,46,0.35)]'
                            : isDisabled
                            ? 'text-[#6F7B71]/35 cursor-not-allowed'
                            : !cell.inMonth
                            ? 'text-[#6F7B71]/60 hover:bg-[#1C241E]'
                            : isToday
                            ? 'bg-[#1C241E] text-[#F4F7F0] ring-1 ring-[#C8FF2E]/70 hover:bg-[#263028]'
                            : 'text-[#F4F7F0] hover:bg-[#1C241E]'
                        }`}
                      >
                        <span>{cell.day}</span>
                        {isToday && (
                          <span
                            className={`w-1 h-1 rounded-full absolute bottom-1.5 ${
                              isSelected ? 'bg-[#0B0F0C]' : 'bg-[#C8FF2E]'
                            }`}
                          />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
