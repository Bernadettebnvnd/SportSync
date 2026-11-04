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

function getServerSupabaseClient() {
  const admin = createAdminClient();
  if (admin) return admin;
  return createServerClient();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawCode = searchParams.get('code') || searchParams.get('invite');

  if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
  }

  const code = rawCode.trim().toUpperCase();
  const rawClean = rawCode.trim();

  const diskCache = loadCache();
  const combined = { ...memoryStore, ...diskCache };

  const matched = combined[code] || combined[rawClean] || Object.values(combined).find((g) => {
    if (!g) return false;
    const matchInvite = g.inviteCode && g.inviteCode.trim().toUpperCase() === code;
    const matchId = g.id && (g.id.trim().toUpperCase() === code || g.id === rawClean);
    return matchInvite || matchId;
  });

  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      let dbSession: any = null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawClean);

      // 1. Query base session by invite_code
      try {
        const { data: byCode } = await supabase
          .from('sessions')
          .select('*')
          .ilike('invite_code', rawClean)
          .limit(1)
          .maybeSingle();
        if (byCode) dbSession = byCode;
      } catch {}

      if (!dbSession && code !== rawClean) {
        try {
          const { data: byCodeUpper } = await supabase
            .from('sessions')
            .select('*')
            .eq('invite_code', code)
            .limit(1)
            .maybeSingle();
          if (byCodeUpper) dbSession = byCodeUpper;
        } catch {}
      }

      // 2. Query by sessionId if matched has it
      if (!dbSession && matched?.sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matched.sessionId)) {
        try {
          const { data: bySessionId } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', matched.sessionId)
            .maybeSingle();
          if (bySessionId) dbSession = bySessionId;
        } catch {}
      }

      // 3. Query by UUID id if code is valid UUID
      if (!dbSession && isUuid) {
        try {
          const { data: byId } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', rawClean)
            .maybeSingle();
          if (byId) dbSession = byId;
        } catch {}
      }

      // 4. Query invitations table if it exists
      if (!dbSession) {
        try {
          const { data: invRow } = await supabase
            .from('invitations')
            .select('*')
            .or(`invite_code.eq.${code},code.eq.${code},id.eq.${rawClean}`)
            .limit(1)
            .maybeSingle();

          if (invRow) {
            const isExpired = invRow.expires_at && new Date(invRow.expires_at) < new Date();
            if (invRow.status === 'revoked' || invRow.status === 'expired' || isExpired) {
              return NextResponse.json({ success: false, error: 'Invitation No Longer Valid.', invitationStatus: invRow.status || 'expired' }, { status: 410 });
            }
            if (invRow.session_id) {
              const { data: fromInv } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', invRow.session_id)
                .maybeSingle();
              if (fromInv) dbSession = fromInv;
            } else {
              dbSession = invRow;
            }
          }
        } catch {}
      }

      // 5. Query by description tag
      if (!dbSession) {
        try {
          const { data: byDesc } = await supabase
            .from('sessions')
            .select('*')
            .ilike('description', `%${rawClean}%`)
            .limit(1)
            .maybeSingle();
          if (byDesc) dbSession = byDesc;
        } catch {}
      }

      if (dbSession) {
        if (dbSession.status === 'cancelled') {
          delete diskCache[code];
          delete memoryStore[code];
          if (dbSession.id) {
            delete diskCache[dbSession.id.trim().toUpperCase()];
            delete memoryStore[dbSession.id.trim().toUpperCase()];
          }
          saveCache(diskCache);
          return NextResponse.json({ success: false, error: 'Event No Longer Available', deleted: true }, { status: 410 });
        }

        let hostUser: any = null;
        if (dbSession.host_id) {
          try {
            const { data: u } = await supabase
              .from('users')
              .select('*')
              .eq('id', dbSession.host_id)
              .maybeSingle();
            if (u) hostUser = u;
          } catch {}
        }

        let venueData: any = null;
        if (dbSession.venue_id) {
          try {
            const { data: v } = await supabase
              .from('venues')
              .select('*')
              .eq('id', dbSession.venue_id)
              .maybeSingle();
            if (v) venueData = v;
          } catch {}
        }

        const hostName =
          hostUser?.full_name ||
          hostUser?.nickname ||
          matched?.hostName ||
          'Match Organizer';
        const hostAvatar = (hostUser?.avatar_url as any) || matched?.hostAvatar || 'alex';

        let queueMembers: Array<{ id?: string; name: string; avatar: any }> = [];
        try {
          const { data: queueData } = await supabase
            .from('queues')
            .select('*, user:users(*)')
            .eq('session_id', dbSession.id)
            .neq('status', 'cancelled');

          if (Array.isArray(queueData)) {
            queueMembers = queueData.map((q: any) => ({
              id: q.user_id || q.id,
              name: q.user?.full_name || q.user?.nickname || (q.partner_names && q.partner_names[0]) || 'Player',
              avatar: (q.user?.avatar_url as any) || 'alex',
            }));
          }
        } catch {}

        if (queueMembers.length === 0) {
          try {
            const { data: partData } = await supabase
              .from('session_participants')
              .select('*')
              .eq('session_id', dbSession.id);
            if (Array.isArray(partData) && partData.length > 0) {
              queueMembers = partData.map((p: any) => ({
                id: p.user_id,
                name: p.user_name || p.name || 'Player',
                avatar: p.user_avatar || p.avatar || 'alex',
              }));
            }
          } catch {}
        }

        const membersMap = new Map<string, { id?: string; name: string; avatar: any }>();
        queueMembers.forEach((m: any) => {
          const key = m.id || m.name;
          if (!membersMap.has(key)) {
            membersMap.set(key, m);
          }
        });

        const allMembers = Array.from(membersMap.values());
        const totalSpots = dbSession.max_players || matched?.spotsTotal || 10;
        const joinedCount = allMembers.length;

        if (dbSession.current_players_count !== joinedCount) {
          try {
            await supabase
              .from('sessions')
              .update({ current_players_count: joinedCount, updated_at: new Date().toISOString() })
              .eq('id', dbSession.id);
          } catch {}
        }

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
          status: (dbSession.status || matched?.status || 'upcoming') as any,
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
        return NextResponse.json({ success: true, session: dbSession, game: mappedGame });
      }
    } catch {}
  }

  if (matched) {
    if ((matched as any).status === 'cancelled') {
      delete diskCache[code];
      delete memoryStore[code];
      saveCache(diskCache);
      return NextResponse.json({ success: false, error: 'Event No Longer Available', deleted: true }, { status: 410 });
    }
    return NextResponse.json({ success: true, session: matched, game: matched });
  }

  return NextResponse.json({ success: false, error: 'Invitation Not Found', notFound: true }, { status: 404 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const game = body.game as CommunityGame;
    const action = body.action as string | undefined;
    const participant = body.participant as { id?: string; name: string; avatar?: string; email?: string } | undefined;

    if (action === 'delete_game') {
      const gId = (body.gameId || body.game?.id || '').trim().toUpperCase();
      const sId = (body.sessionId || body.game?.sessionId || '').trim().toUpperCase();
      const invCode = (body.inviteCode || body.game?.inviteCode || '').trim().toUpperCase();

      const diskCache = loadCache();
      [gId, sId, invCode].filter(Boolean).forEach((k) => {
        delete diskCache[k];
        delete memoryStore[k];
      });
      saveCache(diskCache);

      const supabase = getServerSupabaseClient();
      if (supabase && (sId || gId)) {
        const idToDelete = sId || gId;
        try {
          await supabase.from('queues').delete().eq('session_id', idToDelete);
          await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', idToDelete);
          await supabase.from('sessions').delete().eq('id', idToDelete);
        } catch {}
      }

      return NextResponse.json({ success: true, deleted: true });
    }

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
          .select('*')
          .ilike('invite_code', inviteKey)
          .maybeSingle();
        if (byCode) dbSession = byCode;
      }
      if (!dbSession && (game.sessionId || (game.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(game.id)))) {
        const sId = game.sessionId || game.id;
        const { data: byId } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sId)
          .maybeSingle();
        if (byId) dbSession = byId;
      }

      if (!dbSession && (action === 'create_game' || !action)) {
        let venueId: string | null = null;
        const targetVenueId = body.game?.venueId || (game as any).venue_id || (game as any).venueId;
        if (targetVenueId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetVenueId)) {
          venueId = targetVenueId;
        }
        if (!venueId && game.locationName) {
          try {
            const firstWord = game.locationName.trim().split(' ')[0];
            const { data: v } = await supabase
              .from('venues')
              .select('id')
              .ilike('name', `%${firstWord}%`)
              .limit(1)
              .maybeSingle();
            if (v?.id) venueId = v.id;
          } catch {}
        }
        if (!venueId) {
          try {
            const { data: firstV } = await supabase.from('venues').select('id').limit(1).maybeSingle();
            if (firstV?.id) venueId = firstV.id;
          } catch {}
        }

        let hostUserId: string | null = null;
        if (game.hostId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(game.hostId)) {
          try {
            const { data: u } = await supabase.from('users').select('id').or(`id.eq.${game.hostId},auth_id.eq.${game.hostId}`).limit(1).maybeSingle();
            if (u?.id) hostUserId = u.id;
          } catch {}
        }
        if (!hostUserId && game.hostName) {
          try {
            const { data: u } = await supabase.from('users').select('id').ilike('full_name', `%${game.hostName}%`).limit(1).maybeSingle();
            if (u?.id) hostUserId = u.id;
          } catch {}
        }

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

        if (venueId) {
          try {
            const { data: inserted } = await supabase
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
                max_players: game.spotsTotal || 10,
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
              dbSession = inserted;
              game.id = inserted.id;
              game.sessionId = inserted.id;
            }
          } catch {}
        }
      }
    }

    if (action === 'accept' && participant) {
      // Check invite-only game authorization
      const isInviteOnly = (dbSession?.visibility === 'Invite') || (game.visibility === 'Invite');
      if (isInviteOnly) {
        const pName = (participant.name || '').trim().toLowerCase();
        const pId = participant.id;
        const isHost = Boolean(
          (dbSession?.host_id && pId && dbSession.host_id === pId) ||
          (game.hostId && pId && game.hostId === pId) ||
          (game.hostName && pName && game.hostName.trim().toLowerCase() === pName)
        );
        const isDirectlyInvited = Boolean(
          game.invitedPlayers?.some(
            (ip) =>
              (ip.name && pName && ip.name.trim().toLowerCase() === pName) ||
              (ip.id && pId && ip.id === pId)
          )
        );
        const providedCode = (body.inviteCode || game.inviteCode || '').trim().toUpperCase();
        const actualCode = (dbSession?.invite_code || game.inviteCode || '').trim().toUpperCase();
        const hasValidCode = Boolean(providedCode && actualCode && providedCode === actualCode);

        if (!isHost && !isDirectlyInvited && !hasValidCode) {
          return NextResponse.json(
            {
              success: false,
              error: 'This is an invite-only game. You can only join if the host has invited you.',
              message: 'This is an invite-only game. You can only join if the host has invited you.',
            },
            { status: 403 }
          );
        }
      }

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

      const nowIso = new Date().toISOString();
      let rosterRecorded = false;

      // 1. Try session_participants table with required columns (session_id, user_id, status, joined_at)
      try {
        const { error: partErr } = await supabase
          .from('session_participants')
          .insert({
            session_id: dbSession.id,
            user_id: participantUserId,
            status: 'joined',
            joined_at: nowIso,
          });

        if (!partErr || partErr.code === '23505' || partErr.message?.toLowerCase().includes('duplicate') || partErr.message?.toLowerCase().includes('unique')) {
          rosterRecorded = true;
        }
      } catch {}

      // 2. Try game_rosters table with required columns (session_id, user_id, status, joined_at)
      if (!rosterRecorded) {
        try {
          const { error: rosterErr } = await supabase
            .from('game_rosters')
            .insert({
              session_id: dbSession.id,
              user_id: participantUserId,
              status: 'joined',
              joined_at: nowIso,
            });

          if (!rosterErr || rosterErr.code === '23505' || rosterErr.message?.toLowerCase().includes('duplicate') || rosterErr.message?.toLowerCase().includes('unique')) {
            rosterRecorded = true;
          }
        } catch {}
      }

      // 3. Try queues table
      if (!rosterRecorded) {
        try {
          const { count } = await supabase
            .from('queues')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', dbSession.id);

          const nextQueueNumber = (count || 0) + 1;
          const { error: queueErr } = await supabase.from('queues').insert({
            session_id: dbSession.id,
            user_id: participantUserId,
            queue_number: nextQueueNumber,
            group_size: 1,
            match_format: 'doubles',
            status: 'waiting',
            partner_names: [participant.name],
            joined_at: nowIso,
          });

          if (!queueErr || queueErr.code === '23505' || queueErr.message?.toLowerCase().includes('duplicate') || queueErr.message?.toLowerCase().includes('unique') || queueErr.message?.toLowerCase().includes('already exists')) {
            rosterRecorded = true;
          }
        } catch {}
      }

      let activeCount = 0;
      try {
        const { count: c } = await supabase
          .from('queues')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', dbSession.id)
          .neq('status', 'cancelled');
        activeCount = c || 0;
      } catch {}

      const finalSpotsJoined = Math.min(dbSession.max_players || 10, activeCount || 0);

      try {
        await supabase
          .from('sessions')
          .update({
            current_players_count: finalSpotsJoined,
            updated_at: nowIso,
          })
          .eq('id', dbSession.id);
      } catch {}

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

    if (action === 'remove_participant') {
      const participantId = body.participantId as string | undefined;
      const participantName = (body.participantName as string | undefined || '').trim();
      const hostId = body.hostId as string | undefined;
      const hostName = (body.hostName as string | undefined || '').trim().toLowerCase();

      if (!participantId && !participantName) {
        return NextResponse.json({ success: false, error: 'Participant identification required.' }, { status: 400 });
      }

      if (dbSession && supabase) {
        const { data: hostUser } = await supabase
          .from('users')
          .select('id, auth_id, full_name')
          .eq('id', dbSession.host_id)
          .maybeSingle();

        const isRequesterHost = Boolean(
          (hostId && dbSession.host_id === hostId) ||
          (hostId && hostUser?.auth_id && hostUser.auth_id === hostId) ||
          (hostName && hostUser?.full_name && hostUser.full_name.trim().toLowerCase() === hostName) ||
          (hostName && game.hostName && game.hostName.trim().toLowerCase() === hostName)
        );

        if (!isRequesterHost) {
          return NextResponse.json({ success: false, error: 'Unauthorized: Only the match organizer can remove players.' }, { status: 403 });
        }

        const isRemovingHost = Boolean(
          (participantId && dbSession.host_id === participantId) ||
          (participantId && hostUser?.auth_id && hostUser.auth_id === participantId) ||
          (participantName && hostUser?.full_name && hostUser.full_name.trim().toLowerCase() === participantName.toLowerCase()) ||
          (participantName && game.hostName && game.hostName.trim().toLowerCase() === participantName.toLowerCase())
        );
        if (isRemovingHost) {
          return NextResponse.json({ success: false, error: 'Cannot remove the match organizer from the lineup.' }, { status: 400 });
        }

        let queueIdToDelete: string | null = null;
        if (participantId) {
          const { data: qById } = await supabase
            .from('queues')
            .select('id')
            .eq('session_id', dbSession.id)
            .eq('user_id', participantId)
            .maybeSingle();
          if (qById?.id) queueIdToDelete = qById.id;
        }

        if (!queueIdToDelete && participantName) {
          const { data: allQueues } = await supabase
            .from('queues')
            .select('id, user_id, partner_names, user:users(id, full_name, nickname)')
            .eq('session_id', dbSession.id);

          const matched = (allQueues || []).find((q: any) => {
            const uName = q.user?.full_name || q.user?.nickname || (q.partner_names && q.partner_names[0]);
            return uName && uName.trim().toLowerCase() === participantName.toLowerCase();
          });
          if (matched?.id) queueIdToDelete = matched.id;
        }

        if (queueIdToDelete) {
          await supabase.from('queues').delete().eq('id', queueIdToDelete);
        }

        const { count: activeQueueCount } = await supabase
          .from('queues')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', dbSession.id)
          .neq('status', 'cancelled');

        const nextSpots = activeQueueCount || 0;
        await supabase
          .from('sessions')
          .update({
            current_players_count: nextSpots,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dbSession.id);

        const updatedMembers = (game.members || []).filter((m) => {
          if (participantId && m.id && m.id === participantId) return false;
          if (participantName && m.name && m.name.trim().toLowerCase() === participantName.toLowerCase()) return false;
          return true;
        });

        const updatedGame: CommunityGame = {
          ...game,
          sessionId: dbSession.id,
          spotsJoined: nextSpots,
          members: updatedMembers,
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

        return NextResponse.json({ success: true, game: updatedGame, spotsJoined: nextSpots });
      }

      const updatedMembers = (game.members || []).filter((m) => {
        if (participantId && m.id && m.id === participantId) return false;
        if (participantName && m.name && m.name.trim().toLowerCase() === participantName.toLowerCase()) return false;
        return true;
      });

      const nextSpots = updatedMembers.length;
      const updatedGame: CommunityGame = {
        ...game,
        spotsJoined: nextSpots,
        members: updatedMembers,
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

      return NextResponse.json({ success: true, game: updatedGame, spotsJoined: nextSpots });
    }

    if (action === 'toggle_host_participation') {
      const hostId = body.hostId as string | undefined;
      const hostName = (body.hostName as string | undefined || '').trim();
      const hostAvatar = body.hostAvatar || 'alex';
      const participate = Boolean(body.participate);

      if (dbSession && supabase) {
        let hostUserId: string | null = null;
        if (dbSession.host_id) {
          hostUserId = dbSession.host_id;
        } else if (hostId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hostId)) {
          hostUserId = hostId;
        } else if (hostName) {
          const { data: u } = await supabase.from('users').select('id').ilike('full_name', hostName).maybeSingle();
          if (u?.id) hostUserId = u.id;
        }

        if (participate) {
          const { count: currentActive } = await supabase
            .from('queues')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', dbSession.id)
            .neq('status', 'cancelled');

          if ((currentActive || 0) >= (dbSession.max_players || 10)) {
            return NextResponse.json({ success: false, error: 'Cannot join lineup: Match roster is already full.' }, { status: 400 });
          }

          if (hostUserId) {
            await supabase
              .from('queues')
              .upsert(
                {
                  session_id: dbSession.id,
                  user_id: hostUserId,
                  queue_number: (currentActive || 0) + 1,
                  group_size: 1,
                  match_format: 'doubles',
                  status: 'waiting',
                  partner_names: [hostName || 'Organizer'],
                },
                { onConflict: 'session_id,user_id' }
              );
          }
        } else {
          if (hostUserId) {
            await supabase
              .from('queues')
              .delete()
              .eq('session_id', dbSession.id)
              .eq('user_id', hostUserId);
          } else if (hostName) {
            const { data: qList } = await supabase
              .from('queues')
              .select('id, user:users(full_name), partner_names')
              .eq('session_id', dbSession.id);
            const hostQueue = (qList || []).find((q: any) =>
              (q.partner_names && q.partner_names[0]?.trim().toLowerCase() === hostName.toLowerCase()) ||
              (q.user?.full_name?.trim().toLowerCase() === hostName.toLowerCase())
            );
            if (hostQueue?.id) {
              await supabase.from('queues').delete().eq('id', hostQueue.id);
            }
          }
        }

        const { count: finalQueueCount } = await supabase
          .from('queues')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', dbSession.id)
          .neq('status', 'cancelled');

        const finalSpots = finalQueueCount || 0;
        await supabase
          .from('sessions')
          .update({
            current_players_count: finalSpots,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dbSession.id);

        let updatedMembers: { id?: string; name: string; avatar: any }[] = [];
        if (participate) {
          const hostEntry = {
            id: hostUserId || hostId || 'organizer',
            name: hostName || 'Organizer',
            avatar: hostAvatar,
          };
          const existing = (game.members || []).filter(
            (m) => (hostUserId ? m.id !== hostUserId : m.name.trim().toLowerCase() !== hostName.toLowerCase())
          );
          updatedMembers = [hostEntry, ...existing];
        } else {
          updatedMembers = (game.members || []).filter((m) => {
            if (hostUserId && m.id && m.id === hostUserId) return false;
            if (hostName && m.name && m.name.trim().toLowerCase() === hostName.toLowerCase()) return false;
            return true;
          });
        }

        const updatedGame: CommunityGame = {
          ...game,
          sessionId: dbSession.id,
          spotsJoined: updatedMembers.length,
          members: updatedMembers,
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

        return NextResponse.json({ success: true, game: updatedGame, spotsJoined: updatedMembers.length, isParticipating: participate });
      }

      let updatedMembers: { id?: string; name: string; avatar: any }[] = [];
      if (participate) {
        const hostEntry = {
          id: hostId || 'organizer',
          name: hostName || 'Organizer',
          avatar: hostAvatar,
        };
        const existing = (game.members || []).filter(
          (m) => (hostId ? m.id !== hostId : m.name.trim().toLowerCase() !== hostName.toLowerCase())
        );
        updatedMembers = [hostEntry, ...existing];
      } else {
        updatedMembers = (game.members || []).filter((m) => {
          if (hostId && m.id && m.id === hostId) return false;
          if (hostName && m.name && m.name.trim().toLowerCase() === hostName.toLowerCase()) return false;
          return true;
        });
      }

      const updatedGame: CommunityGame = {
        ...game,
        spotsJoined: updatedMembers.length,
        members: updatedMembers,
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

      return NextResponse.json({ success: true, game: updatedGame, spotsJoined: updatedMembers.length, isParticipating: participate });
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

    return NextResponse.json({ success: true, game, session: dbSession });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error processing invitation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
