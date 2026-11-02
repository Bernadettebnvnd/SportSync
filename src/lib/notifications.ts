'use client';

import { useState, useEffect, useCallback } from 'react';
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
  meta?: Record<string, any>;
}

const STORAGE_KEY = 'sportsync_notifications';
const MAX_NOTIFICATIONS = 50;

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

export function addNotification(
  input: Omit<NotificationItem, 'id' | 'timestamp' | 'read' | 'time'> & {
    id?: string;
    timestamp?: number;
    time?: string;
    read?: boolean;
  }
): NotificationItem {
  const current = getNotifications();
  const timestamp = input.timestamp || Date.now();
  const newNotif: NotificationItem = {
    id: input.id || `notif_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    title: input.title,
    desc: input.desc,
    timestamp,
    time: input.time || formatRelativeTime(timestamp),
    read: input.read ?? false,
    linkScreen: input.linkScreen,
    meta: input.meta,
  };

  const updated = [newNotif, ...current].slice(0, MAX_NOTIFICATIONS);
  persistNotifications(updated);

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

export function getUnreadCount(): number {
  return getNotifications().filter((n) => !n.read).length;
}

/**
 * React Hook for real-time notification subscriptions
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getNotifications());

  const refresh = useCallback(() => {
    cachedNotifications = null;
    setNotifications(getNotifications());
  }, []);

  useEffect(() => {
    listeners.add(refresh);
    refresh();

    // Re-check relative times every 45 seconds so timestamps stay up to date
    const interval = setInterval(() => {
      setNotifications((prev) =>
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
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
      sb.channel('sportsync-live-notifications')
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

