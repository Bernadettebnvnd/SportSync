import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const CHAT_DIR = path.join(DATA_DIR, 'chats');

function ensureChatDir() {
  try {
    if (!fs.existsSync(CHAT_DIR)) {
      fs.mkdirSync(CHAT_DIR, { recursive: true });
    }
  } catch {}
}

function loadLocalChat(gameId: string): any[] {
  try {
    ensureChatDir();
    const filePath = path.join(CHAT_DIR, `${gameId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
    }
  } catch {}
  return [];
}

function saveLocalChat(gameId: string, messages: any[]) {
  try {
    ensureChatDir();
    const filePath = path.join(CHAT_DIR, `${gameId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8');
  } catch {}
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;
  if (!gameId) {
    return NextResponse.json({ success: false, error: 'Game ID required' }, { status: 400 });
  }

  const supabase = createAdminClient() || createServerClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('game_chat_messages')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        const formatted = data.map((row: any) => ({
          id: row.id,
          senderName: row.sender_name,
          avatarId: row.sender_avatar || 'alex',
          text: row.message_text,
          time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: false,
        }));
        return NextResponse.json({ success: true, messages: formatted });
      }
    } catch (err) {
      console.warn('[API/Chat] Supabase query error:', err);
    }
  }

  const localMessages = loadLocalChat(gameId);
  return NextResponse.json({ success: true, messages: localMessages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;
  if (!gameId) {
    return NextResponse.json({ success: false, error: 'Game ID required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { text, senderId, senderName, senderAvatar } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: 'Message text cannot be empty' }, { status: 400 });
    }

    const cleanText = text.trim();
    const name = senderName || 'Player';
    const avatar = senderAvatar || 'alex';

    const supabase = createAdminClient() || createServerClient();

    if (supabase) {
      // 1. Verify that game exists
      const { data: game } = await supabase
        .from('community_games')
        .select('id, host_id, host_name, is_public, visibility, invited_player_ids')
        .eq('id', gameId)
        .maybeSingle();

      // 2. Check participant / host permissions if game found
      if (game) {
        const isHost = Boolean(
          (senderId && game.host_id === senderId) ||
          (name && game.host_name && game.host_name.trim().toLowerCase() === name.trim().toLowerCase())
        );

        let isParticipant = isHost;
        if (!isParticipant && senderId) {
          const { data: part } = await supabase
            .from('game_participants')
            .select('id')
            .eq('game_id', gameId)
            .eq('user_id', senderId)
            .eq('status', 'joined')
            .maybeSingle();
          if (part) isParticipant = true;
        }

        // Restrict chat to host and joined participants
        if (!isParticipant) {
          return NextResponse.json(
            { success: false, error: 'Chat is restricted to confirmed roster participants.' },
            { status: 403 }
          );
        }
      }

      // 3. Insert into Supabase
      const { data: newRow, error: insertError } = await supabase
        .from('game_chat_messages')
        .insert({
          game_id: gameId,
          sender_id: senderId && senderId.includes('-') && !senderId.startsWith('usr_') ? senderId : null,
          sender_name: name,
          sender_avatar: avatar,
          message_text: cleanText,
        })
        .select()
        .single();

      if (!insertError && newRow) {
        const formatted = {
          id: newRow.id,
          senderName: newRow.sender_name,
          avatarId: newRow.sender_avatar || 'alex',
          text: newRow.message_text,
          time: new Date(newRow.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: true,
        };
        const local = loadLocalChat(gameId);
        saveLocalChat(gameId, [...local, formatted]);
        return NextResponse.json({ success: true, message: formatted });
      }
    }

    // Local file fallback
    const msg = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `msg_${crypto.randomUUID()}`
        : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      senderName: name,
      avatarId: avatar,
      text: cleanText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    const local = loadLocalChat(gameId);
    saveLocalChat(gameId, [...local, msg]);
    return NextResponse.json({ success: true, message: msg });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error sending message';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
