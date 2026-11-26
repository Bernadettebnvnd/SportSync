/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { CommunityGame } from '@/mock/types';
import { createAdminClient, createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken, serverGetUser, SanitizedUser, isMissingColumnError, extractMissingColumn } from '@/lib/auth/serverAuth';
import { isGameExpired } from '@/lib/utils/gameExpiration';
import {
  formatManilaDateLabel,
  formatTime12h,
  formatTimeRange12h,
  parseTimeTo24h,
  validateEndTime,
} from '@/lib/datetime';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DELETED_LEGACY_HOST_REGEX = /^\s*(inah|xian|shea|marianne|alex|jan)(\s|$)/i;

async function isAuthAccountConfirmedMissing(
  admin: ReturnType<typeof createAdminClient>,
  lookupId?: string | null
): Promise<boolean> {
  if (!admin || !lookupId || !UUID_REGEX.test(lookupId.trim())) return false;
  try {
    const { data, error } = await admin.auth.admin.getUserById(lookupId.trim());
    if (error) {
      const status = (error as { status?: number }).status;
      const code = (error as { code?: string }).code;
      return status === 404 || code === 'user_not_found';
    }
    return !data?.user;
  } catch {
    return false;
  }
}

function getDbClient() {
  const admin = createAdminClient();
  if (admin) return admin;
  return createServerClient();
}

async function authenticateRequest(req: NextRequest): Promise<SanitizedUser | null> {
  const tokenCookie =
    req.cookies.get('sportsync-auth-token')?.value ||
    req.cookies.get('sb-access-token')?.value;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  let token = tokenCookie || bearerToken;

  if (!token) {
    for (const cookie of req.cookies.getAll()) {
      if (cookie.name.includes('-auth-token')) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookie.value));
          if (Array.isArray(parsed) && parsed[0]) {
            token = parsed[0];
            break;
          } else if (parsed?.access_token) {
            token = parsed.access_token;
            break;
          }
        } catch {
          if (cookie.value && cookie.value.length > 20) {
            token = cookie.value;
            break;
          }
        }
      }
    }
  }

  if (!token) return null;

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

  return null;
}

function getManilaDateParts(date: Date = new Date()): { year: number; month: number; day: number; ymd: string } {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  return { year: y, month: m, day: d, ymd };
}

function parseIsoSchedule(
  dateStr?: string,
  timeStr?: string,
  endTimeStr?: string | null,
  explicitEndsAt?: string | null
): { startIso: string; endIso: string; endsAtIso: string | null; error?: string } {
  const manilaNow = getManilaDateParts();
  let y = manilaNow.year;
  let m = manilaNow.month; // 1-indexed
  let d = manilaNow.day;

  const rawDate = (dateStr || '').trim();
  const dNorm = rawDate.toLowerCase();

  if (dNorm === 'tomorrow' || dNorm.startsWith('tomorrow ')) {
    const tom = new Date(Date.UTC(y, m - 1, d + 1));
    y = tom.getUTCFullYear();
    m = tom.getUTCMonth() + 1;
    d = tom.getUTCDate();
  } else if (dNorm && dNorm !== 'today' && !dNorm.startsWith('today ')) {
    const isoMatch = rawDate.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      y = parseInt(isoMatch[1], 10);
      m = parseInt(isoMatch[2], 10);
      d = parseInt(isoMatch[3], 10);
    } else {
      const cleaned = rawDate.replace(/\(.*?\)/g, '').trim();
      const hasYear = /\b\d{4}\b/.test(cleaned);
      const parsed = new Date(hasYear ? cleaned : `${cleaned}, ${y}`);
      if (!isNaN(parsed.getTime())) {
        y = hasYear && parsed.getFullYear() >= 2020 ? parsed.getFullYear() : y;
        m = parsed.getMonth() + 1;
        d = parsed.getDate();
      }
    }
  }

  let startH = 18;
  let startMin = 0;
  const parsedTime = parseTimeTo24h(timeStr);
  if (parsedTime) {
    startH = parsedTime.hour24;
    startMin = parsedTime.minute;
  }

  const yyyy = String(y).padStart(4, '0');
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  const hh = String(startH).padStart(2, '0');
  const min = String(startMin).padStart(2, '0');
  const isoDate = `${yyyy}-${mm}-${dd}`;
  const startTime24 = `${hh}:${min}`;

  const start = new Date(`${isoDate}T${startTime24}:00+08:00`);
  const validStart = isNaN(start.getTime()) ? new Date() : start;
  const startIso = validStart.toISOString();

  if (explicitEndsAt && explicitEndsAt.trim()) {
    const endDate = new Date(explicitEndsAt);
    if (isNaN(endDate.getTime()) || endDate.getTime() <= validStart.getTime()) {
      return {
        startIso,
        endIso: new Date(validStart.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        endsAtIso: null,
        error: 'End time must be after kickoff.',
      };
    }
    const endsAtIso = endDate.toISOString();
    return { startIso, endIso: endsAtIso, endsAtIso };
  }

  if (endTimeStr && endTimeStr.trim()) {
    const check = validateEndTime(isoDate, startTime24, endTimeStr);
    if (!check.valid) {
      return {
        startIso,
        endIso: new Date(validStart.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        endsAtIso: null,
        error: check.error || 'End time must be after kickoff.',
      };
    }
    const endDate = new Date(check.endIso);
    const endsAtIso = endDate.toISOString();
    return { startIso, endIso: endsAtIso, endsAtIso };
  }

  const end = new Date(validStart.getTime() + 2 * 60 * 60 * 1000);
  return { startIso, endIso: end.toISOString(), endsAtIso: null };
}

function formatSessionDateTime(
  startTime?: string,
  endsAt?: string | null
): { date: string; time: string; endTime: string | null } {
  if (!startTime) return { date: 'Upcoming', time: '6:00 PM', endTime: null };
  if (!startTime.includes('T') && !startTime.includes('-')) {
    const endLabel = endsAt ? formatTime12h(endsAt) : null;
    return { date: 'Today', time: formatTimeRange12h(startTime, endLabel), endTime: endLabel };
  }
  try {
    const d = new Date(startTime);
    if (isNaN(d.getTime())) return { date: 'Upcoming', time: formatTime12h(startTime), endTime: null };

    const dateLabel = formatManilaDateLabel(d);
    const startLabel = formatTime12h(startTime);
    const endLabel = endsAt ? formatTime12h(endsAt) : null;
    const timeLabel = formatTimeRange12h(startLabel, endLabel);

    return { date: dateLabel, time: timeLabel, endTime: endLabel };
  } catch {
    return { date: 'Upcoming', time: formatTime12h(startTime), endTime: null };
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
  ends_at?: string | null;
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

      const hostIds = Array.from(
        new Set(
          (sessions || [])
            .map((s: DbSessionRow) => s.host_id)
            .filter((id): id is string => Boolean(id))
        )
      );
      const hostsMap = new Map<string, { id: string; auth_id?: string | null; full_name?: string | null; nickname?: string | null; avatar_url?: string | null }>();

      if (hostIds.length > 0) {
        let uList: any[] | null = null;
        const { data: initialUsers, error: usersErr } = await supabase
          .from('users')
          .select('id, auth_id, full_name, nickname, avatar_url')
          .in('id', hostIds);

        if (usersErr && isMissingColumnError(usersErr)) {
          const { data: fallbackUsers } = await supabase
            .from('users')
            .select('id, full_name, nickname, avatar_url')
            .in('id', hostIds);
          uList = fallbackUsers;
        } else {
          uList = initialUsers;
        }

        if (Array.isArray(uList)) {
          uList.forEach((u) => hostsMap.set(u.id, u));
        }

        const admin = createAdminClient();
        if (admin && hostsMap.size > 0) {
          const hostsToCheck = Array.from(hostsMap.values()).filter((u) =>
            Boolean(u.auth_id) ||
            DELETED_LEGACY_HOST_REGEX.test((u.full_name || u.nickname || '').trim())
          );
          if (hostsToCheck.length > 0) {
            await Promise.all(
              hostsToCheck.map(async (u) => {
                const authLookupId = u.auth_id || u.id;
                if (await isAuthAccountConfirmedMissing(admin, authLookupId)) {
                  hostsMap.delete(u.id);
                }
              })
            );
          }
        }
      }

      const games: CommunityGame[] = (sessions || [])
        .filter((s: DbSessionRow) => {
          if (!s.host_id || !hostsMap.has(s.host_id)) return false;
          const { date, time } = formatSessionDateTime(s.start_time ?? undefined);
          return !isGameExpired(
            {
              date,
              time,
              status: (s.status === 'active' ? 'upcoming' : s.status || 'upcoming') as CommunityGame['status'],
            } as CommunityGame,
            s.end_time ?? undefined
          );
        })
        .map((s: DbSessionRow) => {
          const host = s.host_id ? hostsMap.get(s.host_id) : undefined;
          const { date, time, endTime } = formatSessionDateTime(s.start_time ?? undefined, s.ends_at ?? null);
          return {
            id: s.id,
            sessionId: s.id,
            sport: (s.sport ? s.sport.charAt(0).toUpperCase() + s.sport.slice(1) : 'Pickleball') as CommunityGame['sport'],
            title: s.title,
            format: (s.rotation_format || '5v5') as CommunityGame['format'],
            skillLevel: (s.skill_level === 'all_levels' ? 'Casual' : 'Competitive') as CommunityGame['skillLevel'],
            date,
            time,
            endTime,
            startsAt: s.start_time || undefined,
            endsAt: s.ends_at ?? null,
            locationName: s.location_details || 'Verified Court Facility',
            locationDetails: s.location_details || undefined,
            distance: '0.8 km away',
            hostId: s.host_id ?? undefined,
            hostName: host?.full_name || host?.nickname || 'Match Organizer',
            hostAvatar: (host?.avatar_url as CommunityGame['hostAvatar']) || 'alex',
            spotsTotal: s.max_players === null || s.max_players === undefined ? null : Number(s.max_players),
            spotsJoined: s.current_players_count || 0,
            pricePerPlayer: s.fee_cents ? Math.round(s.fee_cents / 100) : 0,
            notes: s.description || '',
            isPublic: s.visibility ? s.visibility !== 'Invite' : true,
            visibility: (s.visibility as CommunityGame['visibility']) || 'Public',
            status: (s.status === 'active' ? 'upcoming' : s.status || 'upcoming') as CommunityGame['status'],
            inviteCode: s.invite_code || undefined,
            members: [],
          } as CommunityGame;
        });

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

    if (!dbSession.host_id) {
      return NextResponse.json(
        { success: false, error: 'Event No Longer Available', deleted: true },
        { status: 410 }
      );
    }

    let hostUser: { id: string; auth_id?: string | null; full_name?: string | null; nickname?: string | null; avatar_url?: string | null } | null = null;
    let hostErr: any = null;
    const { data: initialHost, error: initialHostErr } = await supabase
      .from('users')
      .select('id, auth_id, full_name, nickname, avatar_url')
      .eq('id', dbSession.host_id)
      .maybeSingle();

    if (initialHostErr && isMissingColumnError(initialHostErr)) {
      const { data: fallbackHost, error: fallbackHostErr } = await supabase
        .from('users')
        .select('id, full_name, nickname, avatar_url')
        .eq('id', dbSession.host_id)
        .maybeSingle();
      hostUser = fallbackHost;
      hostErr = fallbackHostErr;
    } else {
      hostUser = initialHost;
      hostErr = initialHostErr;
    }

    if (hostErr) {
      console.error('[/api/invitations GET] Host user lookup error:', hostErr);
    }

    if (!hostErr && !hostUser) {
      return NextResponse.json(
        { success: false, error: 'Event No Longer Available', deleted: true },
        { status: 410 }
      );
    }

    const admin = createAdminClient();
    if (
      hostUser &&
      admin &&
      (Boolean(hostUser.auth_id) ||
        DELETED_LEGACY_HOST_REGEX.test((hostUser.full_name || hostUser.nickname || '').trim()))
    ) {
      if (await isAuthAccountConfirmedMissing(admin, hostUser.auth_id || hostUser.id)) {
        return NextResponse.json(
          { success: false, error: 'Event No Longer Available', deleted: true },
          { status: 410 }
        );
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

    const hostName =
      hostUser?.full_name ||
      hostUser?.nickname ||
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
    const totalSpots: number | null =
      dbSession.max_players === null || dbSession.max_players === undefined ? null : Number(dbSession.max_players);
    const joinedCount = Math.max(allMembers.length, dbSession.current_players_count || 0);
    const { date: formattedDate, time: formattedTime, endTime: formattedEndTime } = formatSessionDateTime(
      dbSession.start_time ?? undefined,
      dbSession.ends_at ?? null
    );

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
      .replace(/\[LOC:.*?\]/gi, '')
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
      endTime: formattedEndTime,
      startsAt: dbSession.start_time || undefined,
      endsAt: dbSession.ends_at ?? null,
      locationName: resolvedLocation,
      locationDetails: dbSession.location_details || taggedLoc || resolvedLocation,
      coordinates: (dbSession as any).coordinates || parsedCoords,
      distance: '0.8 km away',
      hostId: dbSession.host_id ?? undefined,
      hostName,
      hostAvatar,
      spotsTotal: totalSpots,
      spotsJoined: totalSpots === null ? joinedCount : Math.min(totalSpots, joinedCount),
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
    const authUser = await authenticateRequest(req);
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
              const cleanUserId = (q.user_id || pName || '').toLowerCase().trim();
              const notifDedupeKey = `game_deleted_${idToDelete}_${cleanUserId}`;
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
                  dedupeKey: notifDedupeKey,
                },
                created_at: new Date().toISOString(),
              };

              // Idempotency check: don't insert duplicate notification if already exists
              const { data: existingNotif } = await supabase
                .from('notifications')
                .select('id')
                .filter('metadata->>dedupeKey', 'eq', notifDedupeKey)
                .limit(1)
                .maybeSingle();

              if (!existingNotif) {
                const { error: notifErr } = await supabase.from('notifications').insert(notifPayload);
                if (notifErr && notifErr.code !== '23505') {
                  console.warn('[/api/invitations DELETE] notification insert notice:', notifErr.message);
                }
              }

              // Broadcast to player channel
              if (q.user_id) {
                const ch = supabase.channel(`sportsync-notifs-${q.user_id}`);
                ch.send({ type: 'broadcast', event: 'new_notification', payload: notifPayload }).catch(() => {});
              }
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
    const resolvedSession = await resolveSessionByCodeOrId(supabase, lookupKey);
    let dbSession = resolvedSession.session;
    const lookupErr = resolvedSession.error;

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
      const coordinates = game.coordinates || [13.6218, 123.1948];

      // Resolve a valid venue_id so sessions.venue_id NOT NULL constraint never fails
      let resolvedVenueId: string | null = null;
      try {
        const requestedVenueId = (game as any).venueId || (game as any).venue_id;
        if (requestedVenueId && UUID_REGEX.test(String(requestedVenueId).trim())) {
          const { data: exactVenue } = await supabase
            .from('venues')
            .select('id')
            .eq('id', String(requestedVenueId).trim())
            .maybeSingle();
          if (exactVenue?.id) resolvedVenueId = exactVenue.id;
        }
        if (!resolvedVenueId) {
          const { data: sysVenue } = await supabase
            .from('venues')
            .select('id')
            .eq('slug', 'community-open-court-naga')
            .maybeSingle();
          if (sysVenue?.id) resolvedVenueId = sysVenue.id;
        }
        if (!resolvedVenueId) {
          const { data: anyVenue } = await supabase.from('venues').select('id').limit(1).maybeSingle();
          if (anyVenue?.id) resolvedVenueId = anyVenue.id;
        }
      } catch {}

      const sessionPayload: Record<string, any> = {
        venue_id: resolvedVenueId,
        host_id: (game.hostId && UUID_REGEX.test(game.hostId)) ? game.hostId : authUser.id,
        title: game.title || 'Community Match',
        description: `${game.notes || 'Organized via SportSync Matchmaking'} [INVITE:${inviteCode}] [HOST:${game.hostName || authUser.full_name}] [LOCATION:${venueLocationName}] [COORDS:${JSON.stringify(coordinates)}]`,
        sport: validSport,
        session_type: 'open_play',
        skill_level: game.skillLevel === 'Competitive' ? 'intermediate' : 'all_levels',
        court_ids: [],
        start_time: startIso,
        end_time: endIso,
        ends_at: (game.endsAt ?? null) || (game.endTime ? parseIsoSchedule(game.date, game.time, game.endTime, game.endsAt ?? null).endsAtIso : null),
        fee_cents: Math.round((game.pricePerPlayer || 0) * 100),
        max_players: game.spotsTotal === null ? null : (game.spotsTotal ?? 10),
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

    if (dbSession && (action === 'update_game' || (!action && game && body.action !== 'create_game'))) {
      if (
        dbSession.host_id &&
        dbSession.host_id !== authUser.id &&
        (!authUser.auth_id || dbSession.host_id !== authUser.auth_id)
      ) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only the host can edit this game.' },
          { status: 403 }
        );
      }

      const rawNotes = (game.notes !== undefined ? game.notes : '').replace(/\[(?:LOC|LOCATION|INVITE|HOST|COORDS):.*?\]/gi, '').trim();
      const inviteCode = dbSession.invite_code || game.inviteCode || lookupKey.toUpperCase();
      const hostName = game.hostName || authUser.full_name || 'Host';
      const venueLoc = game.locationName || dbSession.location_details || 'Metro Naga Sports Complex';
      const coordinates = game.coordinates || [13.6218, 123.1948];
      const newDesc = `${rawNotes || 'Organized via SportSync Matchmaking'} [INVITE:${inviteCode}] [HOST:${hostName}] [LOCATION:${venueLoc}] [COORDS:${JSON.stringify(coordinates)}]`;

      // Validate capacity update: null (unlimited) or integer 2-24, and never below joined count
      let nextMaxPlayers: number | null | undefined = undefined;
      if (game.spotsTotal !== undefined) {
        if (game.spotsTotal === null) {
          nextMaxPlayers = null;
        } else {
          const parsedCap = Number(game.spotsTotal);
          if (!Number.isInteger(parsedCap) || parsedCap < 2 || parsedCap > 24) {
            return NextResponse.json(
              { success: false, error: 'Capacity must be between 2 and 24 players, or unlimited.' },
              { status: 400 }
            );
          }
          const { count: joinedNow } = await supabase
            .from('queues')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', dbSession.id)
            .neq('status', 'cancelled');
          const effectiveJoined = Math.max(joinedNow || 0, dbSession.current_players_count || 0);
          if (parsedCap < effectiveJoined) {
            return NextResponse.json(
              {
                success: false,
                error: `Total spots cannot be less than the ${effectiveJoined} players already joined.`,
              },
              { status: 400 }
            );
          }
          nextMaxPlayers = parsedCap;
        }
      }

      const sessionUpdates: Record<string, any> = {
        title: game.title || dbSession.title,
        description: newDesc,
        max_players: nextMaxPlayers !== undefined ? nextMaxPlayers : dbSession.max_players,
        fee_cents: game.pricePerPlayer !== undefined ? Math.round(game.pricePerPlayer * 100) : dbSession.fee_cents,
        location_details: game.locationDetails || game.locationName || dbSession.location_details,
        updated_at: nowIso,
      };
      if (game.date || game.time || game.endTime !== undefined || game.endsAt !== undefined) {
        const existingSchedule = formatSessionDateTime(dbSession.start_time ?? undefined, dbSession.ends_at ?? null);
        const parsedSched = parseIsoSchedule(
          game.date || existingSchedule.date,
          game.time || existingSchedule.time,
          game.endTime !== undefined ? game.endTime : undefined,
          game.endsAt !== undefined ? game.endsAt : undefined
        );
        if (parsedSched.error) {
          return NextResponse.json({ success: false, error: parsedSched.error }, { status: 400 });
        }
        sessionUpdates.start_time = parsedSched.startIso;
        sessionUpdates.end_time = parsedSched.endIso;
        if (game.endTime !== undefined || game.endsAt !== undefined) {
          sessionUpdates.ends_at = parsedSched.endsAtIso;
        }
      }
      if (game.visibility) {
        sessionUpdates.visibility = game.visibility;
      }

      let { data: updatedDb, error: updateDbErr } = await supabase
        .from('sessions')
        .update(sessionUpdates)
        .eq('id', dbSession.id)
        .select('*')
        .single();

      while (updateDbErr && isMissingColumnError(updateDbErr)) {
        const missing = extractMissingColumn(updateDbErr);
        if (missing && missing in sessionUpdates) {
          delete sessionUpdates[missing];
        } else {
          delete sessionUpdates.ends_at;
        }
        const retry = await supabase
          .from('sessions')
          .update(sessionUpdates)
          .eq('id', dbSession.id)
          .select('*')
          .single();
        updatedDb = retry.data;
        updateDbErr = retry.error;
        if (updatedDb || !isMissingColumnError(updateDbErr)) break;
      }

      if (updateDbErr || !updatedDb) {
        console.error('[/api/invitations POST update_game] session update failed:', updateDbErr);
        return NextResponse.json(
          { success: false, error: updateDbErr?.message || 'Failed to update game session.' },
          { status: 500 }
        );
      }

      const { date: updatedDate, time: updatedTime, endTime: updatedEndTime } = formatSessionDateTime(
        updatedDb.start_time ?? undefined,
        updatedDb.ends_at ?? null
      );
      return NextResponse.json({
        success: true,
        session: updatedDb,
        game: {
          ...game,
          id: updatedDb.id,
          sessionId: updatedDb.id,
          date: updatedDate,
          time: updatedTime,
          endTime: updatedEndTime,
          startsAt: updatedDb.start_time || undefined,
          endsAt: updatedDb.ends_at ?? null,
          spotsTotal: updatedDb.max_players === null || updatedDb.max_players === undefined ? null : Number(updatedDb.max_players),
          notes: rawNotes,
        },
      });
    }

    if (action === 'accept') {
      const isInviteOnly = dbSession.visibility === 'Invite' || game.visibility === 'Invite';
      if (isInviteOnly) {
        const isHost = dbSession.host_id === authUser.id || (Boolean(authUser.auth_id) && dbSession.host_id === authUser.auth_id);
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

      // Check existing DB queues for capacity and existing membership
      const { data: currentQueues, error: preQueueErr } = await supabase
        .from('queues')
        .select('user_id, partner_names')
        .eq('session_id', dbSession.id)
        .neq('status', 'cancelled');

      if (preQueueErr) {
        console.error('[/api/invitations POST accept] pre-join queues check error:', preQueueErr);
        return NextResponse.json({ success: false, error: preQueueErr.message }, { status: 500 });
      }

      const activeQueueRows = Array.isArray(currentQueues) ? currentQueues : [];
      const alreadyInQueue = activeQueueRows.some(
        (q: { user_id?: string | null }) =>
          q.user_id === authUser.id || (Boolean(authUser.auth_id) && q.user_id === authUser.auth_id)
      );
      const maxPlayers = dbSession.max_players === null || dbSession.max_players === undefined ? null : Number(dbSession.max_players);

      if (!alreadyInQueue && maxPlayers !== null && activeQueueRows.length >= maxPlayers) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot join match: The roster is already full (${maxPlayers}/${maxPlayers} players).`,
          },
          { status: 409 }
        );
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

      // Upsert into queues table with valid schema (match_format column removed)
      const { error: queueErr } = await supabase.from('queues').upsert(
        {
          session_id: dbSession.id,
          user_id: authUser.id,
          queue_number: activeQueueRows.length + 1,
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

      // Query authoritative DB queues count & roster members after join
      const { data: postQueueRows, error: postQueueErr } = await supabase
        .from('queues')
        .select('user_id, partner_names, user:users(id, full_name, nickname, avatar_url)')
        .eq('session_id', dbSession.id)
        .neq('status', 'cancelled');

      if (postQueueErr) {
        console.error('[/api/invitations POST accept] post-join queues fetch error:', postQueueErr);
        return NextResponse.json({ success: false, error: postQueueErr.message }, { status: 500 });
      }

      const dbMembersMap = new Map<string, CommunityGame['members'][number]>();
      (postQueueRows || []).forEach((q: any) => {
        const uObj = Array.isArray(q.user) ? q.user[0] : q.user;
        const mName = uObj?.full_name || uObj?.nickname || (q.partner_names && q.partner_names[0]) || 'Player';
        const mId = q.user_id || uObj?.id || undefined;
        const key = mId || mName.toLowerCase();
        if (!dbMembersMap.has(key)) {
          dbMembersMap.set(key, {
            id: mId,
            name: mName,
            avatar: (uObj?.avatar_url as CommunityGame['hostAvatar']) || 'alex',
          });
        }
      });

      const finalMembers = Array.from(dbMembersMap.values());
      const finalSpotsJoined = maxPlayers === null ? finalMembers.length : Math.min(maxPlayers, finalMembers.length);

      const { error: updateErr } = await supabase
        .from('sessions')
        .update({ current_players_count: finalSpotsJoined, updated_at: nowIso })
        .eq('id', dbSession.id);

      if (updateErr) {
        console.error('[/api/invitations POST accept] session count update error:', updateErr);
      }

      // Notify the Game Host immediately via Supabase notifications table & realtime broadcast
      const hostUserId = dbSession.host_id || game.hostId || null;
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

          const cleanHostKey = (hostUserId || hostName || '').toLowerCase().trim();
          const cleanJoinerKey = (authUser.id || joiningPlayerName || '').toLowerCase().trim();
          const notifDedupeKey = `player_joined_${dbSession.id}_${cleanJoinerKey}_${cleanHostKey}`;
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

          // Idempotency check: don't insert duplicate notification if already exists
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .filter('metadata->>dedupeKey', 'eq', notifDedupeKey)
            .limit(1)
            .maybeSingle();

          if (!existingNotif) {
            const { error: notifErr } = await supabase.from('notifications').insert(notifPayload);
            if (notifErr && notifErr.code !== '23505') {
              console.warn('[/api/invitations POST accept] notification insert notice:', notifErr.message);
            }
          }

          // Broadcast to recipient's primary channel
          const primaryChannel = hostUserId
            ? `sportsync-notifs-${hostUserId}`
            : hostName
              ? `sportsync-notifs-${hostName.toLowerCase().replace(/\s+/g, '_')}`
              : 'sportsync-notifs-all';

          try {
            const hostChannel = supabase.channel(primaryChannel);
            if (typeof (hostChannel as any).httpSend === 'function') {
              await (hostChannel as any).httpSend('new_notification', notifPayload).catch(() => {});
            } else {
              await new Promise<void>((resolve) => {
                const timer = setTimeout(() => {
                  try { supabase.removeChannel(hostChannel); } catch {}
                  resolve();
                }, 1500);
                hostChannel.subscribe((status: string) => {
                  if (status === 'SUBSCRIBED') {
                    hostChannel
                      .send({
                        type: 'broadcast',
                        event: 'new_notification',
                        payload: notifPayload,
                      })
                      .catch(() => {})
                      .finally(() => {
                        clearTimeout(timer);
                        try { supabase.removeChannel(hostChannel); } catch {}
                        resolve();
                      });
                  }
                });
              });
            }
          } catch {}
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

      const { count: remainingAfterRemove } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', dbSession.id)
        .neq('status', 'cancelled');

      const updatedMembers = (game.members || []).filter((m) => {
        if (participantId && m.id && m.id === participantId) return false;
        if (participantUserId && m.id && m.id === participantUserId) return false;
        if (participantName && m.name && m.name.trim().toLowerCase() === participantName.toLowerCase()) return false;
        return true;
      });

      const nextSpots = typeof remainingAfterRemove === 'number' ? remainingAfterRemove : updatedMembers.length;
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

      const { count: remainingAfterLeave } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', dbSession.id)
        .neq('status', 'cancelled');

      const updatedMembers = (game.members || []).filter((m) => m.id !== authUser.id);
      const nextSpots = typeof remainingAfterLeave === 'number' ? remainingAfterLeave : updatedMembers.length;

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
      if (
        dbSession.host_id &&
        dbSession.host_id !== authUser.id &&
        (!authUser.auth_id || dbSession.host_id !== authUser.auth_id)
      ) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Only the host can toggle participation.' },
          { status: 403 }
        );
      }

      const participate = Boolean(body.participate);
      if (participate) {
        const { data: currentHostQueues, error: countErr } = await supabase
          .from('queues')
          .select('user_id')
          .eq('session_id', dbSession.id)
          .neq('status', 'cancelled');

        if (countErr) {
          console.error('[/api/invitations POST toggle_host_participation] queues count error:', countErr);
          return NextResponse.json({ success: false, error: countErr.message }, { status: 500 });
        }

        const activeRows = Array.isArray(currentHostQueues) ? currentHostQueues : [];
        const hostAlreadyJoined = activeRows.some((q) => q.user_id === authUser.id);

        const hostMaxPlayers = dbSession.max_players === null || dbSession.max_players === undefined ? null : Number(dbSession.max_players);
        if (!hostAlreadyJoined && hostMaxPlayers !== null && activeRows.length >= hostMaxPlayers) {
          return NextResponse.json(
            { success: false, error: 'Cannot join lineup: Match roster is already full.' },
            { status: 409 }
          );
        }

        const { error: hostUpsertErr } = await supabase.from('queues').upsert(
          {
            session_id: dbSession.id,
            user_id: authUser.id,
            queue_number: activeRows.length + 1,
            group_size: 1,
            status: 'waiting',
            partner_names: [authUser.full_name || 'Organizer'],
            joined_at: nowIso,
          },
          { onConflict: 'session_id,user_id' }
        );

        if (hostUpsertErr) {
          console.error('[/api/invitations POST toggle_host_participation] queues upsert error:', hostUpsertErr);
          return NextResponse.json({ success: false, error: hostUpsertErr.message }, { status: 500 });
        }
      } else {
        const { error: hostDelErr } = await supabase
          .from('queues')
          .delete()
          .eq('session_id', dbSession.id)
          .eq('user_id', authUser.id);

        if (hostDelErr) {
          console.error('[/api/invitations POST toggle_host_participation] queues delete error:', hostDelErr);
          return NextResponse.json({ success: false, error: hostDelErr.message }, { status: 500 });
        }
      }

      const { count: remainingHostToggle } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', dbSession.id)
        .neq('status', 'cancelled');

      const updatedMembers = participate
        ? [
            { id: authUser.id, name: authUser.full_name, avatar: (authUser.avatar_url as CommunityGame['hostAvatar']) || 'alex' },
            ...(game.members || []).filter((m) => m.id !== authUser.id),
          ]
        : (game.members || []).filter((m) => m.id !== authUser.id);

      const finalCount = typeof remainingHostToggle === 'number' ? remainingHostToggle : updatedMembers.length;

      const { error: updErr } = await supabase
        .from('sessions')
        .update({ current_players_count: finalCount, updated_at: nowIso })
        .eq('id', dbSession.id);

      if (updErr) {
        console.error('[/api/invitations POST toggle_host_participation] session update error:', updErr);
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        game: { ...game, sessionId: dbSession.id, spotsJoined: finalCount, members: updatedMembers },
        spotsJoined: finalCount,
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
