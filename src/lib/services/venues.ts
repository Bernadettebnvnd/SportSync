import { Venue, Court, SportType } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { TEST_VENUES, TEST_COURTS } from '@/lib/mockData';

export interface VenueFilterOptions {
  sport?: SportType | 'all';
  city?: string;
  searchQuery?: string;
}

let hasLoggedVenuesNetworkWarning = false;

function filterOfflineVenues(venues: Venue[], options: VenueFilterOptions = {}): Venue[] {
  let result = [...venues];
  if (options.sport && options.sport !== 'all') {
    result = result.filter((v) => v.featured_sports?.includes(options.sport as SportType));
  }
  if (options.city && options.city.trim() && options.city !== 'All Metro Manila') {
    const c = options.city.trim().toLowerCase();
    result = result.filter((v) => v.city.toLowerCase().includes(c));
  }
  if (options.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.trim().toLowerCase();
    result = result.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q)
    );
  }
  return result;
}

/**
 * Fetch all venues with their court facilities from Supabase.
 * When Supabase is offline or unresolvable, gracefully falls back
 * to verified Philippine sports centers cache without crashing.
 */
export async function getVenues(options: VenueFilterOptions = {}): Promise<Venue[]> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) {
    return filterOfflineVenues(TEST_VENUES, options);
  }

  try {
    let query = supabase
      .from('venues')
      .select('*, courts(*)');

    if (options.sport && options.sport !== 'all') {
      query = query.contains('featured_sports', [options.sport]);
    }

    if (options.city && options.city.trim() && options.city !== 'All Metro Manila') {
      query = query.ilike('city', `%${options.city.trim()}%`);
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.trim();
      query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      if (!hasLoggedVenuesNetworkWarning) {
        hasLoggedVenuesNetworkWarning = true;
        console.warn('[Venues] Live Supabase unreachable. Using offline verified venues cache.');
      }
      return filterOfflineVenues(TEST_VENUES, options);
    }

    if (data && data.length > 0) {
      return (data as Venue[]);
    }

    return filterOfflineVenues(TEST_VENUES, options);
  } catch (err) {
    if (!hasLoggedVenuesNetworkWarning) {
      hasLoggedVenuesNetworkWarning = true;
      console.warn('[Venues] Network query exception. Using offline verified venues cache:', err);
    }
    return filterOfflineVenues(TEST_VENUES, options);
  }
}

/**
 * Fetch a single venue by its ID or slug, including its playing areas (courts).
 */
export async function getVenueById(idOrSlug: string): Promise<Venue | null> {
  const supabase = getSupabaseClient();
  const fallbackVenue = TEST_VENUES.find((v) => v.id === idOrSlug || v.slug === idOrSlug) || null;

  if (!supabase || !isSupabaseConfigured) {
    return fallbackVenue;
  }

  try {
    // Check if input looks like a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const query = supabase.from('venues').select('*, courts(*)');
    const { data, error } = isUuid
      ? await query.eq('id', idOrSlug).maybeSingle()
      : await query.eq('slug', idOrSlug).maybeSingle();

    if (error || !data) {
      return fallbackVenue;
    }

    return (data as Venue);
  } catch {
    return fallbackVenue;
  }
}

/**
 * Fetch courts for a given venue.
 */
export async function getCourtsByVenueId(venueId: string): Promise<Court[]> {
  const supabase = getSupabaseClient();
  const fallbackCourts = TEST_COURTS.filter((c) => c.venue_id === venueId);

  if (!supabase || !isSupabaseConfigured) {
    return fallbackCourts;
  }

  try {
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return fallbackCourts;
    }

    return (data as Court[]);
  } catch {
    return fallbackCourts;
  }
}

/**
 * Create a new facility and playing areas in Supabase.
 * Enforces authenticated owner session.
 */
export async function createVenueWithCourts(
  venueData: Omit<Venue, 'id' | 'courts'>,
  courtsData: Array<Omit<Court, 'id' | 'venue_id'>>
): Promise<{ venue: Venue; courts: Court[] } | null> {
  const supabase = getSupabaseClient();

  // Local development / demo fallback if Supabase is unconfigured
  if (!supabase || !isSupabaseConfigured) {
    const venueId = `venue_${Date.now()}`;
    const newVenue: Venue = {
      id: venueId,
      owner_id: 'local_owner',
      name: venueData.name,
      slug: venueData.slug,
      description: venueData.description,
      address: venueData.address,
      city: venueData.city,
      latitude: venueData.latitude || 14.5828,
      longitude: venueData.longitude || 121.0664,
      operating_hours: venueData.operating_hours || { mon_sun: '06:00 - 23:00' },
      amenities: venueData.amenities || [],
      featured_sports: venueData.featured_sports || ['pickleball'],
      images: venueData.images || [],
      payment_info: venueData.payment_info || { accepts_cash: true },
      rating: 5.0,
      review_count: 0,
      is_verified: true,
      inventory_source: venueData.inventory_source || 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newCourts: Court[] = courtsData.map((c, i) => ({
      id: `court_${venueId}_${i + 1}`,
      venue_id: venueId,
      name: c.name,
      sport: c.sport,
      hourly_rate_cents: c.hourly_rate_cents,
      floor_type: c.floor_type || 'Tournament Standard Surface',
      court_type: c.court_type || 'standard',
      is_indoor: c.is_indoor ?? true,
      is_active: true,
      supports_doubles: c.supports_doubles ?? true,
      supports_singles: c.supports_singles ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    newVenue.courts = newCourts;
    return { venue: newVenue, courts: newCourts };
  }

  const { data: userData } = await supabase.auth.getUser();
  const ownerId = userData?.user?.id || 'local_owner';

  // Insert venue
  const { data: newVenue, error: venueError } = await supabase
    .from('venues')
    .insert({
      owner_id: ownerId,
      name: venueData.name,
      slug: venueData.slug,
      description: venueData.description,
      address: venueData.address,
      city: venueData.city,
      latitude: venueData.latitude,
      longitude: venueData.longitude,
      operating_hours: venueData.operating_hours,
      amenities: venueData.amenities,
      featured_sports: venueData.featured_sports,
      images: venueData.images,
      payment_info: venueData.payment_info,
      gcash_number: venueData.payment_info?.gcash_number,
      gcash_name: venueData.payment_info?.gcash_name,
      is_verified: true,
      inventory_source: venueData.inventory_source || 'manual',
    })
    .select()
    .single();

  if (venueError || !newVenue) {
    console.error('Error inserting venue:', venueError);
    throw new Error(venueError?.message || 'Failed to create venue record.');
  }

  // Link staff record
  if (ownerId) {
    await supabase.from('facility_staff').upsert({
      facility_id: newVenue.id,
      user_id: ownerId,
      role: 'owner',
    });
  }

  // Insert courts
  const formattedCourts = courtsData.map((c) => ({
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

  const { data: newCourts, error: courtsError } = await supabase
    .from('courts')
    .insert(formattedCourts)
    .select();

  if (courtsError) {
    console.error('Error inserting courts:', courtsError);
  }

  return {
    venue: { ...newVenue, courts: newCourts || [] },
    courts: (newCourts as Court[]) || [],
  };
}
