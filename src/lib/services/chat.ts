import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { AvatarId } from '../../illustrations/Avatars';
import { ChatMessage } from '../../design-system/components/ChatBubble';

export interface DbChatMessage {
  id: string;
  game_id: string;
  sender_id?: string | null;
  sender_name: string;
  sender_avatar?: string;
  message_text: string;
  created_at: string;
}

export interface GameParticipant {
  id?: string;
  name: string;
  avatar: AvatarId;
  role?: 'Host' | 'Player';
  isHost?: boolean;
}

export interface AuthenticatedProfile {
  id: string;
  name: string;
  avatar: AvatarId;
}

const isUuid = (val?: string): boolean =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export function formatMessageTime(isoString?: string): string {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Just now';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return 'Just now';
  }
}

/**
 * Retrieve the authenticated user's profile directly from Supabase.
 * Uses auth.getUser() and joins with the public.users table to fetch the real full name and avatar.
 */
export async function getAuthenticatedUserProfile(): Promise<AuthenticatedProfile | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return null;

    const authUser = authData.user;
    const authId = authUser.id;

    // Fetch user profile from public.users table
    const { data: profile } = await supabase
      .from('users')
      .select('id, auth_id, full_name, nickname, avatar_url, email')
      .or(`id.eq.${authId},auth_id.eq.${authId},email.eq.${authUser.email}`)
      .maybeSingle();

    const meta = authUser.user_metadata || {};
    const resolvedName =
      profile?.full_name?.trim() ||
      profile?.nickname?.trim() ||
      meta.full_name?.trim() ||
      meta.nickname?.trim() ||
      authUser.email?.split('@')[0] ||
      'Player';

    const resolvedAvatar = (profile?.avatar_url as AvatarId) || (meta.avatar_url as AvatarId) || 'alex';
    const resolvedId = profile?.id || authId;

    return {
      id: resolvedId,
      name: resolvedName,
      avatar: resolvedAvatar,
    };
  } catch (err) {
    console.warn('[Chat] Failed to get authenticated user profile:', err);
    return null;
  }
}

/**
 * Fetch persisted messages for a game from Supabase, resolving real sender names and avatars from public.users.
 * Distinguishes the host's messages and individual players' messages.
 */
export async function fetchGameMessages(
  gameId: string,
  alternateId?: string,
  hostInfo?: { hostId?: string; hostName?: string }
): Promise<ChatMessage[]> {
  if (!gameId) return [];

  const targetIds = Array.from(new Set([gameId, alternateId].filter(Boolean))) as string[];
  const cacheKey = `sportsync_chat_${gameId}`;

  // Read local cache first for instant UI response
  let cachedMessages: ChatMessage[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cachedMessages = parsed;
        }
      }
    } catch (e) {
      console.warn('[Chat] Failed reading localStorage cache:', e);
    }
  }

  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) {
    return cachedMessages;
  }

  try {
    let query = supabase.from('game_chat_messages').select('*');

    if (targetIds.length === 1) {
      query = query.eq('game_id', targetIds[0]);
    } else {
      query = query.in('game_id', targetIds);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.warn('[Chat] Supabase messages query error:', error.message);
      return cachedMessages;
    }

    if (Array.isArray(data)) {
      // 1. Collect all distinct sender IDs to batch lookup authentic profiles from public.users
      const senderIds = Array.from(
        new Set(data.map((r) => r.sender_id).filter((id) => Boolean(id && isUuid(id))))
      ) as string[];

      const userProfilesMap = new Map<string, { name: string; avatar: AvatarId }>();

      if (senderIds.length > 0) {
        try {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, auth_id, full_name, nickname, avatar_url')
            .in('id', senderIds);

          if (Array.isArray(usersData)) {
            usersData.forEach((u: any) => {
              const uName = u.full_name || u.nickname;
              const uAvatar = (u.avatar_url as AvatarId) || 'alex';
              if (u.id) userProfilesMap.set(u.id, { name: uName, avatar: uAvatar });
              if (u.auth_id) userProfilesMap.set(u.auth_id, { name: uName, avatar: uAvatar });
            });
          }
        } catch (uErr) {
          console.warn('[Chat] Could not batch-fetch sender profiles:', uErr);
        }
      }

      const seenIds = new Set<string>();
      const mapped: ChatMessage[] = [];

      for (const row of data) {
        if (!row.id || seenIds.has(row.id)) continue;
        seenIds.add(row.id);

        const profile = row.sender_id ? userProfilesMap.get(row.sender_id) : undefined;
        const resolvedSenderName = profile?.name || row.sender_name || 'Player';
        const resolvedAvatar = profile?.avatar || (row.sender_avatar as AvatarId) || 'alex';

        // Check if sender is the host
        const isSenderHost = Boolean(
          (hostInfo?.hostId && row.sender_id && hostInfo.hostId === row.sender_id) ||
          (hostInfo?.hostName && resolvedSenderName.trim().toLowerCase() === hostInfo.hostName.trim().toLowerCase())
        );

        mapped.push({
          id: row.id,
          senderId: row.sender_id,
          senderName: isSenderHost && hostInfo?.hostName ? hostInfo.hostName : resolvedSenderName,
          avatarId: resolvedAvatar,
          text: row.message_text,
          time: formatMessageTime(row.created_at),
          isHost: isSenderHost,
        });
      }

      // Update local storage cache
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(mapped));
        } catch {}
      }

      return mapped;
    }
  } catch (err) {
    console.warn('[Chat] Failed to fetch messages from Supabase:', err);
  }

  return cachedMessages;
}

/**
 * Send and persist a new message to Supabase for the specified game.
 * Uses the authenticated user's actual profile name and avatar.
 */
export async function sendGameMessage(params: {
  gameId: string;
  senderId?: string;
  senderName: string;
  senderAvatar?: AvatarId | string;
  text: string;
  isHost?: boolean;
}): Promise<ChatMessage> {
  const { gameId, senderId, senderName, senderAvatar = 'alex', text, isHost = false } = params;

  const nowIso = new Date().toISOString();
  const messageId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const createdMessage: ChatMessage = {
    id: messageId,
    senderId,
    senderName,
    avatarId: (senderAvatar as AvatarId) || 'alex',
    text: text.trim(),
    time: formatMessageTime(nowIso),
    isMe: true,
    isHost,
  };

  // 1. Save to localStorage cache immediately
  const cacheKey = `sportsync_chat_${gameId}`;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(cacheKey);
      const existing: ChatMessage[] = raw ? JSON.parse(raw) : [];
      if (!existing.some((m) => m.id === messageId)) {
        existing.push(createdMessage);
        localStorage.setItem(cacheKey, JSON.stringify(existing));
      }
    } catch {}
  }

  // 2. Persist to Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      const dbSenderId = senderId && isUuid(senderId) ? senderId : null;

      const { error } = await supabase.from('game_chat_messages').insert({
        id: messageId,
        game_id: gameId,
        sender_id: dbSenderId,
        sender_name: senderName,
        sender_avatar: senderAvatar,
        message_text: text.trim(),
        created_at: nowIso,
      });

      if (error) {
        console.warn('[Chat] Supabase insert warning:', error.message);
        // Fallback: try Next.js API route if direct insert errored
        try {
          await fetch(`/api/games/${encodeURIComponent(gameId)}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: messageId,
              senderId: dbSenderId,
              senderName,
              senderAvatar,
              text: text.trim(),
              createdAt: nowIso,
            }),
          });
        } catch {}
      }
    } catch (dbEx) {
      console.warn('[Chat] Exception writing message to Supabase:', dbEx);
    }
  }

  return createdMessage;
}

/**
 * Subscribe to real-time chat messages for a specific game.
 * Uses both Postgres changes and Supabase broadcast for low-latency delivery.
 */
export function subscribeToGameChat(
  gameId: string,
  alternateId: string | undefined,
  hostInfo: { hostId?: string; hostName?: string } | undefined,
  onNewMessage: (msg: ChatMessage) => void
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured || !gameId) {
    return () => {};
  }

  const channelName = `game-chat-${gameId}`;
  const channel = supabase.channel(channelName);

  const processIncomingRow = (row: any) => {
    if (!row || !row.id || !row.message_text) return;

    const senderName = row.sender_name || 'Player';
    const isSenderHost = Boolean(
      (hostInfo?.hostId && row.sender_id && hostInfo.hostId === row.sender_id) ||
      (hostInfo?.hostName && senderName.trim().toLowerCase() === hostInfo.hostName.trim().toLowerCase())
    );

    const msg: ChatMessage = {
      id: row.id,
      senderId: row.sender_id,
      senderName: isSenderHost && hostInfo?.hostName ? hostInfo.hostName : senderName,
      avatarId: (row.sender_avatar as AvatarId) || 'alex',
      text: row.message_text,
      time: formatMessageTime(row.created_at),
      isHost: isSenderHost,
    };
    onNewMessage(msg);
  };

  channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_chat_messages',
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => {
        processIncomingRow(payload.new);
      }
    )
    .on('broadcast', { event: 'new_message' }, (payload) => {
      const data = payload?.payload;
      if (data && data.id && data.text) {
        onNewMessage(data);
      }
    });

  if (alternateId && alternateId !== gameId) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_chat_messages',
        filter: `game_id=eq.${alternateId}`,
      },
      (payload) => {
        processIncomingRow(payload.new);
      }
    );
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      // Channel connected
    }
  });

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {}
  };
}

/**
 * Broadcast a message to peers on the game's channel for instantaneous UI sync.
 */
export async function broadcastGameMessage(gameId: string, message: ChatMessage): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured || !gameId) return;

  try {
    const channel = supabase.channel(`game-chat-${gameId}`);
    await channel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: message,
    });
  } catch {}
}

/**
 * Fetch actual game participants from Supabase (session_participants, game_rosters, queues).
 * Guarantees no fake mock data (Marcus Bell, Elena Rostova, etc.) is injected.
 */
export async function fetchGameParticipants(params: {
  gameId: string;
  sessionId?: string;
  hostId?: string;
  hostName?: string;
  hostAvatar?: AvatarId;
  existingMembers?: Array<{ id?: string; name: string; avatar: AvatarId }>;
}): Promise<{
  host: GameParticipant;
  joined: GameParticipant[];
  all: GameParticipant[];
}> {
  const {
    gameId,
    sessionId,
    hostId,
    hostName = 'Match Organizer',
    hostAvatar = 'alex',
    existingMembers = [],
  } = params;

  const resolvedHost: GameParticipant = {
    id: hostId,
    name: hostName,
    avatar: hostAvatar,
    role: 'Host',
    isHost: true,
  };

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  if (hostId) seenIds.add(hostId.toLowerCase());
  if (hostName) seenNames.add(hostName.trim().toLowerCase());

  const joinedList: GameParticipant[] = [];

  // Add existing verified members from the game object (excluding the host)
  for (const m of existingMembers) {
    const mId = m.id ? m.id.toLowerCase() : undefined;
    const mName = m.name ? m.name.trim().toLowerCase() : '';

    if (mId && seenIds.has(mId)) continue;
    if (mName && seenNames.has(mName)) continue;

    if (mId) seenIds.add(mId);
    if (mName) seenNames.add(mName);

    joinedList.push({
      id: m.id,
      name: m.name,
      avatar: m.avatar || 'alex',
      role: 'Player',
      isHost: false,
    });
  }

  const supabase = getSupabaseClient();
  const searchSessionId = (sessionId && isUuid(sessionId)) ? sessionId : (isUuid(gameId) ? gameId : undefined);

  if (supabase && isSupabaseConfigured && searchSessionId) {
    try {
      // 1. Query session_participants
      const { data: partData } = await supabase
        .from('session_participants')
        .select('user_id, status, joined_at')
        .eq('session_id', searchSessionId)
        .neq('status', 'cancelled');

      // 2. Query queues
      const { data: queueData } = await supabase
        .from('queues')
        .select('user_id, partner_names, status')
        .eq('session_id', searchSessionId)
        .not('status', 'in', '("cancelled","left")');

      // 3. Query game_rosters
      const { data: rosterData } = await supabase
        .from('game_rosters')
        .select('user_id, status')
        .eq('session_id', searchSessionId)
        .neq('status', 'cancelled');

      const userIdsToLookup = new Set<string>();

      (partData || []).forEach((p: any) => {
        if (p.user_id && isUuid(p.user_id)) userIdsToLookup.add(p.user_id);
      });
      (rosterData || []).forEach((r: any) => {
        if (r.user_id && isUuid(r.user_id)) userIdsToLookup.add(r.user_id);
      });
      (queueData || []).forEach((q: any) => {
        if (q.user_id && isUuid(q.user_id)) userIdsToLookup.add(q.user_id);
      });

      const userMap = new Map<string, { name: string; avatar: AvatarId }>();

      if (userIdsToLookup.size > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, nickname, avatar_url')
          .in('id', Array.from(userIdsToLookup));

        if (Array.isArray(usersData)) {
          usersData.forEach((u: any) => {
            userMap.set(u.id, {
              name: u.full_name || u.nickname || 'Player',
              avatar: (u.avatar_url as AvatarId) || 'alex',
            });
          });
        }
      }

      // Add users from userMap
      userMap.forEach((userInfo, uId) => {
        const cleanId = uId.toLowerCase();
        const cleanName = userInfo.name.trim().toLowerCase();

        if (seenIds.has(cleanId) || seenNames.has(cleanName)) return;

        seenIds.add(cleanId);
        seenNames.add(cleanName);

        joinedList.push({
          id: uId,
          name: userInfo.name,
          avatar: userInfo.avatar,
          role: 'Player',
          isHost: false,
        });
      });

      // Add partner names from queues if any
      (queueData || []).forEach((q: any) => {
        if (Array.isArray(q.partner_names)) {
          q.partner_names.forEach((pName: string) => {
            if (!pName || typeof pName !== 'string') return;
            const cleanName = pName.trim().toLowerCase();
            if (seenNames.has(cleanName)) return;
            seenNames.add(cleanName);

            joinedList.push({
              name: pName.trim(),
              avatar: 'alex',
              role: 'Player',
              isHost: false,
            });
          });
        }
      });
    } catch (e) {
      console.warn('[Chat] Failed fetching participants from Supabase:', e);
    }
  }

  return {
    host: resolvedHost,
    joined: joinedList,
    all: [resolvedHost, ...joinedList],
  };
}

/**
 * Get the last read timestamp for a specific game chat from localStorage.
 */
export function getGameChatLastRead(gameId: string): string | null {
  if (typeof window === 'undefined' || !gameId) return null;
  try {
    return localStorage.getItem(`sportsync_chat_read_${gameId}`);
  } catch {
    return null;
  }
}

const lastMarkedReadMap = new Map<string, number>();

/**
 * Mark a specific game chat as read. Removes the unread count for that conversation.
 * Throttled to prevent infinite event ping-pong loops.
 */
export function markGameChatAsRead(gameId: string, force = false): void {
  if (typeof window === 'undefined' || !gameId) return;
  const now = Date.now();
  const lastTime = lastMarkedReadMap.get(gameId) || 0;
  if (!force && now - lastTime < 1500) {
    return; // Already marked read within last 1.5s, skip redundant dispatch
  }
  lastMarkedReadMap.set(gameId, now);

  try {
    const nowIso = new Date(now).toISOString();
    localStorage.setItem(`sportsync_chat_read_${gameId}`, nowIso);
    window.dispatchEvent(
      new CustomEvent('sportsync:chat_read', { detail: { gameId, timestamp: nowIso } })
    );
  } catch {}
}

/**
 * Check whether a user is authorized to access a game's chat.
 * Restricts access to host and joined players.
 */
export function isUserAuthorizedForChat(game: any, userId?: string, userName?: string): boolean {
  if (!game) return false;
  const normName = userName?.trim().toLowerCase();

  const isHost = Boolean(
    (game.hostId && userId && game.hostId === userId) ||
    (game.hostName && normName && game.hostName.trim().toLowerCase() === normName)
  );

  const isJoined = Boolean(
    game.members &&
      game.members.some(
        (m: any) =>
          (m.id && userId && m.id === userId) ||
          (m.name && normName && m.name.trim().toLowerCase() === normName)
      )
  );

  return isHost || isJoined;
}

/**
 * Fetch unread counts for all authorized games from Supabase.
 */
export async function fetchUnreadCountsForAuthorizedGames(
  games: any[],
  userId?: string,
  userName?: string
): Promise<{ total: number; byGame: Record<string, number> }> {
  const authorizedGames = games.filter((g) => isUserAuthorizedForChat(g, userId, userName));
  if (authorizedGames.length === 0) {
    return { total: 0, byGame: {} };
  }

  const supabase = getSupabaseClient();
  const byGame: Record<string, number> = {};
  let total = 0;

  if (!supabase || !isSupabaseConfigured) {
    // Check cached messages in localStorage
    if (typeof window !== 'undefined') {
      try {
        const normUser = userName?.trim().toLowerCase();
        for (const g of authorizedGames) {
          const cacheKey = `sportsync_chat_${g.id}`;
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const msgs = JSON.parse(raw);
            const lastRead = getGameChatLastRead(g.id);
            const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;

            const unread = msgs.filter((m: any) => {
              if (m.senderId && userId && m.senderId === userId) return false;
              if (m.senderName && normUser && m.senderName.trim().toLowerCase() === normUser) return false;
              if (!lastReadTime) return true;
              return new Date(m.time).getTime() > lastReadTime;
            }).length;

            byGame[g.id] = unread;
            total += unread;
          }
        }
      } catch {}
    }
    return { total, byGame };
  }

  try {
    const gameIds = authorizedGames.map((g) => g.id);
    const { data: messages, error } = await supabase
      .from('game_chat_messages')
      .select('id, game_id, sender_id, sender_name, created_at')
      .in('game_id', gameIds);

    if (!error && Array.isArray(messages)) {
      const normUser = userName?.trim().toLowerCase();

      for (const g of authorizedGames) {
        const lastRead = getGameChatLastRead(g.id);
        const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;

        const unreadList = messages.filter((m) => {
          if (m.game_id !== g.id) return false;
          // Ignore messages sent by the user themselves
          if (m.sender_id && userId && m.sender_id === userId) return false;
          if (m.sender_name && normUser && m.sender_name.trim().toLowerCase() === normUser) return false;
          // Check if message is newer than last read
          const msgTime = new Date(m.created_at).getTime();
          return msgTime > lastReadTime;
        });

        const count = unreadList.length;
        byGame[g.id] = count;
        total += count;
      }
    }
  } catch (err) {
    console.warn('[Chat] Failed fetching unread counts:', err);
  }

  return { total, byGame };
}

/**
 * Custom React hook to track real-time unread messages for authorized chats.
 * Removes corresponding count when a conversation is opened.
 * Formats counts > 99 as '99+'.
 */
export function useChatUnread(params: {
  games: any[];
  currentUserId?: string;
  currentUserName?: string;
  activeChatGameId?: string | null;
}) {
  const { games, currentUserId, currentUserName, activeChatGameId } = params;

  // Use refs to decouple Realtime subscription and listeners from component re-renders
  const gamesRef = useRef<any[]>(games);
  gamesRef.current = games;

  const currentUserIdRef = useRef<string | undefined>(currentUserId);
  currentUserIdRef.current = currentUserId;

  const currentUserNameRef = useRef<string | undefined>(currentUserName);
  currentUserNameRef.current = currentUserName;

  const activeChatGameIdRef = useRef<string | null | undefined>(activeChatGameId);
  activeChatGameIdRef.current = activeChatGameId;

  const [unreadState, setUnreadState] = useState<{ total: number; byGame: Record<string, number> }>({
    total: 0,
    byGame: {},
  });

  // Stable key of authorized game IDs so we don't query DB when games array changes reference without new game IDs
  const authorizedGameIdsKey = useMemo(() => {
    return (games || [])
      .filter((g) => isUserAuthorizedForChat(g, currentUserId, currentUserName))
      .map((g) => g.id)
      .sort()
      .join(',');
  }, [games, currentUserId, currentUserName]);

  // 1. Initial calculation & refresh (only runs when authorized games actually change)
  const refreshUnread = useCallback(async () => {
    const res = await fetchUnreadCountsForAuthorizedGames(
      gamesRef.current,
      currentUserIdRef.current,
      currentUserNameRef.current
    );
    setUnreadState((prev) => {
      if (prev.total === res.total) {
        const prevKeys = Object.keys(prev.byGame);
        const nextKeys = Object.keys(res.byGame);
        if (
          prevKeys.length === nextKeys.length &&
          prevKeys.every((k) => prev.byGame[k] === res.byGame[k])
        ) {
          return prev;
        }
      }
      return res;
    });
  }, []);

  useEffect(() => {
    refreshUnread();
  }, [authorizedGameIdsKey, refreshUnread]);

  // 2. Mark active game chat read if open
  useEffect(() => {
    if (activeChatGameId) {
      markGameChatAsRead(activeChatGameId);
      setUnreadState((prev) => {
        const prevGameCount = prev.byGame[activeChatGameId] || 0;
        if (prevGameCount === 0) return prev; // Avoid unnecessary re-render
        return {
          total: Math.max(0, prev.total - prevGameCount),
          byGame: { ...prev.byGame, [activeChatGameId]: 0 },
        };
      });
    }
  }, [activeChatGameId]);

  // 3. Listen to local read events to remove count when conversation is opened
  useEffect(() => {
    const handleReadEvent = (e: any) => {
      const readGameId = e.detail?.gameId;
      if (!readGameId) return;
      setUnreadState((prev) => {
        const prevGameCount = prev.byGame[readGameId] || 0;
        if (prevGameCount === 0) return prev; // Avoid unnecessary re-render
        return {
          total: Math.max(0, prev.total - prevGameCount),
          byGame: { ...prev.byGame, [readGameId]: 0 },
        };
      });
    };

    window.addEventListener('sportsync:chat_read', handleReadEvent);
    return () => {
      window.removeEventListener('sportsync:chat_read', handleReadEvent);
    };
  }, []);

  // 4. Real-time updates via Supabase: established ONCE per user
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured) return;

    const channelName = `chat-global-unread-${currentUserId || 'anon'}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_chat_messages',
        },
        (payload) => {
          const row = payload.new as any;
          if (!row || !row.game_id) return;

          const latestGames = gamesRef.current;
          const uId = currentUserIdRef.current;
          const uName = currentUserNameRef.current;
          const activeId = activeChatGameIdRef.current;

          // Check if user is authorized for this game
          const targetGame = latestGames.find((g) => g.id === row.game_id || g.sessionId === row.game_id);
          if (!targetGame || !isUserAuthorizedForChat(targetGame, uId, uName)) {
            return;
          }

          // Ignore messages sent by current user
          const normUser = uName?.trim().toLowerCase();
          if (row.sender_id && uId && row.sender_id === uId) return;
          if (row.sender_name && normUser && row.sender_name.trim().toLowerCase() === normUser) return;

          // If currently viewing this chat, mark as read immediately
          if (activeId && (activeId === row.game_id || targetGame.id === activeId)) {
            markGameChatAsRead(targetGame.id);
            return;
          }

          // Otherwise increment unread count in real-time
          setUnreadState((prev) => {
            const currentForGame = prev.byGame[targetGame.id] || 0;
            return {
              total: prev.total + 1,
              byGame: {
                ...prev.byGame,
                [targetGame.id]: currentForGame + 1,
              },
            };
          });
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [currentUserId]);

  return {
    totalUnread: unreadState.total,
    unreadByGame: unreadState.byGame,
    formattedTotal: unreadState.total > 99 ? '99+' : unreadState.total.toString(),
    getFormattedByGame: (gameId: string): string | null => {
      const c = unreadState.byGame[gameId] || 0;
      if (c <= 0) return null;
      return c > 99 ? '99+' : c.toString();
    },
    refreshUnread,
  };
}
