import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken, serverGetUser, SanitizedUser } from '@/lib/auth/serverAuth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(val?: string): val is string {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

async function authenticateRequest(request: NextRequest): Promise<SanitizedUser | null> {
  const tokenCookie =
    request.cookies.get('sportsync-auth-token')?.value ||
    request.cookies.get('sb-access-token')?.value;
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const token = tokenCookie || bearerToken;
  if (!token) return null;

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
      }
    }
  }

  return null;
}

async function resolveSession(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  gameId: string
): Promise<{ id: string; host_id: string | null } | null> {
  if (isUuid(gameId)) {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, host_id')
      .eq('id', gameId.trim())
      .maybeSingle();
    if (error) {
      console.error('[API/Chat] Session lookup error:', error);
      throw new Error(error.message);
    }
    if (data) return data;
  }

  const { data: byCode, error: codeErr } = await supabase
    .from('sessions')
    .select('id, host_id')
    .ilike('invite_code', gameId.trim())
    .limit(1)
    .maybeSingle();

  if (codeErr) {
    console.error('[API/Chat] Session invite_code lookup error:', codeErr);
    throw new Error(codeErr.message);
  }
  return byCode || null;
}

async function isUserHostOrParticipant(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  session: { id: string; host_id: string | null },
  userId: string
): Promise<boolean> {
  if (session.host_id && session.host_id === userId) {
    return true;
  }

  const { data: queueRow, error: qErr } = await supabase
    .from('queues')
    .select('id')
    .eq('session_id', session.id)
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .limit(1)
    .maybeSingle();

  if (qErr) {
    console.error('[API/Chat] queues authorization check error:', qErr);
    throw new Error(qErr.message);
  }
  if (queueRow?.id) return true;

  const { data: partRow, error: pErr } = await supabase
    .from('session_participants')
    .select('id')
    .eq('session_id', session.id)
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .limit(1)
    .maybeSingle();

  if (pErr) {
    console.error('[API/Chat] session_participants authorization check error:', pErr);
    throw new Error(pErr.message);
  }
  return Boolean(partRow?.id);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id: gameId } = await context.params;
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required.' }, { status: 400 });
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server admin database client unavailable (missing SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 500 }
      );
    }

    const session = await resolveSession(supabase, gameId);
    const canonicalGameId = session?.id || gameId;
    const targetIds = Array.from(new Set([canonicalGameId, gameId].filter(Boolean)));

    const { data, error } = await supabase
      .from('game_chat_messages')
      .select('*')
      .in('game_id', targetIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API/Chat GET] Failed to query messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];
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
    // 1. Authenticate via serverGetUser()
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id: gameId } = await context.params;
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, text } = body as { id?: string; text?: string };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Message text is required.' }, { status: 400 });
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server admin database client unavailable (missing SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 500 }
      );
    }

    // 2. Resolve session and verify user is host or joined participant
    const session = await resolveSession(supabase, gameId);
    if (!session) {
      return NextResponse.json({ error: 'Game session not found.' }, { status: 404 });
    }

    const authorized = await isUserHostOrParticipant(supabase, session, authUser.id);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Forbidden: Only the host and joined players can send messages in this match chat.' },
        { status: 403 }
      );
    }

    // 3. Use canonical authenticated user identity (never trust senderId/senderName from body)
    const resolvedName = authUser.full_name || authUser.nickname || 'Player';
    const resolvedAvatar = authUser.avatar_url || 'alex';
    const resolvedTime = new Date().toISOString();
    const messageId = id && isUuid(id) ? id : crypto.randomUUID();
    const canonicalGameId = session.id;

    const { data: inserted, error } = await supabase
      .from('game_chat_messages')
      .insert({
        id: messageId,
        game_id: canonicalGameId,
        sender_id: authUser.id,
        sender_name: resolvedName,
        sender_avatar: resolvedAvatar,
        message_text: text.trim(),
        created_at: resolvedTime,
      })
      .select('*')
      .single();

    if (error || !inserted) {
      console.error('[API/Chat POST] Insert failed:', error);
      return NextResponse.json(
        { error: error?.message || 'Failed to persist chat message.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: {
          id: inserted.id,
          gameId: canonicalGameId,
          senderId: authUser.id,
          senderName: resolvedName,
          senderAvatar: resolvedAvatar,
          text: inserted.message_text,
          createdAt: inserted.created_at,
          isHost: session.host_id === authUser.id,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error sending chat message.';
    console.error('[API/Chat POST] Unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
