import { NextRequest, NextResponse } from 'next/server';
import { CommunityGame } from '@/mock/types';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

const memoryStore: Record<string, CommunityGame> = loadCache();

function getServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('xyzcompany') || url.includes('placeholder')) {
    return null;
  }
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get('code') || searchParams.get('invite') || '').trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ success: false, error: 'Invite code is required' }, { status: 400 });
  }

  const diskCache = loadCache();
  const combined = { ...memoryStore, ...diskCache };

  const matched = combined[code] || Object.values(combined).find((g) => {
    if (!g) return false;
    const matchInvite = g.inviteCode && g.inviteCode.trim().toUpperCase() === code;
    const matchId = g.id && g.id.trim().toUpperCase() === code;
    return matchInvite || matchId;
  });

  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data: byCode } = await supabase
        .from('sessions')
        .select('*, venue:venues(*), host:users(*)')
        .eq('invite_code', code)
        .limit(1);

      let dbSession = byCode && byCode[0];

      if (!dbSession && matched?.sessionId) {
        const { data: bySessionId } = await supabase
          .from('sessions')
          .select('*, venue:venues(*), host:users(*)')
          .eq('id', matched.sessionId)
          .limit(1);
        dbSession = bySessionId && bySessionId[0];
      }

      if (!dbSession) {
        const { data: byDesc } = await supabase
          .from('sessions')
          .select('*, venue:venues(*), host:users(*)')
          .ilike('description', `%[INVITE:${code}]%`)
          .limit(1);
        dbSession = byDesc && byDesc[0];
      }

      if (dbSession) {
        let hostUser = dbSession.host;
        if (!hostUser && dbSession.host_id) {
          const { data: u } = await supabase
            .from('users')
            .select('*')
            .eq('id', dbSession.host_id)
            .maybeSingle();
          if (u) hostUser = u;
        }

        const hostName =
          hostUser?.full_name ||
          hostUser?.nickname ||
          matched?.hostName ||
          'Match Organizer';
        const hostAvatar = (hostUser?.avatar_url as any) || matched?.hostAvatar || 'alex';

        const { data: queueData } = await supabase
          .from('queues')
          .select('*, user:users(*)')
          .eq('session_id', dbSession.id)
          .neq('status', 'cancelled');

        const queueMembers = (queueData || []).map((q: any) => ({
          id: q.user_id,
          name: q.user?.full_name || q.user?.nickname || q.partner_names?.[0] || 'Player',
          avatar: (q.user?.avatar_url as any) || 'alex',
        }));

        const hostMember = {
          id: dbSession.host_id || matched?.hostId || 'organizer',
          name: hostName,
          avatar: hostAvatar,
        };

        const membersMap = new Map<string, { id?: string; name: string; avatar: any }>();
        membersMap.set(hostMember.id || hostMember.name, hostMember);

        queueMembers.forEach((m: any) => {
          const key = m.id || m.name;
          if (!membersMap.has(key)) {
            membersMap.set(key, m);
          }
        });

        if (matched?.members && Array.isArray(matched.members)) {
          matched.members.forEach((m) => {
            const key = m.id || m.name;
            if (!membersMap.has(key)) {
              membersMap.set(key, m);
            }
          });
        }

        const allMembers = Array.from(membersMap.values());
        const totalSpots = dbSession.max_players || matched?.spotsTotal || 10;
        const joinedCount = Math.min(
          totalSpots,
          Math.max(dbSession.current_players_count || 1, allMembers.length, matched?.spotsJoined || 1)
        );

        const mappedGame: CommunityGame = {
          id: dbSession.id,
          sessionId: dbSession.id,
          sport: (dbSession.sport ? dbSession.sport.charAt(0).toUpperCase() + dbSession.sport.slice(1) : matched?.sport || 'Pickleball') as any,
          title: dbSession.title || matched?.title || 'Community Match',
          format: (dbSession.rotation_format || matched?.format || '5v5') as any,
          skillLevel: dbSession.skill_level === 'all_levels' ? 'Casual' : 'Competitive',
          date: matched?.date || 'Upcoming',
          time: matched?.time || dbSession.start_time || '18:00',
          locationName: dbSession.venue?.name || matched?.locationName || 'Verified Court Facility',
          locationDetails: dbSession.location_details || matched?.locationDetails || undefined,
          distance: matched?.distance || '0.8 km away',
          hostId: dbSession.host_id || matched?.hostId,
          hostName,
          hostAvatar,
          spotsTotal: totalSpots,
          spotsJoined: joinedCount,
          pricePerPlayer: dbSession.fee_cents ? Math.round(dbSession.fee_cents / 100) : (matched?.pricePerPlayer || 0),
          notes: dbSession.description || matched?.notes || '',
          coordinates: matched?.coordinates,
          isPublic: dbSession.visibility ? dbSession.visibility !== 'Invite' : (matched?.isPublic ?? false),
          visibility: (dbSession.visibility as any) || matched?.visibility || 'Invite',
          inviteCode: code,
          members: allMembers,
        };

        diskCache[code] = mappedGame;
        memoryStore[code] = mappedGame;
        if (mappedGame.id) {
          diskCache[mappedGame.id.trim().toUpperCase()] = mappedGame;
          memoryStore[mappedGame.id.trim().toUpperCase()] = mappedGame;
        }
        saveCache(diskCache);
        return NextResponse.json({ success: true, game: mappedGame });
      }
    } catch {}
  }

  if (matched) {
    return NextResponse.json({ success: true, game: matched });
  }

  return NextResponse.json({ success: false, error: 'Invitation not found or expired' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const game = body.game as CommunityGame;

    if (!game || !game.id) {
      return NextResponse.json({ success: false, error: 'Invalid game payload' }, { status: 400 });
    }

    const diskCache = loadCache();

    if (game.inviteCode) {
      const inviteKey = game.inviteCode.trim().toUpperCase();
      diskCache[inviteKey] = game;
      memoryStore[inviteKey] = game;
    }

    if (game.id) {
      const idKey = game.id.trim().toUpperCase();
      diskCache[idKey] = game;
      memoryStore[idKey] = game;
    }

    saveCache(diskCache);

    const supabase = getServerSupabaseClient();
    if (supabase) {
      const sId = game.sessionId || (game.id && game.id.includes('-') ? game.id : undefined);
      if (sId) {
        try {
          await supabase
            .from('sessions')
            .update({
              current_players_count: game.spotsJoined,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sId);
        } catch {}
      }
    }

    return NextResponse.json({ success: true, game });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error processing invitation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
