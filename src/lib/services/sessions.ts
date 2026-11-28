import { Session, QueueEntry, MatchFormat, SportType, Venue, User, QueueStatus } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { isSessionExpired } from '@/lib/utils/gameExpiration';

export function getDeletedSessionTombstones(): { ids: Set<string>; titles: Set<string> } {
  const ids = new Set<string>();
  const titles = new Set<string>();
  if (typeof window === 'undefined') return { ids, titles };
  try {
    const raw = localStorage.getItem('sportsync_deleted_session_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: string | { id?: string }) => {
          if (typeof item === 'string') {
            ids.add(item);
          } else if (item && typeof item === 'object') {
            if (item.id) ids.add(item.id);
          }
        });
      }
    }
  } catch {}

  try {
    const rawGames = localStorage.getItem('sportsync_deleted_game_ids');
    if (rawGames) {
      const parsed = JSON.parse(rawGames);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: string | { id?: string; sessionId?: string }) => {
          if (typeof item === 'string') {
            ids.add(item);
          } else if (item && typeof item === 'object') {
            if (item.id) ids.add(item.id);
            if (item.sessionId) ids.add(item.sessionId);
          }
        });
      }
    }
  } catch {}

  return { ids, titles };
}

export function markSessionDeleted(sessionId: string, _sessionTitle?: string) {
  if (typeof window === 'undefined' || !sessionId) return;
  try {
    const existingRaw = localStorage.getItem('sportsync_deleted_session_ids');
    const existing: Array<{ id: string } | string> = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [
      ...existing.filter((item) => (typeof item === 'string' ? item !== sessionId : item.id !== sessionId)),
      { id: sessionId },
    ];
    localStorage.setItem('sportsync_deleted_session_ids', JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to mark session as deleted:', err);
  }
}

function isMissingColumnError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === '42703' ||
    err.code === 'PGRST204' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the')
  );
}

function extractMissingColumn(err: { message?: string } | null | undefined): string | null {
  if (!err || !err.message) return null;
  const match =
    err.message.match(/Could not find the '([^']+)' column/i) ||
    err.message.match(/column "?([^"\s]+)"? of relation/i) ||
    err.message.match(/column "?([^"\s]+)"? does not exist/i);
  return match ? match[1] : null;
}

/**
 * Generate a cryptographically strong, collision-free unique session ID.
 * Avoids timestamp-only collisions (e.g. session_1793605585154).
 */
export function generateUniqueSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `session_${crypto.randomUUID()}`;
  }
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const perfNow = typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000) : 0;
  return `session_${timestamp}_${perfNow}_${randomSuffix}`;
}

/**
 * Detects mock template sessions so they can be safely excluded from runtime feeds.
 */
export function isMockSession(s: Partial<Session> | null | undefined): boolean {
  if (!s) return true;
  if (
    s.id &&
    (s.id.startsWith('sess_test_') ||
      s.id.startsWith('session_test_') ||
      ['cg1', 'cg2', 'cg3', 'cg4', 'cg5', 'cg6', 'cg7', 'cg8'].includes(s.id))
  ) {
    return true;
  }
  const title = (s.title || '').toLowerCase();
  const mockTitles = [
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
  if (mockTitles.some((t) => title.includes(t))) return true;

  return false;
}

function getLocalStoredSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('sportsync_user_sessions');
    if (!raw) return [];
    const parsed: Session[] = JSON.parse(raw);
    const { ids } = getDeletedSessionTombstones();
    const seenIds = new Set<string>();
    const deduped: Session[] = [];

    parsed.forEach((s) => {
      if (!s || !s.id || isMockSession(s) || !s.host_id || s.host_id === 'host') return;
      if (!ids.has(s.id) && s.status !== 'cancelled' && !isSessionExpired(s) && !seenIds.has(s.id)) {
        seenIds.add(s.id);
        deduped.push(s);
      }
    });

    return deduped;
  } catch {
    return [];
  }
}

function saveLocalStoredSession(session: Session) {
  if (typeof window === 'undefined' || !session?.id) return;
  try {
    const { ids } = getDeletedSessionTombstones();
    if (ids.has(session.id)) {
      return; // Do not save previously deleted session
    }
    const existing = getLocalStoredSessions();
    const updated = [
      session,
      ...existing.filter((s) => s.id !== session.id),
    ];
    localStorage.setItem('sportsync_user_sessions', JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save session to localStorage:', err);
  }
}

/**
 * Fetch active and upcoming Open Play sessions from Supabase.
 * Returns only genuine database or user-created records — never fake mock data.
 * When no sessions exist, returns an empty array to trigger distinct empty states.
 */
export async function getOpenPlaySessions(venueId?: string): Promise<Session[]> {
  const supabase = getSupabaseClient();
  const localSessions = getLocalStoredSessions();
  const { ids: deletedIds } = getDeletedSessionTombstones();

  const isSessionNotDeleted = (s: Session) =>
    !isMockSession(s) && !deletedIds.has(s.id) && s.status !== 'cancelled';

  if (!supabase || !isSupabaseConfigured) {
    const filtered = localSessions.filter(isSessionNotDeleted);
    return venueId ? filtered.filter((s) => s.venue_id === venueId) : filtered;
  }

  try {
    // 1. Fetch base session columns without broken relationship joins
    let query = supabase
      .from('sessions')
      .select('*')
      .in('status', ['active', 'upcoming']);

    if (venueId) {
      query = query.eq('venue_id', venueId);
    }

    const { data: rawSessions, error } = await query.order('start_time', { ascending: true });

    if (error) {
      console.warn('[Sessions] Query returned error, using local records:', error.message);
      const filtered = localSessions.filter(isSessionNotDeleted);
      return venueId ? filtered.filter((s) => s.venue_id === venueId) : filtered;
    }

    // 2. Fetch venues and hosts cleanly in separate simple queries
    const venuesMap = new Map<string, Venue>();
    const usersMap = new Map<string, User>();
    const queuesMap = new Map<string, QueueEntry[]>();
    let usersQuerySucceeded = true;

    if (Array.isArray(rawSessions) && rawSessions.length > 0) {
      const sessionIds = Array.from(new Set(rawSessions.map((s) => s.id).filter(Boolean)));
      const venueIds = Array.from(new Set(rawSessions.map((s) => s.venue_id).filter(Boolean)));
      const hostIds = Array.from(new Set(rawSessions.map((s) => s.host_id).filter(Boolean)));

      if (sessionIds.length > 0) {
        try {
          const { data: queues } = await supabase
            .from('queues')
            .select('*, user:users(*)')
            .in('session_id', sessionIds)
            .neq('status', 'cancelled');
          if (Array.isArray(queues)) {
            queues.forEach((q: QueueEntry) => {
              const list = queuesMap.get(q.session_id) || [];
              list.push(q);
              queuesMap.set(q.session_id, list);
            });
          }
        } catch {}

        try {
          const { data: participants } = await supabase
            .from('session_participants')
            .select('*, user:users(*)')
            .in('session_id', sessionIds)
            .neq('status', 'cancelled');
          if (Array.isArray(participants)) {
            participants.forEach((p: {
              id: string;
              session_id: string;
              user_id?: string;
              user?: User;
              user_name?: string;
              name?: string;
              user_avatar?: string;
              avatar?: string;
              status?: QueueStatus;
              joined_at?: string;
            }) => {
              const list = queuesMap.get(p.session_id) || [];
              const alreadyInList = list.some(
                (existing: QueueEntry) =>
                  (p.user_id && (existing.user_id === p.user_id || existing.user?.id === p.user_id)) ||
                  (p.user?.full_name && existing.user?.full_name === p.user.full_name)
              );
              if (!alreadyInList) {
                list.push({
                  id: p.id,
                  session_id: p.session_id,
                  user_id: p.user_id || '',
                  queue_number: list.length + 1,
                  group_size: 1,
                  match_format: 'doubles',
                  partner_names: [],
                  needs_partner: false,
                  user: p.user || ({
                    id: p.user_id || '',
                    email: '',
                    full_name: p.user_name || p.name || 'Participant',
                    avatar_url: p.user_avatar || p.avatar || 'alex',
                    role: 'player',
                    created_at: p.joined_at || new Date().toISOString(),
                  } as User),
                  status: p.status || 'waiting',
                  estimated_wait_minutes: 0,
                  joined_at: p.joined_at || new Date().toISOString(),
                });
                queuesMap.set(p.session_id, list);
              }
            });
          }
        } catch {}
      }

      if (venueIds.length > 0) {
        try {
          const { data: venues } = await supabase.from('venues').select('*').in('id', venueIds);
          if (Array.isArray(venues)) {
            venues.forEach((v: Venue) => venuesMap.set(v.id, v));
          }
        } catch {}
      }

      if (hostIds.length > 0) {
        usersQuerySucceeded = false;
        try {
          const { data: users, error: usersErr } = await supabase.from('users').select('*').in('id', hostIds);
          if (!usersErr && Array.isArray(users)) {
            usersQuerySucceeded = true;
            users.forEach((u: User) => usersMap.set(u.id, u));
          }
        } catch {}
      }
    }

    const validRawSessions = (rawSessions || []).filter((s) => {
      if (!s || !s.host_id) return false;
      if (usersQuerySucceeded && !usersMap.has(s.host_id)) return false;
      return true;
    });

    const data = validRawSessions.map((s) => {
      const resolvedHost = usersMap.get(s.host_id);
      const locTagMatch = s.description?.match(/\[(?:LOCATION|LOC):(.*?)\]/i);
      const taggedLoc = locTagMatch ? locTagMatch[1].trim() : '';
      const isInvalidLoc = (val?: string | null) =>
        !val ||
        val.includes('Upper Deck') ||
        val.includes('Pasig') ||
        val.includes('Ortigas') ||
        val === 'Community / Open Court' ||
        val === 'Naga Sports Venue';

      const v = s.venue_id ? venuesMap.get(s.venue_id) : undefined;
      const vName = !isInvalidLoc(v?.name) ? v!.name : '';
      const cleanLocDetails = !isInvalidLoc(s.location_details) ? s.location_details : '';
      const cleanTagged = !isInvalidLoc(taggedLoc) ? taggedLoc : '';

      const resolvedLocation = cleanTagged || cleanLocDetails || vName || 'Metro Naga Sports Complex';

      return {
        ...s,
        location_details: cleanLocDetails || cleanTagged || resolvedLocation,
        venue: v,
        host: resolvedHost,
        queues: queuesMap.get(s.id) || [],
      };
    });

    const dbSessions = ((data as Session[]) || []).filter(isSessionNotDeleted);
    const seenIds = new Set<string>();
    const combined: Session[] = [];

    // Deduplicate strictly by canonical session ID
    dbSessions.forEach((s) => {
      if (!s || !s.id) return;
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id);
        combined.push(s);
      }
    });

    // Prune stale cached sessions in localStorage so deleted/orphaned hosts never resurrect
    if (!venueId && typeof window !== 'undefined') {
      try {
        localStorage.setItem('sportsync_user_sessions', JSON.stringify(combined));
      } catch {}
    }

    return combined;
  } catch (err) {
    console.warn('[Sessions] Exception querying sessions:', err);
    const filtered = localSessions.filter(isSessionNotDeleted);
    return venueId ? filtered.filter((s) => s.venue_id === venueId) : filtered;
  }
}

/**
 * Fetch live queues for a specific session.
 */
export async function getSessionQueues(sessionId: string): Promise<QueueEntry[]> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('queues')
      .select('*, user:users(*), court:courts(*)')
      .eq('session_id', sessionId)
      .in('status', ['waiting', 'warming_up', 'on_court'])
      .order('queue_number', { ascending: true });

    if (error) {
      console.error('Error fetching session queues:', error);
      return [];
    }

    return (data as QueueEntry[]) || [];
  } catch (err) {
    console.error('Failed to query queues:', err);
    return [];
  }
}

/**
 * Join an Open Play session queue with real database insertion.
 */
export async function joinSessionQueue(
  sessionId: string,
  partnerNames: string[] = [],
  matchFormat: MatchFormat = 'doubles',
  needsPartner = false
): Promise<QueueEntry | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error('You must be signed in to join an Open Play queue.');
  }

  const { data: publicUser } = await supabase
    .from('users')
    .select('id')
    .or(`id.eq.${userData.user.id},auth_id.eq.${userData.user.id}`)
    .limit(1)
    .maybeSingle();

  if (!publicUser) {
    throw new Error('User profile not found.');
  }

  // Determine current queue size
  const { count } = await supabase
    .from('queues')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  const nextQueueNumber = (count || 0) + 1;
  const estimatedWaitMinutes = Math.max(5, nextQueueNumber * 8);
  const groupSize = matchFormat === 'doubles' ? (partnerNames.length > 0 ? 2 : 1) : 1;

  const { data: newEntry, error } = await supabase
    .from('queues')
    .insert({
      session_id: sessionId,
      user_id: publicUser.id,
      queue_number: nextQueueNumber,
      group_size: groupSize,
      match_format: matchFormat,
      partner_names: partnerNames,
      needs_partner: needsPartner,
      status: 'waiting',
      estimated_wait_minutes: estimatedWaitMinutes,
    })
    .select('*, user:users(*)')
    .single();

  if (error) {
    console.error('Error joining queue:', error);
    throw new Error(error.message || 'Failed to join queue.');
  }

  // Increment session player count
  const { error: rpcError } = await supabase.rpc('increment_session_players', { s_id: sessionId, count_add: groupSize });
  if (rpcError) {
    await supabase
      .from('sessions')
      .update({ current_players_count: nextQueueNumber })
      .eq('id', sessionId);
  }

  return newEntry as QueueEntry;
}

/**
 * Facility Owner / Host: Create an Open Play session via the server-backed /api/games endpoint
 * or direct Supabase insert — never silently falling back to a fake localStorage-only game.
 */
export async function createOpenPlaySession(
  sessionData: Omit<Session, 'id' | 'venue' | 'current_players_count'>
): Promise<Session | null> {
  const supabase = getSupabaseClient();

  const validCourtUuids = (sessionData.court_ids || []).filter(
    (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );

  const sLower = (sessionData.sport || '').toLowerCase();
  const validSports = ['badminton', 'pickleball', 'basketball', 'padel', 'tennis', 'volleyball', 'football', 'billiards', 'darts', 'table_tennis'];
  const validSport = (validSports.find((vs) => sLower.includes(vs)) || 'basketball') as SportType;

  let startTimeIso = sessionData.start_time;
  if (!startTimeIso || (!startTimeIso.includes('T') && !startTimeIso.includes('-'))) {
    startTimeIso = new Date().toISOString();
  }
  let endTimeIso = sessionData.end_time;
  if (!endTimeIso || (!endTimeIso.includes('T') && !endTimeIso.includes('-'))) {
    const parsedStart = new Date(startTimeIso);
    endTimeIso = new Date(parsedStart.getTime() + 2 * 60 * 60 * 1000).toISOString();
  }

  // In the browser, delegate to POST /api/games which uses createAdminClient() and handles host/venue resolution safely
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_game',
        game: {
          venueId: sessionData.venue_id,
          hostId: sessionData.host_id,
          title: sessionData.title,
          sport: validSport,
          notes: sessionData.description,
          date: startTimeIso,
          time: startTimeIso,
          spotsTotal: sessionData.max_players,
          pricePerPlayer: Math.round((sessionData.fee_cents || 0) / 100),
          format: sessionData.rotation_format || '5v5',
          skillLevel: sessionData.skill_level === 'intermediate' || sessionData.skill_level === 'competitive' ? 'Competitive' : 'Casual',
          visibility: sessionData.visibility || 'Public',
          inviteCode: sessionData.invite_code,
          locationDetails: sessionData.location_details,
          locationName: sessionData.location_details,
        },
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.session?.id) {
      throw new Error(json?.error || 'Failed to create session on server.');
    }

    const createdSession = json.session as Session;
    saveLocalStoredSession(createdSession);
    return createdSession;
  }

  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  let validVenueId =
    sessionData.venue_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionData.venue_id)
      ? sessionData.venue_id
      : null;

  if (!validVenueId) {
    try {
      const { data: vRow } = await supabase.from('venues').select('id').limit(1).maybeSingle();
      if (vRow?.id) {
        validVenueId = vRow.id;
      }
    } catch {}
  }

  const validHostId =
    sessionData.host_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionData.host_id)
      ? sessionData.host_id
      : null;

  const extendedPayload: Record<string, unknown> = {
    venue_id: validVenueId,
    host_id: validHostId,
    title: sessionData.title,
    description: sessionData.description,
    sport: validSport,
    session_type: 'open_play',
    ...(sessionData.allowed_formats ? { allowed_formats: sessionData.allowed_formats } : {}),
    skill_level: sessionData.skill_level || 'all_levels',
    court_ids: validCourtUuids,
    start_time: startTimeIso,
    end_time: endTimeIso,
    ends_at: sessionData.ends_at ?? null,
    fee_cents: Math.round(Number(sessionData.fee_cents) || 0),
    max_players:
      sessionData.max_players === null
        ? null
        : Math.max(2, Math.min(24, Number(sessionData.max_players) || 10)),
    current_players_count: 0,
    rotation_format: sessionData.rotation_format || '5v5',
    status: 'active',
    visibility: sessionData.visibility || 'Public',
    invite_code: sessionData.invite_code ? sessionData.invite_code.trim().toUpperCase() : null,
    location_details: sessionData.location_details || null,
  };

  const activePayload = { ...extendedPayload };
  let { data: newSession, error } = await supabase
    .from('sessions')
    .insert(activePayload)
    .select('*')
    .single();

  while (error && isMissingColumnError(error)) {
    const missing = extractMissingColumn(error);
    if (missing && missing in activePayload) {
      delete activePayload[missing];
    } else {
      delete activePayload.allowed_formats;
      delete activePayload.visibility;
      delete activePayload.invite_code;
      delete activePayload.location_details;
      delete activePayload.court_ids;
      delete activePayload.rotation_format;
    }
    const retry = await supabase
      .from('sessions')
      .insert(activePayload)
      .select('*')
      .single();
    newSession = retry.data;
    error = retry.error;
    if (newSession || !isMissingColumnError(error)) break;
  }

  if (error || !newSession) {
    console.error('[Sessions] Session insert failed:', {
      code: error?.code,
      message: error?.message,
      details: error?.details,
    });
    throw new Error(error?.message || 'Failed to create Open Play session.');
  }

  const created = newSession as Session;
  saveLocalStoredSession(created);
  return created;
}

/**
 * Update an existing Open Play session in Supabase and localStorage.
 */
export async function updateOpenPlaySession(
  sessionId: string,
  updates: Partial<Session>
): Promise<Session | null> {
  const supabase = getSupabaseClient();
  const localSessions = getLocalStoredSessions();
  const target = localSessions.find((s) => s.id === sessionId);

  if (target) {
    const updated = { ...target, ...updates, updated_at: new Date().toISOString() };
    saveLocalStoredSession(updated);
  }

  if (!supabase || !isSupabaseConfigured) {
    return target ? ({ ...target, ...updates } as Session) : null;
  }

  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.sport !== undefined) dbUpdates.sport = updates.sport;
    if (updates.start_time !== undefined) dbUpdates.start_time = updates.start_time;
    if (updates.end_time !== undefined) dbUpdates.end_time = updates.end_time;
    if (updates.ends_at !== undefined) dbUpdates.ends_at = updates.ends_at;
    if (updates.fee_cents !== undefined) dbUpdates.fee_cents = updates.fee_cents;
    if (updates.max_players !== undefined) dbUpdates.max_players = updates.max_players;
    if (updates.skill_level !== undefined) dbUpdates.skill_level = updates.skill_level;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.location_details !== undefined) dbUpdates.location_details = updates.location_details;
    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('sessions')
      .update(dbUpdates)
      .eq('id', sessionId)
      .select('*')
      .single();

    if (error) {
      console.warn('[Sessions] Update session fallback handled:', error.message);
      return target ? ({ ...target, ...updates } as Session) : null;
    }

    if (data) {
      const enriched = { ...data, venue: target?.venue, host: target?.host } as Session;
      saveLocalStoredSession(enriched);
      return enriched;
    }
  } catch (err) {
    console.warn('[Sessions] Exception updating session:', err);
  }

  return target ? ({ ...target, ...updates } as Session) : null;
}

/**
 * Permanently delete or cancel an Open Play session by its canonical ID and clean up related participation records.
 */
export async function deleteOpenPlaySession(
  sessionId: string,
  _sessionTitle?: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  // 1. Mark canonical session ID in tombstone storage to prevent local resurrection
  markSessionDeleted(sessionId);

  // 2. Remove from localStorage strictly by ID
  if (typeof window !== 'undefined') {
    try {
      const existing = getLocalStoredSessions();
      const updated = existing.filter((s) => s.id !== sessionId);
      localStorage.setItem('sportsync_user_sessions', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to remove session from localStorage:', err);
    }
  }

  if (!supabase || !isSupabaseConfigured) {
    return true;
  }

  try {
    // 3. Clean up related participation / queues records to prevent orphaned data
    try {
      await supabase.from('queues').delete().eq('session_id', sessionId);
    } catch (e) {
      console.warn('[Sessions] Queues cleanup notice:', e);
    }

    // 4. Clean up related match records
    try {
      await supabase.from('matches').delete().eq('session_id', sessionId);
    } catch (e) {
      console.warn('[Sessions] Matches cleanup notice:', e);
    }

    // 5. Clean up related payment records
    try {
      await supabase.from('payments').delete().eq('session_id', sessionId);
    } catch (e) {
      console.warn('[Sessions] Payments cleanup notice:', e);
    }

    // 6. Delete session itself from database strictly by id (never by title)
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (error) {
      console.warn('[Sessions] Supabase delete session error, marking cancelled:', error.message);
      await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', sessionId);
    }
    return true;
  } catch (err) {
    console.warn('[Sessions] Exception deleting session:', err);
    return true;
  }
}
