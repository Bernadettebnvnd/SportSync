import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { ChatMessage } from '@/design-system/components/ChatBubble';
import { AvatarId } from '@/illustrations/Avatars';

export interface GameParticipant {
  id?: string;
  user_id?: string;
  name: string;
  avatar: AvatarId;
  role: 'host' | 'player';
  status?: string;
  joined_at?: string;
}

/**
 * Fetch actual messages for a specific game from Supabase.
 * Strictly separates chat messages by gameId.
 */
export async function fetchGameChatMessages(gameId: string): Promise<ChatMessage[]> {
  if (!gameId) return [];
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('game_chat_messages')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        return data.map((row: any) => ({
          id: row.id,
          senderName: row.sender_name,
          avatarId: (row.sender_avatar as AvatarId) || 'alex',
          text: row.message_text,
          time: formatMessageTime(row.created_at),
          isMe: false, // will be evaluated by caller against currentUserName/Id
        }));
      }
    } catch (err) {
      console.warn('[ChatService] Error querying Supabase messages:', err);
    }
  }

  // Fallback to Next.js API route
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(gameId)}/chat`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.messages)) {
          return json.messages;
        }
      }
    } catch {}
  }

  // Fallback to local cache for offline resiliency
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`sportsync_chat_${gameId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }

  return [];
}

/**
 * Send and persist a real chat message to Supabase.
 */
export async function sendGameChatMessage(
  gameId: string,
  messageText: string,
  sender: {
    id?: string;
    name: string;
    avatarId?: AvatarId;
  }
): Promise<{ success: boolean; message?: ChatMessage; error?: string }> {
  if (!gameId || !messageText.trim()) {
    return { success: false, error: 'Message text and game ID are required.' };
  }

  const supabase = getSupabaseClient();
  const avatar = sender.avatarId || 'alex';
  const senderName = sender.name || 'Player';
  const cleanText = messageText.trim();

  // Try direct Supabase insertion
  if (supabase && isSupabaseConfigured) {
    try {
      // Resolve UUID sender_id if available
      let senderUuid: string | null = null;
      if (sender.id && sender.id.includes('-') && !sender.id.startsWith('usr_')) {
        senderUuid = sender.id;
      } else {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          const { data: pubUser } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', authData.user.id)
            .maybeSingle();
          if (pubUser?.id) senderUuid = pubUser.id;
        }
      }

      const { data, error } = await supabase
        .from('game_chat_messages')
        .insert({
          game_id: gameId,
          sender_id: senderUuid,
          sender_name: senderName,
          sender_avatar: avatar,
          message_text: cleanText,
        })
        .select()
        .single();

      if (!error && data) {
        const formatted: ChatMessage = {
          id: data.id,
          senderName: data.sender_name,
          avatarId: (data.sender_avatar as AvatarId) || avatar,
          text: data.message_text,
          time: formatMessageTime(data.created_at),
          isMe: true,
        };
        cacheLocalMessage(gameId, formatted);
        return { success: true, message: formatted };
      }
    } catch (err) {
      console.warn('[ChatService] Direct insert failed, trying API fallback:', err);
    }
  }

  // Fallback to Next.js API route
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(gameId)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          senderId: sender.id,
          senderName,
          senderAvatar: avatar,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.message) {
          cacheLocalMessage(gameId, json.message);
          return { success: true, message: json.message };
        }
      }
    } catch (err) {
      console.warn('[ChatService] API message fallback error:', err);
    }
  }

  // Offline / Local save
  const localMsg: ChatMessage = {
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `msg_${crypto.randomUUID()}`
      : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    senderName,
    avatarId: avatar,
    text: cleanText,
    time: 'Just now',
    isMe: true,
  };
  cacheLocalMessage(gameId, localMsg);
  return { success: true, message: localMsg };
}

/**
 * Subscribe to real-time chat messages for a specific game in Supabase.
 */
export function subscribeToGameChat(
  gameId: string,
  onNewMessage: (msg: ChatMessage) => void
): () => void {
  if (!gameId) return () => {};
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) return () => {};

  try {
    const channelName = `game_chat_${gameId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_chat_messages',
          filter: `game_id=eq.${gameId}`,
        },
        (payload: any) => {
          if (payload?.new) {
            const row = payload.new;
            const formatted: ChatMessage = {
              id: row.id,
              senderName: row.sender_name,
              avatarId: (row.sender_avatar as AvatarId) || 'alex',
              text: row.message_text,
              time: formatMessageTime(row.created_at),
              isMe: false,
            };
            onNewMessage(formatted);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[ChatService] Realtime subscription error:', err);
    return () => {};
  }
}

/**
 * Fetch actual roster participants from Supabase for a game.
 */
export async function fetchGameParticipants(gameId: string): Promise<GameParticipant[]> {
  if (!gameId) return [];
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseConfigured) {
    try {
      let { data, error } = await supabase
        .from('game_participants')
        .select('*, user:users(*)')
        .eq('game_id', gameId)
        .neq('status', 'left')
        .order('joined_at', { ascending: true });

      if (error) {
        const fallbackRes = await supabase
          .from('game_participants')
          .select('*')
          .eq('game_id', gameId)
          .neq('status', 'left')
          .order('joined_at', { ascending: true });
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row: any) => ({
          id: row.user_id || row.id,
          user_id: row.user_id,
          name: row.user?.full_name || row.user_name || 'Player',
          avatar: (row.user?.avatar_url as AvatarId) || (row.user_avatar as AvatarId) || 'alex',
          role: (row.role as 'host' | 'player') || 'player',
          status: row.status,
          joined_at: row.joined_at,
        }));
      }
    } catch (err) {
      console.warn('[ChatService] Error fetching participants from Supabase:', err);
    }
  }

  // Fallback to Next.js API route
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(gameId)}/roster`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.participants)) {
          return json.participants;
        }
      }
    } catch {}
  }

  return [];
}

/**
 * Subscribe to real-time roster changes (new joins / leaves).
 */
export function subscribeToGameParticipants(
  gameId: string,
  onParticipantChange: () => void
): () => void {
  if (!gameId) return () => {};
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) return () => {};

  try {
    const channelName = `game_roster_${gameId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_participants',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          onParticipantChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[ChatService] Participant realtime error:', err);
    return () => {};
  }
}

// Helper: Format message time string
function formatMessageTime(isoString?: string): string {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Just now';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
}

// Helper: Local storage cache
function cacheLocalMessage(gameId: string, message: ChatMessage) {
  if (typeof window === 'undefined') return;
  try {
    const key = `sportsync_chat_${gameId}`;
    const raw = localStorage.getItem(key);
    const existing: ChatMessage[] = raw ? JSON.parse(raw) : [];
    if (!existing.some((m) => m.id === message.id)) {
      const updated = [...existing, message];
      localStorage.setItem(key, JSON.stringify(updated.slice(-100)));
    }
  } catch {}
}
