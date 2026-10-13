import { Session, QueueEntry, MatchFormat } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_SESSIONS } from '@/lib/mockData';

let hasLoggedSessionsNetworkWarning = false;

/**
 * Fetch active and upcoming Open Play sessions from Supabase.
 * Gracefully falls back to offline sessions cache if Supabase is unreachable.
 */
export async function getOpenPlaySessions(venueId?: string): Promise<Session[]> {
  const supabase = getSupabaseClient();
  const fallback = venueId ? INITIAL_SESSIONS.filter((s) => s.venue_id === venueId) : INITIAL_SESSIONS;

  if (!supabase || !isSupabaseConfigured) {
    return fallback;
  }

  try {
    let query = supabase
      .from('sessions')
      .select('*, venue:venues(*)')
      .in('status', ['active', 'upcoming']);

    if (venueId) {
      query = query.eq('venue_id', venueId);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) {
      if (!hasLoggedSessionsNetworkWarning) {
        hasLoggedSessionsNetworkWarning = true;
        console.warn('[Sessions] Live database unreachable. Using offline sessions cache.');
      }
      return fallback;
    }

    if (data && data.length > 0) {
      return (data as Session[]);
    }

    return fallback;
  } catch (err) {
    if (!hasLoggedSessionsNetworkWarning) {
      hasLoggedSessionsNetworkWarning = true;
      console.warn('[Sessions] Network query exception. Using offline sessions cache:', err);
    }
    return fallback;
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
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
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
      host_id: publicUser?.id,
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
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating open play session:', error);
    throw new Error(error.message || 'Failed to create session.');
  }

  return newSession as Session;
}
