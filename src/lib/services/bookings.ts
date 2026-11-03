import { Booking, BookingStatus, CourtAvailabilitySlot, SportType } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

function isValidUuid(id?: string | null): boolean {
  return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
}

function getLocalBookedHours(courtId: string, bookingDate: string): Set<string> {
  const localSet = new Set<string>();
  if (typeof window === 'undefined') return localSet;
  try {
    const raw = localStorage.getItem('sportsync_my_bookings') || localStorage.getItem('sideline_my_bookings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const b of parsed) {
          if (
            b.court_id === courtId &&
            b.booking_date === bookingDate &&
            b.status !== 'cancelled'
          ) {
            let startStr = b.start_time || '';
            if (startStr.includes('T')) {
              const d = new Date(startStr);
              startStr = `${String(d.getUTCHours()).padStart(2, '0')}:00`;
            } else if (startStr.length >= 5) {
              startStr = startStr.substring(0, 5);
            }
            if (startStr) localSet.add(startStr);
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Bookings] Error reading local bookings:', e);
  }
  return localSet;
}

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

  // Generate standard operating time slots for the day
  const candidateSlots: string[] = [];
  for (let h = openHour; h < closeHour; h++) {
    candidateSlots.push(`${String(h).padStart(2, '0')}:00`);
  }

  const bookedHoursSet = getLocalBookedHours(courtId, bookingDate);

  // If courtId is not a UUID (e.g. demo mock court like court_test_01),
  // do not query PostgreSQL UUID column which causes Postgres 22P02 error.
  if (!isValidUuid(courtId) || !supabase || !isSupabaseConfigured) {
    return candidateSlots.map((time) => {
      const nextHour = parseInt(time.split(':')[0], 10) + 1;
      return {
        time,
        endTime: `${String(nextHour).padStart(2, '0')}:00`,
        isAvailable: !bookedHoursSet.has(time),
        courtId,
        courtName,
        hourlyRateCents,
        sport,
      };
    });
  }

  // Real Database Query for valid UUID court
  const { data: bookedSlots, error } = await supabase
    .from('bookings')
    .select('start_time, end_time, status')
    .eq('court_id', courtId)
    .eq('booking_date', bookingDate)
    .neq('status', 'cancelled');

  if (error) {
    console.error('Database error querying court availability:', error.message);
    throw new Error(`Database error querying court availability: ${error.message}`);
  }

  if (bookedSlots) {
    for (const b of bookedSlots) {
      // b.start_time can be stored as "14:00" or ISO string
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
}

/**
 * Fetch all bookings for the currently authenticated user.
 */
export async function getPlayerBookings(): Promise<Booking[]> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: publicUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', userData.user.id)
          .maybeSingle();

        if (publicUser) {
          const { data, error } = await supabase
            .from('bookings')
            .select('*, venue:venues(*), court:courts(*)')
            .eq('user_id', publicUser.id)
            .order('booking_date', { ascending: false })
            .order('start_time', { ascending: false });

          if (!error && data && data.length > 0) {
            return data as Booking[];
          }
        }
      }
    } catch (err) {
      console.warn('Supabase getPlayerBookings notice:', err);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/bookings', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.bookings)) return json.bookings as Booking[];
      }
    } catch (err) {
      console.warn('API getPlayerBookings fallback notice:', err);
    }
  }

  return [];
}

/**
 * Fetch all bookings for a facility managed by the authenticated operator.
 */
export async function getFacilityBookings(venueId?: string): Promise<Booking[]> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      let query = supabase
        .from('bookings')
        .select('*, user:users(*), court:courts(*), venue:venues(*)');

      if (venueId) {
        query = query.eq('venue_id', venueId);
      }

      const { data, error } = await query
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as Booking[];
      }
    } catch (err) {
      console.warn('Supabase getFacilityBookings notice:', err);
    }
  }

  // Fallback to /api/bookings
  if (typeof window !== 'undefined') {
    try {
      const url = venueId ? `/api/bookings?venueId=${encodeURIComponent(venueId)}` : '/api/bookings';
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.bookings)) return json.bookings as Booking[];
      }
    } catch (err) {
      console.warn('API getFacilityBookings fallback notice:', err);
    }
  }

  return [];
}

/**
 * Update the status of a booking (e.g. check-in, completed, cancelled).
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) return false;

  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) {
      console.error('Failed to update booking status:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error updating booking status:', err);
    return false;
  }
}
