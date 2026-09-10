import { Venue, Court, SportType } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export interface VenueFilterOptions {
  sport?: SportType | 'all';
  city?: string;
  searchQuery?: string;
}

/**
 * Fetch all venues with their court facilities from Supabase.
 * Returns empty array if Supabase is unconfigured or table is empty.
 * Never returns mock fallback data.
 */
export async function getVenues(options: VenueFilterOptions = {}): Promise<Venue[]> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) {
    return [];
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
      console.error('Error fetching venues:', error);
      return [];
    }

    return (data as Venue[]) || [];
  } catch (err) {
    console.error('Failed to query venues:', err);
    return [];
  }
}

/**
 * Fetch a single venue by its ID or slug, including its playing areas (courts).
 * Returns null if not found — callers must handle null by rendering an intentional NotFound state.
 */
export async function getVenueById(idOrSlug: string): Promise<Venue | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) {
    return null;
  }

  try {
    // Check if input looks like a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const query = supabase.from('venues').select('*, courts(*)');
    const { data, error } = isUuid
      ? await query.eq('id', idOrSlug).maybeSingle()
      : await query.eq('slug', idOrSlug).maybeSingle();

    if (error) {
      console.error('Error fetching venue by ID/slug:', error);
      return null;
    }

    return data as Venue | null;
  } catch (err) {
    console.error('Failed to query venue:', err);
    return null;
  }
}

/**
 * Fetch courts for a given venue.
 */
export async function getCourtsByVenueId(venueId: string): Promise<Court[]> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching courts:', error);
      return [];
    }

    return (data as Court[]) || [];
  } catch (err) {
    console.error('Failed to query courts:', err);
    return [];
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
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error('You must be logged in to register a facility.');
  }

  // Look up user's public record
  const { data: publicUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', userData.user.id)
    .single();

  const ownerId = publicUser?.id;

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
