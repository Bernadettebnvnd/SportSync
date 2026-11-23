/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { CommunityGame } from '@/mock/types';
import { createAdminClient, createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken, isMissingColumnError, extractMissingColumn } from '@/lib/auth/serverAuth';
import { isGameExpired } from '@/lib/utils/gameExpiration';

function getSupabase() {
  const admin = createAdminClient();
  if (admin) return admin;
  return createServerClient();
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(val?: string | null): val is string {
  return Boolean(val && UUID_REGEX.test(val.trim()));
}

const DELETED_LEGACY_HOST_REGEX = /^\s*(inah|xian|shea|marianne|alex|jan)(\s|$)/i;

async function isAuthAccountConfirmedMissing(
  admin: ReturnType<typeof createAdminClient>,
  lookupId?: string | null
): Promise<boolean> {
  if (!admin || !isValidUuid(lookupId)) return false;
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


const MOCK_TITLES = [
  'friday night smash',
  'open play queuing',
  'dinking & rally',
  'pickleball social rotation',
  'pickleball doubles social',
  'king of court',
  'king of the court',
  'rally rotation',
  '5v5: sunset game',
  'sunday morning league prep',
  'clay doubles friendly',
  '3v3 half-court runs',
  'casual friday night 5v5',
];

const MOCK_IDS = new Set([
  'cg1', 'cg2', 'cg3', 'cg4', 'cg5', 'cg6', 'cg7', 'cg8',
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
]);

function isMockFixture(g: { id?: string; sessionId?: string; title?: string }): boolean {
  if (!g) return true;
  if (g.id && (MOCK_IDS.has(g.id) || g.id.startsWith('sess_test_') || g.id.startsWith('session_test_'))) return true;
  if (g.sessionId && (MOCK_IDS.has(g.sessionId) || g.sessionId.startsWith('sess_test_') || g.sessionId.startsWith('session_test_'))) return true;
  const t = (g.title || '').trim().toLowerCase();
  return MOCK_TITLES.some((mt) => t.includes(mt));
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

function parseManilaSchedule(dateStr?: string, timeStr?: string): { startIso: string; endIso: string } {
  const manilaNow = getManilaDateParts();
  let y = manilaNow.year;
  let m = manilaNow.month; // 1-indexed
  let d = manilaNow.day;

  const rawDate = (dateStr || '').trim();
  const dNorm = rawDate.toLowerCase();

  if (dNorm === 'tomorrow') {
    const tom = new Date(Date.UTC(y, m - 1, d + 1));
    y = tom.getUTCFullYear();
    m = tom.getUTCMonth() + 1;
    d = tom.getUTCDate();
  } else if (dNorm && dNorm !== 'today') {
    const isoMatch = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      y = parseInt(isoMatch[1], 10);
      m = parseInt(isoMatch[2], 10);
      d = parseInt(isoMatch[3], 10);
    } else {
      const hasYear = /\b\d{4}\b/.test(rawDate);
      const parsed = new Date(hasYear ? rawDate : `${rawDate}, ${y}`);
      if (!isNaN(parsed.getTime())) {
        y = hasYear && parsed.getFullYear() >= 2020 ? parsed.getFullYear() : y;
        m = parsed.getMonth() + 1;
        d = parsed.getDate();
      }
    }
  }

  let startH = 18;
  let startM = 0;
  if (timeStr) {
    const cleanTime = timeStr.trim();
    const twelveHr = cleanTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (twelveHr) {
      let ph = parseInt(twelveHr[1], 10);
      const pm = twelveHr[2] ? parseInt(twelveHr[2], 10) : 0;
      const mer = twelveHr[3].toUpperCase();
      if (mer === 'PM' && ph < 12) ph += 12;
      if (mer === 'AM' && ph === 12) ph = 0;
      startH = ph;
      startM = pm;
    } else {
      const parts = cleanTime.split(':');
      if (parts.length >= 2) {
        const ph = parseInt(parts[0], 10);
        const pm = parseInt(parts[1], 10);
        if (!isNaN(ph) && ph >= 0 && ph <= 23) startH = ph;
        if (!isNaN(pm) && pm >= 0 && pm <= 59) startM = pm;
      }
    }
  }

  const yyyy = String(y).padStart(4, '0');
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  const hh = String(startH).padStart(2, '0');
  const min = String(startM).padStart(2, '0');

  const startDate = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00+08:00`);
  const validStart = isNaN(startDate.getTime()) ? new Date() : startDate;
  const startIso = validStart.toISOString();
  const endIso = new Date(validStart.getTime() + 2 * 60 * 60 * 1000).toISOString();
  return { startIso, endIso };
}

function formatSessionDateTime(startTime?: string): { date: string; time: string } {
  if (!startTime) return { date: 'Today', time: '18:00' };
  if (!startTime.includes('T') && !startTime.includes('-')) {
    return { date: 'Today', time: startTime };
  }
  try {
    const d = new Date(startTime);
    if (isNaN(d.getTime())) return { date: 'Today', time: startTime };

    const todayManila = getManilaDateParts();
    const tomDate = new Date(Date.UTC(todayManila.year, todayManila.month - 1, todayManila.day + 1));
    const tomorrowYmd = `${tomDate.getUTCFullYear()}-${String(tomDate.getUTCMonth() + 1).padStart(2, '0')}-${String(tomDate.getUTCDate()).padStart(2, '0')}`;
    const targetManila = getManilaDateParts(d);

    const isToday = targetManila.ymd === todayManila.ymd;
    const isTomorrow = targetManila.ymd === tomorrowYmd;

    const dateLabel = isToday
      ? 'Today'
      : isTomorrow
      ? 'Tomorrow'
      : d.toLocaleDateString('en-US', {
          timeZone: 'Asia/Manila',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

    const timeLabel = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);

    return { date: dateLabel, time: timeLabel };
  } catch {
    return { date: 'Today', time: startTime };
  }
}

async function getAuthenticatedUserFromRequest(req: NextRequest): Promise<{ sub: string; email: string; role?: string } | null> {
  const tokenCookie = req.cookies.get('sportsync-auth-token')?.value || req.cookies.get('sb-access-token')?.value;
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
  if (verified && verified.userId) {
    return {
      sub: verified.userId,
      email: verified.email || '',
      role: verified.role,
    };
  }

  if (isSupabaseConfigured) {
    const sb = createServerClient(token);
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (data?.user?.id) {
        return {
          sub: data.user.id,
          email: data.user.email || '',
          role: (data.user.user_metadata?.role as string) || 'player',
        };
      }
    }
  }

  return null;
}

/**
 * Ensures the host user exists in `public.users` and returns their canonical `public.users.id`
 * so `public.sessions.host_id` never fails a foreign key constraint.
 */
async function resolveCanonicalHostUserId(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  authUser: { sub: string; email: string; role?: string },
  gameHostName?: string
): Promise<string | null> {
  const candidateIds = [
    isValidUuid(authUser.sub) ? authUser.sub.trim() : null,
  ].filter((id): id is string => Boolean(id));

  // 1. Check public.users by id or auth_id
  for (const candidateId of candidateIds) {
    const { data: byId } = await supabase
      .from('users')
      .select('id')
      .or(`id.eq.${candidateId},auth_id.eq.${candidateId}`)
      .limit(1)
      .maybeSingle();

    if (byId?.id) {
      return byId.id;
    }
  }

  // 2. Check public.users by authenticated email
  if (authUser?.email) {
    const normalizedEmail = authUser.email.trim().toLowerCase();
    const { data: byEmail } = await supabase
      .from('users')
      .select('id')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (byEmail?.id) {
      return byEmail.id;
    }
  }

  // 3. If we have a valid UUID (from session cookie or game.hostId) that is missing from public.users,
  // verify it in auth.users or upsert a corresponding public.users row first so FK never fails.
  const primaryId = candidateIds[0];
  if (primaryId) {
    let email = authUser?.email?.trim().toLowerCase() || '';
    let fullName = (gameHostName || '').trim() || 'SportSync Player';

    try {
      const admin = createAdminClient();
      if (admin) {
        const { data: authData } = await admin.auth.admin.getUserById(primaryId);
        if (authData?.user) {
          email = (authData.user.email || email).trim().toLowerCase();
          fullName =
            authData.user.user_metadata?.full_name ||
            authData.user.user_metadata?.name ||
            fullName;
        }
      }
    } catch {
      // Non-fatal
    }

    if (email) {
      const userPayload = {
        id: primaryId,
        auth_id: primaryId,
        email,
        full_name: fullName,
        nickname: fullName.split(' ')[0] || 'Player',
        role: authUser?.role === 'facility' || authUser?.role === 'venue_owner' ? 'venue_owner' : 'player',
        skill_level: 'intermediate',
        preferred_sports: ['basketball', 'badminton', 'pickleball'],
        city: 'Naga City',
      };

      const { data: initialUpserted, error: upsertErr } = await supabase
        .from('users')
        .upsert(userPayload, { onConflict: 'id' })
        .select('id')
        .maybeSingle();
      let upserted = initialUpserted;

      if (upsertErr && isMissingColumnError(upsertErr)) {
        const { data: minUpserted } = await supabase
          .from('users')
          .upsert({ id: primaryId, auth_id: primaryId, email, full_name: fullName }, { onConflict: 'id' })
          .select('id')
          .maybeSingle();
        upserted = minUpserted;
      }

      if (upserted?.id) {
        return upserted.id;
      }
    }
  }

  return null;
}

/**
 * Ensures a dedicated system fallback venue exists to satisfy `sessions.venue_id NOT NULL REFERENCES venues(id)`.
 * Searches for the dedicated system fallback slug, community/open-court venues, any Naga City venue,
 * or any active venue in public.venues. If none exist in the database, it creates a fallback venue.
 */
async function getOrCreateSystemCommunityVenueId(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  hostUserId?: string | null
): Promise<string | null> {
  const SYSTEM_SLUG = 'community-open-court-naga';

  // 1. Try finding existing system community venue by its dedicated slug
  try {
    const { data: existing } = await supabase
      .from('venues')
      .select('id')
      .eq('slug', SYSTEM_SLUG)
      .maybeSingle();

    if (existing?.id) {
      return existing.id;
    }
  } catch {}

  // 2. Try finding any community or open court venue
  try {
    const { data: comm } = await supabase
      .from('venues')
      .select('id')
      .or('slug.ilike.%community%,name.ilike.%community%,name.ilike.%open court%')
      .limit(1)
      .maybeSingle();

    if (comm?.id) {
      return comm.id;
    }
  } catch {}

  // 3. Try finding any existing venue located in Naga City
  try {
    const { data: nagaVenue } = await supabase
      .from('venues')
      .select('id')
      .or('city.ilike.%Naga%,name.ilike.%Naga%,name.ilike.%Robredo%,name.ilike.%Metro%')
      .limit(1)
      .maybeSingle();

    if (nagaVenue?.id) {
      return nagaVenue.id;
    }
  } catch {}

  // 4. Try querying ANY valid venue in public.venues (public SELECT always succeeds via RLS)
  try {
    const { data: anyVenue } = await supabase
      .from('venues')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (anyVenue?.id) {
      return anyVenue.id;
    }
  } catch {}

  // 5. If venues table is completely empty, attempt to create the system fallback venue
  try {
    const admin = createAdminClient() || supabase;
    const { data: created } = await admin
      .from('venues')
      .insert({
        owner_id: hostUserId || null,
        name: 'Community / Open Court',
        slug: SYSTEM_SLUG,
        description: 'System fallback venue for custom community and open-court games in Naga City',
        address: 'Naga City, Camarines Sur',
        city: 'Naga City',
        latitude: 13.6218,
        longitude: 123.1948,
        amenities: [],
        images: [],
        operating_hours: { mon_sun: '06:00 - 23:00' },
        is_verified: true,
        rating: null,
        review_count: 0,
      })
      .select('id')
      .maybeSingle();

    if (created?.id) return created.id;
  } catch (err) {
    console.warn('[/api/games] Fallback community venue creation notice:', err);
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseConfigured) {
      return NextResponse.json({
        success: true,
        games: [],
        offline: true,
        message: 'Supabase is not configured on the server. Running in local mode.',
      });
    }

    // Touch request auth cookie for verification awareness
    await getAuthenticatedUserFromRequest(req);

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .in('status', ['active', 'upcoming'])
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[/api/games GET] Supabase query failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
          games: [],
        },
        { status: 500 }
      );
    }

    const combinedMap = new Map<string, CommunityGame>();

    if (Array.isArray(sessions)) {
      const sessionIds = sessions.map((s) => s.id).filter(Boolean);
      const venueIds = Array.from(new Set(sessions.map((s) => s.venue_id).filter(Boolean)));
      const hostIds = Array.from(new Set(sessions.map((s) => s.host_id).filter(Boolean)));

      const venuesMap = new Map<string, any>();
      const hostsMap = new Map<string, any>();
      const rostersMap = new Map<string, { id?: string; name: string; avatar: any }[]>();

      if (venueIds.length > 0) {
        const { data: vList } = await supabase
          .from('venues')
          .select('id, name, city, address')
          .in('id', venueIds);
        if (Array.isArray(vList)) {
          vList.forEach((v) => venuesMap.set(v.id, v));
        }
      }

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

      if (sessionIds.length > 0) {
        const { data: qList } = await supabase
          .from('queues')
          .select('session_id, user_id, partner_names, user:users(id, full_name, nickname, avatar_url)')
          .in('session_id', sessionIds)
          .neq('status', 'cancelled');

        if (Array.isArray(qList)) {
          qList.forEach((q: any) => {
            const list = rostersMap.get(q.session_id) || [];
            const uName = q.user?.full_name || q.user?.nickname || (q.partner_names && q.partner_names[0]) || 'Player';
            const uId = q.user_id || q.user?.id;
            const already = list.some(
              (m) => (uId && m.id === uId) || m.name.toLowerCase() === uName.toLowerCase()
            );
            if (!already) {
              list.push({
                id: uId,
                name: uName,
                avatar: q.user?.avatar_url || 'alex',
              });
              rostersMap.set(q.session_id, list);
            }
          });
        }

        const { data: pList } = await supabase
          .from('session_participants')
          .select('session_id, user_id, user_name, user_avatar')
          .in('session_id', sessionIds)
          .neq('status', 'cancelled');

        if (Array.isArray(pList)) {
          pList.forEach((p: any) => {
            const list = rostersMap.get(p.session_id) || [];
            const already = list.some(
              (m) => (p.user_id && m.id === p.user_id) || m.name.toLowerCase() === (p.user_name || '').toLowerCase()
            );
            if (!already) {
              list.push({
                id: p.user_id,
                name: p.user_name || 'Player',
                avatar: p.user_avatar || 'alex',
              });
              rostersMap.set(p.session_id, list);
            }
          });
        }
      }

      sessions.forEach((s) => {
        if (!s || !s.id || isMockFixture(s)) return;
        if (!s.host_id || !hostsMap.has(s.host_id)) return;

        const venue = s.venue_id ? venuesMap.get(s.venue_id) : undefined;
        const host = hostsMap.get(s.host_id);
        const inviteTagMatch = s.description?.match(/\[INVITE:([A-Z0-9_-]+)\]/i);
        const taggedInvite = inviteTagMatch ? inviteTagMatch[1].trim().toUpperCase() : undefined;

        const { date: fDate, time: fTime } = formatSessionDateTime(s.start_time);
        const members = [...(rostersMap.get(s.id) || [])];
        const resolvedHostName = host?.full_name || host?.nickname || 'Match Organizer';
        const resolvedHostAvatar = host?.avatar_url || 'alex';

        // Ensure host is included in members roster if no members were found yet
        if (members.length === 0 && resolvedHostName) {
          members.push({
            id: s.host_id || undefined,
            name: resolvedHostName,
            avatar: resolvedHostAvatar,
          });
        }

        const spotsJoined = Math.min(
          s.max_players || 12,
          Math.max(members.length, s.current_players_count || 0)
        );

        const locTagMatch = s.description?.match(/\[(?:LOCATION|LOC):(.*?)\]/i);
        const taggedLoc = locTagMatch ? locTagMatch[1].trim() : '';
        const coordsTagMatch = s.description?.match(/\[COORDS:(.*?)\]/i);
        let parsedCoords: [number, number] | undefined = undefined;
        if (coordsTagMatch) {
          try {
            parsedCoords = JSON.parse(coordsTagMatch[1]);
          } catch {}
        }
        const isInvalidLoc = (val?: string | null) =>
          !val ||
          val.includes('Upper Deck') ||
          val.includes('Pasig') ||
          val.includes('Ortigas') ||
          val === 'Community / Open Court' ||
          val === 'Naga Sports Venue';

        const validVenueName = !isInvalidLoc(venue?.name) ? venue!.name : '';
        const cleanTaggedLoc = !isInvalidLoc(taggedLoc) ? taggedLoc : '';
        const cleanLocationDetails = !isInvalidLoc(s.location_details) ? s.location_details : '';

        const resolvedLocation =
          cleanTaggedLoc ||
          cleanLocationDetails ||
          validVenueName ||
          'Metro Naga Sports Complex';

        const cleanNotes = (s.description || '')
          .replace(/\[INVITE:.*?\]/gi, '')
          .replace(/\[HOST:.*?\]/gi, '')
          .replace(/\[LOCATION:.*?\]/gi, '')
          .replace(/\[LOC:.*?\]/gi, '')
          .replace(/\[COORDS:.*?\]/gi, '')
          .trim();

        const gameObj: CommunityGame = {
          id: s.id,
          sessionId: s.id,
          sport: (s.sport ? s.sport.charAt(0).toUpperCase() + s.sport.slice(1) : 'Basketball') as any,
          title: s.title,
          format: (s.rotation_format || '5v5') as any,
          skillLevel: (s.skill_level === 'competitive' || s.skill_level === 'intermediate' ? 'Competitive' : 'Casual') as any,
          date: fDate,
          time: fTime,
          locationName: resolvedLocation,
          locationDetails: cleanLocationDetails || cleanTaggedLoc || resolvedLocation,
          distance: 'Naga City • 0.5 km away',
          coordinates: s.coordinates || parsedCoords,
          hostId: s.host_id,
          hostName: resolvedHostName,
          hostAvatar: resolvedHostAvatar,
          spotsTotal: s.max_players || 12,
          spotsJoined,
          pricePerPlayer: Math.round((s.fee_cents || 0) / 100),
          notes: cleanNotes || 'Verified SportSync match',
          isPublic: s.visibility ? s.visibility !== 'Invite' : true,
          visibility: (s.visibility as any) || 'Public',
          inviteCode: s.invite_code || taggedInvite,
          members,
        };

        if (!isGameExpired(gameObj, s.end_time ?? undefined)) {
          // Deduplicate strictly by canonical game ID
          combinedMap.set(s.id, gameObj);
        }
      });
    }

    const uniqueGames = Array.from(combinedMap.values());
    return NextResponse.json({ success: true, games: uniqueGames });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error fetching games';
    console.error('[/api/games GET] Unexpected error:', err);
    return NextResponse.json({ success: false, error: msg, games: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'create_game';
    const game = body.game as CommunityGame;

    if (!game || !game.title) {
      return NextResponse.json(
        { success: false, error: 'Game title and details are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase || !isSupabaseConfigured) {
      // In local mode without Supabase credentials, return game successfully for local storage persistence
      const fallbackGame: CommunityGame = {
        ...game,
        id: game.id || `local_${Date.now()}`,
        sessionId: game.sessionId || game.id || `local_sess_${Date.now()}`,
        isPublic: game.visibility ? game.visibility !== 'Invite' : true,
        visibility: game.visibility || 'Public',
        inviteCode: (game.inviteCode || Math.random().toString(36).substring(2, 8)).toUpperCase(),
        spotsJoined: Math.max(1, (game.members || []).length),
        members: game.members || [
          {
            id: game.hostId || 'local_player',
            name: game.hostName || 'Player',
            avatar: game.hostAvatar || 'alex',
          },
        ],
      };
      return NextResponse.json({
        success: true,
        game: fallbackGame,
        session: { ...fallbackGame },
        offline: true,
      });
    }

    const authUser = await getAuthenticatedUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    if (action === 'create_game') {
      const inviteCode = (game.inviteCode || Math.random().toString(36).substring(2, 8))
        .trim()
        .toUpperCase();

      // 1. Resolve canonical host public.users.id so host_id FK never fails
      const hostUserId = await resolveCanonicalHostUserId(
        supabase,
        authUser,
        game.hostName
      );

      // 2. Resolve venue_id to satisfy foreign key and NOT NULL constraints
      let venueId: string | null = null;
      const requestedVenueId = (body.game as any)?.venueId || (game as any).venue_id;
      if (isValidUuid(requestedVenueId)) {
        const { data: exactVenue } = await supabase
          .from('venues')
          .select('id')
          .eq('id', requestedVenueId.trim())
          .maybeSingle();
        if (exactVenue?.id) {
          venueId = exactVenue.id;
        }
      }

      // Check if requestedVenueId matches a venue slug (e.g. 'robredo-coliseum-naga' or 'metro-naga-sports-complex')
      if (!venueId && typeof requestedVenueId === 'string' && requestedVenueId.trim()) {
        const slugNorm = requestedVenueId.trim().replace(/_/g, '-').toLowerCase();
        const { data: slugVenue } = await supabase
          .from('venues')
          .select('id')
          .or(`slug.eq.${slugNorm},slug.ilike.%${slugNorm}%`)
          .limit(1)
          .maybeSingle();
        if (slugVenue?.id) {
          venueId = slugVenue.id;
        }
      }

      if (!venueId && game.locationName && game.locationName.trim()) {
        const locName = game.locationName.trim();
        const firstSegment = locName.split(',')[0].trim();
        const { data: matchedVenue } = await supabase
          .from('venues')
          .select('id, name')
          .ilike('name', `%${firstSegment}%`)
          .limit(1)
          .maybeSingle();
        if (matchedVenue?.id) {
          venueId = matchedVenue.id;
        }
      }

      // Match by locationName keywords for known Naga venues
      if (!venueId && game.locationName && game.locationName.trim()) {
        const loc = game.locationName.toLowerCase();
        let keyword = '';
        if (loc.includes('robredo')) keyword = 'Robredo';
        else if (loc.includes('metro naga') || loc.includes('pacol')) keyword = 'Metro Naga';
        else if (loc.includes('coliseum')) keyword = 'Coliseum';
        else if (loc.includes('complex')) keyword = 'Complex';

        if (keyword) {
          const { data: kwVenue } = await supabase
            .from('venues')
            .select('id')
            .ilike('name', `%${keyword}%`)
            .limit(1)
            .maybeSingle();
          if (kwVenue?.id) {
            venueId = kwVenue.id;
          }
        }
      }

      // If venueId is still not resolved, resolve fallback venue to ensure venue_id NOT NULL constraint is satisfied
      if (!venueId) {
        venueId = await getOrCreateSystemCommunityVenueId(supabase, hostUserId);
      }

      // Absolute safety net: if venueId is still null, query any existing venue from venues table
      if (!venueId) {
        try {
          const { data: anyV } = await supabase.from('venues').select('id').limit(1).maybeSingle();
          if (anyV?.id) {
            venueId = anyV.id;
          }
        } catch {}
      }

      // 3. Normalize sport & schedule timestamps
      const sLower = (game.sport || '').toLowerCase();
      const validSports = [
        'badminton',
        'pickleball',
        'basketball',
        'padel',
        'tennis',
        'volleyball',
        'football',
        'billiards',
        'darts',
        'table_tennis',
      ];
      const validSport = validSports.find((vs) => sLower.includes(vs)) || 'basketball';

      const { startIso, endIso } = parseManilaSchedule(game.date, game.time);

      const isInvalidLocInput = (val?: string | null) =>
        !val ||
        val.includes('Upper Deck') ||
        val.includes('Pasig') ||
        val.includes('Ortigas') ||
        val === 'Community / Open Court' ||
        val === 'Naga Sports Venue';

      const venueLocationName = (
        (!isInvalidLocInput(game.locationName) ? game.locationName : '') ||
        (!isInvalidLocInput(game.locationDetails) ? game.locationDetails : '') ||
        'Metro Naga Sports Complex'
      ).trim();
      const venueLocationDetails = (
        (!isInvalidLocInput(game.locationDetails) ? game.locationDetails : '') ||
        venueLocationName
      ).trim();
      const coordinates = game.coordinates || [13.6218, 123.1948];

      const initialMembers =
        Array.isArray(game.members) && game.members.length > 0
          ? game.members
          : [
              {
                id: hostUserId || game.hostId,
                name: game.hostName || 'Host',
                avatar: game.hostAvatar || 'alex',
              },
            ];

      const basePayload: Record<string, any> = {
        venue_id: venueId,
        host_id: hostUserId,
        title: game.title.trim(),
        description: `${game.notes || 'Organized via SportSync Matchmaking'} [INVITE:${inviteCode}] [HOST:${game.hostName || ''}] [LOCATION:${venueLocationName}] [LOC:${venueLocationName}] [COORDS:${JSON.stringify(coordinates)}]`,
        sport: validSport,
        session_type: 'open_play',
        skill_level: game.skillLevel === 'Competitive' ? 'intermediate' : 'all_levels',
        court_ids: [],
        start_time: startIso,
        end_time: endIso,
        fee_cents: Math.round((game.pricePerPlayer || 0) * 100),
        max_players: Math.max(2, Math.min(24, game.spotsTotal || 10)),
        current_players_count: Math.max(1, initialMembers.length),
        rotation_format: game.format || '5v5',
        status: 'active',
      };

      if ((game as any).allowed_formats && Array.isArray((game as any).allowed_formats)) {
        basePayload.allowed_formats = (game as any).allowed_formats;
      }

      const activePayload: Record<string, any> = {
        ...basePayload,
        visibility: game.visibility || 'Public',
        invite_code: inviteCode,
        location_details: venueLocationName,
      };

      let { data: inserted, error: insertErr } = await supabase
        .from('sessions')
        .insert(activePayload)
        .select('*')
        .single();

      // Handle case where optional session columns (allowed_formats/visibility/invite_code/location_details) aren't in schema cache
      while (insertErr && isMissingColumnError(insertErr)) {
        const missing = extractMissingColumn(insertErr);
        if (missing && missing in activePayload) {
          console.warn(`[/api/games POST] sessions.${missing} missing from schema cache, retrying without it:`, insertErr.message);
          delete activePayload[missing];
        } else {
          delete activePayload.allowed_formats;
          delete activePayload.visibility;
          delete activePayload.invite_code;
          delete activePayload.location_details;
          delete activePayload.coordinates;
          delete activePayload.rotation_format;
        }

        const retry = await supabase
          .from('sessions')
          .insert(activePayload)
          .select('*')
          .single();
        inserted = retry.data;
        insertErr = retry.error;
        if (inserted || !isMissingColumnError(insertErr)) break;
      }

      // Handle case where venue_id NOT NULL constraint (23502) is still active in Postgres before SQL migration is executed
      const isVenueNullError = Boolean(
        insertErr && (
          insertErr.code === '23502' ||
          (insertErr.message && insertErr.message.includes('venue_id'))
        )
      );
      if (isVenueNullError) {
        console.warn('[/api/games POST] sessions.venue_id is NOT NULL in DB; resolving guaranteed fallback venue.');
        const fallbackVenueId =
          (await getOrCreateSystemCommunityVenueId(supabase, hostUserId)) ||
          (await (async () => {
            try {
              const { data: anyV } = await supabase.from('venues').select('id').limit(1).maybeSingle();
              return anyV?.id || null;
            } catch {
              return null;
            }
          })());

        if (fallbackVenueId) {
          activePayload.venue_id = fallbackVenueId;

          let retryWithSystemVenue = await supabase
            .from('sessions')
            .insert(activePayload)
            .select('*')
            .single();

          while (retryWithSystemVenue.error && isMissingColumnError(retryWithSystemVenue.error)) {
            const missing = extractMissingColumn(retryWithSystemVenue.error);
            if (missing && missing in activePayload) {
              delete activePayload[missing];
            } else {
              delete activePayload.allowed_formats;
              delete activePayload.visibility;
              delete activePayload.invite_code;
              delete activePayload.location_details;
              delete activePayload.coordinates;
              delete activePayload.rotation_format;
            }
            retryWithSystemVenue = await supabase
              .from('sessions')
              .insert(activePayload)
              .select('*')
              .single();
          }
          inserted = retryWithSystemVenue.data;
          insertErr = retryWithSystemVenue.error;
        }
      }

      // If still error due to enum constraint (e.g. sport_type or match_format not supported in remote DB yet)
      if (insertErr && (insertErr.code === '22P02' || insertErr.message?.includes('enum'))) {
        console.warn('[/api/games POST] Enum constraint failure, retrying with baseline basketball:', insertErr.message);
        const fallbackEnumPayload: Record<string, any> = {
          ...activePayload,
          sport: 'basketball',
          session_type: 'open_play',
          skill_level: 'all_levels',
        };
        delete fallbackEnumPayload.allowed_formats;

        let retryEnum = await supabase
          .from('sessions')
          .insert(fallbackEnumPayload)
          .select('*')
          .single();

        while (retryEnum.error && isMissingColumnError(retryEnum.error)) {
          const missing = extractMissingColumn(retryEnum.error);
          if (missing && missing in fallbackEnumPayload) {
            delete fallbackEnumPayload[missing];
          } else {
            delete fallbackEnumPayload.visibility;
            delete fallbackEnumPayload.invite_code;
            delete fallbackEnumPayload.location_details;
          }
          retryEnum = await supabase
            .from('sessions')
            .insert(fallbackEnumPayload)
            .select('*')
            .single();
        }
        inserted = retryEnum.data;
        insertErr = retryEnum.error;
      }

      if (insertErr || !inserted) {
        console.error('[/api/games POST] Supabase session insert failed:', {
          code: insertErr?.code,
          message: insertErr?.message,
          details: insertErr?.details,
        });
        return NextResponse.json(
          {
            success: false,
            error: insertErr?.message || 'Failed to create game session in database.',
            code: insertErr?.code,
            details: insertErr?.details,
          },
          { status: 400 }
        );
      }

      // Also seed the host into queues or session_participants so rosters immediately reflect the host across all devices
      if (hostUserId && inserted?.id) {
        try {
          await supabase.from('queues').insert({
            session_id: inserted.id,
            user_id: hostUserId,
            group_size: 1,
            queue_number: 1,
            partner_names: [game.hostName || 'Host'],
            status: 'waiting',
          });
        } catch {
          // Non-fatal if queue row already exists or schema differs
        }

        try {
          await supabase.from('session_participants').insert({
            session_id: inserted.id,
            user_id: hostUserId,
            user_name: game.hostName || 'Host',
            user_avatar: game.hostAvatar || 'alex',
            status: 'joined',
          });
        } catch {
          // Non-fatal if session_participants table doesn't exist yet
        }
      }

      const finalGame: CommunityGame = {
        ...game,
        id: inserted.id,
        sessionId: inserted.id,
        hostId: hostUserId || game.hostId,
        locationName: venueLocationName,
        locationDetails: venueLocationDetails,
        coordinates: coordinates,
        inviteCode,
        isPublic: game.visibility ? game.visibility !== 'Invite' : true,
        visibility: game.visibility || 'Public',
        spotsJoined: Math.max(1, initialMembers.length),
        members: initialMembers,
      };

      return NextResponse.json({
        success: true,
        game: finalGame,
        session: inserted,
      });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error in POST /api/games';
    console.error('[/api/games POST] Unexpected error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
