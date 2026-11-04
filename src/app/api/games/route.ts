import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const includePrivate = searchParams.get('includePrivate') === 'true';
  const userId = searchParams.get('userId');

  const supabase = createAdminClient() || createServerClient();

  if (supabase) {
    try {
      let query = supabase.from('community_games').select('*');

      if (!includePrivate) {
        // Enforce privacy: Hide invite-only games from public listings!
        query = query.eq('is_public', true).neq('visibility', 'Invite');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return NextResponse.json({ success: true, games: data });
      }
    } catch (err) {
      console.warn('[API/Games] Error querying games:', err);
    }
  }

  return NextResponse.json({ success: true, games: [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const game = body.game;

    if (!game || !game.title) {
      return NextResponse.json({ success: false, error: 'Invalid game payload' }, { status: 400 });
    }

    const supabase = createAdminClient() || createServerClient();

    if (supabase) {
      const hostUuid = game.hostId && game.hostId.includes('-') && !game.hostId.startsWith('usr_')
        ? game.hostId
        : null;

      const { data: created, error } = await supabase
        .from('community_games')
        .insert({
          id: game.id || undefined,
          title: game.title,
          sport: game.sport || 'football',
          format: game.format || '5v5',
          skill_level: game.skillLevel || 'Casual',
          date: game.date || 'Today',
          time: game.time || '18:00',
          location_name: game.locationName || 'Naga City',
          location_details: game.locationDetails,
          distance: game.distance || 'Naga City',
          host_id: hostUuid,
          host_name: game.hostName || 'Organizer',
          host_avatar: game.hostAvatar || 'alex',
          spots_total: game.spotsTotal || 10,
          spots_joined: 1,
          price_per_player: game.pricePerPlayer || 0,
          notes: game.notes,
          is_public: game.visibility ? game.visibility !== 'Invite' : true,
          visibility: game.visibility || 'Public',
          invite_code: game.inviteCode,
          invited_player_ids: Array.isArray(game.invitedPlayers)
            ? game.invitedPlayers.map((p: any) => p.id).filter((id: string) => id && id.includes('-'))
            : [],
          invited_players: game.invitedPlayers || [],
        })
        .select()
        .single();

      if (!error && created) {
        // Automatically add host as the first participant
        await supabase.from('game_participants').insert({
          game_id: created.id,
          user_id: hostUuid,
          user_name: game.hostName || 'Organizer',
          user_avatar: game.hostAvatar || 'alex',
          role: 'host',
          status: 'joined',
        });

        return NextResponse.json({ success: true, game: created });
      }
    }

    return NextResponse.json({ success: true, game });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error creating game';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
