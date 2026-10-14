import { Venue, Court, SportType } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { TEST_VENUES } from '@/lib/mockData';

export interface VenueFilterOptions {
  sport?: SportType | 'all';
  city?: string;
  searchQuery?: string;
  verifiedOnly?: boolean;
}

function isValidUuid(id?: string | null): boolean {
  return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
}

/**
 * Filter venues locally by sport, city, or search query.
 */
export function filterVenuesList(venues: Venue[], options: VenueFilterOptions = {}): Venue[] {
  let result = [...venues];

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
    result = result.filter((v) => v.city.toLowerCase().includes(c));
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
 * Gracefully merges locally cached venues and falls back to Philippine seed venues.
 */
export async function getVenues(options: VenueFilterOptions = {}): Promise<Venue[]> {
  const supabase = getSupabaseClient();
  const localVenues = getLocalStoredVenues();

  if (!supabase || !isSupabaseConfigured) {
    const fallbackList = localVenues.length > 0 ? localVenues : TEST_VENUES;
    return filterVenuesList(fallbackList, options);
  }

  try {
    let query = supabase.from('venues').select('*, courts(*)');

    if (options.verifiedOnly) {
      query = query.eq('is_verified', true);
    }

    if (options.sport && options.sport !== 'all') {
      query = query.contains('featured_sports', [options.sport]);
    }

    if (options.city && options.city.trim() && options.city !== 'all' && options.city !== 'All Cities') {
      query = query.ilike('city', `%${options.city.trim()}%`);
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.trim();
      query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('[Venues] Live Supabase query returned error, using local records:', error.message);
      const fallbackList = localVenues.length > 0 ? localVenues : TEST_VENUES;
      return filterVenuesList(fallbackList, options);
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
      return filterVenuesList(TEST_VENUES, options);
    }

    return filterVenuesList(combined, options);
  } catch (err) {
    console.warn('[Venues] Exception querying venues:', err);
    const fallbackList = localVenues.length > 0 ? localVenues : TEST_VENUES;
    return filterVenuesList(fallbackList, options);
  }
}

/**
 * Fetch a single venue by its ID or slug, including its playing areas (courts).
 */
export async function getVenueById(idOrSlug: string): Promise<Venue | null> {
  const supabase = getSupabaseClient();
  const localVenue = getLocalStoredVenues().find((v) => v.id === idOrSlug || v.slug === idOrSlug) || null;

  if (!supabase || !isSupabaseConfigured) {
    return localVenue || TEST_VENUES.find((v) => v.id === idOrSlug || v.slug === idOrSlug) || null;
  }

  try {
    const isUuid = isValidUuid(idOrSlug);

    const query = supabase.from('venues').select('*, courts(*)');
    const { data, error } = isUuid
      ? await query.eq('id', idOrSlug).maybeSingle()
      : await query.eq('slug', idOrSlug).maybeSingle();

    if (error || !data) {
      return localVenue || TEST_VENUES.find((v) => v.id === idOrSlug || v.slug === idOrSlug) || null;
    }

    return data as Venue;
  } catch {
    return localVenue || TEST_VENUES.find((v) => v.id === idOrSlug || v.slug === idOrSlug) || null;
  }
}

/**
 * Fetch all courts belonging to a venue.
 */
export async function getCourtsByVenueId(venueId: string): Promise<Court[]> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) {
    const v = getLocalStoredVenues().find((x) => x.id === venueId) || TEST_VENUES.find((x) => x.id === venueId);
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
 * Create a new facility and playing areas in Supabase.
 */
export async function createVenueWithCourts(
  venueData: Omit<Venue, 'id' | 'courts'>,
  courtsData: Array<Omit<Court, 'id' | 'venue_id'>>
): Promise<{ venue: Venue; courts: Court[] } | null> {
  const supabase = getSupabaseClient();
  const venueId = `venue_${Date.now()}`;

  // Construct venue record
  const formattedVenue: Venue = {
    id: venueId,
    owner_id: venueData.owner_id || 'owner_pending',
    name: venueData.name,
    slug: venueData.slug || `${venueData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`,
    description: venueData.description || '',
    address: venueData.address,
    city: venueData.city,
    latitude: venueData.latitude || 14.5828,
    longitude: venueData.longitude || 121.0664,
    operating_hours: venueData.operating_hours || { mon_sun: '06:00 - 23:00' },
    amenities: venueData.amenities || ['Air Conditioning', 'Free Parking', 'Shower Rooms', 'Pro Shop'],
    featured_sports: venueData.featured_sports || ['pickleball'],
    images: venueData.images || ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'],
    payment_info: venueData.payment_info || { accepts_cash: true },
    rating: 5.0,
    review_count: 0,
    is_verified: true, // Display on player dashboard
    inventory_source: venueData.inventory_source || 'manual',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const formattedCourts: Court[] = courtsData.map((c, i) => ({
    id: `court_${venueId}_${i + 1}`,
    venue_id: venueId,
    name: c.name,
    sport: c.sport,
    hourly_rate_cents: c.hourly_rate_cents || 45000,
    floor_type: c.floor_type || 'Standard Playing Surface',
    court_type: c.court_type || 'standard',
    is_indoor: c.is_indoor ?? true,
    is_active: true,
    supports_doubles: c.supports_doubles ?? true,
    supports_singles: c.supports_singles ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  formattedVenue.courts = formattedCourts;

  // Persist locally for immediate availability
  saveLocalStoredVenues(formattedVenue);

  if (!supabase || !isSupabaseConfigured) {
    return { venue: formattedVenue, courts: formattedCourts };
  }

  try {
    const { data: userData } = await supabase.auth.getUser();
    const rawOwnerId = userData?.user?.id || formattedVenue.owner_id;
    // UUID verification to avoid postgres foreign key syntax error
    const ownerId = isValidUuid(rawOwnerId) ? rawOwnerId : null;

    // Insert to Supabase venues table
    const { data: newVenue, error: venueError } = await supabase
      .from('venues')
      .insert({
        owner_id: ownerId,
        name: formattedVenue.name,
        slug: formattedVenue.slug,
        description: formattedVenue.description,
        address: formattedVenue.address,
        city: formattedVenue.city,
        latitude: formattedVenue.latitude,
        longitude: formattedVenue.longitude,
        operating_hours: formattedVenue.operating_hours,
        amenities: formattedVenue.amenities,
        featured_sports: formattedVenue.featured_sports,
        images: formattedVenue.images,
        payment_info: formattedVenue.payment_info,
        is_verified: true,
        inventory_source: formattedVenue.inventory_source,
      })
      .select()
      .single();

    if (venueError || !newVenue) {
      console.warn('Supabase venue insert fallback handled, using local record:', venueError?.message);
      return { venue: formattedVenue, courts: formattedCourts };
    }

    // Link staff record if ownerId is valid UUID
    if (ownerId && isValidUuid(ownerId)) {
      try {
        await supabase.from('facility_staff').upsert({
          facility_id: newVenue.id,
          user_id: ownerId,
          role: 'owner',
        });
      } catch (staffErr) {
        console.warn('Facility staff link error:', staffErr);
      }
    }

    // Insert courts
    const dbCourts = courtsData.map((c) => ({
      venue_id: newVenue.id,
      name: c.name,
      sport: c.sport,
      floor_type: c.floor_type,
      hourly_rate_cents: c.hourly_rate_cents,
      supports_doubles: c.supports_doubles ?? true,
      supports_singles: c.supports_singles ?? true,
      is_indoor: c.is_indoor ?? true,
      is_active: true,
    }));

    const { data: createdCourts } = await supabase
      .from('courts')
      .insert(dbCourts)
      .select();

    const finalCourts = (createdCourts as Court[]) || formattedCourts;
    const finalVenue: Venue = {
      ...newVenue,
      courts: finalCourts,
    };

    saveLocalStoredVenues(finalVenue);
    return { venue: finalVenue, courts: finalCourts };
  } catch (err) {
    console.warn('Supabase venue creation exception, returning stored record:', err);
    return { venue: formattedVenue, courts: formattedCourts };
  }
}

/**
 * Create a new court for an existing venue in Supabase and local storage.
 */
export async function createCourt(courtData: Omit<Court, 'id'>): Promise<Court> {
  const supabase = getSupabaseClient();
  const courtId = `court_${Date.now()}`;
  const localCourt: Court = {
    ...courtData,
    id: courtId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Update in local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = getLocalStoredVenues();
      const targetVenue = stored.find((v) => v.id === courtData.venue_id);
      if (targetVenue) {
        targetVenue.courts = [localCourt, ...(targetVenue.courts || []).filter((c) => c.id !== courtId)];
        if (!targetVenue.featured_sports.includes(courtData.sport)) {
          targetVenue.featured_sports.push(courtData.sport);
        }
        saveLocalStoredVenues(targetVenue);
      }
    } catch (err) {
      console.warn('Error updating local storage courts:', err);
    }
  }

  // 2. Insert to Supabase if configured and valid UUID
  if (supabase && isSupabaseConfigured) {
    try {
      if (isValidUuid(courtData.venue_id)) {
        const { data, error } = await supabase
          .from('courts')
          .insert({
            venue_id: courtData.venue_id,
            name: courtData.name,
            sport: courtData.sport,
            floor_type: courtData.floor_type,
            court_type: courtData.court_type || 'standard',
            hourly_rate_cents: courtData.hourly_rate_cents,
            supports_doubles: courtData.supports_doubles ?? true,
            supports_singles: courtData.supports_singles ?? true,
            is_indoor: courtData.is_indoor ?? true,
            is_active: courtData.is_active ?? true,
          })
          .select()
          .single();

        if (data && !error) {
          const createdDbCourt = data as Court;
          // Also update venue's sports list in Supabase
          try {
            const { data: vData } = await supabase.from('venues').select('featured_sports').eq('id', courtData.venue_id).single();
            if (vData && !vData.featured_sports?.includes(courtData.sport)) {
              await supabase.from('venues').update({
                featured_sports: [...(vData.featured_sports || []), courtData.sport],
              }).eq('id', courtData.venue_id);
            }
          } catch {}
          return createdDbCourt;
        }
      }
    } catch (err) {
      console.warn('Error creating court in Supabase:', err);
    }
  }

  return localCourt;
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

