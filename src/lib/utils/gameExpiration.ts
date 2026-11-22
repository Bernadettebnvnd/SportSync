/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Game and Session expiration utility for SportSync.
 * Reinforces strict expiration: once the scheduled game time has finished/expired,
 * it must not be seen anywhere in discovery, feeds, lists, or profiles.
 */

import type { CommunityGame } from '@/mock/types';
import type { Session } from '@/types';

interface TimeComponents {
  hour: number;
  minute: number;
}

/**
 * Parses time formats such as "18:00", "6:00 PM", "6 PM", "09:30".
 */
export function parseTimeComponents(timeStr: string): TimeComponents | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();

  // 12-hour format: e.g. "6:30 PM", "6 PM", "11:00 AM"
  const twelveHourMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (twelveHourMatch) {
    let hour = parseInt(twelveHourMatch[1], 10);
    const minute = twelveHourMatch[2] ? parseInt(twelveHourMatch[2], 10) : 0;
    const meridian = twelveHourMatch[3];

    if (meridian === 'PM' && hour < 12) hour += 12;
    if (meridian === 'AM' && hour === 12) hour = 0;

    return { hour, minute };
  }

  // 24-hour format: e.g. "18:00", "09:30", "20:15"
  const twentyFourHourMatch = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    const hour = parseInt(twentyFourHourMatch[1], 10);
    const minute = parseInt(twentyFourHourMatch[2], 10);
    if (hour >= 0 && hour <= 24 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  return null;
}

/**
 * Check if a CommunityGame has finished/expired.
 */
export function isGameExpired(game: CommunityGame, sessionEndTime?: string): boolean {
  if (!game) return true;

  // Explicitly completed or cancelled matches are considered expired/inactive
  if ((game as any).status === 'completed' || (game as any).status === 'cancelled') {
    return true;
  }

  // Active or upcoming games must remain visible and not be discarded prematurely
  if ((game as any).status === 'active' || (game as any).status === 'upcoming') {
    const rawDate = (game.date || (game as any).scheduled_date || "").toLowerCase();
    if (rawDate.includes('today') || rawDate.includes('tomorrow')) {
      return false;
    }
  }

  const now = new Date();
  const currentTimestamp = now.getTime();

  const candidateEndIso =
    sessionEndTime ||
    (game as { end_time?: string; endTime?: string }).end_time ||
    (game as { end_time?: string; endTime?: string }).endTime;

  if (candidateEndIso && (candidateEndIso.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(candidateEndIso))) {
    const sessionEnd = new Date(candidateEndIso);
    if (!isNaN(sessionEnd.getTime())) {
      return sessionEnd.getTime() <= currentTimestamp;
    }
  }

  const candidateStartIso =
    (game as { start_time?: string; startTime?: string }).start_time ||
    (game as { start_time?: string; startTime?: string }).startTime;

  if (candidateStartIso && (candidateStartIso.includes('T') || /^\d{4}-\d{2}-\d{2}T/.test(candidateStartIso))) {
    const sessionStart = new Date(candidateStartIso);
    if (!isNaN(sessionStart.getTime())) {
      const defaultEndMs = sessionStart.getTime() + 2 * 60 * 60 * 1000;
      return defaultEndMs <= currentTimestamp;
    }
  }

  let dateStr = (game.date || (game as any).scheduled_date || (game as any).day || '').trim();
  let timeStr = (game.time || (game as any).timeSlot || (game as any).start_time || '').trim();

  // If start_time and end_time are separate fields on game
  if ((game as any).end_time && !timeStr.includes('-')) {
    timeStr = timeStr ? `${timeStr} - ${(game as any).end_time}` : (game as any).end_time;
  }

  // Handle combined string like "Today (18:00)" or "2026-11-03 (19:30)"
  if (dateStr.includes('(') && dateStr.includes(')')) {
    const match = dateStr.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      dateStr = match[1].trim();
      if (!timeStr) timeStr = match[2].trim();
    }
  }

  // If no date at all, cannot verify so don't hide unless time is also missing
  if (!dateStr && !timeStr) return false;

  const lowerDate = dateStr.toLowerCase();

  // Quick check for Yesterday
  if (lowerDate === 'yesterday') {
    return true;
  }

  // Resolve current Manila calendar date parts (YYYY-MM-DD) so UTC servers and local clients agree
  const manilaTodayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [manilaYear, manilaMonth, manilaDay] = manilaTodayStr.split('-').map((n) => parseInt(n, 10));

  let gameYear = manilaYear || now.getFullYear();
  let gameMonth = (manilaMonth ? manilaMonth - 1 : now.getMonth()); // 0-indexed
  let gameDay = manilaDay || now.getDate();

  if (lowerDate === 'today') {
    // Uses current Manila date
  } else if (lowerDate === 'tomorrow') {
    const tom = new Date(Date.UTC(gameYear, gameMonth, gameDay + 1));
    gameYear = tom.getUTCFullYear();
    gameMonth = tom.getUTCMonth();
    gameDay = tom.getUTCDate();
  } else {
    // Try YYYY-MM-DD
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      gameYear = parseInt(isoMatch[1], 10);
      gameMonth = parseInt(isoMatch[2], 10) - 1;
      gameDay = parseInt(isoMatch[3], 10);
    } else {
      // If no 4-digit year is present (e.g. "Nov 25"), append current Manila year so V8 never defaults to 2001
      const hasYear = /\b\d{4}\b/.test(dateStr);
      const dateStrWithYear = hasYear ? dateStr : `${dateStr}, ${gameYear}`;
      const parsedDate = new Date(dateStrWithYear);
      if (!isNaN(parsedDate.getTime())) {
        const parsedYear = parsedDate.getFullYear();
        gameYear = hasYear && parsedYear >= 2020 ? parsedYear : gameYear;
        gameMonth = parsedDate.getMonth();
        gameDay = parsedDate.getDate();
      }
    }
  }

  // Determine end time of the match
  let endHour = 23;
  let endMinute = 59;
  let dayOffset = 0;

  if (timeStr) {
    // If time is a range e.g. "18:00 - 20:00" or "6:00 PM - 8:00 PM"
    const rangeParts = timeStr.split(/\s*[-–—]\s*/);
    if (rangeParts.length > 1) {
      const parsedEnd = parseTimeComponents(rangeParts[1]);
      if (parsedEnd) {
        endHour = parsedEnd.hour;
        endMinute = parsedEnd.minute;
      }
    } else {
      // Only start time is provided: game finishes after default 90-120 min duration
      const parsedStart = parseTimeComponents(rangeParts[0]);
      if (parsedStart) {
        // Standard pickup match duration is 90 minutes (1.5 hours)
        endHour = parsedStart.hour + 1;
        endMinute = parsedStart.minute + 30;
        if (endMinute >= 60) {
          endHour += 1;
          endMinute -= 60;
        }
        if (endHour >= 24) {
          endHour -= 24;
          dayOffset += 1;
        }
      }
    }
  }

  // Construct expiration moment explicitly in Asia/Manila (+08:00)
  const targetUtcDate = new Date(Date.UTC(gameYear, gameMonth, gameDay + dayOffset));
  const yyyy = targetUtcDate.getUTCFullYear();
  const mm = String(targetUtcDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(targetUtcDate.getUTCDate()).padStart(2, '0');
  const hh = String(Math.min(23, Math.max(0, endHour))).padStart(2, '0');
  const min = String(Math.min(59, Math.max(0, endMinute))).padStart(2, '0');
  const expirationDate = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00+08:00`);

  return expirationDate.getTime() <= currentTimestamp;
}

/**
 * Check if an Open Play Session has finished/expired.
 */
export function isSessionExpired(session: Session): boolean {
  if (!session) return true;

  if (session.status === 'completed' || session.status === 'cancelled') {
    return true;
  }

  const now = new Date();
  const currentTimestamp = now.getTime();

  // Active or upcoming sessions must remain visible and not be discarded prematurely
  if (session.status === 'active' || session.status === 'upcoming') {
    const rawDate = ((session as any).date || (session as any).scheduled_date || '').toLowerCase();
    if (rawDate.includes('today') || rawDate.includes('tomorrow')) {
      return false;
    }
    if (session.created_at) {
      const createdTime = new Date(session.created_at).getTime();
      if (!isNaN(createdTime) && currentTimestamp - createdTime < 24 * 60 * 60 * 1000) {
        return false;
      }
    }
  }

  // 1. Check end_time (with 2-hour grace period for active play)
  if (session.end_time) {
    const end = new Date(session.end_time);
    if (!isNaN(end.getTime())) {
      const gracePeriodMs = session.status === 'active' ? 2 * 60 * 60 * 1000 : 0;
      return end.getTime() + gracePeriodMs <= currentTimestamp;
    }
    // If end_time is HH:mm
    const parsedEnd = parseTimeComponents(session.end_time);
    if (parsedEnd) {
      const dateVal = (session as any).date || (session as any).scheduled_date;
      const sessionDate = dateVal ? new Date(dateVal) : (session.start_time ? new Date(session.start_time) : now);
      const refDate = isNaN(sessionDate.getTime()) ? now : sessionDate;
      const exp = new Date(
        refDate.getFullYear(),
        refDate.getMonth(),
        refDate.getDate(),
        parsedEnd.hour,
        parsedEnd.minute,
        0
      );
      const gracePeriodMs = session.status === 'active' ? 2 * 60 * 60 * 1000 : 0;
      return exp.getTime() + gracePeriodMs <= currentTimestamp;
    }
  }

  // 2. Check start_time with default duration (with grace period for active pickup games)
  if (session.start_time) {
    const start = new Date(session.start_time);
    if (!isNaN(start.getTime())) {
      // Allow 4-hour window for active session
      const sessionEnd = new Date(start.getTime() + 4 * 60 * 60 * 1000);
      return sessionEnd.getTime() <= currentTimestamp;
    }
    const parsedStart = parseTimeComponents(session.start_time);
    if (parsedStart) {
      const dateVal = (session as any).date || (session as any).scheduled_date;
      const sessionDate = dateVal ? new Date(dateVal) : now;
      const refDate = isNaN(sessionDate.getTime()) ? now : sessionDate;
      const exp = new Date(
        refDate.getFullYear(),
        refDate.getMonth(),
        refDate.getDate(),
        parsedStart.hour + 4,
        parsedStart.minute,
        0
      );
      return exp.getTime() <= currentTimestamp;
    }
  }

  // 3. Check standalone date field if time is omitted
  const standaloneDate = (session as any).date || (session as any).scheduled_date;
  if (standaloneDate) {
    const d = new Date(standaloneDate);
    if (!isNaN(d.getTime())) {
      // End of that date
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      return endOfDay.getTime() <= currentTimestamp;
    }
  }

  return false;
}

/**
 * Filters out finished/expired games.
 */
export function filterActiveGames(games: CommunityGame[], sessions?: Session[]): CommunityGame[] {
  if (!Array.isArray(games)) return [];

  const sessionEndMap = new Map<string, string>();
  if (sessions) {
    sessions.forEach((s) => {
      if (s?.id && s.end_time) sessionEndMap.set(s.id, s.end_time);
    });
  }

  return games.filter((g) => {
    const sessionEndTime = g.sessionId ? sessionEndMap.get(g.sessionId) : undefined;
    return !isGameExpired(g, sessionEndTime);
  });
}
