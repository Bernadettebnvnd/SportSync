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

  const now = new Date();
  const currentTimestamp = now.getTime();

  if (sessionEndTime && (sessionEndTime.includes('T') || sessionEndTime.includes('-'))) {
    const sessionEnd = new Date(sessionEndTime);
    if (!isNaN(sessionEnd.getTime())) {
      return sessionEnd.getTime() <= currentTimestamp;
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

  let gameYear = now.getFullYear();
  let gameMonth = now.getMonth(); // 0-indexed
  let gameDay = now.getDate();

  if (lowerDate === 'today') {
    // Uses current date
  } else if (lowerDate === 'tomorrow') {
    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    gameYear = tom.getFullYear();
    gameMonth = tom.getMonth();
    gameDay = tom.getDate();
  } else {
    // Try YYYY-MM-DD
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      gameYear = parseInt(isoMatch[1], 10);
      gameMonth = parseInt(isoMatch[2], 10) - 1;
      gameDay = parseInt(isoMatch[3], 10);
    } else {
      // Try standard string parse e.g. "Nov 3, 2026" or "Nov 3"
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        gameYear = parsedDate.getFullYear();
        gameMonth = parsedDate.getMonth();
        gameDay = parsedDate.getDate();
      }
    }
  }

  // Determine end time of the match
  let endHour = 23;
  let endMinute = 59;

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
          gameDay += 1;
        }
      }
    }
  }

  // Construct expiration moment
  const expirationDate = new Date(gameYear, gameMonth, gameDay, endHour, endMinute, 0, 0);

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

  // 1. Check end_time
  if (session.end_time) {
    const end = new Date(session.end_time);
    if (!isNaN(end.getTime())) {
      return end.getTime() <= currentTimestamp;
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
      return exp.getTime() <= currentTimestamp;
    }
  }

  // 2. Check start_time with default duration
  if (session.start_time) {
    const start = new Date(session.start_time);
    if (!isNaN(start.getTime())) {
      // Assume 2-hour max session if end_time not set
      const sessionEnd = new Date(start.getTime() + 2 * 60 * 60 * 1000);
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
        parsedStart.hour + 2,
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
