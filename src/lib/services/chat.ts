/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/refs, react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { AvatarId } from '../../illustrations/Avatars';
import { ChatMessage } from '../../design-system/components/ChatBubble';
import {
  getUnreadChatNotificationsCount,
  markGameChatNotificationsAsRead,
} from '../notifications';

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
 * Fetch persisted messages for a game via GET /api/games/[id]/chat.
 * Canonical game ID should be `game.sessionId || game.id`.
 */
export async function fetchGameMessages(
  gameId: string,
  alternateId?: string,
  hostInfo?: { hostId?: string; hostName?: string }
): Promise<ChatMessage[]> {
  const canonicalId = gameId || alternateId;
  if (!canonicalId) return [];

  const supabase = getSupabaseClient();
  let authToken: string | undefined;
  if (supabase && isSupabaseConfigured) {
    try {
      const { data } = await supabase.auth.getSession();
      authToken = data?.session?.access_token;
    } catch {}
  }

  const res = await fetch(`/api/games/${encodeURIComponent(canonicalId)}/chat`, {
    credentials: 'include',
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (json?.error && (json.error.includes('schema cache') || json.error.includes('game_chat_messages'))) {
      return [];
    }
    throw new Error(json?.error || `Failed to load chat messages (${res.status}).`);
  }

  const rows = Array.isArray(json.messages) ? json.messages : [];
  const seenIds = new Set<string>();
  const mapped: ChatMessage[] = [];

  for (const row of rows) {
    if (!row?.id || seenIds.has(row.id)) continue;
    seenIds.add(row.id);

    const resolvedSenderName = row.sender_name || 'Player';
    const resolvedAvatar = (row.sender_avatar as AvatarId) || 'alex';
    const isSenderHost = Boolean(
      (hostInfo?.hostId && row.sender_id && hostInfo.hostId === row.sender_id) ||
        (hostInfo?.hostName &&
          resolvedSenderName.trim().toLowerCase() === hostInfo.hostName.trim().toLowerCase())
    );

    mapped.push({
      id: row.id,
      senderId: row.sender_id,
      senderName: isSenderHost && hostInfo?.hostName ? hostInfo.hostName : resolvedSenderName,
      avatarId: resolvedAvatar,
      text: row.message_text,
      time: formatMessageTime(row.created_at),
      createdAt: row.created_at,
      isHost: isSenderHost,
    });
  }

  return mapped;
}

export interface SendGameMessageParams {
  gameId: string;
  senderId?: string;
  senderName: string;
  senderAvatar?: AvatarId | string;
  text: string;
  isHost?: boolean;
  gameTitle?: string;
  sport?: string;
  locationName?: string;
  schedule?: string;
  recipients?: Array<{ id?: string; name: string }>;
}

/**
 * Send and persist a new message via POST /api/games/[id]/chat.
 */
export async function sendGameMessage(params: SendGameMessageParams): Promise<ChatMessage> {
  const { gameId, text, isHost = false } = params;

  const messageId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const supabase = getSupabaseClient();
  let authToken: string | undefined;
  if (supabase && isSupabaseConfigured) {
    try {
      const { data } = await supabase.auth.getSession();
      authToken = data?.session?.access_token;
    } catch {}
  }

  const res = await fetch(`/api/games/${encodeURIComponent(gameId)}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({
      id: messageId,
      text: text.trim(),
      senderId: params.senderId,
      senderName: params.senderName,
      senderAvatar: params.senderAvatar,
      isHost,
      gameTitle: params.gameTitle,
      sport: params.sport,
      locationName: params.locationName,
      schedule: params.schedule,
      recipients: params.recipients,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.message) {
    if (json?.error && (json.error.includes('schema cache') || json.error.includes('game_chat_messages'))) {
      return {
        id: messageId,
        senderId: params.senderId,
        senderName: params.senderName,
        avatarId: (params.senderAvatar as AvatarId) || 'alex',
        text: text.trim(),
        time: formatMessageTime(new Date().toISOString()),
        isMe: true,
        isHost,
      };
    }
    throw new Error(json?.error || `Failed to send message (${res.status}).`);
  }

  const m = json.message;
  return {
    id: m.id || messageId,
    senderId: m.senderId,
    senderName: m.senderName || params.senderName,
    avatarId: (m.senderAvatar as AvatarId) || (params.senderAvatar as AvatarId) || 'alex',
    text: m.text || text.trim(),
    time: formatMessageTime(m.createdAt),
    isMe: true,
    isHost: typeof m.isHost === 'boolean' ? m.isHost : isHost,
  };
}

const activeChatChannels = new Map<string, any>();
const chatChannelEntries = new Map<
  string,
  { channel: any; listeners: Set<(msg: ChatMessage) => void>; altId?: string }
>();

/**
 * Subscribe to real-time chat messages for a specific game.
 * Multiplexes mounted listeners per canonical game ID so all peers share the exact
 * `game-chat-${canonicalId}` broadcast topic without channel collisions.
 */
export function subscribeToGameChat(
  gameId: string,
  alternateId: string | undefined,
  hostInfo: { hostId?: string; hostName?: string } | undefined,
  onNewMessage: (msg: ChatMessage) => void
): () => void {
  const supabase = getSupabaseClient();
  const canonicalId = gameId || alternateId || '';
  if (!supabase || !isSupabaseConfigured || !canonicalId) {
    return () => {};
  }

  const secondaryId = alternateId && alternateId !== canonicalId ? alternateId : undefined;
  let entry = chatChannelEntries.get(canonicalId);

  if (!entry) {
    const channelName = `game-chat-${canonicalId}`;
    const channel = supabase.channel(channelName);
    const listeners = new Set<(msg: ChatMessage) => void>();
    entry = { channel, listeners, altId: secondaryId };
    chatChannelEntries.set(canonicalId, entry);

    const dispatchMessage = (msg: ChatMessage) => {
      entry?.listeners.forEach((cb) => {
        try {
          cb(msg);
        } catch {}
      });
    };

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
        createdAt: row.created_at,
        isHost: isSenderHost,
      };
      dispatchMessage(msg);
    };

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_chat_messages',
          filter: `game_id=eq.${canonicalId}`,
        },
        (payload) => {
          processIncomingRow(payload.new);
        }
      )
      .on('broadcast', { event: 'new_message' }, (payload) => {
        const data = payload?.payload;
        if (data && data.id && data.text) {
          dispatchMessage(data);
        }
      });

    if (secondaryId) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_chat_messages',
          filter: `game_id=eq.${secondaryId}`,
        },
        (payload) => {
          processIncomingRow(payload.new);
        }
      );
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        activeChatChannels.set(canonicalId, channel);
        if (secondaryId) {
          activeChatChannels.set(secondaryId, channel);
        }
      }
    });
  }

  entry.listeners.add(onNewMessage);

  return () => {
    const currentEntry = chatChannelEntries.get(canonicalId);
    if (!currentEntry) return;
    currentEntry.listeners.delete(onNewMessage);
    if (currentEntry.listeners.size === 0) {
      chatChannelEntries.delete(canonicalId);
      activeChatChannels.delete(canonicalId);
      if (currentEntry.altId) {
        activeChatChannels.delete(currentEntry.altId);
      }
      try {
        supabase.removeChannel(currentEntry.channel);
      } catch {}
    }
  };
}

/**
 * Broadcast a message to peers over the active subscribed channel for instantaneous UI sync.
 */
export async function broadcastGameMessage(gameId: string, message: ChatMessage): Promise<void> {
  if (!gameId) return;
  const activeChannel = activeChatChannels.get(gameId);
  if (!activeChannel) return;

  try {
    await activeChannel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: message,
    });
  } catch (err) {
    console.warn('[Chat] Broadcast send warning:', err);
  }
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

      const userIdsToLookup = new Set<string>();

      (partData || []).forEach((p: any) => {
        if (p.user_id && isUuid(p.user_id)) userIdsToLookup.add(p.user_id);
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
/**
 * Get the last read timestamp for a specific game chat from localStorage.
 */
export function getGameChatLastRead(gameId?: string, alternateId?: string): string | null {
  if (typeof window === 'undefined' || (!gameId && !alternateId)) return null;
  try {
    const time1 = gameId ? localStorage.getItem(`sportsync_chat_read_${gameId}`) : null;
    const time2 = alternateId ? localStorage.getItem(`sportsync_chat_read_${alternateId}`) : null;
    if (!time1) return time2;
    if (!time2) return time1;
    return new Date(time1).getTime() >= new Date(time2).getTime() ? time1 : time2;
  } catch {
    return null;
  }
}

const lastMarkedReadMap = new Map<string, number>();

/**
 * Mark a specific game chat as read. Removes the unread count for that conversation.
 * Throttled to prevent infinite event ping-pong loops.
 */
export function markGameChatAsRead(
  gameId?: string,
  alternateId?: string,
  gameTitle?: string,
  userFilter?: { id?: string; name?: string },
  force = false
): void {
  if (typeof window === 'undefined' || (!gameId && !alternateId)) return;
  const now = Date.now();
  const key = [gameId, alternateId].filter(Boolean).sort().join('_');
  const lastTime = lastMarkedReadMap.get(key) || 0;
  if (!force && now - lastTime < 300) {
    return; // Already marked read within last 300ms, skip redundant dispatch
  }
  lastMarkedReadMap.set(key, now);

  try {
    const nowIso = new Date(now).toISOString();
    if (gameId) localStorage.setItem(`sportsync_chat_read_${gameId}`, nowIso);
    if (alternateId && alternateId !== gameId) {
      localStorage.setItem(`sportsync_chat_read_${alternateId}`, nowIso);
    }

    const ids = [gameId, alternateId].filter(Boolean) as string[];
    markGameChatNotificationsAsRead(ids, gameTitle, userFilter);

    window.dispatchEvent(
      new CustomEvent('sportsync:chat_read', {
        detail: {
          gameId,
          alternateId,
          gameTitle,
          timestamp: nowIso,
        },
      })
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
    (game.members &&
      game.members.some(
        (m: any) =>
          (m.id && userId && m.id === userId) ||
          (m.name && normName && m.name.trim().toLowerCase() === normName)
      )) ||
    (typeof window !== 'undefined' && (() => {
      try {
        const raw = localStorage.getItem('sportsync_joined_games');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            return list.includes(game.id) || (game.sessionId && list.includes(game.sessionId));
          }
        }
      } catch {}
      return false;
    })())
  );

  return isHost || isJoined;
}

/**
 * Determine a user's role in a game ('host' | 'joined' | null).
 */
export function getUserGameRole(game: any, userId?: string, userName?: string): 'host' | 'joined' | null {
  if (!game) return null;
  const normName = userName?.trim().toLowerCase();

  const isHost = Boolean(
    (game.hostId && userId && game.hostId === userId) ||
    (game.hostName && normName && game.hostName.trim().toLowerCase() === normName)
  );
  if (isHost) return 'host';

  const isJoined = Boolean(
    (game.members &&
      game.members.some(
        (m: any) =>
          (m.id && userId && m.id === userId) ||
          (m.name && normName && m.name.trim().toLowerCase() === normName)
      )) ||
    (typeof window !== 'undefined' && (() => {
      try {
        const raw = localStorage.getItem('sportsync_joined_games');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            return list.includes(game.id) || (game.sessionId && list.includes(game.sessionId));
          }
        }
      } catch {}
      return false;
    })())
  );

  return isJoined ? 'joined' : null;
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
          const raw =
            localStorage.getItem(`sportsync_chat_${g.id}`) ||
            (g.sessionId ? localStorage.getItem(`sportsync_chat_${g.sessionId}`) : null);
          if (raw) {
            const msgs = JSON.parse(raw);
            const lastRead = getGameChatLastRead(g.id, g.sessionId);
            const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;

            const unread = msgs.filter((m: any) => {
              if (m.senderId && userId && m.senderId === userId) return false;
              if (m.senderName && normUser && m.senderName.trim().toLowerCase() === normUser) return false;
              if (!lastReadTime) return true;
              return new Date(m.time || m.created_at).getTime() > lastReadTime;
            }).length;

            byGame[g.id] = unread;
            if (g.sessionId) byGame[g.sessionId] = unread;
            total += unread;
          }
        }
      } catch {}
    }
    return { total, byGame };
  }

  try {
    const queryIds = Array.from(
      new Set(
        authorizedGames.flatMap((g) => [g.id, g.sessionId].filter(Boolean) as string[])
      )
    );
    const { data: messages, error } = await supabase
      .from('game_chat_messages')
      .select('id, game_id, sender_id, sender_name, created_at')
      .in('game_id', queryIds);

    if (!error && Array.isArray(messages)) {
      const normUser = userName?.trim().toLowerCase();

      for (const g of authorizedGames) {
        const lastRead = getGameChatLastRead(g.id, g.sessionId);
        const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;

        const unreadList = messages.filter((m) => {
          if (m.game_id !== g.id && (!g.sessionId || m.game_id !== g.sessionId)) return false;
          // Ignore messages sent by the user themselves
          if (m.sender_id && userId && m.sender_id === userId) return false;
          if (m.sender_name && normUser && m.sender_name.trim().toLowerCase() === normUser) return false;
          // Check if message is newer than last read
          const msgTime = new Date(m.created_at).getTime();
          return msgTime > lastReadTime;
        });

        const count = unreadList.length;
        byGame[g.id] = count;
        if (g.sessionId) byGame[g.sessionId] = count;
        total += count;
      }
    }
  } catch (err) {
    console.warn('[Chat] Failed fetching unread counts:', err);
  }

  // Merge unread counts from notifications system (sportsync_notifications)
  try {
    for (const g of authorizedGames) {
      const notifCount = getUnreadChatNotificationsCount(
        [g.id, g.sessionId].filter(Boolean) as string[],
        g.title,
        { id: userId, name: userName }
      );
      if (notifCount > 0) {
        const existing = byGame[g.id] || 0;
        const effective = Math.max(existing, notifCount);
        total += (effective - existing);
        byGame[g.id] = effective;
        if (g.sessionId) {
          byGame[g.sessionId] = effective;
        }
      }
    }
  } catch {}

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
  activeChatSessionId?: string | null;
  activeChatGameTitle?: string | null;
}) {
  const { games, currentUserId, currentUserName, activeChatGameId, activeChatSessionId, activeChatGameTitle } = params;

  // Use refs to decouple Realtime subscription and listeners from component re-renders
  const gamesRef = useRef<any[]>(games);
  gamesRef.current = games;

  const currentUserIdRef = useRef<string | undefined>(currentUserId);
  currentUserIdRef.current = currentUserId;

  const currentUserNameRef = useRef<string | undefined>(currentUserName);
  currentUserNameRef.current = currentUserName;

  const activeChatGameIdRef = useRef<string | null | undefined>(activeChatGameId);
  activeChatGameIdRef.current = activeChatGameId;

  const activeChatSessionIdRef = useRef<string | null | undefined>(activeChatSessionId);
  activeChatSessionIdRef.current = activeChatSessionId;

  const activeChatGameTitleRef = useRef<string | null | undefined>(activeChatGameTitle);
  activeChatGameTitleRef.current = activeChatGameTitle;

  const [unreadState, setUnreadState] = useState<{ total: number; byGame: Record<string, number> }>({
    total: 0,
    byGame: {},
  });
  const countedMessageIdsRef = useRef<Set<string>>(new Set());

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
    if (activeChatGameId || activeChatSessionId) {
      const gId = activeChatGameId || undefined;
      const sId = activeChatSessionId || undefined;
      markGameChatAsRead(gId, sId, activeChatGameTitle || undefined, {
        id: currentUserId,
        name: currentUserName,
      });

      setUnreadState((prev) => {
        const c1 = gId ? (prev.byGame[gId] || 0) : 0;
        const c2 = sId ? (prev.byGame[sId] || 0) : 0;
        const prevGameCount = Math.max(c1, c2);
        if (prevGameCount === 0) return prev; // Avoid unnecessary re-render
        const nextByGame = { ...prev.byGame };
        if (gId) nextByGame[gId] = 0;
        if (sId) nextByGame[sId] = 0;
        return {
          total: Math.max(0, prev.total - prevGameCount),
          byGame: nextByGame,
        };
      });
    }
  }, [activeChatGameId, activeChatSessionId, activeChatGameTitle, currentUserId, currentUserName]);

  // 3. Listen to local read events and incoming chat notification events
  useEffect(() => {
    const handleReadEvent = (e: any) => {
      const readGameId = e.detail?.gameId;
      const readSessionId = e.detail?.alternateId;
      if (!readGameId && !readSessionId) return;

      setUnreadState((prev) => {
        const c1 = readGameId ? (prev.byGame[readGameId] || 0) : 0;
        const c2 = readSessionId ? (prev.byGame[readSessionId] || 0) : 0;
        const prevGameCount = Math.max(c1, c2);
        if (prevGameCount === 0) return prev; // Avoid unnecessary re-render
        const nextByGame = { ...prev.byGame };
        if (readGameId) nextByGame[readGameId] = 0;
        if (readSessionId) nextByGame[readSessionId] = 0;
        return {
          total: Math.max(0, prev.total - prevGameCount),
          byGame: nextByGame,
        };
      });
    };

    const handleChatNotificationReceived = (e: any) => {
      const notif = e.detail;
      if (!notif || notif.type !== 'chat') return;
      const gameId = notif.meta?.gameId || notif.meta?.sessionId;
      if (!gameId) return;

      const latestGames = gamesRef.current;
      const uId = currentUserIdRef.current;
      const uName = currentUserNameRef.current;
      const activeId = activeChatGameIdRef.current;
      const activeAltId = activeChatSessionIdRef.current;

      const targetGame = latestGames.find((g) => g.id === gameId || g.sessionId === gameId);
      if (!targetGame || !isUserAuthorizedForChat(targetGame, uId, uName)) return;

      // Ignore messages sent by current user
      const senderName = notif.senderName || notif.meta?.senderName;
      if (uName && senderName && senderName.trim().toLowerCase() === uName.trim().toLowerCase()) return;
      if (uId && notif.senderId && notif.senderId === uId) return;

      // If currently viewing this chat, mark as read immediately
      const isOpen =
        (activeId && (activeId === gameId || targetGame.id === activeId || targetGame.sessionId === activeId)) ||
        (activeAltId && (activeAltId === gameId || targetGame.id === activeAltId || targetGame.sessionId === activeAltId));

      if (isOpen) {
        markGameChatAsRead(targetGame.id, targetGame.sessionId, targetGame.title, { id: uId, name: uName });
        return;
      }

      const msgId = String(notif.meta?.messageId || notif.meta?.message_id || notif.id || '').trim();
      if (msgId) {
        if (countedMessageIdsRef.current.has(msgId)) return;
        countedMessageIdsRef.current.add(msgId);
      }

      setUnreadState((prev) => {
        const currentForGame = prev.byGame[targetGame.id] || 0;
        const nextCount = currentForGame + 1;
        const nextByGame: Record<string, number> = { ...prev.byGame, [targetGame.id]: nextCount };
        if (targetGame.sessionId) {
          nextByGame[String(targetGame.sessionId)] = nextCount;
        }
        return {
          total: prev.total + 1,
          byGame: nextByGame,
        };
      });
    };

    window.addEventListener('sportsync:chat_read', handleReadEvent);
    window.addEventListener('sportsync:notification-received', handleChatNotificationReceived);
    window.addEventListener('sportsync:notification-change', refreshUnread);
    return () => {
      window.removeEventListener('sportsync:chat_read', handleReadEvent);
      window.removeEventListener('sportsync:notification-received', handleChatNotificationReceived);
      window.removeEventListener('sportsync:notification-change', refreshUnread);
    };
  }, [refreshUnread]);

  // 4. Real-time updates via Supabase: established ONCE per user
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured) return;

    const subId = Math.random().toString(36).substring(2, 9);
    const channelName = `chat-global-unread-${currentUserId || 'anon'}-${subId}`;
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
          const activeAltId = activeChatSessionIdRef.current;

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
          const isOpen =
            (activeId && (activeId === row.game_id || targetGame.id === activeId || targetGame.sessionId === activeId)) ||
            (activeAltId && (activeAltId === row.game_id || targetGame.id === activeAltId || targetGame.sessionId === activeAltId));

          if (isOpen) {
            markGameChatAsRead(targetGame.id, targetGame.sessionId, targetGame.title, { id: uId, name: uName });
            return;
          }

          const msgId = String(row.id || '').trim();
          if (msgId) {
            if (countedMessageIdsRef.current.has(msgId)) return;
            countedMessageIdsRef.current.add(msgId);
          }

          // Otherwise increment unread count in real-time
          setUnreadState((prev) => {
            const currentForGame = prev.byGame[targetGame.id] || 0;
            const nextCount = currentForGame + 1;
            const nextByGame: Record<string, number> = { ...prev.byGame, [targetGame.id]: nextCount };
            if (targetGame.sessionId) {
              nextByGame[String(targetGame.sessionId)] = nextCount;
            }
            return {
              total: prev.total + 1,
              byGame: nextByGame,
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
