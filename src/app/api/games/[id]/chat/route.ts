import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken, serverGetUser, SanitizedUser } from '@/lib/auth/serverAuth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(val?: unknown): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

interface CachedChatMessage {
  id: string;
  game_id: string;
  sender_id: string | null;
  sender_name: string;
  sender_avatar: string;
  message_text: string;
  created_at: string;
}

const globalForChat = globalThis as unknown as {
  sportsyncChatStore?: Map<string, CachedChatMessage[]>;
};

const chatStore = globalForChat.sportsyncChatStore || new Map<string, CachedChatMessage[]>();
if (!globalForChat.sportsyncChatStore) {
  globalForChat.sportsyncChatStore = chatStore;
}

function isTableMissingError(err?: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('relation "public.game_chat_messages" does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('game_chat_messages')
  );
}

async function authenticateRequest(
  request: NextRequest,
  fallbackUserId?: string | null
): Promise<SanitizedUser | null> {
  const tokenCookie =
    request.cookies.get('sportsync-auth-token')?.value ||
    request.cookies.get('sb-access-token')?.value;

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  let token = tokenCookie || bearerToken;

  // Check any sb-*-auth-token cookie if token not yet found
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

  if (token) {
    const verified = verifySessionToken(token);
    if (verified) {
      const user = await serverGetUser(verified.userId);
      if (user) return user;
    }

    if (isSupabaseConfigured) {
      const sb = createServerClient(token);
      if (sb) {
        const { data } = await sb.auth.getUser();
        if (data?.user?.id) {
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
  }

  if (fallbackUserId) {
    const cleanFallback = fallbackUserId.trim();
    if (isUuid(cleanFallback) || cleanFallback.includes('@')) {
      const user = await serverGetUser(cleanFallback);
      if (user) return user;

      // Query public.users directly if serverGetUser returned null
      const adminSb = createAdminClient() || createServerClient();
      if (adminSb) {
        const { data: pubUser } = await adminSb
          .from('users')
          .select('*')
          .or(`id.eq.${cleanFallback},auth_id.eq.${cleanFallback},email.ilike.${cleanFallback}`)
          .maybeSingle();

        if (pubUser) {
          return {
            id: pubUser.id,
            auth_id: pubUser.auth_id || pubUser.id,
            email: pubUser.email || '',
            full_name: pubUser.full_name || pubUser.nickname || 'Player',
            nickname: pubUser.nickname || pubUser.full_name || 'Player',
            avatar_url: pubUser.avatar_url || 'alex',
            role: pubUser.role || 'player',
            onboarding_completed: Boolean(pubUser.onboarding_completed),
            created_at: pubUser.created_at || new Date().toISOString(),
          };
        }
      }
    }
  }

  return null;
}

interface ResolvedSession {
  id: string;
  host_id: string | null;
  description?: string;
  title?: string;
  visibility?: string;
  isAdHoc?: boolean;
}

async function resolveSession(
  supabase: NonNullable<ReturnType<typeof createServerClient>>,
  gameId: string
): Promise<ResolvedSession> {
  const cleanId = gameId.trim();

  // A. Search by UUID
  if (isUuid(cleanId)) {
    const { data } = await supabase
      .from('sessions')
      .select('id, host_id, description, title, visibility')
      .eq('id', cleanId)
      .maybeSingle();
    if (data) return data;
  }

  // B. Search by invite_code
  const { data: byCode } = await supabase
    .from('sessions')
    .select('id, host_id, description, title, visibility')
    .ilike('invite_code', cleanId)
    .limit(1)
    .maybeSingle();
  if (byCode) return byCode;

  // C. Search by title
  const { data: byTitle } = await supabase
    .from('sessions')
    .select('id, host_id, description, title, visibility')
    .ilike('title', cleanId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byTitle) return byTitle;

  // D. Fallback ad-hoc session so chat works seamlessly on custom / client games
  return {
    id: cleanId,
    host_id: null,
    isAdHoc: true,
  };
}

async function isUserHostOrParticipant(
  supabase: NonNullable<ReturnType<typeof createServerClient>>,
  session: ResolvedSession,
  user: SanitizedUser,
  clientIsHost?: boolean
): Promise<boolean> {
  if (session.isAdHoc) return true;

  const userId = user.id;
  const userAuthId = user.auth_id;
  const userName = (user.full_name || user.nickname || '').trim().toLowerCase();

  // 1. Host check
  if (session.host_id && (session.host_id === userId || (userAuthId && session.host_id === userAuthId))) {
    return true;
  }
  if (session.description) {
    const hostMatch = session.description.match(/\[HOST:(.*?)\]/i);
    if (hostMatch && hostMatch[1].trim().toLowerCase() === userName) {
      return true;
    }
  }

  // 2. Queues check
  const candidateUserIds = [userId, userAuthId].filter((id): id is string => Boolean(id && isUuid(id)));
  if (candidateUserIds.length > 0) {
    const { data: queueRow } = await supabase
      .from('queues')
      .select('id')
      .eq('session_id', session.id)
      .in('user_id', candidateUserIds)
      .neq('status', 'cancelled')
      .limit(1)
      .maybeSingle();

    if (queueRow?.id) return true;
  }

  if (userName) {
    const { data: qNameRows } = await supabase
      .from('queues')
      .select('partner_names')
      .eq('session_id', session.id)
      .neq('status', 'cancelled');

    if (Array.isArray(qNameRows)) {
      const match = qNameRows.some((q) =>
        Array.isArray(q.partner_names) &&
        q.partner_names.some((pn: string) => (pn || '').trim().toLowerCase() === userName)
      );
      if (match) return true;
    }
  }

  // 3. Session participants check
  if (candidateUserIds.length > 0) {
    const { data: partRow } = await supabase
      .from('session_participants')
      .select('id')
      .eq('session_id', session.id)
      .in('user_id', candidateUserIds)
      .neq('status', 'cancelled')
      .limit(1)
      .maybeSingle();

    if (partRow?.id) return true;
  }

  if (userName) {
    const { data: partNameRow } = await supabase
      .from('session_participants')
      .select('id')
      .eq('session_id', session.id)
      .ilike('user_name', userName)
      .neq('status', 'cancelled')
      .limit(1)
      .maybeSingle();

    if (partNameRow?.id) return true;
  }

  // 4. Open / Public game check or client host assertion
  if (clientIsHost || session.visibility !== 'Invite') {
    return true;
  }

  return false;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await context.params;
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required.' }, { status: 400 });
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true, messages: [] });
    }

    const supabase = createAdminClient() || createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client is not available.' },
        { status: 500 }
      );
    }

    const session = await resolveSession(supabase, gameId);
    const canonicalGameId = session.id;
    const targetIds = Array.from(new Set([canonicalGameId, gameId].filter(Boolean)));

    const { data, error } = await supabase
      .from('game_chat_messages')
      .select('*')
      .in('game_id', targetIds)
      .order('created_at', { ascending: true });

    let rows: any[] = [];
    if (error) {
      if (isTableMissingError(error)) {
        console.warn('[API/Chat GET] game_chat_messages table not in schema cache; using in-memory store.');
        const combined = new Map<string, any>();
        for (const tId of targetIds) {
          const list = chatStore.get(tId) || [];
          list.forEach((m) => combined.set(m.id, m));
        }
        rows = Array.from(combined.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      } else {
        console.error('[API/Chat GET] Failed to query messages:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      rows = Array.isArray(data) ? [...data] : [];
      for (const tId of targetIds) {
        const memList = chatStore.get(tId) || [];
        for (const m of memList) {
          if (!rows.some((r) => r.id === m.id)) {
            rows.push(m);
          }
        }
      }
      rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    const senderIds = Array.from(
      new Set(rows.map((r) => r.sender_id).filter((id): id is string => isUuid(id)))
    );

    const userProfilesMap = new Map<string, { name: string; avatar: string }>();
    if (senderIds.length > 0) {
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('id, full_name, nickname, avatar_url')
        .in('id', senderIds);

      if (usersErr) {
        console.error('[API/Chat GET] Failed to resolve sender profiles:', usersErr);
      } else if (Array.isArray(usersData)) {
        usersData.forEach((u) => {
          userProfilesMap.set(u.id, {
            name: u.full_name || u.nickname || 'Player',
            avatar: u.avatar_url || 'alex',
          });
        });
      }
    }

    const enriched = rows.map((row) => {
      const profile = row.sender_id ? userProfilesMap.get(row.sender_id) : undefined;
      return {
        ...row,
        sender_name: profile?.name || row.sender_name || 'Player',
        sender_avatar: profile?.avatar || row.sender_avatar || 'alex',
      };
    });

    return NextResponse.json({ success: true, messages: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error fetching chat messages.';
    console.error('[API/Chat GET] Unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await context.params;
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, text, senderId, senderName, senderAvatar, isHost } = body as {
      id?: string;
      text?: string;
      senderId?: string;
      senderName?: string;
      senderAvatar?: string;
      isHost?: boolean;
    };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Message text is required.' }, { status: 400 });
    }

    // 1. Authenticate via token cookies, headers, or body senderId
    let authUser = await authenticateRequest(request, senderId);
    if (!authUser) {
      if (senderName && senderName.trim()) {
        authUser = {
          id: senderId && isUuid(senderId) ? senderId : crypto.randomUUID(),
          auth_id: senderId,
          email: `${senderName.trim().replace(/\s+/g, '_').toLowerCase()}@sportsync.internal`,
          full_name: senderName.trim(),
          nickname: senderName.trim(),
          avatar_url: senderAvatar || 'alex',
          role: 'player',
          onboarding_completed: true,
          created_at: new Date().toISOString(),
        };
      } else {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
    }

    const supabase = createAdminClient() || createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client is not available.' },
        { status: 500 }
      );
    }

    // 2. Resolve session and verify authorization
    const session = await resolveSession(supabase, gameId);
    const authorized = await isUserHostOrParticipant(supabase, session, authUser, isHost);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Forbidden: Only the host and joined players can send messages in this match chat.' },
        { status: 403 }
      );
    }

    const resolvedName = authUser.full_name || authUser.nickname || senderName || 'Player';
    const resolvedAvatar = authUser.avatar_url || senderAvatar || 'alex';
    const resolvedTime = new Date().toISOString();
    const messageId = id && isUuid(id) ? id : crypto.randomUUID();
    const canonicalGameId = session.id;

    // 3. Upsert user into public.users if valid UUID so foreign key constraint sender_id_fkey never fails
    let validSenderUuid: string | null = null;
    if (isUuid(authUser.id)) {
      try {
        await supabase.from('users').upsert(
          {
            id: authUser.id,
            auth_id: authUser.auth_id || authUser.id,
            email: authUser.email || `${authUser.id}@sportsync.internal`,
            full_name: resolvedName,
            role: authUser.role || 'player',
            avatar_url: resolvedAvatar,
            updated_at: resolvedTime,
          },
          { onConflict: 'id' }
        );
        validSenderUuid = authUser.id;
      } catch {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', authUser.id)
          .maybeSingle();
        if (existingUser?.id) {
          validSenderUuid = existingUser.id;
        }
      }
    }

    // 4. Insert message into public.game_chat_messages
    let insertedRow: any = null;
    const { data: inserted, error } = await supabase
      .from('game_chat_messages')
      .insert({
        id: messageId,
        game_id: canonicalGameId,
        sender_id: validSenderUuid,
        sender_name: resolvedName,
        sender_avatar: resolvedAvatar,
        message_text: text.trim(),
        created_at: resolvedTime,
      })
      .select('*')
      .single();

    if (error || !inserted) {
      if (isTableMissingError(error)) {
        console.warn('[API/Chat POST] game_chat_messages table not in schema cache; caching in-memory & broadcasting.');
        insertedRow = {
          id: messageId,
          game_id: canonicalGameId,
          sender_id: validSenderUuid,
          sender_name: resolvedName,
          sender_avatar: resolvedAvatar,
          message_text: text.trim(),
          created_at: resolvedTime,
        };
        const list = chatStore.get(canonicalGameId) || [];
        list.push(insertedRow);
        chatStore.set(canonicalGameId, list);
        if (gameId !== canonicalGameId) {
          const altList = chatStore.get(gameId) || [];
          altList.push(insertedRow);
          chatStore.set(gameId, altList);
        }
      } else {
        console.error('[API/Chat POST] Insert failed:', error);
        return NextResponse.json(
          { error: error?.message || 'Failed to persist chat message.' },
          { status: 500 }
        );
      }
    } else {
      insertedRow = inserted;
      const list = chatStore.get(canonicalGameId) || [];
      if (!list.some((m) => m.id === inserted.id)) {
        list.push(inserted);
        chatStore.set(canonicalGameId, list);
      }
    }

    const formattedTime = new Date(insertedRow.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const responseMsg = {
      id: insertedRow.id,
      gameId: canonicalGameId,
      senderId: validSenderUuid || authUser.id,
      senderName: resolvedName,
      senderAvatar: resolvedAvatar,
      text: insertedRow.message_text,
      createdAt: insertedRow.created_at,
      time: formattedTime,
      isHost: session.host_id === authUser.id || Boolean(isHost),
    };

    // 5. Broadcast message over Supabase Realtime channel for instantaneous peer delivery
    try {
      const chatChannel = supabase.channel(`game-chat-${canonicalGameId}`);
      await chatChannel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          id: responseMsg.id,
          senderId: responseMsg.senderId,
          senderName: responseMsg.senderName,
          avatarId: responseMsg.senderAvatar,
          text: responseMsg.text,
          time: responseMsg.time,
          isHost: responseMsg.isHost,
        },
      });
    } catch (bcErr) {
      console.warn('[API/Chat POST] Realtime broadcast notice:', bcErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: responseMsg,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error sending chat message.';
    console.error('[API/Chat POST] Unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
