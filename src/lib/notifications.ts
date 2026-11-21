'use client';

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
 * Filter out legacy mock notifications, test items, or orphaned personal notifications
 * that have no recipient, preventing newly registered users from seeing false notifications.
 */
function sanitizeNotifications(list: NotificationItem[]): NotificationItem[] {
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

  const rId = (n.recipientId || n.meta?.recipientId || n.meta?.recipient_id || n.meta?.hostId || n.meta?.host_id)?.toString().trim().toLowerCase();
  const rName = (n.recipientName || n.meta?.recipientName || n.meta?.recipient_name || n.meta?.hostName || n.meta?.host_name)?.toString().trim().toLowerCase();
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

  // 2. Supabase Realtime WebSocket broadcast to host and universal notification channels
  const sb = getSupabaseClient();
  if (sb && isSupabaseConfigured) {
    try {
      const targetId = notif.recipientId || notif.meta?.hostId || notif.meta?.host_id;
      const targetName = (notif.recipientName || notif.meta?.hostName || notif.meta?.host_name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

      const targetChannels = [
        'sportsync-notifs-all',
        ...(targetId ? [`sportsync-notifs-${targetId}`] : []),
        ...(targetName ? [`sportsync-notifs-${targetName}`] : []),
      ];

      for (const chName of targetChannels) {
        try {
          const ch = sb.channel(chName);
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
                }, 2000);
              });
            }
          });
        } catch {}
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

export function resetNotificationCache(): void {
  cachedNotifications = null;
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
    const refreshed = sanitized.map((item) => ({
      ...item,
      recipientId: item.recipientId || item.meta?.hostId || item.meta?.host_id || item.meta?.recipientId,
      recipientName: item.recipientName || item.meta?.hostName || item.meta?.host_name || item.meta?.recipientName,
      senderName:
        item.senderName ||
        item.meta?.senderName ||
        item.meta?.sender_name ||
        item.meta?.joiningPlayerName ||
        item.meta?.joining_player_name ||
        item.meta?.hostName ||
        item.meta?.host_name,
      senderAvatar:
        item.senderAvatar ||
        item.meta?.senderAvatar ||
        item.meta?.sender_avatar ||
        item.meta?.joiningPlayerAvatar ||
        item.meta?.joining_player_avatar,
      time: formatRelativeTime(item.timestamp || Date.now()),
    }));

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
 * Fetch authenticated user notifications directly from Supabase.
 * Allows notifications to persist after refreshing, logging out, and logging back in.
 */
export async function fetchUserNotificationsFromSupabase(
  userFilter?: UserNotificationFilter
): Promise<NotificationItem[]> {
  const sb = getSupabaseClient();
  if (!sb || !isSupabaseConfigured || (!userFilter?.id && !userFilter?.name && !userFilter?.email)) {
    return [];
  }
  try {
    const uId = userFilter.id?.trim();
    const uName = userFilter.name?.trim();
    const uEmail = userFilter.email?.trim();

    const isUuid = (val?: string) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const conditions: string[] = ['type.eq.system'];
    if (uId && isUuid(uId)) {
      conditions.push(`user_id.eq.${uId}`);
    }
    if (uName) {
      conditions.push(`user_identifier.ilike.%${uName}%`);
      const firstName = uName.split(' ')[0];
      if (firstName && firstName !== uName && firstName.length >= 3) {
        conditions.push(`user_identifier.ilike.%${firstName}%`);
      }
    }
    if (uId && !isUuid(uId)) {
      conditions.push(`user_identifier.ilike.%${uId}%`);
    }
    if (uEmail) {
      conditions.push(`user_identifier.ilike.%${uEmail}%`);
    }

    let query = sb.from('notifications').select('*');
    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error || !Array.isArray(data)) {
      if (error) console.warn('[Notifications] Error fetching from Supabase:', error.message);
      return [];
    }

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
  } catch (err) {
    console.warn('[Notifications] Exception fetching user notifications from Supabase:', err);
    return [];
  }
}

export async function persistNotificationToSupabase(item: NotificationItem): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb || !isSupabaseConfigured) return false;
  try {
    const isUuid = (val?: string) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const recipientId = item.recipientId && isUuid(item.recipientId) ? item.recipientId : null;
    const { error } = await sb.from('notifications').insert({
      id: item.id && isUuid(item.id) ? item.id : undefined,
      user_id: recipientId,
      user_identifier: item.recipientName || item.recipientId || null,
      type: item.type,
      title: item.title,
      description: item.desc,
      read: item.read ?? false,
      link_screen: item.linkScreen || null,
      metadata: {
        ...(item.meta || {}),
        host_name: item.meta?.hostName || item.meta?.host_name || item.recipientName,
        host_id: item.meta?.hostId || item.meta?.host_id || item.recipientId,
        recipient_name: item.recipientName || item.meta?.recipientName,
        recipient_id: item.recipientId || item.meta?.recipientId,
        sender_name: item.senderName || item.meta?.senderName || item.meta?.joiningPlayerName,
        sender_avatar: item.senderAvatar || item.meta?.senderAvatar || item.meta?.joiningPlayerAvatar,
      },
    });
    if (error) {
      console.warn('[Notifications] Supabase insert warning (falling back to local):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Notifications] Exception saving notification to Supabase:', err);
    return false;
  }
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
  }
): NotificationItem {
  const current = getNotifications();
  const timestamp = input.timestamp || Date.now();
  const dedupeKey = input.meta?.dedupeKey || input.id;

  // Strict deduplication: check if already exists in memory or delivered keys
  if (input.id && current.some((n) => n.id === input.id)) {
    return current.find((n) => n.id === input.id)!;
  }
  const metaKey = input.meta?.dedupeKey;
  if (metaKey && current.some((n) => n.meta?.dedupeKey === metaKey)) {
    return current.find((n) => n.meta?.dedupeKey === metaKey)!;
  }
  if (dedupeKey && getDeliveredNotificationKeys().has(dedupeKey)) {
    const existing = current.find(
      (n) => n.id === input.id || (Boolean(metaKey) && n.meta?.dedupeKey === metaKey)
    );
    if (existing) return existing;
  }

  if (dedupeKey) {
    recordDeliveredNotificationKey(dedupeKey);
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
    recipientId: input.recipientId || input.meta?.hostId || input.meta?.host_id || input.meta?.recipientId,
    recipientName: input.recipientName || input.meta?.hostName || item_meta_host_name(input.meta),
    senderName: input.senderName || input.meta?.senderName || input.meta?.joiningPlayerName,
    senderAvatar: input.senderAvatar || input.meta?.senderAvatar || input.meta?.joiningPlayerAvatar,
    meta: {
      ...(input.meta || {}),
      hostName: input.recipientName || input.meta?.hostName,
      hostId: input.recipientId || input.meta?.hostId,
      recipientName: input.recipientName || input.meta?.recipientName,
      recipientId: input.recipientId || input.meta?.recipientId,
    },
  };

  const updated = [newNotif, ...current].slice(0, MAX_NOTIFICATIONS);
  persistNotifications(updated);

  // Background persist to Supabase if configured
  persistNotificationToSupabase(newNotif).catch(() => {});

  // Broadcast cross-tab and cross-device
  broadcastNotification(newNotif).catch(() => {});

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
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  persistNotifications(updated);

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

  const sb = getSupabaseClient();
  if (sb && isSupabaseConfigured && (userFilter?.id || userFilter?.name)) {
    const isUuid = (val?: string) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const conditions: string[] = [];
    if (userFilter.id && isUuid(userFilter.id)) conditions.push(`user_id.eq.${userFilter.id}`);
    if (userFilter.name) conditions.push(`user_identifier.ilike.${userFilter.name}`);

    if (conditions.length > 0) {
      sb.from('notifications').update({ read: true }).or(conditions.join(',')).then();
    }
  }
}

export function dismissNotification(id: string): void {
  const current = getNotifications();
  const updated = current.filter((n) => n.id !== id);
  persistNotifications(updated);

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
    refresh();

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
      if (!isMounted || remoteItems.length === 0) return;

      const current = getNotifications();
      const existingIds = new Set(current.map((n) => n.id));
      const newItemsFromRemote = remoteItems.filter((rn) => !existingIds.has(rn.id));

      if (newItemsFromRemote.length > 0) {
        const merged = [...newItemsFromRemote, ...current].sort((a, b) => b.timestamp - a.timestamp);
        persistNotifications(merged);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userFilter?.id, userFilter?.name, userFilter?.email]);

  // 3. Real-time updates via Supabase WebSocket for this user (broadcasts & postgres_changes)
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb || !isSupabaseConfigured || (!userFilter?.id && !userFilter?.name && !userFilter?.email)) return;

    const uId = userFilter.id?.trim();
    const uName = userFilter.name?.trim().toLowerCase();
    const cleanName = uName?.replace(/\s+/g, '_');

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
        addNotification(notifItem);
        notifyAll();
      }
    };

    const channelNames = [
      'sportsync-notifs-all',
      ...(uId ? [`sportsync-notifs-${uId}`] : []),
      ...(cleanName ? [`sportsync-notifs-${cleanName}`] : []),
    ];

    const activeChannels = channelNames.map((cName) => {
      return sb
        .channel(cName)
        .on('broadcast', { event: 'new_notification' }, handleIncoming)
        .on('broadcast', { event: 'notification' }, handleIncoming)
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
    });

    return () => {
      activeChannels.forEach((ch) => {
        try {
          sb.removeChannel(ch);
        } catch {}
      });
    };
  }, [userFilter?.id, userFilter?.name, userFilter?.email]);

  // 4. Strict recipient filtering to guarantee newly registered users never see false notifications
  const notifications = useMemo(() => {
    return allNotifications.filter((n: NotificationItem) => isNotificationForUser(n, userFilter));
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

