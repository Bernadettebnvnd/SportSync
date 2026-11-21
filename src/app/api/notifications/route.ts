import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken, serverGetUser } from '@/lib/auth/serverAuth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NOTIFICATIONS = 50;

function isUuid(val?: unknown): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

function isTableMissingError(err?: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('relation "public.notifications" does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('notifications')
  );
}

// In-memory server-side fallback store by user ID / user name
const globalForNotifications = globalThis as unknown as {
  sportsyncNotificationStore?: Map<string, any[]>;
};

const notifStore = globalForNotifications.sportsyncNotificationStore || new Map<string, any[]>();
if (!globalForNotifications.sportsyncNotificationStore) {
  globalForNotifications.sportsyncNotificationStore = notifStore;
}

/**
 * GET /api/notifications?userId=...&userName=...&email=...
 * Retrieves notifications for the user from Supabase public.notifications or fallback user storage.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId')?.trim();
    const userName = searchParams.get('userName')?.trim();
    const userEmail = searchParams.get('email')?.trim();

    if (!userId && !userName && !userEmail) {
      return NextResponse.json({ success: true, notifications: [] });
    }

    if (!isSupabaseConfigured) {
      const memList = notifStore.get(userId || userName || '') || [];
      return NextResponse.json({ success: true, notifications: memList });
    }

    const supabase = createAdminClient() || createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: true, notifications: [] });
    }

    // 1. Try public.notifications table
    try {
      const conditions: string[] = ['type.eq.system'];
      if (userId && isUuid(userId)) conditions.push(`user_id.eq.${userId}`);
      if (userName) conditions.push(`user_identifier.ilike.*${userName}*`);
      if (userEmail) conditions.push(`user_identifier.ilike.*${userEmail}*`);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(conditions.join(','))
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS);

      if (!error && Array.isArray(data) && data.length > 0) {
        return NextResponse.json({
          success: true,
          notifications: data.map((row: any) => ({
            id: row.id,
            type: row.type || 'match',
            title: row.title,
            desc: row.description,
            timestamp: new Date(row.created_at).getTime(),
            read: Boolean(row.read),
            linkScreen: row.link_screen,
            recipientId: row.user_id,
            recipientName: row.user_identifier,
            senderName:
              row.metadata?.sender_name ||
              row.metadata?.senderName ||
              row.metadata?.joining_player_name ||
              row.metadata?.host_name ||
              row.metadata?.hostName,
            senderAvatar:
              row.metadata?.sender_avatar ||
              row.metadata?.senderAvatar ||
              row.metadata?.joining_player_avatar,
            meta: row.metadata,
          })),
        });
      }
    } catch {}

    // 2. Fallback to public.users table (equipped_gear._sportsync_notifications)
    try {
      let query = supabase.from('users').select('id, full_name, equipped_gear');
      if (userId && isUuid(userId)) {
        query = query.or(`id.eq.${userId},auth_id.eq.${userId}`);
      } else if (userName) {
        query = query.ilike('full_name', userName);
      } else if (userEmail) {
        query = query.eq('email', userEmail);
      }

      const { data: userRow } = await query.limit(1).maybeSingle();
      if (userRow?.equipped_gear && typeof userRow.equipped_gear === 'object') {
        const saved = (userRow.equipped_gear as any)._sportsync_notifications;
        if (Array.isArray(saved) && saved.length > 0) {
          return NextResponse.json({ success: true, notifications: saved });
        }
      }
    } catch (e) {
      console.warn('[/api/notifications GET fallback error]', e);
    }

    // 3. Fallback to in-memory store
    const memKey = (userId || userName || userEmail || '').toLowerCase();
    const memList = notifStore.get(memKey) || [];
    return NextResponse.json({ success: true, notifications: memList });
  } catch (err: any) {
    console.error('[/api/notifications GET error]', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Body: { notification: NotificationItem }
 * Saves notification to Supabase public.notifications or fallback user storage, and broadcasts.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const notif = body.notification;
    if (!notif || !notif.title) {
      return NextResponse.json({ success: false, error: 'Valid notification is required.' }, { status: 400 });
    }

    if (!isSupabaseConfigured) {
      const recipient = (notif.recipientId || notif.recipientName || 'global').toLowerCase();
      const current = notifStore.get(recipient) || [];
      notifStore.set(recipient, [notif, ...current].slice(0, MAX_NOTIFICATIONS));
      return NextResponse.json({ success: true });
    }

    const supabase = createAdminClient() || createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database client not available.' }, { status: 500 });
    }

    const recipientId = notif.recipientId && isUuid(notif.recipientId) ? notif.recipientId : null;
    const recipientName = notif.recipientName || notif.meta?.recipientName || notif.meta?.hostName || '';
    const nowIso = new Date().toISOString();

    const notifRow = {
      id: notif.id && isUuid(notif.id) ? notif.id : undefined,
      user_id: recipientId,
      user_identifier: recipientName || recipientId || null,
      type: notif.type || 'match',
      title: notif.title,
      description: notif.desc || '',
      read: notif.read ?? false,
      link_screen: notif.linkScreen || null,
      metadata: {
        ...(notif.meta || {}),
        host_name: notif.meta?.hostName || notif.meta?.host_name || recipientName,
        host_id: notif.meta?.hostId || notif.meta?.host_id || recipientId,
        recipient_name: recipientName || notif.meta?.recipientName,
        recipient_id: notif.recipientId || notif.meta?.recipientId,
        sender_name: notif.senderName || notif.meta?.senderName || notif.meta?.joiningPlayerName,
        sender_avatar: notif.senderAvatar || notif.meta?.senderAvatar || notif.meta?.joiningPlayerAvatar,
      },
      created_at: nowIso,
    };

    let tableSaved = false;
    // 1. Try public.notifications table
    try {
      const { error: insertErr } = await supabase.from('notifications').insert(notifRow);
      if (!insertErr) {
        tableSaved = true;
      }
    } catch {}

    // 2. Fallback to public.users table if notifications table does not exist
    if (!tableSaved) {
      try {
        let userQuery = supabase.from('users').select('id, equipped_gear');
        if (recipientId && isUuid(recipientId)) {
          userQuery = userQuery.or(`id.eq.${recipientId},auth_id.eq.${recipientId}`);
        } else if (recipientName) {
          userQuery = userQuery.ilike('full_name', recipientName.trim());
        }

        const { data: userRow } = await userQuery.limit(1).maybeSingle();
        if (userRow?.id) {
          const currentGear = typeof userRow.equipped_gear === 'object' && userRow.equipped_gear ? userRow.equipped_gear : {};
          const existingNotifs = Array.isArray((currentGear as any)._sportsync_notifications)
            ? (currentGear as any)._sportsync_notifications
            : [];

          if (!existingNotifs.some((n: any) => n.id === notif.id || (n.meta?.dedupeKey && n.meta.dedupeKey === notif.meta?.dedupeKey))) {
            const updated = [notif, ...existingNotifs].slice(0, MAX_NOTIFICATIONS);
            await supabase
              .from('users')
              .update({
                equipped_gear: { ...currentGear, _sportsync_notifications: updated },
                updated_at: nowIso,
              })
              .eq('id', userRow.id);
          }
        }
      } catch (e) {
        console.warn('[/api/notifications POST fallback error]', e);
      }
    }

    // In-memory server cache update
    const memKey = (recipientId || recipientName || 'global').toLowerCase();
    const currentMem = notifStore.get(memKey) || [];
    if (!currentMem.some((n: any) => n.id === notif.id)) {
      notifStore.set(memKey, [notif, ...currentMem].slice(0, MAX_NOTIFICATIONS));
    }

    // 3. Broadcast across Supabase Realtime channels (chat notifications only go to recipient channels)
    const isChat = notif.type === 'chat';
    const targetChannels = [
      ...(!isChat ? ['sportsync-notifs-all'] : []),
      ...(recipientId ? [`sportsync-notifs-${recipientId}`] : []),
      ...(recipientName ? [`sportsync-notifs-${recipientName.toLowerCase().replace(/\s+/g, '_')}`] : []),
    ];

    for (const chName of targetChannels) {
      try {
        const ch = supabase.channel(chName);
        if (typeof (ch as any).httpSend === 'function') {
          await (ch as any).httpSend('new_notification', notifRow).catch(() => {});
        }
        ch.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            ch.send({
              type: 'broadcast',
              event: 'new_notification',
              payload: notifRow,
            }).catch(() => {}).finally(() => {
              setTimeout(() => {
                try { supabase.removeChannel(ch); } catch {}
              }, 1500);
            });
          }
        });
      } catch {}
    }

    return NextResponse.json({ success: true, saved: true });
  } catch (err: any) {
    console.error('[/api/notifications POST error]', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Body: { action: 'mark_read', id?: string, all?: boolean, userId?: string, userName?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, all, userId, userName } = body;

    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true });
    }

    const supabase = createAdminClient() || createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: true });
    }

    // 1. Try public.notifications table
    try {
      if (all) {
        const conditions: string[] = [];
        if (userId && isUuid(userId)) conditions.push(`user_id.eq.${userId}`);
        if (userName) conditions.push(`user_identifier.ilike.*${userName}*`);
        if (conditions.length > 0) {
          await supabase.from('notifications').update({ read: true }).or(conditions.join(','));
        }
      } else if (id) {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
      }
    } catch {}

    // 2. Also update fallback storage in public.users table
    try {
      let userQuery = supabase.from('users').select('id, equipped_gear');
      if (userId && isUuid(userId)) {
        userQuery = userQuery.or(`id.eq.${userId},auth_id.eq.${userId}`);
      } else if (userName) {
        userQuery = userQuery.ilike('full_name', userName.trim());
      }

      const { data: userRow } = await userQuery.limit(1).maybeSingle();
      if (userRow?.equipped_gear && typeof userRow.equipped_gear === 'object') {
        const currentGear = userRow.equipped_gear as any;
        const savedNotifs = Array.isArray(currentGear._sportsync_notifications)
          ? currentGear._sportsync_notifications
          : [];

        const updated = savedNotifs.map((n: any) => {
          if (all || (id && n.id === id)) {
            return { ...n, read: true };
          }
          return n;
        });

        await supabase
          .from('users')
          .update({
            equipped_gear: { ...currentGear, _sportsync_notifications: updated },
            updated_at: new Date().toISOString(),
          })
          .eq('id', userRow.id);
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications
 * Body: { id?: string, all?: boolean, userId?: string, userName?: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, all, userId, userName } = body;

    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true });
    }

    const supabase = createAdminClient() || createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: true });
    }

    // 1. Try public.notifications table
    try {
      if (all) {
        const conditions: string[] = [];
        if (userId && isUuid(userId)) conditions.push(`user_id.eq.${userId}`);
        if (userName) conditions.push(`user_identifier.ilike.*${userName}*`);
        if (conditions.length > 0) {
          await supabase.from('notifications').delete().or(conditions.join(','));
        }
      } else if (id) {
        await supabase.from('notifications').delete().eq('id', id);
      }
    } catch {}

    // 2. Also update fallback storage in public.users table
    try {
      let userQuery = supabase.from('users').select('id, equipped_gear');
      if (userId && isUuid(userId)) {
        userQuery = userQuery.or(`id.eq.${userId},auth_id.eq.${userId}`);
      } else if (userName) {
        userQuery = userQuery.ilike('full_name', userName.trim());
      }

      const { data: userRow } = await userQuery.limit(1).maybeSingle();
      if (userRow?.equipped_gear && typeof userRow.equipped_gear === 'object') {
        const currentGear = userRow.equipped_gear as any;
        const savedNotifs = Array.isArray(currentGear._sportsync_notifications)
          ? currentGear._sportsync_notifications
          : [];

        const remaining = all ? [] : savedNotifs.filter((n: any) => n.id !== id);

        await supabase
          .from('users')
          .update({
            equipped_gear: { ...currentGear, _sportsync_notifications: remaining },
            updated_at: new Date().toISOString(),
          })
          .eq('id', userRow.id);
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
