/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken, serverGetUser, SanitizedUser } from '@/lib/auth/serverAuth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NOTIFICATIONS = 50;

function isUuid(val?: unknown): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

// In-memory server-side fallback store by user ID / user name
const globalForNotifications = globalThis as unknown as {
  sportsyncNotificationStore?: Map<string, any[]>;
};

const notifStore = globalForNotifications.sportsyncNotificationStore || new Map<string, any[]>();
if (!globalForNotifications.sportsyncNotificationStore) {
  globalForNotifications.sportsyncNotificationStore = notifStore;
}

async function authenticateRequest(request: NextRequest): Promise<SanitizedUser | null> {
  const tokenCookie =
    request.cookies.get('sportsync-auth-token')?.value ||
    request.cookies.get('sb-access-token')?.value;
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  let token = bearerToken || tokenCookie || null;

  if (!token) {
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.includes('-auth-token')) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookie.value));
          if (Array.isArray(parsed) && parsed[0]) {
            token = parsed[0];
            break;
          } else if (parsed?.access_token) {
            token = parsed.access_token;
            break;
          }
        } catch {
          if (cookie.value && cookie.value.length > 20) {
            token = cookie.value;
            break;
          }
        }
      }
    }
  }

  if (!token) return null;

  const verified = verifySessionToken(token);
  if (verified) {
    const user = await serverGetUser(verified.userId);
    if (user) return user;
  }

  if (isSupabaseConfigured) {
    const sb = createServerClient(token);
    if (sb) {
      const { data, error } = await sb.auth.getUser(token);
      if (!error && data?.user?.id) {
        const user = await serverGetUser(data.user.id);
        if (user) return user;

        const meta = data.user.user_metadata || {};
        const fullName = meta.full_name || meta.name || data.user.email?.split('@')[0] || 'Player';
        return {
          id: data.user.id,
          auth_id: data.user.id,
          email: data.user.email || '',
          full_name: fullName,
          nickname: meta.nickname || fullName.split(' ')[0] || 'Player',
          avatar_url: meta.avatar_url || 'alex',
          role: 'player',
          onboarding_completed: true,
          created_at: data.user.created_at || new Date().toISOString(),
        };
      }
    }
  }

  return null;
}

function isTargetingAuthenticatedUser(
  authUser: SanitizedUser,
  params: { userId?: string | null; userName?: string | null; userEmail?: string | null }
): boolean {
  const { userId, userName, userEmail } = params;
  const authIds = [authUser.id, authUser.auth_id]
    .filter((v): v is string => Boolean(v))
    .map((v) => v.trim().toLowerCase());
  const authNames = [authUser.full_name, authUser.nickname]
    .filter((v): v is string => Boolean(v))
    .map((v) => v.trim().toLowerCase());
  const authEmail = (authUser.email || '').trim().toLowerCase();

  if (userId && userId.trim()) {
    const reqId = userId.trim().toLowerCase();
    if (!authIds.includes(reqId) && reqId !== authEmail && !authNames.includes(reqId)) {
      return false;
    }
  }

  if (userName && userName.trim()) {
    const reqName = userName.trim().toLowerCase();
    if (!authNames.includes(reqName) && !authIds.includes(reqName) && reqName !== authEmail) {
      return false;
    }
  }

  if (userEmail && userEmail.trim()) {
    const reqEmail = userEmail.trim().toLowerCase();
    if (authEmail && reqEmail !== authEmail) {
      return false;
    }
  }

  return true;
}

/**
 * GET /api/notifications?userId=...&userName=...&email=...
 * Retrieves notifications strictly for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reqUserId = searchParams.get('userId')?.trim();
    const reqUserName = searchParams.get('userName')?.trim();
    const reqUserEmail = searchParams.get('email')?.trim();

    if (
      !isTargetingAuthenticatedUser(authUser, {
        userId: reqUserId,
        userName: reqUserName,
        userEmail: reqUserEmail,
      })
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot read notifications for another user.' },
        { status: 403 }
      );
    }

    const userId = authUser.id;
    const userName = authUser.full_name?.trim();
    const userEmail = authUser.email?.trim();

    if (!isSupabaseConfigured) {
      const memList = notifStore.get((userId || userName || '').toLowerCase()) || [];
      return NextResponse.json({ success: true, notifications: memList });
    }

    const supabase = createAdminClient() || createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: true, notifications: [] });
    }

    // 1. Try public.notifications table scoped to authenticated user
    try {
      const conditions: string[] = ['type.eq.system'];
      if (userId && isUuid(userId)) {
        conditions.push(`user_id.eq.${userId}`);
        conditions.push(`user_identifier.eq.${userId}`);
      }
      if (authUser.auth_id && isUuid(authUser.auth_id) && authUser.auth_id !== userId) {
        conditions.push(`user_id.eq.${authUser.auth_id}`);
      }
      if (userEmail) conditions.push(`user_identifier.eq.${userEmail}`);
      if (!userId && userName) conditions.push(`user_identifier.eq.${userName}`);

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
      } else if (userEmail) {
        query = query.eq('email', userEmail);
      } else if (userName) {
        query = query.ilike('full_name', userName);
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
 * Requires authentication and scopes mutations strictly to the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const notif = body.notification;
    if (!notif || !notif.title) {
      return NextResponse.json({ success: false, error: 'Valid notification is required.' }, { status: 400 });
    }

    const requestedRecipientId = notif.recipientId || notif.meta?.recipientId || notif.meta?.hostId || null;
    const requestedRecipientName = notif.recipientName || notif.meta?.recipientName || notif.meta?.hostName || null;

    if (
      (requestedRecipientId || requestedRecipientName) &&
      !isTargetingAuthenticatedUser(authUser, {
        userId: requestedRecipientId,
        userName: requestedRecipientName,
      })
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot write notifications for another user.' },
        { status: 403 }
      );
    }

    const recipientId = isUuid(authUser.id) ? authUser.id : null;
    const recipientName = authUser.full_name || authUser.nickname || '';

    if (!isSupabaseConfigured) {
      const recipient = (recipientId || recipientName || 'global').toLowerCase();
      const current = notifStore.get(recipient) || [];
      notifStore.set(recipient, [notif, ...current].slice(0, MAX_NOTIFICATIONS));
      return NextResponse.json({ success: true });
    }

    const supabase = createAdminClient() || createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database client not available.' }, { status: 500 });
    }

    const recipientKey = (recipientId || recipientName || 'recipient')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');
    const rawDedupeKey = String(notif.meta?.dedupeKey || notif.id || '').trim();
    const dedupeKey =
      rawDedupeKey && rawDedupeKey.startsWith('chat_') && !rawDedupeKey.endsWith(`_${recipientKey}`)
        ? `${rawDedupeKey}_${recipientKey}`
        : rawDedupeKey;
    const nowIso = new Date().toISOString();

    // 1. Idempotency Check scoped to this user
    if (dedupeKey) {
      try {
        let dupQuery = supabase
          .from('notifications')
          .select('id, read, created_at')
          .filter('metadata->>dedupeKey', 'eq', dedupeKey);
        if (recipientId) {
          dupQuery = dupQuery.eq('user_id', recipientId);
        } else if (recipientName) {
          dupQuery = dupQuery.ilike('user_identifier', recipientName);
        }
        const { data: existing } = await dupQuery.limit(1).maybeSingle();

        if (existing) {
          return NextResponse.json({
            success: true,
            deduplicated: true,
            id: existing.id,
          });
        }
      } catch {}
    }

    // 1b. Chat Message ID Deduplication scoped to this user
    const msgId = notif.meta?.messageId || notif.meta?.message_id;
    if (msgId) {
      try {
        let msgQuery = supabase
          .from('notifications')
          .select('id')
          .filter('metadata->>messageId', 'eq', msgId);
        if (recipientId) {
          msgQuery = msgQuery.eq('user_id', recipientId);
        } else if (recipientName) {
          msgQuery = msgQuery.ilike('user_identifier', recipientName);
        }
        const { data: existingMsg } = await msgQuery.limit(1).maybeSingle();

        if (existingMsg) {
          return NextResponse.json({
            success: true,
            deduplicated: true,
            id: existingMsg.id,
          });
        }
      } catch {}
    }

    // 2. Secondary Deduplication: Avoid duplicate rapid notifications for the same recipient
    if (notif.title && notif.desc && (recipientId || recipientName)) {
      try {
        let dupQuery = supabase.from('notifications').select('id');
        if (recipientId) {
          dupQuery = dupQuery.eq('user_id', recipientId);
        } else {
          dupQuery = dupQuery.ilike('user_identifier', recipientName);
        }
        const { data: recentDup } = await dupQuery
          .eq('title', notif.title)
          .eq('description', notif.desc)
          .limit(1)
          .maybeSingle();

        if (recentDup) {
          return NextResponse.json({
            success: true,
            deduplicated: true,
            id: recentDup.id,
          });
        }
      } catch {}
    }

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
        dedupeKey,
        host_name: notif.meta?.hostName || notif.meta?.host_name || recipientName,
        host_id: notif.meta?.hostId || notif.meta?.host_id || recipientId,
        recipient_name: recipientName,
        recipient_id: recipientId,
        sender_name: notif.senderName || notif.meta?.senderName || notif.meta?.joiningPlayerName,
        sender_avatar: notif.senderAvatar || notif.meta?.senderAvatar || notif.meta?.joiningPlayerAvatar,
      },
      created_at: nowIso,
    };

    let tableSaved = false;
    // 3. Try public.notifications table
    try {
      const { error: insertErr } = await supabase.from('notifications').insert(notifRow);
      if (!insertErr) {
        tableSaved = true;
      } else if (insertErr.code === '23505' || insertErr.message?.includes('duplicate key')) {
        return NextResponse.json({ success: true, deduplicated: true });
      }
    } catch {}

    // 4. Fallback to public.users table if notifications table does not exist
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

          if (!existingNotifs.some((n: any) => n.id === notif.id || (n.meta?.dedupeKey && n.meta.dedupeKey === dedupeKey))) {
            const updated = [{ ...notif, recipientId, recipientName, meta: { ...(notif.meta || {}), dedupeKey } }, ...existingNotifs].slice(0, MAX_NOTIFICATIONS);
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
    if (!currentMem.some((n: any) => n.id === notif.id || (n.meta?.dedupeKey && n.meta.dedupeKey === dedupeKey))) {
      notifStore.set(memKey, [{ ...notif, recipientId, recipientName, meta: { ...(notif.meta || {}), dedupeKey } }, ...currentMem].slice(0, MAX_NOTIFICATIONS));
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
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, ids, all, action, gameIds, gameTitle, userId: reqUserId, userName: reqUserName } = body;

    if (!isTargetingAuthenticatedUser(authUser, { userId: reqUserId, userName: reqUserName })) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot modify notifications for another user.' },
        { status: 403 }
      );
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true });
    }

    const supabase = createAdminClient() || createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: true });
    }

    const userId = authUser.id;
    const userName = authUser.full_name?.trim();
    const isChatRead = action === 'mark_chat_read';
    const targetGameIds: string[] = Array.isArray(gameIds) ? gameIds.map((g: any) => String(g).toLowerCase().trim()) : [];
    const cleanGameTitle = typeof gameTitle === 'string' ? gameTitle.toLowerCase().trim() : '';

    // 1. Try public.notifications table scoped strictly to authenticated user
    try {
      const userConditions: string[] = [];
      if (userId && isUuid(userId)) userConditions.push(`user_id.eq.${userId}`);
      if (authUser.auth_id && isUuid(authUser.auth_id) && authUser.auth_id !== userId) {
        userConditions.push(`user_id.eq.${authUser.auth_id}`);
      }
      if (!userId && userName) userConditions.push(`user_identifier.eq.${userName}`);

      const explicitIds: string[] = Array.isArray(ids) ? ids.filter((v: any) => typeof v === 'string' && v.trim()) : [];
      if (explicitIds.length > 0 && userConditions.length > 0) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', explicitIds)
          .or(userConditions.join(','));
      }

      if (isChatRead && (targetGameIds.length > 0 || cleanGameTitle) && userConditions.length > 0) {
        const { data: chatRows } = await supabase
          .from('notifications')
          .select('id, metadata')
          .eq('type', 'chat')
          .eq('read', false)
          .or(userConditions.join(','));

        if (Array.isArray(chatRows) && chatRows.length > 0) {
          const matchIds = chatRows.filter((r) => {
            const meta = r.metadata || {};
            const nGId = String(meta.gameId || meta.game_id || '').toLowerCase().trim();
            const nSId = String(meta.sessionId || meta.session_id || '').toLowerCase().trim();
            const nTitle = String(meta.gameTitle || meta.game_title || '').toLowerCase().trim();

            const idMatch = targetGameIds.some((tId) => tId && (nGId === tId || nSId === tId));
            const titleMatch = Boolean(
              cleanGameTitle &&
              nTitle &&
              (cleanGameTitle === nTitle || cleanGameTitle.includes(nTitle) || nTitle.includes(cleanGameTitle))
            );
            return idMatch || titleMatch;
          }).map((r) => r.id);

          if (matchIds.length > 0) {
            await supabase
              .from('notifications')
              .update({ read: true })
              .in('id', matchIds)
              .or(userConditions.join(','));
          }
        }
      } else if (all && userConditions.length > 0) {
        await supabase.from('notifications').update({ read: true }).or(userConditions.join(','));
      } else if (id && userConditions.length > 0) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id)
          .or(userConditions.join(','));
      }
    } catch {}

    // 2. Also update fallback storage in public.users table for authenticated user
    try {
      let userQuery = supabase.from('users').select('id, equipped_gear');
      if (userId && isUuid(userId)) {
        userQuery = userQuery.or(`id.eq.${userId},auth_id.eq.${userId}`);
      } else if (userName) {
        userQuery = userQuery.ilike('full_name', userName);
      }

      const { data: userRow } = await userQuery.limit(1).maybeSingle();
      if (userRow?.equipped_gear && typeof userRow.equipped_gear === 'object') {
        const currentGear = userRow.equipped_gear as any;
        const savedNotifs = Array.isArray(currentGear._sportsync_notifications)
          ? currentGear._sportsync_notifications
          : [];

        const updated = savedNotifs.map((n: any) => {
          if (isChatRead && n.type === 'chat') {
            const meta = n.meta || {};
            const nGId = String(meta.gameId || meta.game_id || '').toLowerCase().trim();
            const nSId = String(meta.sessionId || meta.session_id || '').toLowerCase().trim();
            const nTitle = String(meta.gameTitle || meta.game_title || '').toLowerCase().trim();
            const idMatch = targetGameIds.some((tId) => tId && (nGId === tId || nSId === tId));
            const titleMatch = Boolean(
              cleanGameTitle &&
              nTitle &&
              (cleanGameTitle === nTitle || cleanGameTitle.includes(nTitle) || nTitle.includes(cleanGameTitle))
            );
            if (idMatch || titleMatch) return { ...n, read: true };
          }
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
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, all, userId: reqUserId, userName: reqUserName } = body;

    if (!isTargetingAuthenticatedUser(authUser, { userId: reqUserId, userName: reqUserName })) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot delete notifications for another user.' },
        { status: 403 }
      );
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true });
    }

    const supabase = createAdminClient() || createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: true });
    }

    const userId = authUser.id;
    const userName = authUser.full_name?.trim();
    const userConditions: string[] = [];
    if (userId && isUuid(userId)) userConditions.push(`user_id.eq.${userId}`);
    if (authUser.auth_id && isUuid(authUser.auth_id) && authUser.auth_id !== userId) {
      userConditions.push(`user_id.eq.${authUser.auth_id}`);
    }
    if (!userId && userName) userConditions.push(`user_identifier.eq.${userName}`);

    // 1. Try public.notifications table scoped strictly to authenticated user
    try {
      if (all && userConditions.length > 0) {
        await supabase.from('notifications').delete().or(userConditions.join(','));
      } else if (id && userConditions.length > 0) {
        await supabase
          .from('notifications')
          .delete()
          .eq('id', id)
          .or(userConditions.join(','));
      }
    } catch {}

    // 2. Also update fallback storage in public.users table for authenticated user
    try {
      let userQuery = supabase.from('users').select('id, equipped_gear');
      if (userId && isUuid(userId)) {
        userQuery = userQuery.or(`id.eq.${userId},auth_id.eq.${userId}`);
      } else if (userName) {
        userQuery = userQuery.ilike('full_name', userName);
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
