'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export type NotificationType =
  | 'booking'
  | 'match'
  | 'goal'
  | 'achievement'
  | 'wager'
  | 'chat'
  | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  desc: string;
  time: string;
  timestamp: number;
  read: boolean;
  linkScreen?: string;
  recipientId?: string;
  recipientName?: string;
  senderName?: string;
  senderAvatar?: string;
  meta?: Record<string, any>;
}

const STORAGE_KEY = 'sportsync_notifications';
const DELIVERED_KEYS_STORAGE = 'sportsync_sent_notifications';
const MAX_NOTIFICATIONS = 50;

function getDeliveredNotificationKeys(): Set<string> {
  const keys = new Set<string>();
  if (typeof window === 'undefined') return keys;
  try {
    const raw = localStorage.getItem(DELIVERED_KEYS_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((k) => typeof k === 'string' && keys.add(k));
      }
    }
  } catch {}
  return keys;
}

function recordDeliveredNotificationKey(key: string): void {
  if (typeof window === 'undefined' || !key) return;
  try {
    const existing = getDeliveredNotificationKeys();
    existing.add(key);
    localStorage.setItem(DELIVERED_KEYS_STORAGE, JSON.stringify(Array.from(existing).slice(-100)));
  } catch {}
}

export interface UserNotificationFilter {
  id?: string;
  name?: string;
  email?: string;
  username?: string;
}

/**
 * Canonical semantic identifier for any notification.
 * Normalizes dedupe keys, strips non-deterministic trailing timestamps (e.g. _1712345678901),
 * and creates deterministic identities for player join actions, matches, bookings, and chats.
 */
export function getSemanticKey(n?: Partial<NotificationItem> | null): string {
  if (!n) return '';

  const meta = n.meta || {};
  const rawKey = String(meta.dedupeKey || meta.dedupe_key || n.id || '').trim();

  // Strip trailing millisecond timestamps like _1732248900000 or -1732248900000
  const normalizedKey = rawKey.replace(/[_-]\d{10,14}$/, '');

  // 1. Specific canonical handler for chat notifications
  const isChatNotif =
    n.type === 'chat' ||
    n.linkScreen === 'match-chat' ||
    meta.event === 'new_chat_message' ||
    Boolean(n.title && n.title.toLowerCase().includes('new message')) ||
    rawKey.startsWith('chat_') ||
    rawKey.startsWith('notif_chat_');

  if (isChatNotif) {
    const rKey = (
      n.recipientId ||
      meta.recipientId ||
      meta.recipient_id ||
      n.recipientName ||
      meta.recipientName ||
      meta.recipient_name ||
      ''
    )
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');

    const directMsgId = meta.messageId || meta.message_id;
    if (directMsgId) {
      return rKey ? `chat_${directMsgId}_${rKey}` : `chat_${directMsgId}`;
    }

    // Try extracting UUID from rawKey / dedupeKey
    const uuidMatch = rawKey.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) {
      return rKey ? `chat_${uuidMatch[0]}_${rKey}` : `chat_${uuidMatch[0]}`;
    }

    // Try extracting msgId from chat_<msgId>_<recipient> or notif_chat_<msgId>_<recipient>
    const chatPrefixMatch = rawKey.match(/(?:notif_)?chat_([a-zA-Z0-9-]+?)(?:_[a-zA-Z0-9-_]+)?$/);
    if (chatPrefixMatch && chatPrefixMatch[1] && chatPrefixMatch[1] !== 'notif') {
      return rKey ? `chat_${chatPrefixMatch[1]}_${rKey}` : `chat_${chatPrefixMatch[1]}`;
    }

    // Fallback: match by game and content preview
    const gId = meta.gameId || meta.game_id || meta.sessionId || meta.session_id || meta.gameTitle || 'game';
    const content = (n.desc || meta.messageText || n.title || '').trim().toLowerCase().replace(/\s+/g, '_');
    return rKey ? `chat_${gId}_${content}_${rKey}` : `chat_${gId}_${content}`;
  }

  if (
    normalizedKey &&
    (normalizedKey.startsWith('player_joined_') ||
      normalizedKey.startsWith('match_joined_') ||
      normalizedKey.startsWith('player_confirmed_') ||
      normalizedKey.startsWith('join_') ||
      normalizedKey.startsWith('booking_') ||
      normalizedKey.startsWith('roster_') ||
      normalizedKey.startsWith('game_updated_') ||
      normalizedKey.startsWith('update_') ||
      normalizedKey.startsWith('game_deleted_') ||
      normalizedKey.startsWith('delete_game_') ||
      normalizedKey.startsWith('del_') ||
      normalizedKey.startsWith('participant_removed_') ||
      normalizedKey.startsWith('rem_') ||
      normalizedKey.startsWith('match_invitation_') ||
      normalizedKey.startsWith('invites_') ||
      normalizedKey.startsWith('member_left_') ||
      normalizedKey.startsWith('left_match_') ||
      normalizedKey.startsWith('achievement_') ||
      normalizedKey.startsWith('wager_'))
  ) {
    return normalizedKey;
  }

  // Handle player joined match / session notifications
  const gameId = meta.gameId || meta.game_id || meta.sessionId || meta.session_id;
  const joiner = (
    meta.joiningPlayerName ||
    meta.joining_player_name ||
    meta.joiningPlayerId ||
    meta.joining_player_id ||
    n.senderName ||
    meta.senderName ||
    meta.sender_name ||
    ''
  )
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  const host = (
    meta.hostName ||
    meta.host_name ||
    meta.hostId ||
    meta.host_id ||
    meta.recipientName ||
    meta.recipient_name ||
    n.recipientName ||
    n.recipientId ||
    ''
  )
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  const titleLower = (n.title || '').toLowerCase();
  const descLower = (n.desc || '').toLowerCase();

  if (gameId && (n.type === 'match' || titleLower.includes('joined') || descLower.includes('joined'))) {
    if (titleLower.includes('confirmed') || descLower.includes('confirmed') || meta.event === 'match_joined') {
      return `match_joined_${gameId}_${joiner || host || 'unknown'}`;
    }
    if (meta.event === 'player_joined' || titleLower.includes('joined')) {
      return `player_joined_${gameId}_${joiner || 'unknown'}_${host || 'unknown'}`;
    }
  }

  // Handle game update notifications
  if (gameId && (meta.event === 'game_updated' || titleLower.includes('details updated'))) {
    const targetRecipient = (n.recipientId || n.recipientName || meta.recipientId || meta.recipientName || 'player')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    return `game_updated_${gameId}_${targetRecipient}`;
  }

  // Handle game cancellation / deletion notifications
  if (gameId && (meta.event === 'game_deleted' || titleLower.includes('game cancelled') || descLower.includes('cancelled'))) {
    const targetRecipient = (n.recipientId || n.recipientName || meta.recipientId || meta.recipientName || 'player')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    return `game_deleted_${gameId}_${targetRecipient}`;
  }

  // Handle participant removal notifications
  if (gameId && (meta.event === 'participant_removed' || titleLower.includes('removed from match'))) {
    const targetRecipient = (n.recipientId || n.recipientName || meta.recipientId || meta.recipientName || 'player')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    return `participant_removed_${gameId}_${targetRecipient}`;
  }

  return (
    normalizedKey ||
    n.id ||
    `${n.type || 'notif'}_${n.title || ''}_${n.desc || ''}`.toLowerCase().replace(/\s+/g, '_')
  );
}

/**
 * Filter out legacy mock notifications, test items, or orphaned personal notifications
 * that have no recipient, preventing newly registered users from seeing false notifications.
 */
function sanitizeNotifications(list: NotificationItem[]): NotificationItem[] {
  const seenKeys = new Set<string>();
  return list.filter((n) => {
    if (!n || !n.id) return false;
    // Strip old mock IDs from previous static mockups
    if (['n1', 'n2', 'n3', 'n4', 'n5'].includes(n.id)) return false;
    if (n.title.includes('Northgate FC') || n.title.includes('Kensington RFC')) return false;

    // Strict rule: Strip any orphaned personal notifications (non-system) that have no recipient at all
    const hasRecipient = Boolean(
      n.recipientId ||
      n.recipientName ||
      n.meta?.hostName ||
      n.meta?.host_name ||
      n.meta?.hostId ||
      n.meta?.host_id ||
      n.meta?.recipientName ||
      n.meta?.recipient_name ||
      n.meta?.recipientId ||
      n.meta?.recipient_id ||
      n.meta?.targetUserId ||
      n.meta?.target_user_id
    );

    if (n.type !== 'system' && !hasRecipient) {
      return false;
    }

    // Chat deduplication & sender self-notification filter
    if (n.type === 'chat') {
      const sName = (n.senderName || n.meta?.senderName || '').trim().toLowerCase();
      const rName = (n.recipientName || n.meta?.recipientName || '').trim().toLowerCase();
      // Drop if sender is the recipient (never notify oneself about own sent message)
      if (sName && rName && sName === rName) {
        return false;
      }
    }

    const semKey = getSemanticKey(n);
    if (semKey) {
      if (seenKeys.has(semKey)) return false;
      seenKeys.add(semKey);
    }

    return true;
  });
}

/**
 * Checks whether a notification belongs to the specified user filter.
 * Handles ID matching (UUID, usr_ prefixes), full name matching, first-name matching,
 * metadata host/recipient matching, and system announcements.
 */
export function isNotificationForUser(
  n: NotificationItem,
  userFilter?: UserNotificationFilter
): boolean {
  if (!userFilter || (!userFilter.id && !userFilter.name && !userFilter.email && !userFilter.username)) {
    return n.type === 'system' && !n.recipientId && !n.recipientName;
  }

  const uId = userFilter.id?.trim().toLowerCase();
  const uName = userFilter.name?.trim().toLowerCase();
  const uFirst = uName ? uName.split(' ')[0] : undefined;
  const uEmail = userFilter.email?.trim().toLowerCase();
  const uUsername = userFilter.username?.trim().toLowerCase().replace(/^@/, '');

  // 0. SENDER EXCLUSION: If the user is the sender of this chat message, never notify them
  if (n.type === 'chat') {
    const sName = (n.senderName || n.meta?.senderName || n.meta?.sender_name)?.toString().trim().toLowerCase();
    const sId = (n.meta?.senderId || n.meta?.sender_id)?.toString().trim().toLowerCase();
    if (uId && sId && (uId === sId || uId.includes(sId) || sId.includes(uId))) return false;
    if (uName && sName && (uName === sName || uName.toLowerCase() === sName.toLowerCase())) return false;
    if (uUsername && sName && uUsername === sName) return false;
    if (uFirst && sName && uFirst === sName.split(' ')[0] && uFirst.length >= 2) return false;
  }

  const isChat = n.type === 'chat';
  const rId = (
    n.recipientId ||
    n.meta?.recipientId ||
    n.meta?.recipient_id ||
    (!isChat ? (n.meta?.hostId || n.meta?.host_id) : undefined)
  )?.toString().trim().toLowerCase();

  const rName = (
    n.recipientName ||
    n.meta?.recipientName ||
    n.meta?.recipient_name ||
    (!isChat ? (n.meta?.hostName || n.meta?.host_name) : undefined)
  )?.toString().trim().toLowerCase();

  const rFirst = rName ? rName.split(' ')[0] : undefined;
  const targetId = (n.meta?.targetUserId || n.meta?.target_user_id)?.toString().trim().toLowerCase();

  // 1. Direct ID match
  if (uId) {
    if (rId && (rId === uId || rId.includes(uId) || uId.includes(rId))) return true;
    if (targetId && (targetId === uId || targetId.includes(uId) || uId.includes(targetId))) return true;
  }

  // 2. Direct Name match
  if (uName && rName) {
    if (rName === uName) return true;
    if (rName.includes(uName) || uName.includes(rName)) return true;
    if (uFirst && rFirst && uFirst === rFirst && uFirst.length >= 2) return true;
  }

  // 3. Username match
  if (uUsername && rName) {
    if (rName === uUsername || rName.replace(/^@/, '') === uUsername) return true;
  }

  // 4. Email match
  if (uEmail) {
    if (rId && rId === uEmail) return true;
    if (rName && rName === uEmail) return true;
  }

  // 5. System announcement broadcast to all users
  if (n.type === 'system' && !n.recipientId && !n.recipientName && !rName && !rId) {
    return true;
  }

  return false;
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffSecs = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffSecs < 45) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  const notifDate = new Date(timestamp);
  const today = new Date();

  const isToday = notifDate.toDateString() === today.toDateString();
  if (isToday) return `${diffHours}h ago`;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (notifDate.toDateString() === yesterday.toDateString()) return 'Yesterday';

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return notifDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

// In-memory cache & listeners
let cachedNotifications: NotificationItem[] | null = null;
const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.warn('[Notifications] Listener notification error:', e);
    }
  });

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('sportsync:notification-change'));
    } catch {}
  }
}

// Multi-tab BroadcastChannel
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('sportsync_notifications_channel');
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'SYNC') {
        cachedNotifications = null;
        notifyAll();
      } else if (event.data?.type === 'NEW_NOTIFICATION' && event.data?.item) {
        const item: NotificationItem = event.data.item;
        const current = getNotifications();
        if (!current.some((n) => n.id === item.id || (n.meta?.dedupeKey && n.meta.dedupeKey === item.meta?.dedupeKey))) {
          persistNotifications([item, ...current].slice(0, MAX_NOTIFICATIONS));
        }
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('sportsync:notification-received', { detail: item }));
          } catch {}
        }
      }
    };
  } catch {}
}

function broadcastSync() {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'SYNC', timestamp: Date.now() });
    } catch {}
  }
}

/**
 * Broadcast a newly created notification across all tabs and via Supabase Realtime channels.
 */
export async function broadcastNotification(notif: NotificationItem): Promise<void> {
  // 1. Multi-tab local sync via browser BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'NEW_NOTIFICATION', item: notif });
    } catch {}
  }

  // 2. Supabase Realtime WebSocket broadcast
  // We send strictly to ONE targeted channel to prevent fan-out multiplication:
  // - If recipientId is present, send to sportsync-notifs-${recipientId}
  // - Else if recipientName is present, send to sportsync-notifs-${cleanName}
  // - Otherwise, send to sportsync-notifs-all (only for non-chat system notifications)
  const sb = getSupabaseClient();
  if (sb && isSupabaseConfigured) {
    try {
      const targetId = notif.recipientId || notif.meta?.hostId || notif.meta?.host_id;
      const targetName = (notif.recipientName || notif.meta?.hostName || notif.meta?.host_name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

      const isChat = notif.type === 'chat';
      let primaryChannel = '';

      if (targetId) {
        primaryChannel = `sportsync-notifs-${targetId}`;
      } else if (targetName) {
        primaryChannel = `sportsync-notifs-${targetName}`;
      } else if (!isChat) {
        primaryChannel = 'sportsync-notifs-all';
      }

      if (primaryChannel) {
        const ch = sb.channel(primaryChannel);
        if (typeof (ch as any).httpSend === 'function') {
          await (ch as any).httpSend('new_notification', notif).catch(() => {});
        }
        ch.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            ch.send({
              type: 'broadcast',
              event: 'new_notification',
              payload: notif,
            }).catch(() => {}).finally(() => {
              setTimeout(() => {
                try { sb.removeChannel(ch); } catch {}
              }, 1500);
            });
          }
        });
      }
    } catch (e) {
      console.warn('[Notifications] Realtime broadcast notice:', e);
    }
  }
}

// Storage event listener for cross-tab sync fallback
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      cachedNotifications = null;
      notifyAll();
    }
  });
}

export function resetNotificationCache(clearStorage: boolean = false): void {
  cachedNotifications = null;
  if (clearStorage && typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  notifyAll();
}

export function getNotifications(): NotificationItem[] {
  if (cachedNotifications !== null) {
    return cachedNotifications;
  }

  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedNotifications = [];
      return [];
    }

    const parsed: NotificationItem[] = JSON.parse(raw);
    const sanitized = sanitizeNotifications(Array.isArray(parsed) ? parsed : []);

    // Refresh relative times and backfill missing recipient details from meta
    const refreshed = sanitized.map((item) => {
      const isChat = item.type === 'chat';
      return {
        ...item,
        recipientId: item.recipientId || (!isChat ? (item.meta?.hostId || item.meta?.host_id) : undefined) || item.meta?.recipientId,
        recipientName: item.recipientName || (!isChat ? (item.meta?.hostName || item.meta?.host_name) : undefined) || item.meta?.recipientName,
        senderName:
          item.senderName ||
          item.meta?.senderName ||
          item.meta?.sender_name ||
          item.meta?.joiningPlayerName ||
          item.meta?.joining_player_name ||
          (!isChat ? (item.meta?.hostName || item.meta?.host_name) : undefined),
        senderAvatar:
          item.senderAvatar ||
          item.meta?.senderAvatar ||
          item.meta?.sender_avatar ||
          item.meta?.joiningPlayerAvatar ||
          item.meta?.joining_player_avatar,
        time: formatRelativeTime(item.timestamp || Date.now()),
      };
    });

    // If sanitization changed items, save clean copy
    if (sanitized.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
    }

    cachedNotifications = refreshed;
    return refreshed;
  } catch (err) {
    console.warn('[Notifications] Failed to load stored notifications:', err);
    cachedNotifications = [];
    return [];
  }
}

function persistNotifications(items: NotificationItem[]) {
  cachedNotifications = items;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[Notifications] Storage save failed:', e);
    }
  }
  broadcastSync();
  notifyAll();
}

/**
 * Fetch authenticated user notifications directly from Supabase / API.
 * Allows notifications to persist after refreshing, logging out, and logging back in.
 */
export async function fetchUserNotificationsFromSupabase(
  userFilter?: UserNotificationFilter
): Promise<NotificationItem[]> {
  if (!userFilter?.id && !userFilter?.name && !userFilter?.email) {
    return [];
  }

  const uId = userFilter.id?.trim();
  const uName = userFilter.name?.trim();
  const uEmail = userFilter.email?.trim();

  // 1. Fetch from server API endpoint (which handles admin client & users fallback)
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams();
      if (uId) params.set('userId', uId);
      if (uName) params.set('userName', uName);
      if (uEmail) params.set('email', uEmail);

      const res = await fetch(`/api/notifications?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.notifications)) {
          return json.notifications
            .map((item: any) => ({
              ...item,
              time: formatRelativeTime(item.timestamp || Date.now()),
            }))
            .filter((item: NotificationItem) => isNotificationForUser(item, userFilter));
        }
      }
    } catch (apiErr) {
      console.warn('[Notifications] API fetch note:', apiErr);
    }
  }

  // 2. Direct Supabase client query fallback
  const sb = getSupabaseClient();
  if (!sb || !isSupabaseConfigured) return [];

  try {
    const isUuid = (val?: string) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const conditions: string[] = ['type.eq.system'];
    if (uId && isUuid(uId)) conditions.push(`user_id.eq.${uId}`);
    if (uName) conditions.push(`user_identifier.ilike.*${uName}*`);
    if (uEmail) conditions.push(`user_identifier.ilike.*${uEmail}*`);

    const { data, error } = await sb
      .from('notifications')
      .select('*')
      .or(conditions.join(','))
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data
        .map((row: any) => ({
          id: row.id,
          type: (row.type as NotificationType) || 'match',
          title: row.title,
          desc: row.description,
          timestamp: new Date(row.created_at).getTime(),
          time: formatRelativeTime(new Date(row.created_at).getTime()),
          read: Boolean(row.read),
          linkScreen: row.link_screen,
          recipientId: row.user_id,
          recipientName: row.user_identifier,
          senderName:
            row.metadata?.sender_name ||
            row.metadata?.senderName ||
            row.metadata?.joining_player_name ||
            row.metadata?.joiningPlayerName ||
            row.metadata?.host_name ||
            row.metadata?.hostName,
          senderAvatar:
            row.metadata?.sender_avatar ||
            row.metadata?.senderAvatar ||
            row.metadata?.joining_player_avatar ||
            row.metadata?.joiningPlayerAvatar,
          meta: row.metadata,
        }))
        .filter((item: NotificationItem) => isNotificationForUser(item, userFilter));
    }
  } catch (err) {
    console.warn('[Notifications] Direct Supabase fetch note:', err);
  }

  return [];
}

export async function persistNotificationToSupabase(item: NotificationItem): Promise<boolean> {
  const semKey = getSemanticKey(item);
  const itemMeta: Record<string, any> = {
    ...(item.meta || {}),
    dedupeKey: item.meta?.dedupeKey || semKey,
  };
  const itemWithDedupe: NotificationItem = {
    ...item,
    meta: itemMeta,
  };

  // 1. Primary: Send via server API route (handles admin client, users fallback, and idempotency)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification: itemWithDedupe }),
      });
      if (res.ok) {
        return true;
      }
    } catch (apiErr) {
      console.warn('[Notifications] API persist fallback to client:', apiErr);
    }
  }

  // 2. Direct client insert fallback ONLY if server API was unreachable
  const sb = getSupabaseClient();
  if (!sb || !isSupabaseConfigured) return false;
  try {
    const isUuid = (val?: string) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    // Client idempotency check before insert
    if (semKey) {
      const { data: existing } = await sb
        .from('notifications')
        .select('id')
        .filter('metadata->>dedupeKey', 'eq', semKey)
        .limit(1)
        .maybeSingle();

      if (existing) {
        return true;
      }
    }

    const recipientId = itemWithDedupe.recipientId && isUuid(itemWithDedupe.recipientId) ? itemWithDedupe.recipientId : null;
    const { error: insertErr } = await sb.from('notifications').insert({
      id: itemWithDedupe.id && isUuid(itemWithDedupe.id) ? itemWithDedupe.id : undefined,
      user_id: recipientId,
      user_identifier: itemWithDedupe.recipientName || itemWithDedupe.recipientId || null,
      type: itemWithDedupe.type,
      title: itemWithDedupe.title,
      description: itemWithDedupe.desc,
      read: itemWithDedupe.read ?? false,
      link_screen: itemWithDedupe.linkScreen || null,
      metadata: {
        ...itemMeta,
        dedupeKey: semKey,
        host_name: itemMeta.hostName || itemMeta.host_name || itemWithDedupe.recipientName,
        host_id: itemMeta.hostId || itemMeta.host_id || itemWithDedupe.recipientId,
        recipient_name: itemWithDedupe.recipientName || itemMeta.recipientName,
        recipient_id: itemWithDedupe.recipientId || itemMeta.recipientId,
        sender_name: itemWithDedupe.senderName || itemMeta.senderName || itemMeta.joiningPlayerName,
        sender_avatar: itemWithDedupe.senderAvatar || itemMeta.senderAvatar || itemMeta.joiningPlayerAvatar,
      },
    });

    if (insertErr && (insertErr.code === '23505' || insertErr.message?.includes('duplicate key'))) {
      return true;
    }
    return !insertErr;
  } catch {
    return false;
  }
}

export interface AddNotificationOptions {
  skipPersist?: boolean;
  skipBroadcast?: boolean;
}

export function addNotification(
  input: Omit<NotificationItem, 'id' | 'timestamp' | 'read' | 'time'> & {
    id?: string;
    timestamp?: number;
    time?: string;
    read?: boolean;
    recipientId?: string;
    recipientName?: string;
    senderName?: string;
    senderAvatar?: string;
  },
  options: AddNotificationOptions = {}
): NotificationItem {
  const current = getNotifications();
  const timestamp = input.timestamp || Date.now();
  const isChat = input.type === 'chat';
  const semKey = getSemanticKey(input as any);

  // Strict deduplication: check if already exists in memory by ID or semantic key
  if (input.id && current.some((n) => n.id === input.id)) {
    return current.find((n) => n.id === input.id)!;
  }
  if (semKey && current.some((n) => getSemanticKey(n) === semKey)) {
    return current.find((n) => getSemanticKey(n) === semKey)!;
  }

  // Deduplicate against delivered notification keys
  if (semKey && getDeliveredNotificationKeys().has(semKey)) {
    const existing = current.find((n) => getSemanticKey(n) === semKey || n.id === input.id);
    if (existing) return existing;
    return {
      id: input.id || `notif_${semKey}`,
      type: input.type,
      title: input.title,
      desc: input.desc,
      timestamp,
      time: input.time || formatRelativeTime(timestamp),
      read: input.read ?? false,
      linkScreen: input.linkScreen,
      recipientId: input.recipientId,
      recipientName: input.recipientName,
      senderName: input.senderName,
      senderAvatar: input.senderAvatar,
      meta: { ...(input.meta || {}), dedupeKey: semKey },
    };
  }

  if (semKey) {
    recordDeliveredNotificationKey(semKey);
  }

  const newNotif: NotificationItem = {
    id: input.id || `notif_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    title: input.title,
    desc: input.desc,
    timestamp,
    time: input.time || formatRelativeTime(timestamp),
    read: input.read ?? false,
    linkScreen: input.linkScreen,
    recipientId: input.recipientId || (!isChat ? (input.meta?.hostId || input.meta?.host_id) : undefined) || input.meta?.recipientId,
    recipientName: input.recipientName || (!isChat ? (input.meta?.hostName || item_meta_host_name(input.meta)) : undefined) || input.meta?.recipientName,
    senderName: input.senderName || input.meta?.senderName || input.meta?.joiningPlayerName,
    senderAvatar: input.senderAvatar || input.meta?.senderAvatar || input.meta?.joiningPlayerAvatar,
    meta: {
      ...(input.meta || {}),
      dedupeKey: semKey,
      ...(isChat
        ? {}
        : {
            hostName: input.recipientName || input.meta?.hostName,
            hostId: input.recipientId || input.meta?.hostId,
          }),
      recipientName: input.recipientName || input.meta?.recipientName,
      recipientId: input.recipientId || input.meta?.recipientId,
    },
  };

  const updated = [newNotif, ...current].slice(0, MAX_NOTIFICATIONS);
  persistNotifications(updated);

  // Background persist to Supabase / API only if not skipped
  if (!options.skipPersist) {
    persistNotificationToSupabase(newNotif).catch(() => {});
  }

  // Broadcast cross-tab and cross-device only if not skipped
  if (!options.skipBroadcast) {
    broadcastNotification(newNotif).catch(() => {});
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('sportsync:notification-received', { detail: newNotif }));
    } catch {}
  }

  // Trigger optional browser native push if granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(newNotif.title, {
        body: newNotif.desc,
        icon: '/icon-192.png',
      });
    } catch {}
  }

  return newNotif;
}

function item_meta_host_name(meta?: Record<string, any>): string | undefined {
  return meta?.host_name || meta?.recipientName || meta?.recipient_name;
}

export function markAsRead(id: string, userFilter?: UserNotificationFilter): void {
  const current = getNotifications();
  const target = current.find((n) => n.id === id);
  const targetSemKey = target ? getSemanticKey(target) : '';

  const updated = current.map((n) => {
    if (n.id === id || (targetSemKey && getSemanticKey(n) === targetSemKey)) {
      return { ...n, read: true };
    }
    return n;
  });
  persistNotifications(updated);

  if (typeof window !== 'undefined') {
    fetch('/api/notifications', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'mark_read', userId: userFilter?.id, userName: userFilter?.name }),
    }).catch(() => {});
  }

  const sb = getSupabaseClient();
  if (sb && isSupabaseConfigured) {
    sb.from('notifications').update({ read: true }).eq('id', id).then();
  }
}

export function markAllAsRead(userFilter?: UserNotificationFilter): void {
  const current = getNotifications();

  const updated = current.map((n) => {
    if (!userFilter) {
      return { ...n, read: true };
    }
    return isNotificationForUser(n, userFilter) ? { ...n, read: true } : n;
  });
  persistNotifications(updated);

  if (typeof window !== 'undefined') {
    fetch('/api/notifications', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true, action: 'mark_read', userId: userFilter?.id, userName: userFilter?.name }),
    }).catch(() => {});
  }

  const sb = getSupabaseClient();
  if (sb && isSupabaseConfigured && (userFilter?.id || userFilter?.name)) {
    const isUuid = (val?: string) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const conditions: string[] = [];
    if (userFilter.id && isUuid(userFilter.id)) conditions.push(`user_id.eq.${userFilter.id}`);
    if (userFilter.name) conditions.push(`user_identifier.ilike.*${userFilter.name}*`);

    if (conditions.length > 0) {
      sb.from('notifications').update({ read: true }).or(conditions.join(',')).then();
    }
  }
}

export function dismissNotification(id: string): void {
  const current = getNotifications();
  const target = current.find((n) => n.id === id);
  const targetSemKey = target ? getSemanticKey(target) : '';

  const updated = current.filter((n) => {
    if (n.id === id) return false;
    if (targetSemKey && getSemanticKey(n) === targetSemKey) return false;
    return true;
  });
  persistNotifications(updated);

  if (typeof window !== 'undefined') {
    fetch('/api/notifications', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  const sb = getSupabaseClient();
  if (sb && isSupabaseConfigured) {
    sb.from('notifications').delete().eq('id', id).then();
  }
}

export function clearAllNotifications(userFilter?: UserNotificationFilter): void {
  if (!userFilter || (!userFilter.id && !userFilter.name && !userFilter.email)) {
    persistNotifications([]);
  } else {
    const current = getNotifications();
    const remaining = current.filter((n) => !isNotificationForUser(n, userFilter));
    persistNotifications(remaining);
  }

  if (typeof window !== 'undefined') {
    fetch('/api/notifications', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true, userId: userFilter?.id, userName: userFilter?.name }),
    }).catch(() => {});
  }

  const sb = getSupabaseClient();
  if (sb && isSupabaseConfigured && (userFilter?.id || userFilter?.name)) {
    const isUuid = (val?: string) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const conditions: string[] = [];
    if (userFilter.id && isUuid(userFilter.id)) conditions.push(`user_id.eq.${userFilter.id}`);
    if (userFilter.name) conditions.push(`user_identifier.ilike.${userFilter.name}`);

    if (conditions.length > 0) {
      sb.from('notifications').delete().or(conditions.join(',')).then();
    }
  }
}

export function getUnreadCount(userFilter?: UserNotificationFilter): number {
  const all = getNotifications();
  return all.filter((n) => !n.read && isNotificationForUser(n, userFilter)).length;
}

/**
 * Returns the count of unread chat notifications, either globally or scoped to a specific match.
 */
export function getUnreadChatNotificationsCount(
  gameIdentifier?: string | string[],
  gameTitle?: string,
  userFilter?: UserNotificationFilter
): number {
  const all = getNotifications();
  const rawIds = Array.isArray(gameIdentifier) ? gameIdentifier : [gameIdentifier];
  const cleanIds = rawIds.filter(Boolean).map((id) => (id as string).toLowerCase().trim());
  const cleanTitle = gameTitle?.toLowerCase().trim();

  const seen = new Set<string>();
  return all.filter((n) => {
    if (n.read || n.type !== 'chat') return false;
    if (userFilter && !isNotificationForUser(n, userFilter)) return false;

    if (cleanIds.length === 0 && !cleanTitle) {
      const key = getSemanticKey(n) || n.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true; // Global unread chat notifications count
    }

    const nGId = (n.meta?.gameId || '').toLowerCase().trim();
    const nSId = (n.meta?.sessionId || '').toLowerCase().trim();
    const nTitle = (n.meta?.gameTitle || '').toLowerCase().trim();

    const idMatches = cleanIds.some((cId) => cId && (nGId === cId || nSId === cId));
    const titleMatches = Boolean(
      cleanTitle &&
      nTitle &&
      (cleanTitle === nTitle || cleanTitle.includes(nTitle) || nTitle.includes(cleanTitle))
    );

    if (idMatches || titleMatches) {
      const key = getSemanticKey(n) || n.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }
    return false;
  }).length;
}

/**
 * Marks all chat notifications for a specific game as read (e.g. when opening that match chat).
 */
export function markGameChatNotificationsAsRead(
  gameIdentifier?: string | string[],
  gameTitle?: string,
  userFilter?: UserNotificationFilter
): void {
  const current = getNotifications();
  const rawIds = Array.isArray(gameIdentifier) ? gameIdentifier : [gameIdentifier];
  const cleanIds = rawIds.filter(Boolean).map((id) => (id as string).toLowerCase().trim());
  const cleanTitle = gameTitle?.toLowerCase().trim();

  if (cleanIds.length === 0 && !cleanTitle) return;
  const readIds: string[] = [];

  const updated = current.map((n) => {
    if (n.read || n.type !== 'chat') return n;
    if (userFilter && !isNotificationForUser(n, userFilter)) return n;

    const nGId = (n.meta?.gameId || '').toLowerCase().trim();
    const nSId = (n.meta?.sessionId || '').toLowerCase().trim();
    const nTitle = (n.meta?.gameTitle || '').toLowerCase().trim();

    const idMatches = cleanIds.some((cId) => cId && (nGId === cId || nSId === cId));
    const titleMatches = Boolean(
      cleanTitle &&
      nTitle &&
      (cleanTitle === nTitle || cleanTitle.includes(nTitle) || nTitle.includes(cleanTitle))
    );

    if (idMatches || titleMatches) {
      readIds.push(n.id);
      return { ...n, read: true };
    }
    return n;
  });

  if (readIds.length > 0) {
    persistNotifications(updated);

    // Sync to Supabase in background
    if (typeof window !== 'undefined') {
      readIds.forEach((id) => {
        fetch('/api/notifications', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action: 'mark_read', userId: userFilter?.id, userName: userFilter?.name }),
        }).catch(() => {});
      });

      // Also tell the server to mark all matching chat notifications as read for this game
      fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_chat_read',
          gameIds: cleanIds,
          gameTitle: cleanTitle,
          userId: userFilter?.id,
          userName: userFilter?.name,
        }),
      }).catch(() => {});
    }

    const sb = getSupabaseClient();
    if (sb && isSupabaseConfigured) {
      sb.from('notifications').update({ read: true }).in('id', readIds).then();
    }
  }
}

// Shared Realtime Subscription Manager to prevent duplicate channels and handlers across component mounts
interface SharedRealtimeSub {
  subKey: string;
  refCount: number;
  channels: any[];
  cleanupTimer: any;
}

let activeSharedRealtime: SharedRealtimeSub | null = null;

/**
 * React Hook for real-time notification subscriptions with authentic recipient filtering,
 * automatic Supabase persistence, and live WebSocket updates across devices.
 */
export function useNotifications(userFilter?: UserNotificationFilter) {
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>(() => getNotifications());

  const refresh = useCallback(() => {
    cachedNotifications = null;
    setAllNotifications(getNotifications());
  }, []);

  // 1. Initial listener and relative time ticker
  useEffect(() => {
    listeners.add(refresh);

    // Re-check relative times every 45 seconds so timestamps stay up to date
    const interval = setInterval(() => {
      setAllNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          time: formatRelativeTime(n.timestamp),
        }))
      );
    }, 45000);

    return () => {
      listeners.delete(refresh);
      clearInterval(interval);
    };
  }, [refresh]);

  // 2. Fetch authenticated user notifications from Supabase on mount / login
  useEffect(() => {
    if (!userFilter?.id && !userFilter?.name && !userFilter?.email) return;

    let isMounted = true;
    fetchUserNotificationsFromSupabase(userFilter).then((remoteItems) => {
      if (!isMounted || !Array.isArray(remoteItems)) return;

      const current = getNotifications();
      const mergedMap = new Map<string, NotificationItem>();

      // 1. Seed with remote items fetched from Supabase, keyed by semantic key
      remoteItems.forEach((r) => {
        const key = getSemanticKey(r);
        if (key) mergedMap.set(key, r);
      });

      // 2. Merge local items, collapsing identical semantic keys
      current.forEach((c) => {
        const key = getSemanticKey(c);
        if (!key) return;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, c);
        } else {
          const rem = mergedMap.get(key)!;
          mergedMap.set(key, {
            ...rem,
            ...c,
            read: c.read || rem.read,
            // Keep the UUID from Supabase if available so database operations like markAsRead work
            id: (rem.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rem.id)) ? rem.id : c.id,
          });
        }
      });

      const merged = Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
      persistNotifications(merged);
    });

    return () => {
      isMounted = false;
    };
  }, [userFilter?.id, userFilter?.name, userFilter?.email]);

  // 3. Real-time updates via Supabase WebSocket (Shared singleton manager across all component instances)
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb || !isSupabaseConfigured || (!userFilter?.id && !userFilter?.name && !userFilter?.email)) return;

    const uId = userFilter.id?.trim();
    const uName = userFilter.name?.trim().toLowerCase();
    const cleanName = uName?.replace(/\s+/g, '_');
    const subKey = [uId || '', cleanName || '', (userFilter.email || '').trim().toLowerCase()].join('|');

    const handleIncoming = (rawPayload: any) => {
      if (!rawPayload) return;
      const row = rawPayload.payload || rawPayload.item || rawPayload.new || rawPayload;
      if (!row) return;

      const notifItem: NotificationItem = {
        id: row.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: (row.type as NotificationType) || 'match',
        title: row.title || 'Notification',
        desc: row.description || row.desc || '',
        timestamp: row.timestamp || (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
        time: formatRelativeTime(row.timestamp || (row.created_at ? new Date(row.created_at).getTime() : Date.now())),
        read: Boolean(row.read),
        linkScreen: row.link_screen || row.linkScreen,
        recipientId: row.user_id || row.recipientId,
        recipientName: row.user_identifier || row.recipientName,
        senderName:
          row.metadata?.sender_name ||
          row.metadata?.senderName ||
          row.metadata?.joining_player_name ||
          row.metadata?.joiningPlayerName ||
          row.senderName,
        senderAvatar:
          row.metadata?.sender_avatar ||
          row.metadata?.senderAvatar ||
          row.metadata?.joining_player_avatar ||
          row.metadata?.joiningPlayerAvatar ||
          row.senderAvatar,
        meta: row.metadata || row.meta,
      };

      if (isNotificationForUser(notifItem, userFilter)) {
        // Break echo loops: skip persist and broadcast since originator already did so
        addNotification(notifItem, { skipPersist: true, skipBroadcast: true });
        notifyAll();
      }
    };

    if (activeSharedRealtime && activeSharedRealtime.subKey === subKey) {
      if (activeSharedRealtime.cleanupTimer) {
        clearTimeout(activeSharedRealtime.cleanupTimer);
        activeSharedRealtime.cleanupTimer = null;
      }
      activeSharedRealtime.refCount++;
    } else {
      if (activeSharedRealtime) {
        if (activeSharedRealtime.cleanupTimer) {
          clearTimeout(activeSharedRealtime.cleanupTimer);
        }
        activeSharedRealtime.channels.forEach((ch) => {
          try { sb.removeChannel(ch); } catch {}
        });
        activeSharedRealtime = null;
      }

      const channels: any[] = [];

      // A. Targeted channel for this user
      const userChannelName = uId ? `sportsync-notifs-${uId}` : (cleanName ? `sportsync-notifs-${cleanName}` : null);
      if (userChannelName) {
        const uCh = sb
          .channel(userChannelName)
          .on('broadcast', { event: 'new_notification' }, handleIncoming)
          .on('broadcast', { event: 'notification' }, handleIncoming)
          .subscribe();
        channels.push(uCh);
      }

      // B. Universal channel for system alerts
      const allCh = sb
        .channel('sportsync-notifs-all')
        .on('broadcast', { event: 'new_notification' }, handleIncoming)
        .on('broadcast', { event: 'notification' }, handleIncoming)
        .subscribe();
      channels.push(allCh);

      // C. Database change listener registered strictly ONCE per client
      const dbCh = sb
        .channel(`sportsync-db-notifs-${uId || cleanName || 'all'}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload: any) => handleIncoming(payload.new)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications' },
          (payload: any) => {
            const row = payload.new;
            if (!row || !row.id) return;
            if (row.read) {
              const current = getNotifications();
              const updated = current.map((n) => (n.id === row.id ? { ...n, read: true } : n));
              persistNotifications(updated);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notifications' },
          (payload: any) => {
            const old = payload.old;
            if (old?.id) {
              dismissNotification(old.id);
            }
          }
        )
        .subscribe();
      channels.push(dbCh);

      activeSharedRealtime = {
        subKey,
        refCount: 1,
        channels,
        cleanupTimer: null,
      };
    }

    return () => {
      if (activeSharedRealtime && activeSharedRealtime.subKey === subKey) {
        activeSharedRealtime.refCount--;
        if (activeSharedRealtime.refCount <= 0) {
          activeSharedRealtime.cleanupTimer = setTimeout(() => {
            if (activeSharedRealtime && activeSharedRealtime.refCount <= 0) {
              activeSharedRealtime.channels.forEach((ch) => {
                try { sb.removeChannel(ch); } catch {}
              });
              activeSharedRealtime = null;
            }
          }, 3000);
        }
      }
    };
  }, [userFilter?.id, userFilter?.name, userFilter?.email]);

  // 4. Strict recipient filtering to guarantee newly registered users never see false notifications
  const notifications = useMemo(() => {
    const list = allNotifications.filter((n: NotificationItem) => isNotificationForUser(n, userFilter));
    const seen = new Set<string>();
    return list.filter((n) => {
      const key = getSemanticKey(n) || n.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allNotifications, userFilter?.id, userFilter?.name, userFilter?.email, userFilter?.username]);

  const unreadCount = notifications.filter((n: NotificationItem) => !n.read).length;

  return {
    notifications,
    allNotifications,
    unreadCount,
    addNotification,
    markAsRead: (id: string) => markAsRead(id, userFilter),
    markAllAsRead: () => markAllAsRead(userFilter),
    dismissNotification,
    clearAllNotifications: () => clearAllNotifications(userFilter),
    isLive: true,
  };
}

