/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken, serverGetUser, SanitizedUser } from '@/lib/auth/serverAuth';
import { formatTime12h } from '@/lib/datetime';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHAT_STORAGE_BUCKET = 'sportsync-chat';

function isUuid(val?: unknown): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

interface StoredChatRow {
  id: string;
  game_id: string;
  sender_id: string | null;
  sender_name: string;
  sender_avatar: string;
  message_text: string;
  created_at: string;
}

const globalForChatStorage = globalThis as unknown as {
  sportsyncChatBucketReady?: boolean;
  sportsyncChatStorageCache?: Map<string, StoredChatRow>;
  sportsyncChatStorageWarned?: boolean;
};

const chatStorageCache =
  globalForChatStorage.sportsyncChatStorageCache || new Map<string, StoredChatRow>();
if (!globalForChatStorage.sportsyncChatStorageCache) {
  globalForChatStorage.sportsyncChatStorageCache = chatStorageCache;
}

function cacheStoredChatRow(objectPath: string, row: StoredChatRow) {
  if (chatStorageCache.size > 2000) {
    const oldestKey = chatStorageCache.keys().next().value;
    if (oldestKey) chatStorageCache.delete(oldestKey);
  }
  chatStorageCache.set(objectPath, row);
}

async function ensureChatStorageBucket(
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>
): Promise<boolean> {
  if (globalForChatStorage.sportsyncChatBucketReady) return true;

  const { data: existing, error: getErr } = await adminClient.storage.getBucket(CHAT_STORAGE_BUCKET);
  if (existing && !getErr) {
    globalForChatStorage.sportsyncChatBucketReady = true;
    return true;
  }

  const { error: createErr } = await adminClient.storage.createBucket(CHAT_STORAGE_BUCKET, {
    public: false,
    allowedMimeTypes: ['application/json'],
  });

  if (!createErr || /already exists/i.test(createErr.message || '')) {
    globalForChatStorage.sportsyncChatBucketReady = true;
    return true;
  }

  console.error('[API/Chat StorageFallback] Failed to ensure storage bucket:', createErr);
  return false;
}

async function readChatMessagesFromStorage(
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>,
  canonicalGameId: string
): Promise<{ rows: StoredChatRow[]; ok: boolean }> {
  const ready = await ensureChatStorageBucket(adminClient);
  if (!ready) return { rows: [], ok: false };

  const safeRoom = canonicalGameId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const folder = `rooms/${safeRoom}`;
  const { data: files, error: listErr } = await adminClient.storage
    .from(CHAT_STORAGE_BUCKET)
    .list(folder, {
      limit: 500,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (listErr) {
    console.error('[API/Chat StorageFallback] Failed to list room messages:', listErr);
    return { rows: [], ok: false };
  }

  const jsonFiles = (files || []).filter(
    (f) => f?.name && f.name.endsWith('.json') && !f.name.startsWith('.')
  );

  const missingFiles = jsonFiles.filter((f) => !chatStorageCache.has(`${folder}/${f.name}`));
  if (missingFiles.length > 0) {
    await Promise.all(
      missingFiles.map(async (f) => {
        const objectPath = `${folder}/${f.name}`;
        try {
          const { data: blob, error: dlErr } = await adminClient.storage
            .from(CHAT_STORAGE_BUCKET)
            .download(objectPath);
          if (dlErr || !blob) return;
          const text = await blob.text();
          const parsed = JSON.parse(text) as StoredChatRow;
          if (parsed && parsed.id && parsed.message_text) {
            cacheStoredChatRow(objectPath, parsed);
          }
        } catch (err) {
          console.warn('[API/Chat StorageFallback] Failed to parse message object:', objectPath, err);
        }
      })
    );
  }

  const rows: StoredChatRow[] = [];
  for (const f of jsonFiles) {
    const cached = chatStorageCache.get(`${folder}/${f.name}`);
    if (cached) rows.push(cached);
  }
  rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return { rows, ok: true };
}

async function writeChatMessageToStorage(
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>,
  row: StoredChatRow
): Promise<boolean> {
  const ready = await ensureChatStorageBucket(adminClient);
  if (!ready) return false;

  const safeRoom = row.game_id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const tsMs = Number.isFinite(new Date(row.created_at).getTime())
    ? new Date(row.created_at).getTime()
    : Date.now();
  const safeId = row.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const objectPath = `rooms/${safeRoom}/${String(tsMs).padStart(15, '0')}_${safeId}.json`;
  const payload = Buffer.from(JSON.stringify(row), 'utf8');

  const { error: uploadErr } = await adminClient.storage
    .from(CHAT_STORAGE_BUCKET)
    .upload(objectPath, payload, {
      contentType: 'application/json',
      upsert: true,
    });

  if (uploadErr) {
    console.error('[API/Chat StorageFallback] Failed to upload message:', uploadErr);
    return false;
  }

  cacheStoredChatRow(objectPath, row);
  return true;
}

type ChatDbErrorCategory =
  | 'table_missing'
  | 'column_missing'
  | 'rls_denied'
  | 'fk_violation'
  | 'db_error';

interface PostgrestErrorLike {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

function isTableMissingError(err?: PostgrestErrorLike | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').trim();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('relation "public.game_chat_messages" does not exist') ||
    msg.includes('relation "game_chat_messages" does not exist')
  );
}

function classifyChatDbError(err?: PostgrestErrorLike | null): {
  category: ChatDbErrorCategory;
  status: number;
  code: string;
  userMessage: string;
  detail: string;
} {
  const code = (err?.code || 'UNKNOWN').trim();
  const msg = (err?.message || '').trim();
  const low = msg.toLowerCase();

  if (isTableMissingError(err)) {
    return {
      category: 'table_missing',
      status: 503,
      code,
      userMessage:
        `Chat persistence table is missing in Supabase (${code}). Run migration 20261126_ensure_game_chat_messages.sql in Supabase SQL Editor.`,
      detail: msg || 'public.game_chat_messages table was not found in PostgREST schema cache.',
    };
  }

  if (code === 'PGRST204' || code === '42703' || (low.includes('column') && (low.includes('does not exist') || low.includes('schema cache')))) {
    return {
      category: 'column_missing',
      status: 500,
      code,
      userMessage: `Chat table schema is out of date (${code}). Run migration 20261126_ensure_game_chat_messages.sql.`,
      detail: msg,
    };
  }

  if (code === '42501' || low.includes('row-level security') || low.includes('permission denied')) {
    return {
      category: 'rls_denied',
      status: 500,
      code,
      userMessage: `Chat write was blocked by database permissions/RLS (${code}). Run migration 20261126_ensure_game_chat_messages.sql or check SUPABASE_SERVICE_ROLE_KEY.`,
      detail: msg,
    };
  }

  if (code === '23503' || low.includes('foreign key constraint')) {
    return {
      category: 'fk_violation',
      status: 500,
      code,
      userMessage: `Chat sender profile link failed (${code}). Please retry sending your message.`,
      detail: msg,
    };
  }

  return {
    category: 'db_error',
    status: 500,
    code,
    userMessage: msg ? `Could not save message (${code}): ${msg}` : `Failed to persist chat message (${code}).`,
    detail: msg || 'Unexpected database error.',
  };
}

interface AuthenticatedChatContext {
  user: SanitizedUser;
  supabaseJwt?: string;
}

async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedChatContext | null> {
  const tokenCookie =
    request.cookies.get('sportsync-auth-token')?.value ||
    request.cookies.get('sb-access-token')?.value;

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  let token = tokenCookie || bearerToken;

  // Prefer Bearer token for Supabase JWT pass-through if available
  let supabaseJwt: string | undefined =
    bearerToken && bearerToken.split('.').length === 3 ? bearerToken : undefined;

  // Check any sb-*-auth-token cookie if token or Supabase JWT not yet found
  if (!token || !supabaseJwt) {
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.includes('-auth-token')) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookie.value));
          const candidate = Array.isArray(parsed) ? parsed[0] : parsed?.access_token;
          if (typeof candidate === 'string' && candidate.length > 20) {
            if (!token) token = candidate;
            if (!supabaseJwt && candidate.split('.').length === 3) {
              supabaseJwt = candidate;
            }
            break;
          }
        } catch {
          if (cookie.value && cookie.value.length > 20) {
            if (!token) token = cookie.value;
            if (!supabaseJwt && cookie.value.split('.').length === 3) {
              supabaseJwt = cookie.value;
            }
            break;
          }
        }
      }
    }
  }

  if (!token) {
    return null;
  }

  const verified = verifySessionToken(token);
  if (verified) {
    const user = await serverGetUser(verified.userId);
    if (user) return { user, supabaseJwt };
  }

  if (isSupabaseConfigured) {
    const jwtToVerify = supabaseJwt || token;
    const sb = createServerClient(jwtToVerify);
    if (sb) {
      const { data, error } = await sb.auth.getUser(jwtToVerify);
      if (!error && data?.user?.id) {
        const user = await serverGetUser(data.user.id);
        if (user) return { user, supabaseJwt: jwtToVerify };

        const meta = data.user.user_metadata || {};
        const fullName = meta.full_name || meta.name || data.user.email?.split('@')[0] || 'Player';
        return {
          user: {
            id: data.user.id,
            auth_id: data.user.id,
            email: data.user.email || '',
            full_name: fullName,
            nickname: meta.nickname || fullName.split(' ')[0] || 'Player',
            avatar_url: meta.avatar_url || 'alex',
            role: 'player',
            onboarding_completed: true,
            created_at: data.user.created_at || new Date().toISOString(),
          },
          supabaseJwt: jwtToVerify,
        };
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
}

async function resolveSession(
  supabase: NonNullable<ReturnType<typeof createServerClient>>,
  gameId: string
): Promise<ResolvedSession | null> {
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

  return null;
}

async function isUserHostOrParticipant(
  supabase: NonNullable<ReturnType<typeof createServerClient>>,
  session: ResolvedSession,
  user: SanitizedUser
): Promise<boolean> {
  const userId = user.id;
  const userAuthId = user.auth_id;
  const userName = (user.full_name || user.nickname || '').trim().toLowerCase();

  // 1. Host check
  if (session.host_id && (session.host_id === userId || (userAuthId && session.host_id === userAuthId))) {
    return true;
  }
  if (session.description && userName) {
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

    const authCtx = await authenticateRequest(request);
    if (!authCtx) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const { user: authUser, supabaseJwt } = authCtx;

    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
    }

    const adminClient = createAdminClient();
    const supabase = adminClient || createServerClient(supabaseJwt);
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client is not available.' },
        { status: 500 }
      );
    }

    const session = await resolveSession(supabase, gameId);
    if (!session) {
      return NextResponse.json({ error: 'Match session not found.' }, { status: 404 });
    }

    const authorized = await isUserHostOrParticipant(supabase, session, authUser);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Forbidden: Only the host and joined players can view messages in this match chat.' },
        { status: 403 }
      );
    }

    const canonicalGameId = session.id;
    const targetIds = Array.from(new Set([canonicalGameId, gameId].filter(Boolean)));

    const { data, error } = await supabase
      .from('game_chat_messages')
      .select('*')
      .in('game_id', targetIds)
      .order('created_at', { ascending: true });

    let rows: any[] = [];
    if (error) {
      if (isTableMissingError(error) && adminClient) {
        if (!globalForChatStorage.sportsyncChatStorageWarned) {
          globalForChatStorage.sportsyncChatStorageWarned = true;
          console.warn(
            '[API/Chat] public.game_chat_messages table is missing (PGRST205); using durable Supabase Storage fallback bucket until migration 20261126_ensure_game_chat_messages.sql is run.'
          );
        }
        const storageResult = await readChatMessagesFromStorage(adminClient, canonicalGameId);
        if (storageResult.ok) {
          rows = storageResult.rows;
        } else {
          const diag = classifyChatDbError(error);
          return NextResponse.json(
            {
              error: diag.userMessage,
              code: diag.code,
              category: diag.category,
              detail: diag.detail,
            },
            { status: diag.status }
          );
        }
      } else {
        const diag = classifyChatDbError(error);
        console.error('[API/Chat GET] Failed to query messages:', {
          category: diag.category,
          code: diag.code,
          message: error.message,
          hint: error.hint,
          usingAdminClient: Boolean(adminClient),
          hasUserJwt: Boolean(supabaseJwt),
          canonicalGameId,
        });
        return NextResponse.json(
          {
            error: diag.userMessage,
            code: diag.code,
            category: diag.category,
            detail: diag.detail,
          },
          { status: diag.status }
        );
      }
    } else {
      rows = Array.isArray(data) ? [...data] : [];
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
    const { id, text } = body as {
      id?: string;
      text?: string;
    };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Message text is required.' }, { status: 400 });
    }

    // 1. Authenticate strictly via verified session cookie or Bearer token
    const authCtx = await authenticateRequest(request);
    if (!authCtx) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const { user: authUser, supabaseJwt } = authCtx;

    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
    }

    const adminClient = createAdminClient();
    const supabase = adminClient || createServerClient(supabaseJwt);
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client is not available.' },
        { status: 500 }
      );
    }

    // 2. Resolve session and verify authorization in Supabase
    const session = await resolveSession(supabase, gameId);
    if (!session) {
      return NextResponse.json({ error: 'Match session not found.' }, { status: 404 });
    }

    const authorized = await isUserHostOrParticipant(supabase, session, authUser);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Forbidden: Only the host and joined players can send messages in this match chat.' },
        { status: 403 }
      );
    }

    const resolvedName = authUser.full_name || authUser.nickname || 'Player';
    const resolvedAvatar = authUser.avatar_url || 'alex';
    const resolvedTime = new Date().toISOString();
    const messageId = id && isUuid(id) ? id : crypto.randomUUID();
    const canonicalGameId = session.id;

    // 3. Resolve a verified canonical public.users.id so sender_id FK never fails
    let validSenderUuid: string | null = null;
    const candidateUserIds = Array.from(
      new Set([authUser.id, authUser.auth_id].filter((uid): uid is string => isUuid(uid)))
    );

    if (candidateUserIds.length > 0) {
      const orFilter = candidateUserIds.map((uid) => `id.eq.${uid},auth_id.eq.${uid}`).join(',');
      const { data: existingById } = await supabase
        .from('users')
        .select('id')
        .or(orFilter)
        .limit(1)
        .maybeSingle();

      if (existingById?.id) {
        validSenderUuid = existingById.id;
      }
    }

    if (!validSenderUuid && authUser.email) {
      const { data: existingByEmail } = await supabase
        .from('users')
        .select('id')
        .ilike('email', authUser.email.trim().toLowerCase())
        .limit(1)
        .maybeSingle();

      if (existingByEmail?.id) {
        validSenderUuid = existingByEmail.id;
      }
    }

    if (!validSenderUuid && isUuid(authUser.id)) {
      const { data: upsertedUser, error: upsertUserErr } = await supabase
        .from('users')
        .upsert(
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
        )
        .select('id')
        .maybeSingle();

      if (upsertedUser?.id) {
        validSenderUuid = upsertedUser.id;
      } else if (upsertUserErr) {
        console.warn('[API/Chat POST] Could not upsert sender in public.users; storing message with nullable sender_id:', {
          code: upsertUserErr.code,
          message: upsertUserErr.message,
        });
      }
    }

    // 4. Insert message into public.game_chat_messages (with safe fallback if sender_id FK rejects)
    const insertPayload: Record<string, any> = {
      id: messageId,
      game_id: canonicalGameId,
      sender_id: validSenderUuid,
      sender_name: resolvedName,
      sender_avatar: resolvedAvatar,
      message_text: text.trim(),
      created_at: resolvedTime,
    };

    let { data: inserted, error } = await supabase
      .from('game_chat_messages')
      .insert(insertPayload)
      .select('*')
      .single();

    // If sender_id FK fails (e.g., stale user id), retry once with sender_id = null (sender_name is still stored)
    if (error && (error.code === '23503' || error.message?.toLowerCase().includes('foreign key')) && insertPayload.sender_id !== null) {
      console.warn('[API/Chat POST] Retrying chat insert with sender_id=null after FK rejection:', error.message);
      insertPayload.sender_id = null;
      const retryFk = await supabase
        .from('game_chat_messages')
        .insert(insertPayload)
        .select('*')
        .single();
      inserted = retryFk.data;
      error = retryFk.error;
    }

    // If optional sender_avatar column is missing in an older schema, retry without it
    if (error && (error.code === 'PGRST204' || error.code === '42703') && error.message?.toLowerCase().includes('sender_avatar')) {
      delete insertPayload.sender_avatar;
      const retryCol = await supabase
        .from('game_chat_messages')
        .insert(insertPayload)
        .select('*')
        .single();
      inserted = retryCol.data;
      error = retryCol.error;
    }

    let insertedRow: any = inserted;
    if (error || !insertedRow) {
      if (isTableMissingError(error) && adminClient) {
        if (!globalForChatStorage.sportsyncChatStorageWarned) {
          globalForChatStorage.sportsyncChatStorageWarned = true;
          console.warn(
            '[API/Chat] public.game_chat_messages table is missing (PGRST205); persisting chat messages via Supabase Storage fallback until migration 20261126_ensure_game_chat_messages.sql is run.'
          );
        }
        const fallbackRow: StoredChatRow = {
          id: messageId,
          game_id: canonicalGameId,
          sender_id: validSenderUuid,
          sender_name: resolvedName,
          sender_avatar: resolvedAvatar,
          message_text: text.trim(),
          created_at: resolvedTime,
        };
        const savedToStorage = await writeChatMessageToStorage(adminClient, fallbackRow);
        if (savedToStorage) {
          insertedRow = fallbackRow;
        }
      }
    }

    if (!insertedRow) {
      const diag = classifyChatDbError(error);
      console.error('[API/Chat POST] Insert failed:', {
        category: diag.category,
        code: diag.code,
        message: error?.message,
        hint: error?.hint,
        details: error?.details,
        usingAdminClient: Boolean(adminClient),
        hasUserJwt: Boolean(supabaseJwt),
        canonicalGameId,
        hasSenderUuid: Boolean(insertPayload.sender_id),
      });
      return NextResponse.json(
        {
          error: diag.userMessage,
          code: diag.code,
          category: diag.category,
          detail: diag.detail,
        },
        { status: diag.status }
      );
    }

    const formattedTime = formatTime12h(insertedRow.created_at) || 'Just now';

    const responseMsg = {
      id: insertedRow.id,
      gameId: canonicalGameId,
      senderId: validSenderUuid || authUser.id,
      senderName: resolvedName,
      senderAvatar: resolvedAvatar,
      text: insertedRow.message_text,
      createdAt: insertedRow.created_at,
      time: formattedTime,
      isHost: Boolean(session.host_id && (session.host_id === authUser.id || session.host_id === authUser.auth_id)),
    };

    // 5. Broadcast message over Supabase Realtime channel for instantaneous peer delivery
    try {
      const chatChannel = supabase.channel(`game-chat-${canonicalGameId}`);
      const broadcastPayload = {
        id: responseMsg.id,
        senderId: responseMsg.senderId,
        senderName: responseMsg.senderName,
        avatarId: responseMsg.senderAvatar,
        text: responseMsg.text,
        time: responseMsg.time,
        createdAt: responseMsg.createdAt,
        isHost: responseMsg.isHost,
      };
      try {
        if (typeof (chatChannel as any).httpSend === 'function') {
          await (chatChannel as any).httpSend('new_message', broadcastPayload);
        } else {
          await chatChannel.send({
            type: 'broadcast',
            event: 'new_message',
            payload: broadcastPayload,
          });
        }
      } finally {
        try {
          await supabase.removeChannel(chatChannel);
        } catch {}
      }
    } catch (bcErr) {
      console.warn('[API/Chat POST] Realtime broadcast notice:', bcErr);
    }

    // 6. Notify game participants (host and joined players, excluding sender)
    try {
      const recipientMap = new Map<string, { id?: string; name: string }>();
      const normSender = resolvedName.trim().toLowerCase();
      const senderUserId = validSenderUuid || authUser.id;

      const addRecipient = (id?: string | null, name?: string | null) => {
        if (!name && !id) return;
        const normName = (name || '').trim().toLowerCase();
        if (normName && normName === normSender) return;
        if (id && senderUserId && id.toLowerCase() === senderUserId.toLowerCase()) return;

        // Check if already in recipientMap by ID or Name
        for (const existing of recipientMap.values()) {
          const matchId = Boolean(id && existing.id && existing.id.toLowerCase() === id.toLowerCase());
          const matchName = Boolean(normName && existing.name && existing.name.trim().toLowerCase() === normName);
          if (matchId || matchName) {
            // Merge: prefer valid UUID for ID, and prefer non-empty name
            if (!existing.id && id) existing.id = id;
            if (id && isUuid(id) && !isUuid(existing.id)) existing.id = id;
            if (name && (!existing.name || existing.name === 'Player' || existing.name === 'Organizer')) {
              existing.name = name;
            }
            return;
          }
        }

        const mapKey = (id || normName || 'recipient').toLowerCase();
        recipientMap.set(mapKey, { id: id || undefined, name: name?.trim() || 'Player' });
      };

      // 6a. Explicit recipients passed from client
      const bodyAny = body as any;
      if (Array.isArray(bodyAny.recipients)) {
        bodyAny.recipients.forEach((r: any) => {
          if (!r?.name && !r?.id) return;
          addRecipient(r.id, r.name);
        });
      }

      // 6b. Check host if not sender
      if (session.host_id && session.host_id !== senderUserId) {
        const { data: hostUser } = await supabase
          .from('users')
          .select('id, full_name, nickname')
          .eq('id', session.host_id)
          .maybeSingle();

        const hostName = hostUser?.full_name || hostUser?.nickname || 'Organizer';
        addRecipient(session.host_id, hostName);
      } else if (session.description) {
        const hostMatch = session.description.match(/\[HOST:(.*?)\]/i);
        if (hostMatch) {
          addRecipient(null, hostMatch[1].trim());
        }
      }

      // 6c. Check queues table for joined players
      if (session.id && isUuid(session.id)) {
        const { data: queueRows } = await supabase
          .from('queues')
          .select('user_id, partner_names')
          .eq('session_id', session.id)
          .neq('status', 'cancelled');

        if (Array.isArray(queueRows)) {
          for (const q of queueRows) {
            if (q.user_id && q.user_id !== senderUserId) {
              const { data: qUser } = await supabase
                .from('users')
                .select('id, full_name, nickname')
                .eq('id', q.user_id)
                .maybeSingle();
              const qName = qUser?.full_name || qUser?.nickname || 'Player';
              addRecipient(q.user_id, qName);
            }
            if (Array.isArray(q.partner_names)) {
              for (const pn of q.partner_names) {
                if (typeof pn === 'string') {
                  addRecipient(null, pn.trim());
                }
              }
            }
          }
        }
      }

      // 6d. Check session_participants table
      if (session.id && isUuid(session.id)) {
        const { data: partRows } = await supabase
          .from('session_participants')
          .select('user_id, user_name')
          .eq('session_id', session.id)
          .neq('status', 'cancelled');

        if (Array.isArray(partRows)) {
          for (const p of partRows) {
            addRecipient(p.user_id, p.user_name);
          }
        }
      }

      const matchTitle = bodyAny.gameTitle || session.title || 'SportSync Match';
      const sport = bodyAny.sport || 'Sports';
      const locationName = bodyAny.locationName || 'Venue';
      const schedule = bodyAny.schedule || '';
      const textPreview = text.trim().length > 70 ? `${text.trim().slice(0, 70)}...` : text.trim();
      const nowIso = new Date().toISOString();

      for (const recipient of recipientMap.values()) {
        const recipientId = recipient.id && isUuid(recipient.id) ? recipient.id : null;
        const recipientName = recipient.name;
        const recipientKey = (recipientId || recipientName || 'recipient')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '_');
        const dedupeKey = `chat_${insertedRow.id}_${recipientKey}`;
        const notifId = `notif_chat_${insertedRow.id}_${recipientKey}`;

        const notifItem = {
          id: notifId,
          type: 'chat',
          title: `New Message • ${matchTitle}`,
          desc: `${resolvedName}: ${textPreview}`,
          time: 'Just now',
          timestamp: Date.now(),
          read: false,
          linkScreen: 'match-chat',
          recipientId,
          recipientName,
          senderName: resolvedName,
          senderAvatar: resolvedAvatar,
          meta: {
            event: 'new_chat_message',
            gameId: canonicalGameId,
            sessionId: canonicalGameId,
            gameTitle: matchTitle,
            sport,
            locationName,
            schedule,
            messageId: insertedRow.id,
            messageText: text.trim(),
            senderName: resolvedName,
            senderAvatar: resolvedAvatar,
            recipientId,
            recipientName,
            dedupeKey,
          },
        };

        // Dual persistence: public.notifications or fallback to public.users
        let tableSaved = false;
        try {
          // Idempotency: Check if a notification for this chat message already exists for THIS recipient
          let dupQuery = supabase
            .from('notifications')
            .select('id')
            .filter('metadata->>dedupeKey', 'eq', dedupeKey);
          if (recipientId) {
            dupQuery = dupQuery.eq('user_id', recipientId);
          } else if (recipientName) {
            dupQuery = dupQuery.ilike('user_identifier', recipientName);
          }
          const { data: existingChatNotif } = await dupQuery.limit(1).maybeSingle();

          if (!existingChatNotif) {
            const { error: insertErr } = await supabase.from('notifications').insert({
              id: isUuid(notifId) ? notifId : undefined,
              user_id: recipientId,
              user_identifier: recipientName || recipientId || null,
              type: 'chat',
              title: notifItem.title,
              description: notifItem.desc,
              read: false,
              link_screen: 'match-chat',
              metadata: notifItem.meta,
              created_at: nowIso,
            });
            if (!insertErr) tableSaved = true;
          } else {
            tableSaved = true;
          }
        } catch {}

        if (!tableSaved) {
          try {
            let uQuery = supabase.from('users').select('id, equipped_gear');
            if (recipientId && isUuid(recipientId)) {
              uQuery = uQuery.or(`id.eq.${recipientId},auth_id.eq.${recipientId}`);
            } else if (recipientName) {
              uQuery = uQuery.ilike('full_name', recipientName.trim());
            }

            const { data: uRow } = await uQuery.limit(1).maybeSingle();
            if (uRow?.id) {
              const currentGear = typeof uRow.equipped_gear === 'object' && uRow.equipped_gear ? uRow.equipped_gear : {};
              const existingNotifs = Array.isArray((currentGear as any)._sportsync_notifications)
                ? (currentGear as any)._sportsync_notifications
                : [];

              if (!existingNotifs.some((n: any) => n.id === notifItem.id || (n.meta?.messageId && n.meta.messageId === insertedRow.id) || (n.meta?.dedupeKey && n.meta.dedupeKey === notifItem.meta.dedupeKey))) {
                const updated = [notifItem, ...existingNotifs].slice(0, 50);
                await supabase
                  .from('users')
                  .update({
                    equipped_gear: { ...currentGear, _sportsync_notifications: updated },
                    updated_at: nowIso,
                  })
                  .eq('id', uRow.id);
              }
            }
          } catch {}
        }

        // Broadcast strictly to ONE targeted channel per recipient to avoid multiplying notifications
        const targetChannel = recipientId && isUuid(recipientId)
          ? `sportsync-notifs-${recipientId}`
          : (recipientName ? `sportsync-notifs-${recipientName.toLowerCase().replace(/\s+/g, '_')}` : null);

        if (targetChannel) {
          try {
            const ch = supabase.channel(targetChannel);
            if (typeof (ch as any).httpSend === 'function') {
              await (ch as any).httpSend('new_notification', notifItem).catch(() => {});
            } else {
              await new Promise<void>((resolve) => {
                const timer = setTimeout(() => {
                  try { supabase.removeChannel(ch); } catch {}
                  resolve();
                }, 1500);
                ch.subscribe((status: string) => {
                  if (status === 'SUBSCRIBED') {
                    ch.send({
                      type: 'broadcast',
                      event: 'new_notification',
                      payload: notifItem,
                    })
                      .catch(() => {})
                      .finally(() => {
                        clearTimeout(timer);
                        try { supabase.removeChannel(ch); } catch {}
                        resolve();
                      });
                  }
                });
              });
            }
          } catch {}
        }
      }
    } catch (notifErr) {
      console.warn('[API/Chat POST] Notification dispatch warning:', notifErr);
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
