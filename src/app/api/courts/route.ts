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
        { error: 'Authentication required to add a court.' },
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
    const {
      venue_id,
      name,
      sport,
      floor_type,
      court_type,
      hourly_rate_cents,
      supports_doubles,
      supports_singles,
      is_indoor,
      is_active,
    } = body || {};

    if (!isValidUuid(venue_id)) {
      return NextResponse.json(
        { error: 'A valid venue UUID (venue_id) is required.' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Court name is required.' },
        { status: 400 }
      );
    }

    // Verify target venue exists and user is owner or authorized staff
    const { data: targetVenue, error: venueLookupErr } = await admin
      .from('venues')
      .select('id, owner_id, featured_sports')
      .eq('id', venue_id)
      .maybeSingle();

    if (venueLookupErr) {
      console.error('[POST /api/courts] Postgres venue lookup error:', venueLookupErr);
      return NextResponse.json({ error: venueLookupErr.message }, { status: 500 });
    }

    if (!targetVenue) {
      return NextResponse.json({ error: 'Target venue not found.' }, { status: 404 });
    }

    const { data: staffRow } = await admin
      .from('facility_staff')
      .select('id')
      .eq('facility_id', venue_id)
      .eq('user_id', canonicalUserId)
      .maybeSingle();

    if (targetVenue.owner_id !== canonicalUserId && !staffRow) {
      return NextResponse.json(
        { error: 'You are not authorized to add courts to this facility.' },
        { status: 403 }
      );
    }

    const normalizedSport = String(sport || 'pickleball');

    const { data: createdCourt, error: courtError } = await admin
      .from('courts')
      .insert({
        venue_id,
        name: name.trim(),
        sport: normalizedSport,
        floor_type: floor_type || 'Standard Playing Surface',
        court_type: court_type || 'standard',
        hourly_rate_cents: Number(hourly_rate_cents) || 45000,
        supports_doubles: typeof supports_doubles === 'boolean' ? supports_doubles : true,
        supports_singles: typeof supports_singles === 'boolean' ? supports_singles : true,
        is_indoor: typeof is_indoor === 'boolean' ? is_indoor : true,
        is_active: typeof is_active === 'boolean' ? is_active : true,
      })
      .select()
      .single();

    if (courtError || !createdCourt) {
      console.error('[POST /api/courts] Postgres court insert error:', courtError);
      const status = courtError?.code === '22P02' || courtError?.code === '23502' ? 400 : 500;
      return NextResponse.json(
        { error: courtError?.message || 'Failed to create court in database.' },
        { status }
      );
    }

    const currentSports: string[] = Array.isArray(targetVenue.featured_sports)
      ? targetVenue.featured_sports
      : [];
    if (!currentSports.includes(normalizedSport)) {
      const { error: sportsUpdateErr } = await admin
        .from('venues')
        .update({
          featured_sports: [...currentSports, normalizedSport],
          updated_at: new Date().toISOString(),
        })
        .eq('id', venue_id);

      if (sportsUpdateErr) {
        console.warn('[POST /api/courts] featured_sports sync notice:', sportsUpdateErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        court: createdCourt,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('[POST /api/courts] Unexpected server error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to create court.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
