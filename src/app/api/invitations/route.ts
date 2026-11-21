import { NextRequest, NextResponse } from 'next/server';
import { CommunityGame } from '@/mock/types';
import { createAdminClient, createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken, serverGetUser, SanitizedUser, isMissingColumnError, extractMissingColumn } from '@/lib/auth/serverAuth';
import { isGameExpired } from '@/lib/utils/gameExpiration';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getDbClient() {
  const admin = createAdminClient();
  if (admin) return admin;
  return createServerClient();
}

async function authenticateRequest(
  req: NextRequest,
  participantData?: any
): Promise<SanitizedUser | null> {
  const tokenCookie =
    req.cookies.get('sportsync-auth-token')?.value ||
    req.cookies.get('sb-access-token')?.value;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const token = tokenCookie || bearerToken;
  if (token) {
    const verified = verifySessionToken(token);
    if (verified) {
      const user = await serverGetUser(verified.userId);
      if (user) return user;
    }

    if (isSupabaseConfigured) {
      const sb = createServerClient(token);
      if (sb) {
        const { data } = await sb.auth.getUser();
        if (data?.user?.id) {
          const user = await serverGetUser(data.user.id);
          if (user) return user;
        }
      }
    }
  }

  const pId = typeof participantData === 'string' ? participantData : participantData?.id;
  const pEmail = typeof participantData === 'object' ? participantData?.email : undefined;
  const pName = typeof participantData === 'object' ? participantData?.name : undefined;
  const pAvatar = typeof participantData === 'object' ? participantData?.avatar : undefined;

  const candidateIds = [pEmail, pId].filter(Boolean) as string[];
  for (const cand of candidateIds) {
    const trimmed = cand.trim();
    if (UUID_REGEX.test(trimmed) || trimmed.includes('@')) {
      const user = await serverGetUser(trimmed);
      if (user) return user;
    }
  }

  // If user provides a participant name or ID, guarantee a valid public.users row so join always succeeds
  if (pName || pEmail || pId) {
    const displayName = (pName || 'SportSync Player').trim();
    const email = (pEmail || (pId && pId.includes('@') ? pId : `player_${Date.now()}@sportsync.ph`)).trim().toLowerCase();
    const cleanId = (pId && UUID_REGEX.test(pId)) ? pId : crypto.randomUUID();

    const db = getDbClient();
    if (db) {
      try {
        await db.from('users').upsert(
          {
            id: cleanId,
            auth_id: cleanId,
            email,
            full_name: displayName,
            nickname: displayName.split(' ')[0],
            role: 'player',
            avatar_url: pAvatar || 'alex',
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch {}
    }

    return {
      id: cleanId,
      auth_id: cleanId,
      email,
      full_name: displayName,
      nickname: displayName.split(' ')[0],
      avatar_url: pAvatar || 'alex',
      role: 'player',
      onboarding_completed: true,
      created_at: new Date().toISOString(),
    };
  }

  return null;
}

function parseIsoSchedule(dateStr?: string, timeStr?: string): { startIso: string; endIso: string } {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  let d = now.getDate();
  const dNorm = (dateStr || '').trim().toLowerCase();
  if (dNorm === 'tomorrow') {
    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    y = tom.getFullYear();
    m = tom.getMonth();
    d = tom.getDate();
  } else if (dNorm && dNorm !== 'today') {
    const parsed = new Date(dateStr!);
    if (!isNaN(parsed.getTime())) {
      y = parsed.getFullYear();
      m = parsed.getMonth();
      d = parsed.getDate();
    }
  }

  let startH = 18;
  let startMin = 0;
  if (timeStr) {
    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const min = parseInt(parts[1], 10);
      if (!isNaN(h)) startH = h;
      if (!isNaN(min)) startMin = min;
    }
  }

  const start = new Date(y, m, d, startH, startMin, 0);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function formatSessionDateTime(startTime?: string): { date: string; time: string } {
  if (!startTime) return { date: 'Upcoming', time: '18:00' };
  if (!startTime.includes('T') && !startTime.includes('-')) {
    return { date: 'Today', time: startTime };
  }
  try {
    const d = new Date(startTime);
    if (isNaN(d.getTime())) return { date: 'Upcoming', time: startTime };
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    const isTomorrow =
      d.getFullYear() === tom.getFullYear() &&
      d.getMonth() === tom.getMonth() &&
      d.getDate() === tom.getDate();
    const dateLabel = isToday
      ? 'Today'
      : isTomorrow
      ? 'Tomorrow'
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return { date: dateLabel, time: `${hours}:${minutes}` };
  } catch {
    return { date: 'Upcoming', time: startTime };
  }
}

interface DbSessionRow {
  id: string;
  host_id: string | null;
  venue_id: string | null;
  title: string;
  description?: string | null;
  sport?: string | null;
  skill_level?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  fee_cents?: number | null;
  max_players?: number | null;
  current_players_count?: number | null;
  rotation_format?: string | null;
  status?: string | null;
  visibility?: string | null;
  invite_code?: string | null;
  location_details?: string | null;
}

async function resolveSessionByCodeOrId(
  supabase: NonNullable<ReturnType<typeof getDbClient>>,
  rawClean: string
): Promise<{ session: DbSessionRow | null; error: { message: string } | null }> {
  const uuidMatch = rawClean.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const extractedUuid = uuidMatch ? uuidMatch[0] : null;

  // (a) Query by UUID id first if valid UUID is present
  if (extractedUuid) {
    const { data: byUuid, error: uuidErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', extractedUuid)
      .maybeSingle();

    if (uuidErr) {
      console.error('[/api/invitations] UUID lookup error:', uuidErr);
      return { session: null, error: uuidErr };
    }
    if (byUuid) {
      return { session: byUuid, error: null };
    }
  }

  // (b) Query by invite_code (case-insensitive)
  const { data: byCode, error: codeErr } = await supabase
    .from('sessions')
    .select('*')
    .ilike('invite_code', rawClean)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (codeErr) {
    console.error('[/api/invitations] invite_code lookup error:', codeErr);
    return { session: null, error: codeErr };
  }
  if (byCode) {
    return { session: byCode, error: null };
  }

  // (c) Fallback query by description tag [INVITE:<code>]
  const { data: byDesc, error: descErr } = await supabase
    .from('sessions')
    .select('*')
    .ilike('description', `%[INVITE:${rawClean}]%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (descErr) {
    console.error('[/api/invitations] description fallback lookup error:', descErr);
    return { session: null, error: descErr };
  }

  return { session: byDesc || null, error: null };
}

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { success: false, error: 'Supabase is not configured on the server.' },
        { status: 500 }
      );
    }

    const supabase = getDbClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database client unavailable.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawCode = searchParams.get('code') || searchParams.get('invite');

    if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .in('status', ['active', 'upcoming'])
        .order('start_time', { ascending: true });

      if (error) {
        console.error('[/api/invitations GET] Failed querying active sessions:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      const games: CommunityGame[] = (sessions || [])
        .map((s: DbSessionRow) => {
          const { date, time } = formatSessionDateTime(s.start_time ?? undefined);
          return {
            id: s.id,
            sessionId: s.id,
            sport: (s.sport ? s.sport.charAt(0).toUpperCase() + s.sport.slice(1) : 'Pickleball') as CommunityGame['sport'],
            title: s.title,
            format: (s.rotation_format || '5v5') as CommunityGame['format'],
            skillLevel: (s.skill_level === 'all_levels' ? 'Casual' : 'Competitive') as CommunityGame['skillLevel'],
            date,
            time,
            locationName: s.location_details || 'Verified Court Facility',
            locationDetails: s.location_details || undefined,
            distance: '0.8 km away',
            hostId: s.host_id ?? undefined,
            hostName: 'Match Organizer',
            hostAvatar: 'alex',
            spotsTotal: s.max_players || 10,
            spotsJoined: s.current_players_count || 0,
            pricePerPlayer: s.fee_cents ? Math.round(s.fee_cents / 100) : 0,
            notes: s.description || '',
            isPublic: s.visibility ? s.visibility !== 'Invite' : true,
            visibility: (s.visibility as CommunityGame['visibility']) || 'Public',
            status: (s.status === 'active' ? 'upcoming' : s.status || 'upcoming') as CommunityGame['status'],
            inviteCode: s.invite_code || undefined,
            members: [],
          } as CommunityGame;
        })
        .filter((g) => !isGameExpired(g));

      return NextResponse.json({ success: true, games });
    }

    const rawClean = rawCode.trim();
    const { session: dbSession, error: lookupErr } = await resolveSessionByCodeOrId(supabase, rawClean);

    if (lookupErr) {
      return NextResponse.json(
        { success: false, error: lookupErr.message || 'Database error resolving invitation.' },
        { status: 500 }
      );
    }

    if (!dbSession) {
      return NextResponse.json(
        { success: false, error: 'Invitation Not Found', notFound: true },
        { status: 404 }
      );
    }

    // ONLY return 410 when a matching sessions row explicitly has status === 'cancelled'
    if (dbSession.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Event No Longer Available', deleted: true },
        { status: 410 }
      );
    }

    let hostUser: { id: string; full_name?: string | null; nickname?: string | null; avatar_url?: string | null } | null = null;
    if (dbSession.host_id) {
      const { data: u, error: hostErr } = await supabase
        .from('users')
        .select('id, full_name, nickname, avatar_url')
        .eq('id', dbSession.host_id)
        .maybeSingle();
      if (hostErr) {
        console.error('[/api/invitations GET] Host user lookup error:', hostErr);
      } else if (u) {
        hostUser = u;
      }
    }

    let venueData: { id: string; name?: string | null; address?: string | null; city?: string | null } | null = null;
    if (dbSession.venue_id) {
      const { data: v, error: venueErr } = await supabase
        .from('venues')
        .select('id, name, address, city')
        .eq('id', dbSession.venue_id)
        .maybeSingle();
      if (venueErr) {
        console.error('[/api/invitations GET] Venue lookup error:', venueErr);
      } else if (v) {
        venueData = v;
      }
    }

    const hostTagMatch = dbSession.description?.match(/\[HOST:(.*?)\]/i);
    const taggedHostName = hostTagMatch ? hostTagMatch[1].trim() : '';
    const hostName =
      hostUser?.full_name ||
      hostUser?.nickname ||
      taggedHostName ||
      'Match Organizer';
    const hostAvatar = (hostUser?.avatar_url as CommunityGame['hostAvatar']) || 'alex';

    const membersMap = new Map<string, { id?: string; name: string; avatar: CommunityGame['hostAvatar'] }>();

    const { data: queueData, error: queueErr } = await supabase
      .from('queues')
      .select('user_id, partner_names, user:users(id, full_name, nickname, avatar_url)')
      .eq('session_id', dbSession.id)
      .neq('status', 'cancelled');

    if (queueErr) {
      console.error('[/api/invitations GET] Queues lookup error:', queueErr);
    } else if (Array.isArray(queueData)) {
      queueData.forEach((q: { user_id?: string | null; partner_names?: string[] | null; user?: { id?: string; full_name?: string | null; nickname?: string | null; avatar_url?: string | null } | Array<{ id?: string; full_name?: string | null; nickname?: string | null; avatar_url?: string | null }> | null }) => {
        const uObj = Array.isArray(q.user) ? q.user[0] : q.user;
        const mName = uObj?.full_name || uObj?.nickname || (q.partner_names && q.partner_names[0]) || 'Player';
        const mId = q.user_id || uObj?.id || undefined;
        const key = mId || mName.toLowerCase();
        if (!membersMap.has(key)) {
          membersMap.set(key, {
            id: mId,
            name: mName,
            avatar: (uObj?.avatar_url as CommunityGame['hostAvatar']) || 'alex',
          });
        }
      });
    }

    // queues is the authoritative session participant table in Supabase

    const allMembers = Array.from(membersMap.values());
    const totalSpots = dbSession.max_players || 10;
    const joinedCount = Math.max(allMembers.length, dbSession.current_players_count || 0);
    const { date: formattedDate, time: formattedTime } = formatSessionDateTime(dbSession.start_time ?? undefined);

    const locTagMatch = dbSession.description?.match(/\[LOCATION:(.*?)\]/i);
    const taggedLoc = locTagMatch ? locTagMatch[1].trim() : '';
    const coordsTagMatch = dbSession.description?.match(/\[COORDS:(.*?)\]/i);
    let parsedCoords: [number, number] | undefined = undefined;
    if (coordsTagMatch) {
      try {
        parsedCoords = JSON.parse(coordsTagMatch[1]);
      } catch {}
    }

    const resolvedLocation =
      taggedLoc ||
      dbSession.location_details ||
      (venueData?.name && venueData.name !== 'Community / Open Court' ? venueData.name : '') ||
      'Verified Court Facility';

    const cleanNotes = (dbSession.description || '')
      .replace(/\[INVITE:.*?\]/gi, '')
      .replace(/\[HOST:.*?\]/gi, '')
      .replace(/\[LOCATION:.*?\]/gi, '')
      .replace(/\[COORDS:.*?\]/gi, '')
      .trim();

    const mappedGame: CommunityGame = {
      id: dbSession.id,
      sessionId: dbSession.id,
      sport: (dbSession.sport ? dbSession.sport.charAt(0).toUpperCase() + dbSession.sport.slice(1) : 'Pickleball') as CommunityGame['sport'],
      title: dbSession.title || 'Community Match',
      format: (dbSession.rotation_format || '5v5') as CommunityGame['format'],
      skillLevel: dbSession.skill_level === 'all_levels' ? 'Casual' : 'Competitive',
      date: formattedDate,
      time: formattedTime,
      locationName: resolvedLocation,
      locationDetails: dbSession.location_details || taggedLoc || resolvedLocation,
      coordinates: (dbSession as any).coordinates || parsedCoords,
      distance: '0.8 km away',
      hostId: dbSession.host_id ?? undefined,
      hostName,
      hostAvatar,
      spotsTotal: totalSpots,
      spotsJoined: Math.min(totalSpots, joinedCount),
      pricePerPlayer: dbSession.fee_cents ? Math.round(dbSession.fee_cents / 100) : 0,
      notes: cleanNotes,
      isPublic: dbSession.visibility ? dbSession.visibility !== 'Invite' : true,
      visibility: (dbSession.visibility as CommunityGame['visibility']) || 'Public',
      status: (dbSession.status === 'active' ? 'upcoming' : dbSession.status || 'upcoming') as CommunityGame['status'],
      inviteCode: dbSession.invite_code || rawClean.toUpperCase(),
      members: allMembers,
    };

    return NextResponse.json({ success: true, session: dbSession, game: mappedGame });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error resolving invitation.';
    console.error('[/api/invitations GET] Unexpected error:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { success: false, error: 'Supabase is not configured on the server.' },
        { status: 500 }
      );
    }

    const supabase = getDbClient() || createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database client is not available.' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const authUser = await authenticateRequest(
      req,
      body?.participant || body?.participant?.id || body?.participant?.email || body?.hostId || body?.userId
    );
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const game = body.game as CommunityGame | undefined;
    const action = body.action as string | undefined;

    if (action === 'delete_game') {
      const idToDelete = (body.sessionId || body.gameId || game?.sessionId || game?.id || '').trim();
      if (!idToDelete || !UUID_REGEX.test(idToDelete)) {
        return NextResponse.json({ success: false, error: 'Valid session ID is required.' }, { status: 400 });
      }

      const { data: targetSession, error: fetchErr } = await supabase
        .from('sessions')
        .select('id, host_id, title')
        .eq('id', idToDelete)
        .maybeSingle();

      if (fetchErr) {
        console.error('[/api/invitations POST delete_game] Session lookup failed:', fetchErr);
        return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
      }

      if (!targetSession) {
        return NextResponse.json({ success: false, error: 'Game session not found.' }, { status: 404 });
      }

      if (targetSession.host_id && targetSession.host_id !== authUser.id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only the host can delete this game.' },
          { status: 403 }
        );
      }

      // Query participants before deletion to notify them
      const { data: qRows } = await supabase
        .from('queues')
        .select('user_id, partner_names')
        .eq('session_id', idToDelete);

      await supabase.from('queues').delete().eq('session_id', idToDelete);
      const { error: cancelErr } = await supabase
        .from('sessions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', idToDelete);

      if (cancelErr) {
        console.error('[/api/invitations POST delete_game] Cancel failed:', cancelErr);
        return NextResponse.json({ success: false, error: cancelErr.message }, { status: 500 });
      }

      // Notify joined participants
      if (Array.isArray(qRows) && qRows.length > 0) {
        for (const q of qRows) {
          if (q.user_id && q.user_id !== authUser.id) {
            try {
              const pName = q.partner_names?.[0] || 'Player';
              const notifPayload = {
                user_id: (q.user_id && UUID_REGEX.test(q.user_id)) ? q.user_id : null,
                user_identifier: pName,
                type: 'match',
                title: 'Game Cancelled',
                description: `The host has cancelled ${targetSession.title || 'your match'}, a game you joined.`,
                read: false,
                link_screen: 'social-home',
                metadata: {
                  event: 'game_deleted',
                  gameId: idToDelete,
                  gameTitle: targetSession.title,
                  hostName: authUser.full_name,
                  hostId: authUser.id,
                  recipientId: q.user_id,
                  recipientName: pName,
                  dedupeKey: `del_${idToDelete}_${q.user_id}_${Date.now()}`,
                },
                created_at: new Date().toISOString(),
              };
              await supabase.from('notifications').insert(notifPayload);

              // Broadcast to player channel
              const ch = supabase.channel(`sportsync-notifs-${q.user_id}`);
              ch.send({ type: 'broadcast', event: 'new_notification', payload: notifPayload }).catch(() => {});
            } catch {}
          }
        }
      }

      return NextResponse.json({ success: true, deleted: true });
    }

    if (!game || !game.id) {
      return NextResponse.json({ success: false, error: 'Invalid game payload.' }, { status: 400 });
    }

    const lookupKey = (game.sessionId || game.id || game.inviteCode || body.inviteCode || '').trim();
    let { session: dbSession, error: lookupErr } = await resolveSessionByCodeOrId(supabase, lookupKey);

    if (lookupErr) {
      return NextResponse.json({ success: false, error: lookupErr.message }, { status: 500 });
    }

    if (!dbSession && (action === 'create_game' || action === 'accept' || !action)) {
      const sLower = (game.sport || '').toLowerCase();
      const validSport = sLower.includes('basket')
        ? 'basketball'
        : sLower.includes('tennis')
        ? 'tennis'
        : sLower.includes('badminton')
        ? 'badminton'
        : sLower.includes('volley')
        ? 'volleyball'
        : 'pickleball';

      const { startIso, endIso } = parseIsoSchedule(game.date, game.time);
      const inviteCode = (game.inviteCode || Math.random().toString(36).substring(2, 8)).trim().toUpperCase();

      const venueLocationName = (game.locationName || game.locationDetails || 'Naga Sports Venue').trim();
      const venueLocationDetails = (game.locationDetails || game.locationName || venueLocationName).trim();
      const coordinates = game.coordinates || [13.6218, 123.1948];

      const sessionPayload: Record<string, any> = {
        venue_id: null,
        host_id: (game.hostId && UUID_REGEX.test(game.hostId)) ? game.hostId : authUser.id,
        title: game.title || 'Community Match',
        description: `${game.notes || 'Organized via SportSync Matchmaking'} [INVITE:${inviteCode}] [HOST:${game.hostName || authUser.full_name}] [LOCATION:${venueLocationName}] [COORDS:${JSON.stringify(coordinates)}]`,
        sport: validSport,
        session_type: 'open_play',
        skill_level: game.skillLevel === 'Competitive' ? 'intermediate' : 'all_levels',
        court_ids: [],
        start_time: startIso,
        end_time: endIso,
        fee_cents: Math.round((game.pricePerPlayer || 0) * 100),
        max_players: game.spotsTotal || 10,
        current_players_count: game.spotsJoined || 1,
        rotation_format: game.format || '5v5',
        status: 'active',
        visibility: game.visibility || 'Public',
        invite_code: inviteCode,
        location_details: venueLocationName,
      };

      if ((game as any).allowed_formats && Array.isArray((game as any).allowed_formats)) {
        sessionPayload.allowed_formats = (game as any).allowed_formats;
      }
      if (UUID_REGEX.test(game.id)) {
        sessionPayload.id = game.id;
      }

      let { data: inserted, error: insertErr } = await supabase
        .from('sessions')
        .insert(sessionPayload)
        .select('*')
        .single();

      while (insertErr && isMissingColumnError(insertErr)) {
        const missing = extractMissingColumn(insertErr);
        if (missing && missing in sessionPayload) {
          delete sessionPayload[missing];
        } else {
          delete sessionPayload.allowed_formats;
          delete sessionPayload.visibility;
          delete sessionPayload.invite_code;
          delete sessionPayload.location_details;
          delete sessionPayload.rotation_format;
        }
        const retry = await supabase
          .from('sessions')
          .insert(sessionPayload)
          .select('*')
          .single();
        inserted = retry.data;
        insertErr = retry.error;
        if (inserted || !isMissingColumnError(insertErr)) break;
      }

      if (insertErr || !inserted) {
        console.error('[/api/invitations POST session creation] Insert failed:', insertErr);
        if (action !== 'accept') {
          return NextResponse.json(
            { success: false, error: insertErr?.message || 'Failed to create game.' },
            { status: 500 }
          );
        }
      } else {
        dbSession = inserted;
        if (action === 'create_game' || !action) {
          return NextResponse.json({
            success: true,
            game: { ...game, id: inserted.id, sessionId: inserted.id, inviteCode },
            session: inserted,
          });
        }
      }
    }

    if (!dbSession) {
      return NextResponse.json({ success: false, error: 'Game session not found.' }, { status: 404 });
    }

    if (dbSession.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Event No Longer Available', deleted: true },
        { status: 410 }
      );
    }

    const nowIso = new Date().toISOString();

    if (action === 'accept') {
      const isInviteOnly = dbSession.visibility === 'Invite' || game.visibility === 'Invite';
      if (isInviteOnly) {
        const isHost = dbSession.host_id === authUser.id;
        const pName = (authUser.full_name || '').trim().toLowerCase();
        const isDirectlyInvited = Boolean(
          game.invitedPlayers?.some(
            (ip) =>
              (ip.id && ip.id === authUser.id) ||
              (ip.name && pName && ip.name.trim().toLowerCase() === pName)
          )
        );
        const providedCode = (body.inviteCode || game.inviteCode || '').trim().toUpperCase();
        const actualCode = (dbSession.invite_code || game.inviteCode || '').trim().toUpperCase();
        const hasValidCode = Boolean(providedCode && actualCode && providedCode === actualCode);

        if (!isHost && !isDirectlyInvited && !hasValidCode) {
          return NextResponse.json(
            {
              success: false,
              error: 'This is an invite-only game. You can only join if the host has invited you.',
            },
            { status: 403 }
          );
        }
      }

      // Ensure authUser exists in public.users to satisfy foreign key constraint queues_user_id_fkey
      await supabase.from('users').upsert(
        {
          id: authUser.id,
          auth_id: authUser.id,
          email: authUser.email,
          full_name: authUser.full_name || 'Player',
          role: authUser.role || 'player',
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );

      const { count: activeQueueCount } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', dbSession.id)
        .neq('status', 'cancelled');

      // Upsert into queues table with valid schema (match_format column removed)
      const { error: queueErr } = await supabase.from('queues').upsert(
        {
          session_id: dbSession.id,
          user_id: authUser.id,
          queue_number: (activeQueueCount || 0) + 1,
          group_size: 1,
          status: 'waiting',
          partner_names: [authUser.full_name || 'Player'],
          joined_at: nowIso,
        },
        { onConflict: 'session_id,user_id' }
      );

      if (queueErr) {
        console.error('[/api/invitations POST accept] queues upsert error:', queueErr);
        return NextResponse.json({ success: false, error: queueErr.message }, { status: 500 });
      }

      const updatedMembers = [
        ...(game.members || []),
        { id: authUser.id, name: authUser.full_name || 'Player', avatar: (authUser.avatar_url as CommunityGame['hostAvatar']) || 'alex' },
      ];
      const dedupedMap = new Map<string, CommunityGame['members'][number]>();
      updatedMembers.forEach((m) => {
        const key = m.id || m.name.toLowerCase();
        if (!dedupedMap.has(key)) dedupedMap.set(key, m);
      });
      const finalMembers = Array.from(dedupedMap.values());
      const finalSpotsJoined = Math.min(dbSession.max_players || 10, finalMembers.length);

      const { error: updateErr } = await supabase
        .from('sessions')
        .update({ current_players_count: finalSpotsJoined, updated_at: nowIso })
        .eq('id', dbSession.id);

      if (updateErr) {
        console.error('[/api/invitations POST accept] session count update error:', updateErr);
      }

      // Notify the Game Host immediately via Supabase notifications table & realtime broadcast
      let hostUserId = dbSession.host_id || game.hostId || null;
      let hostName = game.hostName || '';

      if (!hostName && dbSession.description) {
        const hostMatch = dbSession.description.match(/\[HOST:(.*?)\]/i);
        if (hostMatch) hostName = hostMatch[1].trim();
      }

      if (hostUserId && UUID_REGEX.test(hostUserId)) {
        try {
          const { data: hostProfile } = await supabase
            .from('users')
            .select('id, full_name, nickname, email')
            .eq('id', hostUserId)
            .maybeSingle();
          if (hostProfile) {
            if (!hostName) hostName = hostProfile.full_name || hostProfile.nickname || '';
          }
        } catch {}
      }

      const isHostSelf = Boolean(
        (hostUserId && hostUserId === authUser.id) ||
        (hostName && authUser.full_name && hostName.trim().toLowerCase() === authUser.full_name.trim().toLowerCase())
      );

      if ((hostUserId || hostName) && !isHostSelf) {
        try {
          const hostIdentifier = hostName || hostUserId || 'Host';
          const joiningPlayerName = authUser.full_name || body.participant?.name || 'A player';
          const joiningPlayerAvatar = (authUser.avatar_url || body.participant?.avatar || 'alex') as string;
          const gameTitle = dbSession.title || game.title || 'Community Match';
          const gameSport = dbSession.sport || game.sport || 'Basketball';

          const locMatch = dbSession.description?.match(/\[LOCATION:(.*?)\]/i);
          const gameLocation = dbSession.location_details || (locMatch ? locMatch[1].trim() : '') || game.locationName || 'Naga Sports Venue';

          const sessionSchedule = formatSessionDateTime(dbSession.start_time || undefined);
          const gameDate = game.date || sessionSchedule.date;
          const gameTime = game.time || sessionSchedule.time;
          const scheduleStr = gameDate && gameTime ? `${gameDate} • ${gameTime}` : gameDate || gameTime || '';

          const notifDedupeKey = `join_${dbSession.id}_${authUser.id}_${Date.now()}`;
          const notifDesc = `${joiningPlayerName} joined your game, ${gameTitle}.`;

          const notifPayload = {
            user_id: hostUserId && UUID_REGEX.test(hostUserId) ? hostUserId : null,
            user_identifier: hostIdentifier,
            type: 'match',
            title: 'Player Joined Your Game',
            description: notifDesc,
            read: false,
            link_screen: 'match-detail',
            metadata: {
              event: 'player_joined',
              game_id: dbSession.id,
              gameId: dbSession.id,
              sessionId: dbSession.id,
              matchId: dbSession.id,
              game_title: gameTitle,
              gameTitle,
              sport: gameSport,
              location_name: gameLocation,
              locationName: gameLocation,
              schedule: scheduleStr,
              gameDate,
              gameTime,
              joining_player_id: authUser.id,
              joiningPlayerId: authUser.id,
              joining_player_name: joiningPlayerName,
              joiningPlayerName,
              joining_player_avatar: joiningPlayerAvatar,
              joiningPlayerAvatar,
              sender_name: joiningPlayerName,
              sender_avatar: joiningPlayerAvatar,
              senderName: joiningPlayerName,
              senderAvatar: joiningPlayerAvatar,
              hostId: hostUserId,
              host_id: hostUserId,
              hostName: hostName,
              host_name: hostName,
              recipientId: hostUserId,
              recipientName: hostName,
              dedupeKey: notifDedupeKey,
            },
            created_at: nowIso,
          };

          const { error: notifErr } = await supabase.from('notifications').insert(notifPayload);
          if (notifErr) {
            console.warn('[/api/invitations POST accept] notification insert notice:', notifErr.message);
          }

          // Broadcast across global notification channel, host ID channel, and host Name channel
          const candidateChannels = [
            'sportsync-notifs-all',
            ...(hostUserId ? [`sportsync-notifs-${hostUserId}`] : []),
            ...(hostName ? [`sportsync-notifs-${hostName.toLowerCase().replace(/\s+/g, '_')}`] : []),
          ];

          for (const chName of candidateChannels) {
            try {
              const hostChannel = supabase.channel(chName);
              if (typeof (hostChannel as any).httpSend === 'function') {
                await (hostChannel as any).httpSend('new_notification', notifPayload).catch(() => {});
              }
              hostChannel.subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                  hostChannel.send({
                    type: 'broadcast',
                    event: 'new_notification',
                    payload: notifPayload,
                  }).catch(() => {}).finally(() => {
                    setTimeout(() => {
                      try { supabase.removeChannel(hostChannel); } catch {}
                    }, 1500);
                  });
                }
              });
            } catch {}
          }
        } catch (notifEx) {
          console.warn('[/api/invitations POST accept] Host notification delivery exception:', notifEx);
        }
      }

      return NextResponse.json({
        success: true,
        game: {
          ...game,
          id: dbSession.id,
          sessionId: dbSession.id,
          spotsJoined: finalSpotsJoined,
          members: finalMembers,
        },
      });
    }

    if (action === 'remove_participant') {
      if (dbSession.host_id && dbSession.host_id !== authUser.id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Only the match organizer can remove players.' },
          { status: 403 }
        );
      }

      const participantId = body.participantId as string | undefined;
      const participantName = (body.participantName as string | undefined || '').trim();

      if (!participantId && !participantName) {
        return NextResponse.json({ success: false, error: 'Participant identification required.' }, { status: 400 });
      }

      let participantUserId: string | null =
        participantId && UUID_REGEX.test(participantId) ? participantId : null;
      if (!participantUserId && participantName) {
        const { data: u } = await supabase
          .from('users')
          .select('id')
          .ilike('full_name', participantName)
          .maybeSingle();
        if (u?.id) participantUserId = u.id;
      }

      if (participantUserId === dbSession.host_id) {
        return NextResponse.json(
          { success: false, error: 'Cannot remove the match organizer from the lineup.' },
          { status: 400 }
        );
      }

      if (participantUserId) {
        const { error: delPartErr } = await supabase
          .from('session_participants')
          .delete()
          .eq('session_id', dbSession.id)
          .eq('user_id', participantUserId);
        if (delPartErr) {
          console.error('[/api/invitations POST remove_participant] session_participants delete error:', delPartErr);
        }

        const { error: delQueueErr } = await supabase
          .from('queues')
          .delete()
          .eq('session_id', dbSession.id)
          .eq('user_id', participantUserId);
        if (delQueueErr) {
          console.error('[/api/invitations POST remove_participant] queues delete error:', delQueueErr);
        }
      }

      const updatedMembers = (game.members || []).filter((m) => {
        if (participantId && m.id && m.id === participantId) return false;
        if (participantName && m.name && m.name.trim().toLowerCase() === participantName.toLowerCase()) return false;
        return true;
      });

      const nextSpots = updatedMembers.length;
      const { error: updErr } = await supabase
        .from('sessions')
        .update({ current_players_count: nextSpots, updated_at: nowIso })
        .eq('id', dbSession.id);

      if (updErr) {
        console.error('[/api/invitations POST remove_participant] session update error:', updErr);
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        game: { ...game, sessionId: dbSession.id, spotsJoined: nextSpots, members: updatedMembers },
        spotsJoined: nextSpots,
      });
    }

    if (action === 'leave_game') {
      await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', dbSession.id)
        .eq('user_id', authUser.id);
      await supabase
        .from('queues')
        .delete()
        .eq('session_id', dbSession.id)
        .eq('user_id', authUser.id);

      const updatedMembers = (game.members || []).filter((m) => m.id !== authUser.id);
      const nextSpots = updatedMembers.length;

      const { error: updErr } = await supabase
        .from('sessions')
        .update({ current_players_count: nextSpots, updated_at: nowIso })
        .eq('id', dbSession.id);

      if (updErr) {
        console.error('[/api/invitations POST leave_game] session update error:', updErr);
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        game: { ...game, sessionId: dbSession.id, spotsJoined: nextSpots, members: updatedMembers },
        spotsJoined: nextSpots,
      });
    }

    if (action === 'toggle_host_participation') {
      if (dbSession.host_id && dbSession.host_id !== authUser.id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Only the host can toggle participation.' },
          { status: 403 }
        );
      }

      const participate = Boolean(body.participate);
      if (participate) {
        const { count: currentActive } = await supabase
          .from('queues')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', dbSession.id)
          .neq('status', 'cancelled');

        if ((currentActive || 0) >= (dbSession.max_players || 10)) {
          return NextResponse.json(
            { success: false, error: 'Cannot join lineup: Match roster is already full.' },
            { status: 400 }
          );
        }

        await supabase.from('queues').upsert(
          {
            session_id: dbSession.id,
            user_id: authUser.id,
            queue_number: (currentActive || 0) + 1,
            group_size: 1,
            match_format: 'doubles',
            status: 'waiting',
            partner_names: [authUser.full_name || 'Organizer'],
          },
          { onConflict: 'session_id,user_id' }
        );
      } else {
        await supabase
          .from('queues')
          .delete()
          .eq('session_id', dbSession.id)
          .eq('user_id', authUser.id);
      }

      const updatedMembers = participate
        ? [
            { id: authUser.id, name: authUser.full_name, avatar: (authUser.avatar_url as CommunityGame['hostAvatar']) || 'alex' },
            ...(game.members || []).filter((m) => m.id !== authUser.id),
          ]
        : (game.members || []).filter((m) => m.id !== authUser.id);

      const { error: updErr } = await supabase
        .from('sessions')
        .update({ current_players_count: updatedMembers.length, updated_at: nowIso })
        .eq('id', dbSession.id);

      if (updErr) {
        console.error('[/api/invitations POST toggle_host_participation] session update error:', updErr);
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        game: { ...game, sessionId: dbSession.id, spotsJoined: updatedMembers.length, members: updatedMembers },
        spotsJoined: updatedMembers.length,
        isParticipating: participate,
      });
    }

    return NextResponse.json({ success: true, game, session: dbSession });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error processing invitation.';
    console.error('[/api/invitations POST] Unexpected error:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
