import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';

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
    const { userId, userName, userAvatar, inviteCode } = body;

    if (!userName) {
      return NextResponse.json({ success: false, error: 'Player name is required' }, { status: 400 });
    }

    const supabase = createAdminClient() || createServerClient();

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service not available' }, { status: 503 });
    }

    // 1. Fetch the target game
    const { data: game, error: gameErr } = await supabase
      .from('community_games')
      .select('*')
      .eq('id', gameId)
      .maybeSingle();

    if (gameErr || !game) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
    }

    // 2. ENFORCE INVITE-ONLY PERMISSION ON THE BACKEND
    const isInviteOnly = game.visibility === 'Invite' || !game.is_public;

    if (isInviteOnly) {
      const isHost = Boolean(
        (userId && game.host_id === userId) ||
        (userName && game.host_name && game.host_name.trim().toLowerCase() === userName.trim().toLowerCase())
      );

      const isExplicitlyInvited = Boolean(
        (userId && Array.isArray(game.invited_player_ids) && game.invited_player_ids.includes(userId)) ||
        (Array.isArray(game.invited_players) && game.invited_players.some((p: any) =>
          (userId && p.id === userId) ||
          (userName && p.name && p.name.trim().toLowerCase() === userName.trim().toLowerCase())
        ))
      );

      const hasValidCode = Boolean(
        inviteCode &&
        game.invite_code &&
        inviteCode.trim().toUpperCase() === game.invite_code.trim().toUpperCase()
      );

      if (!isHost && !isExplicitlyInvited && !hasValidCode) {
        // Strict blocking notice per requirements
        return NextResponse.json(
          {
            success: false,
            error: 'This is an invite-only game. You can only join if the host has invited you.',
          },
          { status: 403 }
        );
      }
    }

    // 3. Prevent duplicate participants
    const userUuid = userId && userId.includes('-') && !userId.startsWith('usr_') ? userId : null;
    let existingQuery = supabase
      .from('game_participants')
      .select('id')
      .eq('game_id', gameId)
      .eq('status', 'joined');

    if (userUuid) {
      existingQuery = existingQuery.eq('user_id', userUuid);
    } else {
      existingQuery = existingQuery.eq('user_name', userName.trim());
    }

    const { data: existingParticipant } = await existingQuery.maybeSingle();

    if (existingParticipant) {
      return NextResponse.json(
        { success: false, alreadyParticipant: true, error: 'You are already on this match roster.' },
        { status: 409 }
      );
    }

    // 4. Check roster capacity
    if (game.spots_joined >= game.spots_total) {
      return NextResponse.json(
        { success: false, error: 'This match roster is already full.' },
        { status: 400 }
      );
    }

    // 5. Insert participant record
    const { data: participant, error: insertErr } = await supabase
      .from('game_participants')
      .insert({
        game_id: gameId,
        user_id: userUuid,
        user_name: userName.trim(),
        user_avatar: userAvatar || 'alex',
        role: 'player',
        status: 'joined',
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json(
        { success: false, error: insertErr.message || 'Failed to join roster' },
        { status: 500 }
      );
    }

    // 6. Increment spots_joined on the game
    const newSpots = (game.spots_joined || 0) + 1;
    await supabase
      .from('community_games')
      .update({ spots_joined: newSpots })
      .eq('id', gameId);

    return NextResponse.json({
      success: true,
      participant,
      game: { ...game, spots_joined: newSpots },
      message: 'Successfully joined game roster!',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error joining game';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
