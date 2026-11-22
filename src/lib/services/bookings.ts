import { Booking, BookingStatus, CourtAvailabilitySlot, SportType } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { broadcastNotification } from '@/lib/notifications';

/**
 * Extracts minutes from midnight (0..1440) from an ISO string (stored as bookingDateTstartTimeZ)
 * or an "HH:MM" time string.
 */
export function extractSlotMinutes(timeOrIso?: string | null, isEnd = false, fallbackStartMins?: number, durationMinutes?: number): number | null {
  if (!timeOrIso || typeof timeOrIso !== 'string') {
    if (isEnd && typeof fallbackStartMins === 'number') {
      return fallbackStartMins + (Number(durationMinutes) || 60);
    }
    return null;
  }

  const trimmed = timeOrIso.trim();
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
      if (isEnd && mins === 0 && typeof fallbackStartMins === 'number' && fallbackStartMins > 0) {
        return 24 * 60;
      }
      return mins;
    }
  }

  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10);
    const m = parseInt(hhmm[2], 10);
    if (!isNaN(h) && !isNaN(m)) {
      return h * 60 + m;
    }
  }

  if (isEnd && typeof fallbackStartMins === 'number') {
    return fallbackStartMins + (Number(durationMinutes) || 60);
  }
  return null;
}

/**
 * Compute hourly court slot availability by querying confirmed bookings
 * and court_availability blocks in Supabase for a specific court and calendar date.
 * Properly locks all hours covered by multi-hour reservations and blocks.
 */
export async function getCourtDailyAvailability(
  courtId: string,
  courtName: string,
  sport: SportType,
  hourlyRateCents: number,
  bookingDate: string, // YYYY-MM-DD
  operatingHours: { openHour?: number; closeHour?: number } = { openHour: 6, closeHour: 23 }
): Promise<CourtAvailabilitySlot[]> {
  const supabase = getSupabaseClient();
  const openHour = operatingHours.openHour ?? 6;
  const closeHour = operatingHours.closeHour ?? 23;

  const candidateSlots: string[] = [];
  for (let h = openHour; h < closeHour; h++) {
    candidateSlots.push(`${String(h).padStart(2, '0')}:00`);
  }

  const lockedIntervals: Array<{ startMins: number; endMins: number }> = [];

  const recordInterval = (startRaw?: string | null, endRaw?: string | null, durationMins?: number | null) => {
    const startMins = extractSlotMinutes(startRaw, false);
    if (startMins === null) return;
    const endMins = extractSlotMinutes(endRaw, true, startMins, durationMins || 60);
    if (endMins === null) return;
    const safeEnd = endMins > startMins ? endMins : startMins + (Number(durationMins) || 60);
    lockedIntervals.push({ startMins, endMins: safeEnd });
  };

  // 1. Prefer server availability API when in browser so RLS never hides other players' confirmed bookings
  let fetchedFromApi = false;
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(
        `/api/bookings?availability=true&courtId=${encodeURIComponent(courtId)}&date=${encodeURIComponent(bookingDate)}`,
        { credentials: 'include', cache: 'no-store' }
      );
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.bookings)) {
          fetchedFromApi = true;
          for (const b of json.bookings) {
            recordInterval(b.start_time, b.end_time, b.duration_minutes);
          }
        }
        if (Array.isArray(json.blocks)) {
          for (const blk of json.blocks) {
            if (!blk.start_time || String(blk.start_time).startsWith(bookingDate) || !String(blk.start_time).includes('T')) {
              recordInterval(blk.start_time, blk.end_time, 60);
            }
          }
        }
      }
    } catch {}
  }

  // 2. Direct Supabase query fallback
  if (!fetchedFromApi && supabase && isSupabaseConfigured) {
    try {
      const { data: bookedSlots, error } = await supabase
        .from('bookings')
        .select('start_time, end_time, duration_minutes, status')
        .eq('court_id', courtId)
        .eq('booking_date', bookingDate)
        .in('status', ['confirmed', 'completed']);

      if (error) {
        console.error('Error querying court availability:', error);
      }

      if (Array.isArray(bookedSlots)) {
        for (const b of bookedSlots) {
          recordInterval(b.start_time, b.end_time, (b as { duration_minutes?: number }).duration_minutes);
        }
      }

      const { data: courtBlocks } = await supabase
        .from('court_availability')
        .select('start_time, end_time')
        .eq('court_id', courtId);

      if (Array.isArray(courtBlocks)) {
        for (const blk of courtBlocks) {
          if (!blk.start_time || String(blk.start_time).startsWith(bookingDate) || !String(blk.start_time).includes('T')) {
            recordInterval(blk.start_time, blk.end_time, 60);
          }
        }
      }
    } catch (err) {
      console.error('Failed to get court availability:', err);
    }
  }

  return candidateSlots.map((time) => {
    const slotStartHour = parseInt(time.split(':')[0], 10);
    const nextHour = slotStartHour + 1;
    const slotStartMins = slotStartHour * 60;
    const slotEndMins = nextHour * 60;

    const isLocked = lockedIntervals.some(
      (iv) => slotStartMins < iv.endMins && slotEndMins > iv.startMins
    );

    return {
      time,
      endTime: `${String(nextHour).padStart(2, '0')}:00`,
      isAvailable: !isLocked,
      courtId,
      courtName,
      hourlyRateCents,
      sport,
    };
  });
}

/**
 * Fetch all bookings for the currently authenticated player via /api/bookings.
 */
export async function getPlayerBookings(): Promise<Booking[]> {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/bookings?mine=true', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status === 401) return [];
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || 'Failed to fetch player bookings.');
    }
    const json = await res.json();
    return Array.isArray(json.bookings) ? (json.bookings as Booking[]) : [];
  }
  return [];
}

/**
 * Fetch all bookings for a facility managed by the authenticated operator via /api/bookings.
 */
export async function getFacilityBookings(venueId?: string): Promise<Booking[]> {
  if (typeof window !== 'undefined') {
    const url = venueId
      ? `/api/bookings?venueId=${encodeURIComponent(venueId)}`
      : '/api/bookings';
    const res = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return [];
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || 'Failed to fetch facility bookings.');
    }
    const json = await res.json();
    return Array.isArray(json.bookings) ? (json.bookings as Booking[]) : [];
  }
  return [];
}

/**
 * Update the status of a booking (e.g. confirmed, rejected, completed, cancelled)
 * strictly through PATCH /api/bookings so server-side authorization, court_availability,
 * and notifications are persisted atomically.
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  reason?: string
): Promise<boolean> {
  const res = await fetch('/api/bookings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      bookingId,
      status,
      ...(reason && reason.trim() ? { reason: reason.trim() } : {}),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Failed to update booking status (${res.status}).`);
  }

  // Multi-tab and Realtime broadcast for instantaneous player notification
  if (data?.notification && typeof window !== 'undefined') {
    try {
      broadcastNotification(data.notification).catch(() => {});
    } catch {}
  }

  return true;
}
