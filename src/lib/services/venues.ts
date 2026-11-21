import { Venue, Court, SportType, VenuePaymentInfo } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_VENUES } from '@/lib/mockData';

export interface VenueFilterOptions {
  sport?: SportType | 'all';
  city?: string;
  searchQuery?: string;
  verifiedOnly?: boolean;
}

function isValidUuid(id?: string | null): boolean {
  return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
}

async function getOptionalAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Verifies whether a venue is located in the pilot market: Naga City, Camarines Sur.
 */
export function isNagaVenue(v: Venue): boolean {
  if (!v) return false;
  const c = (v.city || '').toLowerCase();
  const a = (v.address || '').toLowerCase();
  return c.includes('naga') || a.includes('naga') || a.includes('camarines');
}

/**
 * Filter venues locally by sport, city, or search query (strictly scoped to Naga City pilot market).
 */
export function filterVenuesList(venues: Venue[], options: VenueFilterOptions = {}): Venue[] {
  // Enforce Naga City market boundary on all runtime venue discovery
  let result = venues.filter(isNagaVenue);

  if (options.verifiedOnly) {
    result = result.filter((v) => v.is_verified);
  }

  if (options.sport && options.sport !== 'all') {
    result = result.filter((v) => {
      const sportLower = options.sport!.toLowerCase();
      const hasFeatured = v.featured_sports?.some((s) => s.toLowerCase().includes(sportLower));
      const hasCourt = v.courts?.some((c) => c.sport.toLowerCase().includes(sportLower));
      return hasFeatured || hasCourt;
    });
  }

  if (options.city && options.city.trim() && options.city !== 'all' && options.city !== 'All Cities') {
    const c = options.city.trim().toLowerCase();
    result = result.filter((v) => {
      const vCity = (v.city || '').toLowerCase();
      const vAddr = (v.address || '').toLowerCase();
      return vCity.includes(c) || vAddr.includes(c);
    });
  }

  if (options.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.trim().toLowerCase();
    result = result.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q) ||
        v.courts?.some((c) => c.name.toLowerCase().includes(q) || c.sport.toLowerCase().includes(q))
    );
  }

  return result;
}

/**
 * Helper to get user-created venues from local storage when offline or caching.
 */
export function getLocalStoredVenues(): Venue[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('sportsync_user_venues');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalStoredVenues(venue: Venue) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalStoredVenues();
    const updated = [venue, ...existing.filter((v) => v.id !== venue.id)];
    localStorage.setItem('sportsync_user_venues', JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save venue to localStorage:', err);
  }
}

/**
 * Fetch all venues with their court facilities from Supabase.
 * Returns genuine database or user-created records.
 */
export async function getVenues(options: VenueFilterOptions = {}): Promise<Venue[]> {
  const supabase = getSupabaseClient();
  const localVenues = getLocalStoredVenues();

  if (!supabase || !isSupabaseConfigured) {
    const combined = [...localVenues];
    INITIAL_VENUES.filter(isNagaVenue).forEach((iv) => {
      if (!combined.some((v) => v.id === iv.id || v.name.toLowerCase() === iv.name.toLowerCase())) {
        combined.push(iv);
      }
    });
    return filterVenuesList(combined, options);
  }

  try {
    let query = supabase.from('venues').select('*, courts(*)');

    if (options.verifiedOnly) {
      query = query.eq('is_verified', true);
    }

    if (options.sport && options.sport !== 'all') {
      query = query.contains('featured_sports', [options.sport]);
    }

    // Always scope to Naga City pilot market
    query = query.or('city.ilike.%naga%,address.ilike.%naga%,address.ilike.%camarines%');

    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.trim();
      query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('[Venues] Live Supabase query returned error, using local records:', error.message);
      return filterVenuesList(localVenues, options);
    }

    const dbVenues = (data as Venue[]) || [];
    // Merge any locally staged user venues so newly created venues always appear
    const combined = [...dbVenues];
    localVenues.forEach((lv) => {
      if (!combined.some((v) => v.id === lv.id || v.name.toLowerCase() === lv.name.toLowerCase())) {
        combined.push(lv);
      }
    });
    if (combined.length === 0) {
      INITIAL_VENUES.filter(isNagaVenue).forEach((iv) => {
        if (!combined.some((v) => v.id === iv.id || v.name.toLowerCase() === iv.name.toLowerCase())) {
          combined.push(iv);
        }
      });
    }

    return filterVenuesList(combined, options);
  } catch (err) {
    console.warn('[Venues] Exception querying venues:', err);
    return filterVenuesList(localVenues, options);
  }
}

/**
 * Fetch a single venue by its ID or slug, including its playing areas (courts).
 */
export async function getVenueById(idOrSlug: string): Promise<Venue | null> {
  const supabase = getSupabaseClient();
  const localVenue =
    getLocalStoredVenues().find((v) => isNagaVenue(v) && (v.id === idOrSlug || v.slug === idOrSlug)) ||
    INITIAL_VENUES.filter(isNagaVenue).find((v) => v.id === idOrSlug || v.slug === idOrSlug) ||
    null;

  if (!supabase || !isSupabaseConfigured) {
    return localVenue;
  }

  try {
    const isUuid = isValidUuid(idOrSlug);

    const query = supabase.from('venues').select('*, courts(*)');
    const { data, error } = isUuid
      ? await query.eq('id', idOrSlug).maybeSingle()
      : await query.eq('slug', idOrSlug).maybeSingle();

    if (error || !data) {
      return localVenue;
    }

    return data as Venue;
  } catch {
    return localVenue;
  }
}

/**
 * Fetch all courts belonging to a venue.
 */
export async function getCourtsByVenueId(venueId: string): Promise<Court[]> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) {
    const v = getLocalStoredVenues().find((x) => x.id === venueId);
    return v?.courts || [];
  }

  try {
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      return [];
    }

    return (data as Court[]) || [];
  } catch {
    return [];
  }
}

/**
 * Create a new facility and playing areas in Supabase via authenticated server API.
 */
export async function createVenueWithCourts(
  venueData: Omit<Venue, 'id' | 'courts'> & {
    facility_type?: string;
    booking_mode?: 'instant' | 'inquiry';
  },
  courtsData: Array<Omit<Court, 'id' | 'venue_id'>>
): Promise<{ venue: Venue; courts: Court[] }> {
  const mergedPaymentInfo: VenuePaymentInfo & {
    facility_type?: string;
    booking_mode?: 'instant' | 'inquiry';
  } = {
    ...(venueData.payment_info || { accepts_cash: true }),
    ...(venueData.facility_type ? { facility_type: venueData.facility_type } : {}),
    ...(venueData.booking_mode ? { booking_mode: venueData.booking_mode } : {}),
  };

  const accessToken = await getOptionalAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch('/api/venues', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      venue: {
        ...venueData,
        city: 'Naga City',
        payment_info: mergedPaymentInfo,
      },
      courts: courtsData,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.venue) {
    throw new Error(json?.error || 'Failed to save facility to database.');
  }

  const createdVenue = json.venue as Venue;
  const createdCourts = (json.courts as Court[]) || createdVenue.courts || [];
  const finalVenue: Venue = {
    ...createdVenue,
    courts: createdCourts,
  };

  saveLocalStoredVenues(finalVenue);
  return { venue: finalVenue, courts: createdCourts };
}

/**
 * Create a new court for an existing venue in Supabase via authenticated server API.
 */
export async function createCourt(courtData: Omit<Court, 'id'>): Promise<Court> {
  const accessToken = await getOptionalAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch('/api/courts', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(courtData),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.court) {
    throw new Error(json?.error || 'Failed to create court in database.');
  }

  const createdDbCourt = json.court as Court;

  if (typeof window !== 'undefined') {
    try {
      const stored = getLocalStoredVenues();
      const targetVenue = stored.find((v) => v.id === courtData.venue_id);
      if (targetVenue) {
        targetVenue.courts = [
          createdDbCourt,
          ...(targetVenue.courts || []).filter((c) => c.id !== createdDbCourt.id),
        ];
        if (!targetVenue.featured_sports.includes(createdDbCourt.sport)) {
          targetVenue.featured_sports.push(createdDbCourt.sport);
        }
        saveLocalStoredVenues(targetVenue);
      }
    } catch (err) {
      console.warn('Error updating local storage courts:', err);
    }
  }

  return createdDbCourt;
}

/**
 * Update facility profile in Supabase and local storage.
 */
export async function updateVenueProfile(
  venueId: string,
  updates: Partial<Venue>
): Promise<Venue | null> {
  const supabase = getSupabaseClient();
  let updatedVenue: Venue | null = null;

  // 1. Update in local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = getLocalStoredVenues();
      const existing = stored.find((v) => v.id === venueId);
      if (existing) {
        updatedVenue = { ...existing, ...updates, updated_at: new Date().toISOString() };
        saveLocalStoredVenues(updatedVenue);
      }
    } catch (err) {
      console.warn('Error updating local storage venue:', err);
    }
  }

  // 2. Update in Supabase
  if (supabase && isSupabaseConfigured && isValidUuid(venueId)) {
    try {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name) updatePayload.name = updates.name;
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.address) updatePayload.address = updates.address;
      if (updates.city) updatePayload.city = updates.city;
      if (updates.operating_hours) updatePayload.operating_hours = updates.operating_hours;
      if (updates.featured_sports) updatePayload.featured_sports = updates.featured_sports;
      if (updates.amenities) updatePayload.amenities = updates.amenities;
      if (updates.payment_info) updatePayload.payment_info = updates.payment_info;

      const { data, error } = await supabase
        .from('venues')
        .update(updatePayload)
        .eq('id', venueId)
        .select('*, courts(*)')
        .single();

      if (data && !error) {
        updatedVenue = data as Venue;
        saveLocalStoredVenues(updatedVenue);
      }
    } catch (err) {
      console.warn('Error updating venue in Supabase:', err);
    }
  }

  return updatedVenue;
}

