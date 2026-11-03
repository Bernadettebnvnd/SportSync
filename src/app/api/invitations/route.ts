import { NextRequest, NextResponse } from 'next/server';
import { CommunityGame } from '@/mock/types';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const DATA_DIR = path.join(process.cwd(), '.data');
const CACHE_FILE = path.join(DATA_DIR, 'invitations.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

function loadCache(): Record<string, CommunityGame> {
  try {
    ensureDataDir();
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(raw) || {};
    }
  } catch {}
  return {};
}

function saveCache(cache: Record<string, CommunityGame>): void {
  try {
    ensureDataDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch {}
}

const memoryStore: Record<string, CommunityGame> = loadCache();

function getServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('xyzcompany') || url.includes('placeholder')) {
    return null;
  }
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get('code') || searchParams.get('invite') || '').trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ success: false, error: 'Invite code is required' }, { status: 400 });
  }

  const diskCache = loadCache();
  const combined = { ...memoryStore, ...diskCache };

  const matched = combined[code] || Object.values(combined).find((g) => {
    if (!g) return false;
    const matchInvite = g.inviteCode && g.inviteCode.trim().toUpperCase() === code;
    const matchId = g.id && g.id.trim().toUpperCase() === code;
    return matchInvite || matchId;
  });

  if (matched) {
    return NextResponse.json({ success: true, game: matched });
  }

  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data: byCode } = await supabase
        .from('sessions')
        .select('*')
        .eq('invite_code', code)
        .limit(1);

      let dbSession = byCode && byCode[0];

      if (!dbSession) {
        const { data: byDesc } = await supabase
          .from('sessions')
          .select('*')
          .ilike('description', `%[INVITE:${code}]%`)
          .limit(1);
        dbSession = byDesc && byDesc[0];
      }

      if (dbSession) {
        const mappedGame: CommunityGame = {
          id: dbSession.id,
          sessionId: dbSession.id,
          sport: (dbSession.sport ? dbSession.sport.charAt(0).toUpperCase() + dbSession.sport.slice(1) : 'Pickleball') as any,
          title: dbSession.title,
          format: (dbSession.rotation_format || '5v5') as any,
          skillLevel: dbSession.skill_level === 'all_levels' ? 'Casual' : 'Competitive',
          date: 'Upcoming',
          time: dbSession.start_time || '18:00',
          locationName: 'Verified Court Facility',
          distance: '0.8 km away',
          hostName: 'Organizer',
          hostAvatar: 'alex',
          spotsTotal: dbSession.max_players || 10,
          spotsJoined: dbSession.current_players_count || 1,
          pricePerPlayer: Math.round((dbSession.fee_cents || 0) / 100),
          notes: dbSession.description || '',
          isPublic: false,
          visibility: 'Invite',
          inviteCode: code,
          members: [{ name: 'Organizer', avatar: 'alex' }],
        };
        diskCache[code] = mappedGame;
        memoryStore[code] = mappedGame;
        saveCache(diskCache);
        return NextResponse.json({ success: true, game: mappedGame });
      }
    } catch {}
  }

  return NextResponse.json({ success: false, error: 'Invitation not found or expired' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const game = body.game as CommunityGame;

    if (!game || !game.id) {
      return NextResponse.json({ success: false, error: 'Invalid game payload' }, { status: 400 });
    }

    const diskCache = loadCache();

    if (game.inviteCode) {
      const inviteKey = game.inviteCode.trim().toUpperCase();
      diskCache[inviteKey] = game;
      memoryStore[inviteKey] = game;
    }

    if (game.id) {
      const idKey = game.id.trim().toUpperCase();
      diskCache[idKey] = game;
      memoryStore[idKey] = game;
    }

    saveCache(diskCache);

    return NextResponse.json({ success: true, game });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error processing invitation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
