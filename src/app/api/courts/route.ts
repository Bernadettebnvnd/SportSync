import { NextResponse } from 'next/server';
import { createServerClient, createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken, serverGetUser, SanitizedUser, isMissingTableError, isMissingColumnError, extractMissingColumn } from '@/lib/auth/serverAuth';

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

    const admin = createAdminClient() || createServerClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Server database client is unavailable.' },
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

    const candidateStaffIds = [canonicalUserId, user.auth_id].filter((id): id is string =>
      isValidUuid(id)
    );

    let staffRow = null;
    try {
      if (candidateStaffIds.length > 0) {
        const { data: sData } = await admin
          .from('facility_staff')
          .select('id')
          .eq('facility_id', venue_id)
          .in('user_id', candidateStaffIds)
          .limit(1)
          .maybeSingle();
        staffRow = sData;
      }
    } catch {}

    const roleStr = String(user.role || '');
    const isAdmin = roleStr === 'admin';
    const isVenueOwner =
      targetVenue.owner_id === canonicalUserId ||
      (Boolean(user.auth_id) && targetVenue.owner_id === user.auth_id);

    if (!isVenueOwner && !staffRow && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to add courts to this facility.' },
        { status: 403 }
      );
    }

    const normalizedSport = String(sport || 'pickleball');

    const courtPayload: Record<string, unknown> = {
      venue_id,
      name: name.trim(),
      sport: normalizedSport,
      floor_type: floor_type || 'Standard Playing Surface',
      court_type: court_type || 'standard',
      hourly_rate_cents:
        hourly_rate_cents !== undefined && hourly_rate_cents !== null && !isNaN(Number(hourly_rate_cents))
          ? Math.max(0, Math.round(Number(hourly_rate_cents)))
          : 45000,
      supports_doubles: typeof supports_doubles === 'boolean' ? supports_doubles : true,
      supports_singles: typeof supports_singles === 'boolean' ? supports_singles : true,
      is_indoor: typeof is_indoor === 'boolean' ? is_indoor : true,
      is_active: typeof is_active === 'boolean' ? is_active : true,
    };

    let { data: createdCourt, error: courtError } = await admin
      .from('courts')
      .insert(courtPayload)
      .select()
      .single();

    while (courtError && isMissingColumnError(courtError)) {
      const missing = extractMissingColumn(courtError);
      console.warn(`[POST /api/courts] courts.${missing || 'unknown'} missing from schema cache, retrying:`, courtError.message);
      if (missing && missing in courtPayload) {
        delete courtPayload[missing];
      }
      const retry = await admin
        .from('courts')
        .insert(courtPayload)
        .select()
        .single();
      createdCourt = retry.data;
      courtError = retry.error;
      if (createdCourt || !isMissingColumnError(courtError)) break;
    }

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

export async function PATCH(request: Request) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to edit a court.' },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Supabase database is not configured on the server.' },
        { status: 500 }
      );
    }

    const admin = createAdminClient() || createServerClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Server database client is unavailable.' },
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
      id,
      courtId,
      name,
      floor_type,
      hourly_rate_cents,
      is_indoor,
      is_active,
    } = (body || {}) as {
      id?: string;
      courtId?: string;
      name?: string;
      floor_type?: string;
      hourly_rate_cents?: number;
      is_indoor?: boolean;
      is_active?: boolean;
    };

    const targetCourtId = id || courtId;
    if (!isValidUuid(targetCourtId)) {
      return NextResponse.json(
        { error: 'A valid court UUID is required.' },
        { status: 400 }
      );
    }

    const { data: existingCourt, error: courtLookupErr } = await admin
      .from('courts')
      .select('id, venue_id')
      .eq('id', targetCourtId!)
      .maybeSingle();

    if (courtLookupErr) {
      console.error('[PATCH /api/courts] Postgres court lookup error:', courtLookupErr);
      return NextResponse.json({ error: courtLookupErr.message }, { status: 500 });
    }

    if (!existingCourt) {
      return NextResponse.json({ error: 'Court not found.' }, { status: 404 });
    }

    const { data: targetVenue, error: venueLookupErr } = await admin
      .from('venues')
      .select('id, owner_id')
      .eq('id', existingCourt.venue_id)
      .maybeSingle();

    if (venueLookupErr) {
      console.error('[PATCH /api/courts] Postgres venue lookup error:', venueLookupErr);
      return NextResponse.json({ error: venueLookupErr.message }, { status: 500 });
    }

    if (!targetVenue) {
      return NextResponse.json({ error: 'Associated venue not found.' }, { status: 404 });
    }

    const candidateStaffIds = [canonicalUserId, user.auth_id].filter((id): id is string =>
      isValidUuid(id)
    );

    let staffRow = null;
    try {
      if (candidateStaffIds.length > 0) {
        const { data: sRow, error: staffLookupErr } = await admin
          .from('facility_staff')
          .select('id')
          .eq('facility_id', targetVenue.id)
          .in('user_id', candidateStaffIds)
          .limit(1)
          .maybeSingle();

        if (staffLookupErr && !isMissingTableError(staffLookupErr)) {
          console.warn('[PATCH /api/courts] facility_staff lookup notice:', staffLookupErr.message);
        } else if (sRow) {
          staffRow = sRow;
        }
      }
    } catch {}

    const roleStr = String(user.role || '');
    const isAdmin = roleStr === 'admin';
    const isVenueOwner =
      targetVenue.owner_id === canonicalUserId ||
      (Boolean(user.auth_id) && targetVenue.owner_id === user.auth_id);

    if (!isVenueOwner && !staffRow && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to edit courts for this facility.' },
        { status: 403 }
      );
    }

    const updateFields: {
      name?: string;
      floor_type?: string;
      hourly_rate_cents?: number;
      is_indoor?: boolean;
      is_active?: boolean;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (typeof name === 'string' && name.trim()) {
      updateFields.name = name.trim();
    }
    if (typeof floor_type === 'string') {
      updateFields.floor_type = floor_type.trim() || 'Standard Court Surface';
    }
    if (typeof hourly_rate_cents === 'number' && Number.isFinite(hourly_rate_cents) && hourly_rate_cents >= 0) {
      updateFields.hourly_rate_cents = Math.round(hourly_rate_cents);
    }
    if (typeof is_indoor === 'boolean') {
      updateFields.is_indoor = is_indoor;
    }
    if (typeof is_active === 'boolean') {
      updateFields.is_active = is_active;
    }

    const { data: updatedCourt, error: updateErr } = await admin
      .from('courts')
      .update(updateFields)
      .eq('id', targetCourtId!)
      .select('*')
      .single();

    if (updateErr || !updatedCourt) {
      console.error('[PATCH /api/courts] Postgres court update error:', updateErr);
      return NextResponse.json(
        { error: updateErr?.message || 'Failed to update court in database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, court: updatedCourt });
  } catch (err: unknown) {
    console.error('[PATCH /api/courts] Unexpected server error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to update court.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
