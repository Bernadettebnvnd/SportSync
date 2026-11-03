import { Session, QueueEntry, MatchFormat } from '@/types';
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
        parsed.forEach((item: any) => {
          if (typeof item === 'string') {
            ids.add(item);
            titles.add(item.trim().toLowerCase());
          } else if (item && typeof item === 'object') {
            if (item.id) ids.add(item.id);
            if (item.title) titles.add(item.title.trim().toLowerCase());
          }
        });
      }
    }
  } catch {}
  return { ids, titles };
}

export function markSessionDeleted(sessionId: string, sessionTitle?: string) {
  if (typeof window === 'undefined') return;
  try {
    const existingRaw = localStorage.getItem('sportsync_deleted_session_ids');
    const existing: Array<{ id: string; title?: string }> = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [
      ...existing.filter((item) => (typeof item === 'string' ? item !== sessionId : item.id !== sessionId)),
      { id: sessionId, title: sessionTitle?.trim().toLowerCase() },
    ];
    localStorage.setItem('sportsync_deleted_session_ids', JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to mark session as deleted:', err);
  }
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
  if (s.id && (s.id.startsWith('sess_test_') || s.id.startsWith('session_test_') || ['cg1', 'cg2', 'cg3', 'cg4', 'cg5', 'cg6', 'cg7', 'cg8'].includes(s.id))) {
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

  const venueName = (s.venue?.name || '').toLowerCase();
  const mockVenues = [
    'the upper deck',
    'pickleball playground qc',
    'pickleball playground',
    'smash zone bgc',
    'padel club manila',
    'bgc turf',
    'kerry sports',
    'makati sports club',
    'spike zone',
    'star billiards',
  ];
  if (mockVenues.some((v) => venueName.includes(v))) return true;

  return false;
}

function getLocalStoredSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('sportsync_user_sessions');
    if (!raw) return [];
    const parsed: Session[] = JSON.parse(raw);
    const { ids, titles } = getDeletedSessionTombstones();
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();
    const deduped: Session[] = [];

    parsed.forEach((s) => {
      if (!s || !s.id || isMockSession(s)) return;
      const normTitle = s.title ? s.title.trim().toLowerCase() : '';
      if (!ids.has(s.id) && !titles.has(normTitle) && s.status !== 'cancelled' && !isSessionExpired(s) && !seenIds.has(s.id)) {
        seenIds.add(s.id);
        if (normTitle) seenTitles.add(normTitle);
        deduped.push(s);
      }
    });

    return deduped;
  } catch {
    return [];
  }
}

function saveLocalStoredSession(session: Session) {
  if (typeof window === 'undefined') return;
  try {
    const { ids, titles } = getDeletedSessionTombstones();
    const normTitle = session.title ? session.title.trim().toLowerCase() : '';
    if (ids.has(session.id) || (normTitle && titles.has(normTitle))) {
      return; // Do not save previously deleted session
    }
    const existing = getLocalStoredSessions();
    const updated = [
      session,
      ...existing.filter((s) => s.id !== session.id && (normTitle ? s.title.trim().toLowerCase() !== normTitle : true)),
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
  const { ids: deletedIds, titles: deletedTitles } = getDeletedSessionTombstones();

  const isSessionNotDeleted = (s: Session) =>
    !isMockSession(s) && !deletedIds.has(s.id) && !deletedTitles.has(s.title.trim().toLowerCase()) && s.status !== 'cancelled' && !isSessionExpired(s);

  if (!supabase || !isSupabaseConfigured) {
    const filtered = localSessions.filter(isSessionNotDeleted);
    return venueId ? filtered.filter((s) => s.venue_id === venueId) : filtered;
  }

  try {
    let query = supabase
      .from('sessions')
      .select('*, venue:venues(*), host:users(*), queues(*, user:users(*))')
      .in('status', ['active', 'upcoming']);

    if (venueId) {
      query = query.eq('venue_id', venueId);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) {
      console.warn('[Sessions] Query returned error, using local records:', error.message);
      const filtered = localSessions.filter(isSessionNotDeleted);
      return venueId ? filtered.filter((s) => s.venue_id === venueId) : filtered;
    }

    const dbSessions = ((data as Session[]) || []).filter(isSessionNotDeleted);
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();
    const combined: Session[] = [];

    dbSessions.forEach((s) => {
      if (!s || !s.id) return;
      const normTitle = s.title ? s.title.trim().toLowerCase() : '';
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id);
        if (normTitle) seenTitles.add(normTitle);
        combined.push(s);
      }
    });

    localSessions.forEach((ls) => {
      if (!ls || !ls.id) return;
      const normTitle = ls.title ? ls.title.trim().toLowerCase() : '';
      if (isSessionNotDeleted(ls) && !seenIds.has(ls.id) && (!normTitle || !seenTitles.has(normTitle))) {
        if (!venueId || ls.venue_id === venueId) {
          seenIds.add(ls.id);
          if (normTitle) seenTitles.add(normTitle);
          combined.push(ls);
        }
      }
    });

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
    .eq('auth_id', userData.user.id)
    .single();

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
 * Facility Owner / Host: Create an Open Play session to monetize unused courts.
 */
export async function createOpenPlaySession(
  sessionData: Omit<Session, 'id' | 'venue' | 'current_players_count'>
): Promise<Session | null> {
  const supabase = getSupabaseClient();

  const localId = generateUniqueSessionId();
  const localSession: Session = {
    id: localId,
    venue_id: sessionData.venue_id,
    host_id: sessionData.host_id,
    title: sessionData.title,
    description: sessionData.description,
    sport: sessionData.sport,
    session_type: 'open_play',
    allowed_formats: sessionData.allowed_formats,
    skill_level: sessionData.skill_level,
    court_ids: sessionData.court_ids,
    start_time: sessionData.start_time,
    end_time: sessionData.end_time,
    fee_cents: sessionData.fee_cents,
    max_players: sessionData.max_players,
    current_players_count: 0,
    rotation_format: sessionData.rotation_format,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveLocalStoredSession(localSession);

  if (!supabase || !isSupabaseConfigured) {
    return localSession;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error('You must be signed in to create an Open Play session.');
  }

  const { data: publicUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', userData.user.id)
    .single();

  const { data: newSession, error } = await supabase
    .from('sessions')
    .insert({
      venue_id: sessionData.venue_id,
      host_id: publicUser?.id || sessionData.host_id,
      title: sessionData.title,
      description: sessionData.description,
      sport: sessionData.sport,
      session_type: 'open_play',
      allowed_formats: sessionData.allowed_formats,
      skill_level: sessionData.skill_level,
      court_ids: sessionData.court_ids,
      start_time: sessionData.start_time,
      end_time: sessionData.end_time,
      fee_cents: sessionData.fee_cents,
      max_players: sessionData.max_players,
      current_players_count: 0,
      rotation_format: sessionData.rotation_format,
      status: 'active',
      visibility: sessionData.visibility || 'Public',
      invite_code: sessionData.invite_code,
      location_details: sessionData.location_details,
    })
    .select('*, venue:venues(*), host:users(*)')
    .single();

  if (error) {
    console.warn('Supabase create session fallback handled, returning local session:', error.message);
    return localSession;
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
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.sport !== undefined) dbUpdates.sport = updates.sport;
    if (updates.start_time !== undefined) dbUpdates.start_time = updates.start_time;
    if (updates.end_time !== undefined) dbUpdates.end_time = updates.end_time;
    if (updates.fee_cents !== undefined) dbUpdates.fee_cents = updates.fee_cents;
    if (updates.max_players !== undefined) dbUpdates.max_players = updates.max_players;
    if (updates.skill_level !== undefined) dbUpdates.skill_level = updates.skill_level;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('sessions')
      .update(dbUpdates)
      .eq('id', sessionId)
      .select('*, venue:venues(*), host:users(*), queues(*, user:users(*))')
      .single();

    if (error) {
      console.warn('[Sessions] Update session fallback handled:', error.message);
      return target ? ({ ...target, ...updates } as Session) : null;
    }

    if (data) {
      saveLocalStoredSession(data as Session);
      return data as Session;
    }
  } catch (err) {
    console.warn('[Sessions] Exception updating session:', err);
  }

  return target ? ({ ...target, ...updates } as Session) : null;
}

/**
 * Permanently delete or cancel an Open Play session and clean up related participation records.
 */
export async function deleteOpenPlaySession(
  sessionId: string,
  sessionTitle?: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  // 1. Mark in permanent tombstone storage to prevent resurrection
  markSessionDeleted(sessionId, sessionTitle);

  // 2. Remove from localStorage
  if (typeof window !== 'undefined') {
    try {
      const existing = getLocalStoredSessions();
      const normTitle = sessionTitle?.trim().toLowerCase();
      const updated = existing.filter((s) => {
        if (s.id === sessionId) return false;
        if (normTitle && s.title.trim().toLowerCase() === normTitle) return false;
        return true;
      });
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

    // 6. Delete session itself from database by id
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (error) {
      console.warn('[Sessions] Supabase delete session error, trying fallback:', error.message);
      if (sessionTitle) {
        await supabase.from('sessions').delete().eq('title', sessionTitle);
      }
      await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', sessionId);
    } else if (sessionTitle) {
      // Also ensure any matching session title is cleaned up
      await supabase.from('sessions').delete().eq('title', sessionTitle);
    }
    return true;
  } catch (err) {
    console.warn('[Sessions] Exception deleting session:', err);
    return true;
  }
}

