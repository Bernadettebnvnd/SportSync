import { NextRequest, NextResponse } from 'next/server';
import { CommunityGame } from '@/mock/types';
import fs from 'fs';
import path from 'path';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';

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
  const admin = createAdminClient();
  if (admin) return admin;
  return createServerClient();
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
    const action = body.action as string | undefined;
    const participant = body.participant as { id?: string; name: string; avatar?: string; email?: string } | undefined;

    if (!game || !game.id) {
      return NextResponse.json({ success: false, error: 'Invalid game payload' }, { status: 400 });
    }

    const diskCache = loadCache();
    const supabase = getServerSupabaseClient();

    let dbSession: any = null;
    if (supabase) {
      const inviteKey = (game.inviteCode || body.inviteCode || '').trim().toUpperCase();
      if (inviteKey) {
        const { data: byCode } = await supabase
          .from('sessions')
          .select('id, max_players, current_players_count, host_id, visibility, invite_code')
          .eq('invite_code', inviteKey)
          .maybeSingle();
        if (byCode) dbSession = byCode;
      }
      if (!dbSession && (game.sessionId || (game.id && game.id.includes('-')))) {
        const sId = game.sessionId || game.id;
        const { data: byId } = await supabase
          .from('sessions')
          .select('id, max_players, current_players_count, host_id, visibility, invite_code')
          .eq('id', sId)
          .maybeSingle();
        if (byId) dbSession = byId;
      }
    }

    if (action === 'accept' && participant) {
      if (!supabase || !dbSession) {
        const updatedMembers = [
          ...(game.members || []),
          { id: participant.id || 'usr_' + Date.now(), name: participant.name, avatar: (participant.avatar as any) || 'alex' },
        ];
        const dedupedMap = new Map<string, any>();
        updatedMembers.forEach((m) => {
          const key = m.id || m.name;
          if (!dedupedMap.has(key)) dedupedMap.set(key, m);
        });
        const finalMembers = Array.from(dedupedMap.values());
        const updatedGame: CommunityGame = {
          ...game,
          spotsJoined: Math.min(game.spotsTotal, Math.max(game.spotsJoined + 1, finalMembers.length)),
          members: finalMembers,
        };
        if (game.inviteCode) {
          const inviteKey = game.inviteCode.trim().toUpperCase();
          diskCache[inviteKey] = updatedGame;
          memoryStore[inviteKey] = updatedGame;
        }
        if (game.id) {
          const idKey = game.id.trim().toUpperCase();
          diskCache[idKey] = updatedGame;
          memoryStore[idKey] = updatedGame;
        }
        saveCache(diskCache);
        return NextResponse.json({ success: true, game: updatedGame });
      }

      let participantUserId: string | null = null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participant.id || '');
      if (isUUID) {
        const { data: byId } = await supabase.from('users').select('id').eq('id', participant.id).maybeSingle();
        if (byId?.id) participantUserId = byId.id;
      }
      if (!participantUserId && participant.email) {
        const { data: byEmail } = await supabase.from('users').select('id').eq('email', participant.email).maybeSingle();
        if (byEmail?.id) participantUserId = byEmail.id;
      }
      if (!participantUserId && participant.name) {
        const { data: byName } = await supabase.from('users').select('id').ilike('full_name', participant.name.trim()).maybeSingle();
        if (byName?.id) participantUserId = byName.id;
      }

      if (!participantUserId) {
        const newProfile = {
          email: participant.email || `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@sportsync.ph`,
          full_name: participant.name || 'Invited Player',
          nickname: participant.name?.split(' ')[0] || 'Player',
          avatar_url: participant.avatar || 'alex',
          role: 'player' as const,
          onboarding_completed: true,
        };
        const { data: createdUser, error: createErr } = await supabase
          .from('users')
          .insert(newProfile)
          .select('id')
          .single();
        if (createErr) {
          return NextResponse.json({ success: false, error: 'Database write failed: ' + createErr.message }, { status: 500 });
        }
        participantUserId = createdUser?.id || null;
      }

      if (!participantUserId) {
        return NextResponse.json({ success: false, error: 'Database write failed: Could not resolve participant user profile.' }, { status: 500 });
      }

      const { count } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', dbSession.id);

      const nextQueueNumber = (count || 0) + 1;
      const { error: queueErr } = await supabase
        .from('queues')
        .upsert(
          {
            session_id: dbSession.id,
            user_id: participantUserId,
            queue_number: nextQueueNumber,
            group_size: 1,
            match_format: 'doubles',
            status: 'waiting',
            partner_names: [participant.name],
          },
          { onConflict: 'session_id,user_id' }
        );

      if (queueErr) {
        return NextResponse.json({ success: false, error: 'Database write failed: ' + queueErr.message }, { status: 500 });
      }

      const { count: activeQueueCount } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', dbSession.id)
        .neq('status', 'cancelled');

      const finalSpotsJoined = Math.min(dbSession.max_players || 10, (activeQueueCount || 0) + 1);

      await supabase
        .from('sessions')
        .update({
          current_players_count: finalSpotsJoined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dbSession.id);

      const updatedMembers = [
        ...(game.members || []),
        { id: participantUserId, name: participant.name, avatar: (participant.avatar as any) || 'alex' },
      ];
      const dedupedMap = new Map<string, any>();
      updatedMembers.forEach((m) => {
        const key = m.id || m.name;
        if (!dedupedMap.has(key)) dedupedMap.set(key, m);
      });
      const finalMembers = Array.from(dedupedMap.values());

      const updatedGame: CommunityGame = {
        ...game,
        sessionId: dbSession.id,
        spotsJoined: finalSpotsJoined,
        members: finalMembers,
      };

      if (game.inviteCode) {
        const inviteKey = game.inviteCode.trim().toUpperCase();
        diskCache[inviteKey] = updatedGame;
        memoryStore[inviteKey] = updatedGame;
      }
      if (game.id) {
        const idKey = game.id.trim().toUpperCase();
        diskCache[idKey] = updatedGame;
        memoryStore[idKey] = updatedGame;
      }
      saveCache(diskCache);

      return NextResponse.json({ success: true, game: updatedGame });
    }

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

    if (supabase && dbSession?.id) {
      try {
        await supabase
          .from('sessions')
          .update({
            current_players_count: game.spotsJoined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dbSession.id);
      } catch {}
    }

    return NextResponse.json({ success: true, game });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error processing invitation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
