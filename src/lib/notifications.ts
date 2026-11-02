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

// Filter out any legacy mock items with fake IDs or teams
function sanitizeNotifications(list: NotificationItem[]): NotificationItem[] {
  return list.filter((n) => {
    if (!n || !n.id) return false;
    // Strip old mock IDs from previous static mockups
    if (['n1', 'n2', 'n3', 'n4', 'n5'].includes(n.id)) return false;
    if (n.title.includes('Northgate FC') || n.title.includes('Kensington RFC')) return false;
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

export async function persistNotificationToSupabase(item: NotificationItem): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb || !isSupabaseConfigured) return false;
  try {
    const recipientId = item.recipientId && item.recipientId.length === 36 ? item.recipientId : null;
    const { error } = await sb.from('notifications').insert({
      user_id: recipientId,
      user_identifier: item.recipientName || item.recipientId || null,
      type: item.type,
      title: item.title,
      description: item.desc,
      read: item.read ?? false,
      link_screen: item.linkScreen || null,
      metadata: item.meta || {},
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

export function markAsRead(id: string): void {
  const current = getNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  persistNotifications(updated);
}

export function markAllAsRead(): void {
  const current = getNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  persistNotifications(updated);
}

export function dismissNotification(id: string): void {
  const current = getNotifications();
  const updated = current.filter((n) => n.id !== id);
  persistNotifications(updated);
}

export function clearAllNotifications(): void {
  persistNotifications([]);
}

export function getUnreadCount(userFilter?: { id?: string; name?: string }): number {
  const all = getNotifications();
  if (!userFilter || (!userFilter.id && !userFilter.name)) {
    return all.filter((n) => !n.read).length;
  }
  const currentName = userFilter.name?.trim().toLowerCase();
  const currentId = userFilter.id;
  return all.filter((n) => {
    if (n.read) return false;
    if (!n.recipientName && !n.recipientId) return true;
    if (currentId && n.recipientId === currentId) return true;
    if (currentName && n.recipientName && n.recipientName.trim().toLowerCase() === currentName) return true;
    return false;
  }).length;
}

/**
 * React Hook for real-time notification subscriptions with optional user recipient filtering
 */
export function useNotifications(userFilter?: { id?: string; name?: string }) {
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>(() => getNotifications());

  const refresh = useCallback(() => {
    cachedNotifications = null;
    setAllNotifications(getNotifications());
  }, []);

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

  const notifications = useMemo(() => {
    if (!userFilter || (!userFilter.id && !userFilter.name)) {
      return allNotifications;
    }
    const currentName = userFilter.name?.trim().toLowerCase();
    const currentId = userFilter.id;
    return allNotifications.filter((n: NotificationItem) => {
      // Broadcast notifications (without recipient) are viewable by all
      if (!n.recipientName && !n.recipientId) return true;
      if (currentId && n.recipientId === currentId) return true;
      if (currentName && n.recipientName && n.recipientName.trim().toLowerCase() === currentName) return true;
      return false;
    });
  }, [allNotifications, userFilter?.id, userFilter?.name]);

  const unreadCount = notifications.filter((n: NotificationItem) => !n.read).length;

  return {
    notifications,
    allNotifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    isLive: true,
  };
}

// Connect Supabase Realtime when Supabase is active
if (typeof window !== 'undefined') {
  try {
    const sb = getSupabaseClient();
    if (sb && isSupabaseConfigured) {
      // 1. Listen for new bookings
      sb.channel('sportsync-live-notifications-bookings')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          (payload: any) => {
            if (payload.eventType === 'INSERT') {
              const b = payload.new;
              addNotification({
                type: 'booking',
                title: 'New Booking Confirmed',
                desc: `Reservation ${b.booking_reference || ''} is now active.`,
                linkScreen: 'my-bookings',
                recipientId: b.user_id,
              });
            }
          }
        )
        .subscribe();

      // 2. Listen for new notifications
      sb.channel('sportsync-live-notifications-table')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload: any) => {
            if (payload.new) {
              const n = payload.new;
              addNotification({
                id: n.id,
                type: (n.type as NotificationType) || 'match',
                title: n.title,
                desc: n.description,
                linkScreen: n.link_screen,
                recipientId: n.user_id,
                recipientName: n.user_identifier,
                meta: n.metadata,
              });
            }
          }
        )
        .subscribe();
    }
  } catch (err) {
    console.warn('[Notifications] Realtime listener initialization skipped:', err);
  }
}


