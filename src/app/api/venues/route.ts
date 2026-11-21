import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createServerClient, createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken, serverGetUser, SanitizedUser } from '@/lib/auth/serverAuth';

function isValidUuid(val?: string | null): boolean {
  return Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
}

async function resolveAuthenticatedUser(request: Request): Promise<SanitizedUser | null> {
  const authHeader = request.headers.get('authorization') || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const bearerToken = bearerMatch?.[1]?.trim();

  if (bearerToken) {
    const sessionPayload = verifySessionToken(bearerToken);
    if (sessionPayload) {
      const user = await serverGetUser(sessionPayload.userId);
      if (user) return user;
    }

    if (isSupabaseConfigured) {
      const supaClient = createServerClient(bearerToken);
      if (supaClient) {
        const { data: authData } = await supaClient.auth.getUser(bearerToken);
        if (authData?.user?.id) {
          const user = await serverGetUser(authData.user.id);
          if (user) return user;
        }
      }
    }
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const cookieMatch =
    cookieHeader.match(/sportsync-auth-token=([^;]+)/) ||
    cookieHeader.match(/sb-access-token=([^;]+)/);
  const cookieToken = cookieMatch?.[1]?.trim();

  if (cookieToken) {
    const sessionPayload = verifySessionToken(cookieToken);
    if (sessionPayload) {
      const user = await serverGetUser(sessionPayload.userId);
      if (user) return user;
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to register a facility.' },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Supabase database is not configured on the server.' },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Server admin client is unavailable. Please configure SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      );
    }

    const canonicalUserId = user.id;
    if (!isValidUuid(canonicalUserId)) {
      return NextResponse.json(
        { error: 'Authenticated user does not have a valid database user ID.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { venue, courts } = body || {};

    if (!venue || typeof venue !== 'object' || !String(venue.name || '').trim() || !String(venue.address || '').trim()) {
      return NextResponse.json(
        { error: 'Facility name and street address are required.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(courts) || courts.length === 0) {
      return NextResponse.json(
        { error: 'At least one court is required when registering a facility.' },
        { status: 400 }
      );
    }

    const baseSlug =
      String(venue.slug || venue.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'facility';
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString('hex')}`;

    const rawDescription = String(venue.description || '').trim();
    const venueDescription =
      user.email && !rawDescription.toLowerCase().includes(user.email.toLowerCase())
        ? `${rawDescription}${rawDescription ? ' ' : ''}[Owner: ${user.email}]`
        : rawDescription;

    const mergedPaymentInfo = {
      ...(venue.payment_info && typeof venue.payment_info === 'object' ? venue.payment_info : { accepts_cash: true }),
      accepts_cash: venue.payment_info?.accepts_cash ?? true,
      ...(venue.facility_type ? { facility_type: venue.facility_type } : {}),
      ...(venue.booking_mode ? { booking_mode: venue.booking_mode } : {}),
    };

    // 1. Insert venue via Admin client (bypasses browser RLS safely after server auth check)
    const { data: newVenue, error: venueError } = await admin
      .from('venues')
      .insert({
        owner_id: canonicalUserId,
        name: String(venue.name).trim(),
        slug: uniqueSlug,
        description: venueDescription,
        address: String(venue.address).trim(),
        city: 'Naga City',
        latitude: typeof venue.latitude === 'number' ? venue.latitude : 13.6218,
        longitude: typeof venue.longitude === 'number' ? venue.longitude : 123.1948,
        operating_hours: venue.operating_hours || { mon_sun: '06:00 - 23:00' },
        amenities: Array.isArray(venue.amenities)
          ? venue.amenities
          : ['Air Conditioning', 'Free Parking', 'Shower Rooms', 'Pro Shop'],
        featured_sports:
          Array.isArray(venue.featured_sports) && venue.featured_sports.length > 0
            ? venue.featured_sports
            : ['pickleball'],
        images: Array.isArray(venue.images) ? venue.images : [],
        payment_info: mergedPaymentInfo,
        is_verified: true,
        inventory_source: venue.inventory_source || 'manual',
      })
      .select()
      .single();

    if (venueError || !newVenue) {
      console.error('[POST /api/venues] Postgres venue insert error:', venueError);
      const status = venueError?.code === '23505' ? 409 : venueError?.code === '22P02' || venueError?.code === '23502' ? 400 : 500;
      return NextResponse.json(
        { error: venueError?.message || 'Failed to save facility in database.' },
        { status }
      );
    }

    // 2. Insert courts via Admin client
    const dbCourts = courts.map((c: Record<string, unknown>, idx: number) => ({
      venue_id: newVenue.id,
      name: String(c?.name || `Court ${idx + 1}`).trim(),
      sport: String(c?.sport || 'pickleball'),
      floor_type: String(c?.floor_type || 'Standard Playing Surface'),
      court_type: String(c?.court_type || 'standard'),
      hourly_rate_cents: Number(c?.hourly_rate_cents) || 45000,
      supports_doubles: typeof c?.supports_doubles === 'boolean' ? c.supports_doubles : true,
      supports_singles: typeof c?.supports_singles === 'boolean' ? c.supports_singles : true,
      is_indoor: typeof c?.is_indoor === 'boolean' ? c.is_indoor : true,
      is_active: typeof c?.is_active === 'boolean' ? c.is_active : true,
    }));

    const { data: createdCourts, error: courtsError } = await admin
      .from('courts')
      .insert(dbCourts)
      .select();

    if (courtsError || !createdCourts) {
      console.error('[POST /api/venues] Postgres courts insert error:', courtsError);
      await admin.from('venues').delete().eq('id', newVenue.id);
      const status = courtsError?.code === '22P02' || courtsError?.code === '23502' ? 400 : 500;
      return NextResponse.json(
        { error: `Failed to create courts: ${courtsError?.message || 'Unknown database error'}` },
        { status }
      );
    }

    // 3. Link facility_staff record via Admin client
    const { error: staffError } = await admin.from('facility_staff').upsert(
      {
        facility_id: newVenue.id,
        user_id: canonicalUserId,
        role: 'owner',
      },
      { onConflict: 'facility_id,user_id' }
    );

    if (staffError) {
      console.error('[POST /api/venues] Postgres facility_staff upsert error:', staffError);
      await admin.from('venues').delete().eq('id', newVenue.id);
      return NextResponse.json(
        { error: `Failed to link facility staff: ${staffError.message}` },
        { status: 500 }
      );
    }

    // 4. Mark user as venue_owner with onboarding_completed = true in public.users & auth metadata
    const { error: userUpdateError } = await admin
      .from('users')
      .update({
        role: 'venue_owner',
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', canonicalUserId);

    if (userUpdateError) {
      console.warn('[POST /api/venues] public.users onboarding update warning:', userUpdateError);
    }

    const authUserId = user.auth_id || canonicalUserId;
    if (isValidUuid(authUserId)) {
      try {
        await admin.auth.admin.updateUserById(authUserId, {
          user_metadata: {
            role: 'venue_owner',
            onboarding_completed: true,
            has_completed_onboarding: true,
          },
        });
      } catch (metaErr) {
        console.warn('[POST /api/venues] Auth metadata sync notice:', metaErr);
      }
    }

    const fullVenue = {
      ...newVenue,
      courts: createdCourts,
    };

    return NextResponse.json(
      {
        success: true,
        venue: fullVenue,
        courts: createdCourts,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('[POST /api/venues] Unexpected server error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to create facility.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
