/**
 * Shared Asia/Manila (PHT, UTC+8) date & time utilities for SportSync.
 * Stored/transport timestamps always preserve ISO with +08:00 (or UTC ISO);
 * display helpers consistently render 12-hour human formats ("Fri, Nov 27",
 * "4:00 PM", "4:00 PM - 6:00 PM").
 */

export const MANILA_TZ = 'Asia/Manila';
export const MANILA_OFFSET = '+08:00';
export const MAX_BOOKING_HORIZON_DAYS = 60;

export interface ManilaDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  isoDate: string; // YYYY-MM-DD
  hhmm: string; // HH:mm
  minutesSinceMidnight: number;
}

export function getManilaParts(date: Date = new Date()): ManilaDateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getNum = (type: string, fallback: number): number => {
    const val = parts.find((p) => p.type === type)?.value;
    const parsed = val ? parseInt(val, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const year = getNum('year', date.getUTCFullYear());
  const month = getNum('month', date.getUTCMonth() + 1);
  const day = getNum('day', date.getUTCDate());
  let hour = getNum('hour', 0);
  if (hour === 24) hour = 0;
  const minute = getNum('minute', 0);

  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mi = String(minute).padStart(2, '0');

  return {
    year,
    month,
    day,
    hour,
    minute,
    isoDate: `${yyyy}-${mm}-${dd}`,
    hhmm: `${hh}:${mi}`,
    minutesSinceMidnight: hour * 60 + minute,
  };
}

export function getManilaTodayISO(now: Date = new Date()): string {
  return getManilaParts(now).isoDate;
}

export function addDaysToIsoDate(isoDate: string, deltaDays: number): string {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return getManilaTodayISO();
  const d = new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10) + deltaDays));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function getManilaTomorrowISO(now: Date = new Date()): string {
  return addDaysToIsoDate(getManilaTodayISO(now), 1);
}

export function getMaxBookingDateISO(horizonDays: number = MAX_BOOKING_HORIZON_DAYS, now: Date = new Date()): string {
  return addDaysToIsoDate(getManilaTodayISO(now), horizonDays);
}

export function parseIsoDateToNoonManila(isoDate: string): Date | null {
  const m = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00${MANILA_OFFSET}`);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats an ISO date ("2026-11-27"), timestamp, or Date as "Fri, Nov 27" in Asia/Manila.
 */
export function formatManilaDateShort(input: string | Date): string {
  if (!input) return '';
  let d: Date | null = null;
  if (input instanceof Date) {
    d = input;
  } else {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      d = parseIsoDateToNoonManila(trimmed);
    } else if (trimmed.includes('T') || /\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parsed = new Date(trimmed);
      d = isNaN(parsed.getTime()) ? null : parsed;
    } else {
      return trimmed;
    }
  }
  if (!d || isNaN(d.getTime())) return typeof input === 'string' ? input : '';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/**
 * Formats an ISO date or timestamp as "Today", "Tomorrow", or "Fri, Nov 27" in Asia/Manila.
 */
export function formatManilaDateLabel(input: string | Date, now: Date = new Date()): string {
  const todayISO = getManilaTodayISO(now);
  const tomorrowISO = getManilaTomorrowISO(now);
  let targetISO: string | null = null;

  if (input instanceof Date) {
    targetISO = getManilaParts(input).isoDate;
  } else {
    const trimmed = input.trim();
    const low = trimmed.toLowerCase();
    if (low === 'today' || low.startsWith('today ')) return 'Today';
    if (low === 'tomorrow' || low.startsWith('tomorrow ')) return 'Tomorrow';
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      targetISO = trimmed;
    } else {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        targetISO = getManilaParts(parsed).isoDate;
      }
    }
  }

  if (!targetISO) return typeof input === 'string' ? input : '';
  if (targetISO === todayISO) return 'Today';
  if (targetISO === tomorrowISO) return 'Tomorrow';
  return formatManilaDateShort(targetISO);
}

/**
 * Parses a 24h ("16:00"), 12h ("4:00 PM"), or ISO timestamp into 24-hour components in Asia/Manila.
 */
export function parseTimeTo24h(timeStr?: string | null): { hour24: number; minute: number; hhmm: string } | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const clean = timeStr.trim();
  if (!clean) return null;

  // ISO timestamp
  if (clean.includes('T') && /\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      const p = getManilaParts(parsed);
      return { hour24: p.hour, minute: p.minute, hhmm: p.hhmm };
    }
  }

  // 12-hour format ("4:00 PM", "4 PM", "12:30am")
  const m12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = m12[2] ? parseInt(m12[2], 10) : 0;
    const mer = m12[3].toUpperCase();
    if (h < 1 || h > 12 || min < 0 || min > 59) return null;
    if (mer === 'PM' && h < 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return {
      hour24: h,
      minute: min,
      hhmm: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
    };
  }

  // 24-hour format ("16:00", "07:30", "18:00:00")
  const m24 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const min = parseInt(m24[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return {
      hour24: h,
      minute: min,
      hhmm: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
    };
  }

  return null;
}

/**
 * Formats a 24h ("16:00"), 12h ("4:00 PM"), or ISO timestamp as "4:00 PM" in Asia/Manila.
 * Also handles range strings like "16:00 - 18:00" cleanly.
 */
export function formatTime12h(timeOrIso?: string | null): string {
  if (!timeOrIso || typeof timeOrIso !== 'string') return '';
  const trimmed = timeOrIso.trim();
  if (!trimmed) return '';

  // Handle pre-joined ranges like "16:00 - 18:00" or "16:00 – 18:00"
  if (!trimmed.includes('T') && /\s[-–]\s/.test(trimmed)) {
    const [startPart, endPart] = trimmed.split(/\s[-–]\s/);
    if (startPart && endPart) {
      return `${formatTime12h(startPart)} - ${formatTime12h(endPart)}`;
    }
  }

  const parsed = parseTimeTo24h(trimmed);
  if (!parsed) return trimmed;

  const period = parsed.hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = parsed.hour24 % 12 === 0 ? 12 : parsed.hour24 % 12;
  const minStr = String(parsed.minute).padStart(2, '0');
  return `${hour12}:${minStr} ${period}`;
}

/**
 * Formats kickoff or kickoff + optional end time:
 * - "4:00 PM" when endTimeOrIso is null/undefined/empty
 * - "4:00 PM - 6:00 PM" when endTimeOrIso is present
 */
export function formatTimeRange12h(startTimeOrIso?: string | null, endTimeOrIso?: string | null): string {
  const startLabel = formatTime12h(startTimeOrIso);
  if (!startLabel) return '';
  if (!endTimeOrIso || !endTimeOrIso.trim()) return startLabel;
  const endLabel = formatTime12h(endTimeOrIso);
  if (!endLabel || endLabel === startLabel) return startLabel;
  return `${startLabel} - ${endLabel}`;
}

/**
 * Formats a summary line: "Fri, Nov 27 · 4:00 PM" or "Fri, Nov 27 · 4:00 PM - 6:00 PM"
 */
export function formatMatchSummaryLine(
  isoDate: string,
  startTime: string,
  endTime?: string | null
): string {
  const datePart = formatManilaDateShort(isoDate);
  const timePart = formatTimeRange12h(startTime, endTime);
  if (datePart && timePart) return `${datePart} · ${timePart}`;
  return datePart || timePart;
}

/**
 * Builds an ISO-8601 timestamp string with explicit +08:00 Manila offset.
 */
export function toManilaIsoTimestamp(isoDate: string, timeStr: string): string {
  const parsed = parseTimeTo24h(timeStr) || { hour24: 18, minute: 0, hhmm: '18:00' };
  const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(isoDate.trim()) ? isoDate.trim() : getManilaTodayISO();
  return `${cleanDate}T${parsed.hhmm}:00${MANILA_OFFSET}`;
}

/**
 * Converts a 24-hour "HH:mm" string into 12-hour wheel parts.
 */
export function to12HourParts(time24: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  const parsed = parseTimeTo24h(time24) || { hour24: 18, minute: 0 };
  const period: 'AM' | 'PM' = parsed.hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = parsed.hour24 % 12 === 0 ? 12 : parsed.hour24 % 12;
  return { hour12, minute: parsed.minute, period };
}

/**
 * Converts 12-hour wheel parts back to 24-hour "HH:mm".
 */
export function from12HourParts(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h24 = hour12 % 12;
  if (period === 'PM') h24 += 12;
  const clampedMin = Math.max(0, Math.min(59, minute));
  return `${String(h24).padStart(2, '0')}:${String(clampedMin).padStart(2, '0')}`;
}

/**
 * Shifts a 24-hour "HH:mm" string by deltaMinutes (wrapping across midnight).
 */
export function shiftTime24ByMinutes(time24: string, deltaMinutes: number): string {
  const parsed = parseTimeTo24h(time24) || { hour24: 18, minute: 0 };
  const total = ((parsed.hour24 * 60 + parsed.minute + deltaMinutes) % 1440 + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Smart default kickoff in Asia/Manila:
 * - At least 1 full hour ahead of current Manila time
 * - Evening bias (6:00 PM if still earlier in the day)
 * - Rolls over to Tomorrow 6:00 PM if too late today (>= 10:00 PM)
 */
export function getSmartDefaultKickoff(now: Date = new Date()): {
  isoDate: string;
  time24: string;
  scheduleMode: 'today' | 'tomorrow';
} {
  const p = getManilaParts(now);
  // Minimum full hour at least 60 minutes from now
  const nextFullHourAtLeast1h = Math.ceil((p.minutesSinceMidnight + 60) / 60);

  if (nextFullHourAtLeast1h <= 22) {
    const targetHour = Math.max(nextFullHourAtLeast1h, 18); // evening bias (6:00 PM)
    return {
      isoDate: p.isoDate,
      time24: `${String(targetHour).padStart(2, '0')}:00`,
      scheduleMode: 'today',
    };
  }

  return {
    isoDate: addDaysToIsoDate(p.isoDate, 1),
    time24: '18:00',
    scheduleMode: 'tomorrow',
  };
}

/**
 * Returns the earliest valid 5-minute slot on `isoDate` (in Manila time).
 * For future dates returns "00:00". For today returns next 5-minute step strictly in the future.
 */
export function getMinValidTimeForManilaDate(isoDate: string, now: Date = new Date()): string | null {
  const p = getManilaParts(now);
  if (isoDate > p.isoDate) return '00:00';
  if (isoDate < p.isoDate) return null;
  const nextFiveMin = Math.ceil((p.minutesSinceMidnight + 1) / 5) * 5;
  if (nextFiveMin >= 1440) return null;
  const h = Math.floor(nextFiveMin / 60);
  const m = nextFiveMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Checks whether a given Manila date + 24h time is already in the past.
 */
export function isManilaDateTimeInPast(isoDate: string, time24: string, now: Date = new Date()): boolean {
  const p = getManilaParts(now);
  if (isoDate < p.isoDate) return true;
  if (isoDate > p.isoDate) return false;
  const parsed = parseTimeTo24h(time24);
  if (!parsed) return false;
  return parsed.hour24 * 60 + parsed.minute <= p.minutesSinceMidnight;
}

/**
 * Validates optional end time against kickoff time.
 * If end < kickoff, treats as next day ONLY when delta < 12 hours; otherwise returns inline error.
 */
export function validateEndTime(
  isoDate: string,
  startTime24: string,
  endTime24: string
): {
  valid: boolean;
  endIsoDate: string;
  startIso: string;
  endIso: string;
  durationMinutes: number;
  error?: string;
} {
  const start = parseTimeTo24h(startTime24);
  const end = parseTimeTo24h(endTime24);
  const startIso = toManilaIsoTimestamp(isoDate, startTime24);

  if (!start || !end) {
    return {
      valid: false,
      endIsoDate: isoDate,
      startIso,
      endIso: startIso,
      durationMinutes: 0,
      error: 'End time must be after kickoff',
    };
  }

  const startMins = start.hour24 * 60 + start.minute;
  const endMins = end.hour24 * 60 + end.minute;

  if (endMins > startMins) {
    const durationMinutes = endMins - startMins;
    return {
      valid: true,
      endIsoDate: isoDate,
      startIso,
      endIso: toManilaIsoTimestamp(isoDate, end.hhmm),
      durationMinutes,
    };
  }

  if (endMins < startMins) {
    const nextDayDelta = 1440 - startMins + endMins;
    if (nextDayDelta < 12 * 60) {
      const nextDate = addDaysToIsoDate(isoDate, 1);
      return {
        valid: true,
        endIsoDate: nextDate,
        startIso,
        endIso: toManilaIsoTimestamp(nextDate, end.hhmm),
        durationMinutes: nextDayDelta,
      };
    }
  }

  return {
    valid: false,
    endIsoDate: isoDate,
    startIso,
    endIso: startIso,
    durationMinutes: 0,
    error: 'End time must be after kickoff',
  };
}

/**
 * Resolves a flexible game date string ("Today", "Tomorrow", "2026-11-27", "Fri, Nov 27", "Today (18:00)")
 * to a canonical Asia/Manila ISO date ("YYYY-MM-DD").
 */
export function resolveFlexibleDateToManilaISO(rawDate?: string | null, now: Date = new Date()): string {
  const todayISO = getManilaTodayISO(now);
  if (!rawDate) return todayISO;
  const clean = rawDate.trim();
  const low = clean.toLowerCase();
  if (low.startsWith('today')) return todayISO;
  if (low.startsWith('tomorrow')) return addDaysToIsoDate(todayISO, 1);
  const isoMatch = clean.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const manilaYear = getManilaParts(now).year;
  const withoutParens = clean.replace(/\(.*?\)/g, '').trim();
  const withYear = /\b\d{4}\b/.test(withoutParens) ? withoutParens : `${withoutParens}, ${manilaYear}`;
  const parsed = new Date(withYear);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }

  return todayISO;
}
