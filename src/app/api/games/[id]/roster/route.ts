import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';

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
      let { data, error } = await supabase
        .from('game_participants')
        .select('*, user:users(*)')
        .eq('game_id', gameId)
        .neq('status', 'left')
        .order('joined_at', { ascending: true });

      if (error) {
        const fallbackRes = await supabase
          .from('game_participants')
          .select('*')
          .eq('game_id', gameId)
          .neq('status', 'left')
          .order('joined_at', { ascending: true });
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (!error && Array.isArray(data)) {
        const participants = data.map((row: any) => ({
          id: row.user_id || row.id,
          userId: row.user_id,
          name: row.user?.full_name || row.user_name || 'Player',
          avatar: row.user?.avatar_url || row.user_avatar || 'alex',
          role: row.role || 'player',
          status: row.status,
          joinedAt: row.joined_at,
        }));
        return NextResponse.json({ success: true, participants });
      }
    } catch (err) {
      console.warn('[API/Roster] Error querying participants:', err);
    }
  }

  return NextResponse.json({ success: true, participants: [] });
}
