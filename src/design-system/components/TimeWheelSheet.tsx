'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  formatTime12h,
  from12HourParts,
  isManilaDateTimeInPast,
  to12HourParts,
} from '@/lib/datetime';

export interface TimeWheelSheetProps {
  isOpen: boolean;
  value24: string; // "HH:mm"
  onChange: (nextTime24: string) => void;
  onClose: () => void;
  selectedDateISO?: string;
  blockPastTimes?: boolean;
  title?: string;
}

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const PERIODS: Array<'AM' | 'PM'> = ['AM', 'PM'];
const ITEM_HEIGHT = 44;

function snapMinuteTo5(minute: number): number {
  const idx = Math.round(minute / 5) % 12;
  return MINUTES_5[Math.max(0, Math.min(11, idx))];
}

interface WheelColumnProps<T extends string | number> {
  items: T[];
  selectedIndex: number;
  onSelectIndex: (nextIndex: number) => void;
  formatItem: (item: T) => string;
  isItemDisabled?: (item: T) => boolean;
  ariaLabel: string;
}

function WheelColumn<T extends string | number>({
  items,
  selectedIndex,
  onSelectIndex,
  formatItem,
  isItemDisabled,
  ariaLabel,
}: WheelColumnProps<T>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgrammaticRef = useRef(false);

  const scrollToIndex = useCallback((idx: number, smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    const targetTop = clamped * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - targetTop) < 1) return;
    isProgrammaticRef.current = true;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    el.scrollTo({
      top: targetTop,
      behavior: smooth && !reduced ? 'smooth' : 'auto',
    });
    setTimeout(() => {
      isProgrammaticRef.current = false;
    }, 180);
  }, [items.length]);

  useEffect(() => {
    scrollToIndex(selectedIndex, false);
  }, [selectedIndex, scrollToIndex]);

  const handleScroll = () => {
    if (isProgrammaticRef.current) return;
    const el = scrollRef.current;
    if (!el) return;

    const rawIdx = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, rawIdx));
    if (clamped !== selectedIndex) {
      onSelectIndex(clamped);
    }

    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const settledIdx = Math.max(
        0,
        Math.min(items.length - 1, Math.round(scrollRef.current.scrollTop / ITEM_HEIGHT))
      );
      if (settledIdx !== selectedIndex) {
        onSelectIndex(settledIdx);
      }
    }, 90);
  };

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(items.length - 1, selectedIndex + 1);
      onSelectIndex(next);
      scrollToIndex(next, true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(0, selectedIndex - 1);
      onSelectIndex(prev);
      scrollToIndex(prev, true);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSelectIndex(0);
      scrollToIndex(0, true);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSelectIndex(items.length - 1);
      scrollToIndex(items.length - 1, true);
    }
  };

  return (
    <div
      ref={scrollRef}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      className="h-[220px] overflow-y-auto no-scrollbar focus:outline-none focus-visible:ring-1 focus-visible:ring-[#C8FF2E]/60 rounded-xl relative"
      style={{
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}
    >
      {/* Top padding (2 rows) so index 0 centers in the 5-row viewport */}
      <div style={{ height: ITEM_HEIGHT * 2 }} aria-hidden="true" />
      {items.map((item, idx) => {
        const isSelected = idx === selectedIndex;
        const disabled = isItemDisabled ? isItemDisabled(item) : false;
        return (
          <button
            key={String(item)}
            type="button"
            role="option"
            aria-selected={isSelected}
            aria-disabled={disabled}
            onClick={() => {
              onSelectIndex(idx);
              scrollToIndex(idx, true);
            }}
            style={{
              height: ITEM_HEIGHT,
              scrollSnapAlign: 'center',
            }}
            className={`w-full flex items-center justify-center font-display tabular-nums transition-colors ${
              isSelected
                ? disabled
                  ? 'text-[#FF8F8F] font-bold text-xl'
                  : 'text-[#C8FF2E] font-bold text-xl'
                : disabled
                ? 'text-[#6F7B71]/35 text-base font-medium'
                : 'text-[#A5B0A6]/75 hover:text-[#F4F7F0] text-base font-medium'
            }`}
          >
            {formatItem(item)}
          </button>
        );
      })}
      {/* Bottom padding (2 rows) */}
      <div style={{ height: ITEM_HEIGHT * 2 }} aria-hidden="true" />
    </div>
  );
}

export const TimeWheelSheet: React.FC<TimeWheelSheetProps> = (props) => {
  if (!props.isOpen) return null;
  return <TimeWheelSheetInner {...props} />;
};

const TimeWheelSheetInner: React.FC<TimeWheelSheetProps> = ({
  value24,
  onChange,
  onClose,
  selectedDateISO,
  blockPastTimes = false,
  title = 'Select Time',
}) => {
  const initialParts = useMemo(() => {
    const p = to12HourParts(value24);
    return {
      hour12: p.hour12,
      minute: snapMinuteTo5(p.minute),
      period: p.period,
    };
  }, [value24]);

  const [hour12, setHour12] = useState<number>(initialParts.hour12);
  const [minute, setMinute] = useState<number>(initialParts.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initialParts.period);
  const prevHourRef = useRef<number>(initialParts.hour12);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Restore focus on unmount + Focus trap + Escape
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

  const current24 = from12HourParts(hour12, minute, period);
  const isCurrentInPast = Boolean(
    blockPastTimes && selectedDateISO && isManilaDateTimeInPast(selectedDateISO, current24)
  );

  const commitIfAllowed = useCallback(
    (nextH: number, nextM: number, nextP: 'AM' | 'PM') => {
      const next24 = from12HourParts(nextH, nextM, nextP);
      if (blockPastTimes && selectedDateISO && isManilaDateTimeInPast(selectedDateISO, next24)) {
        return;
      }
      onChange(next24);
    },
    [blockPastTimes, selectedDateISO, onChange]
  );

  const handleHourIndexChange = (idx: number) => {
    const nextHour = HOURS_12[idx];
    const prevHour = prevHourRef.current;
    let nextPeriod = period;
    // Automatically flip AM/PM when crossing 11 <-> 12
    if ((prevHour === 11 && nextHour === 12) || (prevHour === 12 && nextHour === 11)) {
      nextPeriod = period === 'AM' ? 'PM' : 'AM';
      setPeriod(nextPeriod);
    }
    prevHourRef.current = nextHour;
    setHour12(nextHour);
    commitIfAllowed(nextHour, minute, nextPeriod);
  };

  const handleMinuteIndexChange = (idx: number) => {
    const nextMin = MINUTES_5[idx];
    setMinute(nextMin);
    commitIfAllowed(hour12, nextMin, period);
  };

  const handlePeriodIndexChange = (idx: number) => {
    const nextPeriod = PERIODS[idx];
    setPeriod(nextPeriod);
    commitIfAllowed(hour12, minute, nextPeriod);
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
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Header with live time readout & Done button */}
        <div className="px-4 pt-2 pb-3 border-b border-white/10 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-base text-[#F4F7F0]">{title}</h3>
            <p className="text-xs font-semibold text-[#C8FF2E] tabular-nums">
              {formatTime12h(current24)}
            </p>
          </div>
          <button
            type="button"
            disabled={isCurrentInPast}
            onClick={() => {
              if (isCurrentInPast) return;
              onChange(current24);
              onClose();
            }}
            className="min-h-[44px] px-5 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] font-display font-bold text-sm hover:bg-[#d4ff52] disabled:opacity-40 disabled:cursor-not-allowed transition-all press-scale"
          >
            Done
          </button>
        </div>

        {/* Inline past-time notice when today + past slot */}
        {isCurrentInPast && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-[#FF5C5C]/15 border border-[#FF5C5C]/30 text-[#FF8F8F] text-xs font-medium">
            This time has already passed today. Scroll forward to a future slot.
          </div>
        )}

        {/* 3-Column Scroll-Snap Wheel */}
        <div className="relative px-4 py-4">
          {/* Center selection highlight band */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[44px] rounded-2xl bg-[#1C241E]/90 border border-[#C8FF2E]/35"
          />

          {/* Top & bottom gradient fades */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-4 right-4 top-4 h-16 z-10 bg-gradient-to-b from-[#0B0F0C] via-[#0B0F0C]/75 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-4 right-4 bottom-4 h-16 z-10 bg-gradient-to-t from-[#0B0F0C] via-[#0B0F0C]/75 to-transparent"
          />

          <div className="grid grid-cols-3 gap-2 relative z-[1]">
            <WheelColumn
              items={HOURS_12}
              selectedIndex={HOURS_12.indexOf(hour12)}
              onSelectIndex={handleHourIndexChange}
              formatItem={(h) => String(h)}
              isItemDisabled={(h) =>
                Boolean(
                  blockPastTimes &&
                    selectedDateISO &&
                    isManilaDateTimeInPast(selectedDateISO, from12HourParts(h, 55, period))
                )
              }
              ariaLabel="Hour"
            />
            <WheelColumn
              items={MINUTES_5}
              selectedIndex={MINUTES_5.indexOf(minute)}
              onSelectIndex={handleMinuteIndexChange}
              formatItem={(m) => String(m).padStart(2, '0')}
              isItemDisabled={(m) =>
                Boolean(
                  blockPastTimes &&
                    selectedDateISO &&
                    isManilaDateTimeInPast(selectedDateISO, from12HourParts(hour12, m, period))
                )
              }
              ariaLabel="Minute"
            />
            <WheelColumn
              items={PERIODS}
              selectedIndex={PERIODS.indexOf(period)}
              onSelectIndex={handlePeriodIndexChange}
              formatItem={(p) => p}
              isItemDisabled={(p) =>
                Boolean(
                  blockPastTimes &&
                    selectedDateISO &&
                    isManilaDateTimeInPast(selectedDateISO, from12HourParts(11, 55, p))
                )
              }
              ariaLabel="AM or PM"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
