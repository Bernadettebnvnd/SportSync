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

    // Strict rule: Strip any orphaned personal notifications (non-system) that have no recipient
    if (n.type !== 'system' && !n.recipientId && !n.recipientName) {
      return false;
    }

    return true;
  });
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

    // Refresh relative times
    const refreshed = sanitized.map((item) => ({
      ...item,
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
  userFilter?: { id?: string; name?: string }
): Promise<NotificationItem[]> {
  const sb = getSupabaseClient();
  if (!sb || !isSupabaseConfigured || (!userFilter?.id && !userFilter?.name)) {
    return [];
  }
  try {
    const uId = userFilter.id;
    const uName = userFilter.name;

    let query = sb.from('notifications').select('*');
    if (uId && uName) {
      query = query.or(`user_id.eq.${uId},user_identifier.eq.${uName},type.eq.system`);
    } else if (uId) {
      query = query.or(`user_id.eq.${uId},type.eq.system`);
    } else if (uName) {
      query = query.or(`user_identifier.eq.${uName},type.eq.system`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error || !Array.isArray(data)) {
      return [];
    }

    return data
      .filter((row: any) => {
        if (!row || !row.id) return false;
        if (row.type !== 'system' && !row.user_id && !row.user_identifier) return false;
        return true;
      })
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
          row.metadata?.host_name ||
          row.metadata?.hostName ||
          row.metadata?.joining_player_name ||
          row.metadata?.joiningPlayerName ||
          row.metadata?.leaving_player_name ||
          row.metadata?.leavingPlayerName,
        senderAvatar: row.metadata?.sender_avatar || row.metadata?.senderAvatar,
        meta: row.metadata,
      }));
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
        sender_name: item.senderName || item.meta?.senderName || item.meta?.hostName || item.meta?.joiningPlayerName,
        sender_avatar: item.senderAvatar || item.meta?.senderAvatar,
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
    recipientId: input.recipientId,
    recipientName: input.recipientName,
    senderName: input.senderName,
    senderAvatar: input.senderAvatar,
    meta: input.meta,
  };

  const updated = [newNotif, ...current].slice(0, MAX_NOTIFICATIONS);
  persistNotifications(updated);

  // Background persist to Supabase if configured
  persistNotificationToSupabase(newNotif).catch(() => {});

  // Trigger optional browser native push if granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(newNotif.title, {
        body: newNotif.desc,
        icon: '/favicon.ico',
      });
    } catch {}
  }

  return newNotif;
}

export function markAsRead(id: string, userFilter?: { id?: string; name?: string }): void {
  const current = getNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  persistNotifications(updated);

  const sb = getSupabaseClient();
  if (sb && isSupabaseConfigured) {
    sb.from('notifications').update({ read: true }).eq('id', id).then();
  }
}

export function markAllAsRead(userFilter?: { id?: string; name?: string }): void {
  const current = getNotifications();
  const currentId = userFilter?.id;
  const currentName = userFilter?.name?.trim().toLowerCase();

  const updated = current.map((n) => {
    if (!userFilter || (!currentId && !currentName)) {
      return { ...n, read: true };
    }
    const isForUser = Boolean(
      (currentId && n.recipientId === currentId) ||
      (currentName && n.recipientName && n.recipientName.trim().toLowerCase() === currentName) ||
      (!n.recipientId && !n.recipientName && n.type === 'system')
    );
    return isForUser ? { ...n, read: true } : n;
  });
  persistNotifications(updated);

  const sb = getSupabaseClient();
  if (sb && isSupabaseConfigured && (currentId || currentName)) {
    if (currentId && currentName) {
      sb.from('notifications').update({ read: true }).or(`user_id.eq.${currentId},user_identifier.eq.${currentName}`).then();
    } else if (currentId) {
      sb.from('notifications').update({ read: true }).eq('user_id', currentId).then();
    } else if (currentName) {
      sb.from('notifications').update({ read: true }).eq('user_identifier', currentName).then();
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

export function clearAllNotifications(userFilter?: { id?: string; name?: string }): void {
  const currentId = userFilter?.id;
  const currentName = userFilter?.name?.trim().toLowerCase();

  if (!userFilter || (!currentId && !currentName)) {
    persistNotifications([]);
  } else {
    const current = getNotifications();
    const remaining = current.filter((n) => {
      const isForUser = Boolean(
        (currentId && n.recipientId === currentId) ||
        (currentName && n.recipientName && n.recipientName.trim().toLowerCase() === currentName)
      );
      return !isForUser;
    });
    persistNotifications(remaining);
  }

  const sb = getSupabaseClient();
  if (sb && isSupabaseConfigured) {
    if (currentId && currentName) {
      sb.from('notifications').delete().or(`user_id.eq.${currentId},user_identifier.eq.${currentName}`).then();
    } else if (currentId) {
      sb.from('notifications').delete().eq('user_id', currentId).then();
    } else if (currentName) {
      sb.from('notifications').delete().eq('user_identifier', currentName).then();
    }
  }
}

export function getUnreadCount(userFilter?: { id?: string; name?: string }): number {
  const all = getNotifications();
  if (!userFilter || (!userFilter.id && !userFilter.name)) {
    // Unauthenticated or guest: only system announcements without recipient
    return all.filter((n) => !n.read && n.type === 'system' && !n.recipientId && !n.recipientName).length;
  }
  const currentName = userFilter.name?.trim().toLowerCase();
  const currentId = userFilter.id;
  return all.filter((n) => {
    if (n.read) return false;
    // Strict recipient match: personal notifications MUST match user
    if (currentId && n.recipientId && n.recipientId === currentId) return true;
    if (currentName && n.recipientName && n.recipientName.trim().toLowerCase() === currentName) return true;
    if (!n.recipientName && !n.recipientId && n.type === 'system') return true;
    return false;
  }).length;
}

/**
 * React Hook for real-time notification subscriptions with authentic recipient filtering,
 * automatic Supabase persistence, and live WebSocket updates.
 */
export function useNotifications(userFilter?: { id?: string; name?: string }) {
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
    if (!userFilter?.id && !userFilter?.name) return;

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
  }, [userFilter?.id, userFilter?.name]);

  // 3. Real-time updates via Supabase WebSocket for this user
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb || !isSupabaseConfigured || (!userFilter?.id && !userFilter?.name)) return;

    const uId = userFilter.id;
    const uName = userFilter.name?.trim().toLowerCase();
    const channelName = `sportsync-notifs-${uId || uName || 'anon'}`;

    const channel = sb
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;

          const isForUser = Boolean(
            (uId && row.user_id && row.user_id === uId) ||
            (uName && row.user_identifier && row.user_identifier.trim().toLowerCase() === uName) ||
            (row.type === 'system' && !row.user_id && !row.user_identifier)
          );

          if (isForUser) {
            addNotification({
              id: row.id,
              type: (row.type as NotificationType) || 'match',
              title: row.title,
              desc: row.description,
              read: Boolean(row.read),
              linkScreen: row.link_screen,
              recipientId: row.user_id,
              recipientName: row.user_identifier,
              senderName:
                row.metadata?.sender_name ||
                row.metadata?.senderName ||
                row.metadata?.host_name ||
                row.metadata?.hostName ||
                row.metadata?.joining_player_name ||
                row.metadata?.joiningPlayerName ||
                row.metadata?.leaving_player_name ||
                row.metadata?.leavingPlayerName,
              senderAvatar: row.metadata?.sender_avatar || row.metadata?.senderAvatar,
              meta: row.metadata,
              timestamp: new Date(row.created_at).getTime(),
            });
          }
        }
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

    return () => {
      try {
        sb.removeChannel(channel);
      } catch {}
    };
  }, [userFilter?.id, userFilter?.name]);

  // 4. Strict recipient filtering to guarantee newly registered users never see false notifications
  const notifications = useMemo(() => {
    if (!userFilter || (!userFilter.id && !userFilter.name)) {
      return allNotifications.filter((n) => n.type === 'system' && !n.recipientId && !n.recipientName);
    }
    const currentName = userFilter.name?.trim().toLowerCase();
    const currentId = userFilter.id;
    return allNotifications.filter((n: NotificationItem) => {
      // Direct recipient match by ID
      if (currentId && n.recipientId && n.recipientId === currentId) return true;
      // Direct recipient match by Name
      if (currentName && n.recipientName && n.recipientName.trim().toLowerCase() === currentName) return true;
      // Only generic system announcements without recipients can be viewed by all
      if (!n.recipientName && !n.recipientId && n.type === 'system') return true;
      return false;
    });
  }, [allNotifications, userFilter?.id, userFilter?.name]);

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
