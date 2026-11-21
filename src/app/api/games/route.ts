import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CommunityGame } from '@/mock/types';
import { createAdminClient, createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { isGameExpired } from '@/lib/utils/gameExpiration';

const DATA_DIR = path.join(process.cwd(), '.data');
const CACHE_FILE = path.join(DATA_DIR, 'invitations.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

function loadCache(): Record<string, CommunityGame> {
  try {
    ensureDataDir();
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(raw) || {};
    }
  } catch {}
  return {};
}

function saveCache(cache: Record<string, CommunityGame>): void {
  try {
    ensureDataDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch {}
}

function getSupabase() {
  const admin = createAdminClient();
  if (admin) return admin;
  return createServerClient();
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

function formatSessionDateTime(startTime?: string): { date: string; time: string } {
  if (!startTime) return { date: 'Today', time: '18:00' };
  if (!startTime.includes('T') && !startTime.includes('-')) {
    return { date: 'Today', time: startTime };
  }
  try {
    const d = new Date(startTime);
    if (isNaN(d.getTime())) return { date: 'Today', time: startTime };
    const now = new Date();
    const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    const isTomorrow = d.getFullYear() === tom.getFullYear() && d.getMonth() === tom.getMonth() && d.getDate() === tom.getDate();
    const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return { date: dateLabel, time: `${hours}:${minutes}` };
  } catch {
    return { date: 'Today', time: startTime };
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const diskCache = loadCache();
    const cachedGamesList = Object.values(diskCache).filter((g) => g && g.id && !isMockFixture(g) && !isGameExpired(g));

    const combinedMap = new Map<string, CommunityGame>();

    // 1. Fetch sessions from Supabase if available
    if (supabase && isSupabaseConfigured) {
      try {
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('*')
          .in('status', ['active', 'upcoming'])
          .order('start_time', { ascending: true });

        if (!error && Array.isArray(sessions)) {
          const sessionIds = sessions.map((s) => s.id).filter(Boolean);
          const venueIds = Array.from(new Set(sessions.map((s) => s.venue_id).filter(Boolean)));
          const hostIds = Array.from(new Set(sessions.map((s) => s.host_id).filter(Boolean)));

          const venuesMap = new Map<string, any>();
          const hostsMap = new Map<string, any>();
          const rostersMap = new Map<string, { id?: string; name: string; avatar: any }[]>();

          if (venueIds.length > 0) {
            try {
              const { data: vList } = await supabase.from('venues').select('id, name, city, address').in('id', venueIds);
              if (Array.isArray(vList)) vList.forEach((v) => venuesMap.set(v.id, v));
            } catch {}
          }

          if (hostIds.length > 0) {
            try {
              const { data: uList } = await supabase.from('users').select('id, full_name, nickname, avatar_url').in('id', hostIds);
              if (Array.isArray(uList)) uList.forEach((u) => hostsMap.set(u.id, u));
            } catch {}
          }

          if (sessionIds.length > 0) {
            try {
              const { data: qList } = await supabase
                .from('queues')
                .select('session_id, user_id, partner_names, user:users(id, full_name, nickname, avatar_url)')
                .in('session_id', sessionIds)
                .neq('status', 'cancelled');
              if (Array.isArray(qList)) {
                qList.forEach((q: any) => {
                  const list = rostersMap.get(q.session_id) || [];
                  const uName = q.user?.full_name || q.user?.nickname || (q.partner_names && q.partner_names[0]) || 'Player';
                  list.push({
                    id: q.user_id || q.user?.id,
                    name: uName,
                    avatar: q.user?.avatar_url || 'alex',
                  });
                  rostersMap.set(q.session_id, list);
                });
              }
            } catch {}

            try {
              const { data: pList } = await supabase
                .from('session_participants')
                .select('session_id, user_id, user_name, user_avatar')
                .in('session_id', sessionIds)
                .neq('status', 'cancelled');
              if (Array.isArray(pList)) {
                pList.forEach((p: any) => {
                  const list = rostersMap.get(p.session_id) || [];
                  const already = list.some((m) => (p.user_id && m.id === p.user_id) || m.name.toLowerCase() === (p.user_name || '').toLowerCase());
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
            } catch {}
          }

          sessions.forEach((s) => {
            if (isMockFixture(s)) return;
            const venue = s.venue_id ? venuesMap.get(s.venue_id) : undefined;
            const host = s.host_id ? hostsMap.get(s.host_id) : undefined;
            const hostTagMatch = s.description?.match(/\[HOST:(.*?)\]/i);
            const taggedHost = hostTagMatch ? hostTagMatch[1].trim() : '';

            const { date: fDate, time: fTime } = formatSessionDateTime(s.start_time);
            const members = rostersMap.get(s.id) || [];
            const spotsJoined = Math.min(s.max_players || 12, Math.max(members.length, s.current_players_count || 0));

            const resolvedLocation = s.location_details || venue?.name || 'Naga Sports Venue';
            const resolvedHostName = host?.full_name || host?.nickname || taggedHost || 'Match Organizer';
            const resolvedHostAvatar = host?.avatar_url || 'alex';

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
              locationDetails: s.location_details,
              distance: 'Naga City • 0.5 km away',
              hostId: s.host_id,
              hostName: resolvedHostName,
              hostAvatar: resolvedHostAvatar,
              spotsTotal: s.max_players || 12,
              spotsJoined,
              pricePerPlayer: Math.round((s.fee_cents || 0) / 100),
              notes: s.description || 'Verified SportSync match',
              isPublic: s.visibility ? s.visibility !== 'Invite' : true,
              visibility: (s.visibility as any) || 'Public',
              inviteCode: s.invite_code,
              members,
            };

            if (!isGameExpired(gameObj)) {
              combinedMap.set(s.id, gameObj);
              if (s.invite_code) combinedMap.set(s.invite_code.toUpperCase(), gameObj);
            }
          });
        }
      } catch (dbErr) {
        console.warn('[/api/games] Database query exception:', dbErr);
      }
    }

    // 2. Merge with disk cache games
    cachedGamesList.forEach((cg) => {
      if (!cg || !cg.id || isMockFixture(cg) || isGameExpired(cg)) return;
      const key = cg.sessionId || cg.id;
      if (!combinedMap.has(key)) {
        // Also check norm title
        const normTitle = cg.title.trim().toLowerCase();
        const existingWithTitle = Array.from(combinedMap.values()).find(
          (existing) => existing.title.trim().toLowerCase() === normTitle
        );
        if (!existingWithTitle) {
          combinedMap.set(key, cg);
        }
      }
    });

    const uniqueGames: CommunityGame[] = [];
    const seenFinalIds = new Set<string>();

    combinedMap.forEach((g) => {
      if (!seenFinalIds.has(g.id)) {
        seenFinalIds.add(g.id);
        uniqueGames.push(g);
      }
    });

    return NextResponse.json({ success: true, games: uniqueGames });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error fetching games';
    return NextResponse.json({ success: false, error: msg, games: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'create_game';
    const game = body.game as CommunityGame;

    if (!game) {
      return NextResponse.json({ success: false, error: 'Game data is required' }, { status: 400 });
    }

    if (!game.id) {
      game.id = 'cg_' + Math.random().toString(36).substring(2, 9);
    }
    if (!game.inviteCode) {
      game.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const supabase = getSupabase();
    const diskCache = loadCache();

    if (action === 'create_game') {
      let createdSession: any = null;

      if (supabase && isSupabaseConfigured) {
        try {
          // Resolve venue
          let venueId: string | null = null;
          const targetVenueId = (body.game as any)?.venueId || (game as any).venue_id;
          if (targetVenueId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetVenueId)) {
            venueId = targetVenueId;
          }
          if (!venueId && game.locationName) {
            const firstWord = game.locationName.trim().split(' ')[0];
            const { data: v } = await supabase.from('venues').select('id').ilike('name', `%${firstWord}%`).limit(1).maybeSingle();
            if (v?.id) venueId = v.id;
          }
          if (!venueId) {
            const { data: nagaV } = await supabase.from('venues').select('id').or('city.ilike.%naga%,name.ilike.%naga%').limit(1).maybeSingle();
            if (nagaV?.id) venueId = nagaV.id;
          }
          if (!venueId) {
            const { data: firstV } = await supabase.from('venues').select('id').limit(1).maybeSingle();
            if (firstV?.id) venueId = firstV.id;
          }

          // Resolve host
          let hostUserId: string | null = null;
          if (game.hostId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(game.hostId)) {
            const { data: u } = await supabase.from('users').select('id').eq('id', game.hostId).maybeSingle();
            if (u?.id) hostUserId = u.id;
          }
          if (!hostUserId && game.hostName) {
            const { data: u } = await supabase.from('users').select('id').ilike('full_name', `%${game.hostName.trim()}%`).limit(1).maybeSingle();
            if (u?.id) hostUserId = u.id;
          }

          const sLower = (game.sport || '').toLowerCase();
          const validSports = ['badminton', 'pickleball', 'basketball', 'padel', 'tennis', 'volleyball', 'football', 'billiards', 'darts', 'table_tennis'];
          const validSport = validSports.find((vs) => sLower.includes(vs)) || 'basketball';

          const now = new Date();
          let startYear = now.getFullYear();
          let startMonth = now.getMonth();
          let startDay = now.getDate();
          const dNorm = (game.date || '').trim().toLowerCase();
          if (dNorm === 'tomorrow') {
            const tom = new Date(now);
            tom.setDate(now.getDate() + 1);
            startYear = tom.getFullYear();
            startMonth = tom.getMonth();
            startDay = tom.getDate();
          } else if (dNorm && dNorm !== 'today') {
            const parsed = new Date(game.date);
            if (!isNaN(parsed.getTime())) {
              startYear = parsed.getFullYear();
              startMonth = parsed.getMonth();
              startDay = parsed.getDate();
            }
          }
          let startH = 18;
          let startM = 0;
          if (game.time) {
            const parts = game.time.trim().split(':');
            if (parts.length >= 2) {
              const ph = parseInt(parts[0], 10);
              const pm = parseInt(parts[1], 10);
              if (!isNaN(ph)) startH = ph;
              if (!isNaN(pm)) startM = pm;
            }
          }
          const startIso = new Date(startYear, startMonth, startDay, startH, startM, 0).toISOString();
          const endIso = new Date(new Date(startIso).getTime() + 2 * 60 * 60 * 1000).toISOString();

          if (venueId) {
            const { data: inserted, error: insertErr } = await supabase
              .from('sessions')
              .insert({
                venue_id: venueId,
                host_id: hostUserId,
                title: game.title,
                description: `${game.notes || 'Organized via SportSync Matchmaking'} [INVITE:${(game.inviteCode || '').toUpperCase()}] [HOST:${game.hostName || ''}]`,
                sport: validSport,
                session_type: 'open_play',
                allowed_formats: ['doubles', 'singles'],
                skill_level: game.skillLevel === 'Competitive' ? 'intermediate' : 'all_levels',
                court_ids: [],
                start_time: startIso,
                end_time: endIso,
                fee_cents: Math.round((game.pricePerPlayer || 0) * 100),
                max_players: Math.max(2, Math.min(24, game.spotsTotal || 10)),
                current_players_count: (game.members || []).length,
                rotation_format: game.format || '5v5',
                status: 'active',
                visibility: game.visibility || 'Public',
                invite_code: game.inviteCode ? game.inviteCode.trim().toUpperCase() : null,
                location_details: game.locationDetails || game.locationName || null,
              })
              .select('*')
              .single();

            if (inserted) {
              createdSession = inserted;
              game.id = inserted.id;
              game.sessionId = inserted.id;
            } else if (insertErr) {
              console.warn('[/api/games] Session insert error:', insertErr.message);
            }
          }
        } catch (dbEx) {
          console.warn('[/api/games] Exception during session creation:', dbEx);
        }
      }

      const finalGame: CommunityGame = {
        ...game,
        id: createdSession?.id || game.id,
        sessionId: createdSession?.id || game.sessionId || game.id,
        isPublic: game.visibility ? game.visibility !== 'Invite' : true,
        visibility: game.visibility || 'Public',
      };

      if (finalGame.inviteCode) {
        diskCache[finalGame.inviteCode.trim().toUpperCase()] = finalGame;
      }
      if (finalGame.id) {
        diskCache[finalGame.id.trim().toUpperCase()] = finalGame;
      }
      saveCache(diskCache);

      return NextResponse.json({ success: true, game: finalGame, session: createdSession });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error in POST /api/games';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
