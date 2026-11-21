import { Booking, BookingStatus, CourtAvailabilitySlot, SportType } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { broadcastNotification } from '@/lib/notifications';

/**
 * Compute hourly court slot availability by querying confirmed/pending bookings
 * and court blocks in Supabase for a specific court and calendar date.
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

  if (!supabase || !isSupabaseConfigured) {
    return candidateSlots.map((time) => {
      const nextHour = parseInt(time.split(':')[0], 10) + 1;
      return {
        time,
        endTime: `${String(nextHour).padStart(2, '0')}:00`,
        isAvailable: true,
        courtId,
        courtName,
        hourlyRateCents,
        sport,
      };
    });
  }

  try {
    const { data: bookedSlots, error } = await supabase
      .from('bookings')
      .select('start_time, end_time, status')
      .eq('court_id', courtId)
      .eq('booking_date', bookingDate)
      .in('status', ['confirmed', 'completed']);

    if (error) {
      console.error('Error querying court availability:', error);
    }

    const bookedHoursSet = new Set<string>();
    if (bookedSlots) {
      for (const b of bookedSlots) {
        let startStr = b.start_time;
        if (startStr.includes('T')) {
          const d = new Date(startStr);
          startStr = `${String(d.getUTCHours()).padStart(2, '0')}:00`;
        } else if (startStr.length >= 5) {
          startStr = startStr.substring(0, 5);
        }
        bookedHoursSet.add(startStr);
      }
    }

    return candidateSlots.map((time) => {
      const nextHour = parseInt(time.split(':')[0], 10) + 1;
      const isAvailable = !bookedHoursSet.has(time);
      return {
        time,
        endTime: `${String(nextHour).padStart(2, '0')}:00`,
        isAvailable,
        courtId,
        courtName,
        hourlyRateCents,
        sport,
      };
    });
  } catch (err) {
    console.error('Failed to get court availability:', err);
    return [];
  }
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
      if (res.status === 401) return [];
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
