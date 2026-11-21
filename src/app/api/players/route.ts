import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken } from '@/lib/auth/serverAuth';

export interface PublicPlayerProfile {
  id: string;
  name: string;
  username: string;
  avatarId: string;
  skillLevel: string;
  city: string;
  xp: number;
  level: number;
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
}

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Supabase is not configured on the server.' },
        { status: 500 }
      );
    }

    const db = createAdminClient() || createServerClient();
    if (!db) {
      return NextResponse.json(
        { error: 'Database client unavailable.' },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const excludeSelf = url.searchParams.get('excludeSelf') === 'true';

    let currentUserId: string | null = null;
    if (excludeSelf) {
      const tokenCookie =
        request.cookies.get('sportsync-auth-token')?.value ||
        request.cookies.get('sb-access-token')?.value;
      const authHeader = request.headers.get('authorization');
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      const token = tokenCookie || bearerToken;
      if (token) {
        const verified = verifySessionToken(token);
        if (verified?.userId) {
          currentUserId = verified.userId;
        }
      }
    }

    let query = db
      .from('users')
      .select('id, full_name, nickname, avatar_url, role, skill_level, primary_sport, preferred_sports, city, matches_played, matches_won, win_streak')
      .not('role', 'in', '("venue_owner","facility_owner","organizer")')
      .order('matches_won', { ascending: false })
      .order('matches_played', { ascending: false })
      .limit(50);

    if (excludeSelf && currentUserId) {
      query = query.neq('id', currentUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/players] Supabase users query failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const players: PublicPlayerProfile[] = (data || [])
      .filter((u) => Boolean(u?.id && (u.full_name || u.nickname)))
      .map((u) => {
        const displayName = (u.full_name || u.nickname || 'Player').trim();
        const matchesPlayed = Number(u.matches_played) || 0;
        const matchesWon = Number(u.matches_won) || 0;
        const winStreak = Number(u.win_streak) || 0;
        const xp = matchesPlayed * 150 + matchesWon * 100 + winStreak * 50;
        const level = Math.max(1, Math.floor(xp / 500) + 1);
        const rawHandle = (u.nickname || displayName.split(' ')[0] || 'player')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '');

        return {
          id: u.id,
          name: displayName,
          username: rawHandle ? `@${rawHandle}` : '@player',
          avatarId: u.avatar_url || 'alex',
          skillLevel: u.skill_level || 'intermediate',
          city: u.city || 'Naga City',
          xp,
          level,
          matchesPlayed,
          matchesWon,
          winStreak,
        };
      })
      .sort((a, b) => b.xp - a.xp);

    return NextResponse.json({ success: true, players });
  } catch (err: unknown) {
    console.error('[GET /api/players] Unexpected server error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to load players.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
