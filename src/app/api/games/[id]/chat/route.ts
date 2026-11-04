import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';

function getServerSupabaseClient() {
  const admin = createAdminClient();
  if (admin) return admin;
  return createServerClient();
}

const isUuid = (val?: string): boolean =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await context.params;
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, messages: [] });
    }

    const { data, error } = await supabase
      .from('game_chat_messages')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[API/Chat] Failed to query messages:', error.message);
      return NextResponse.json({ success: true, messages: [] });
    }

    return NextResponse.json({ success: true, messages: data || [] });
  } catch (err: any) {
    console.error('[API/Chat] GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await context.params;
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { id, senderId, senderName, senderAvatar, text, createdAt } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    const resolvedName = senderName || 'Player';
    const resolvedAvatar = senderAvatar || 'alex';
    const resolvedTime = createdAt || new Date().toISOString();
    const messageId = id || crypto.randomUUID();
    const dbSenderId = senderId && isUuid(senderId) ? senderId : null;

    const supabase = getServerSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('game_chat_messages').insert({
        id: messageId,
        game_id: gameId,
        sender_id: dbSenderId,
        sender_name: resolvedName,
        sender_avatar: resolvedAvatar,
        message_text: text.trim(),
        created_at: resolvedTime,
      });

      if (error) {
        console.warn('[API/Chat] Insert error:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: {
        id: messageId,
        gameId,
        senderName: resolvedName,
        senderAvatar: resolvedAvatar,
        text: text.trim(),
        createdAt: resolvedTime,
      },
    });
  } catch (err: any) {
    console.error('[API/Chat] POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
