import { NextRequest, NextResponse } from 'next/server';
import { CommunityGame } from '@/mock/types';
import fs from 'fs';
import path from 'path';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get('code') || searchParams.get('invite') || '').trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ success: false, error: 'Invite code is required' }, { status: 400 });
  }

  const diskCache = loadCache();
  const combined = { ...memoryStore, ...diskCache };

  const matched = Object.values(combined).find((g) => {
    if (!g) return false;
    const matchInvite = g.inviteCode && g.inviteCode.trim().toUpperCase() === code;
    const matchId = g.id && g.id.trim().toUpperCase() === code;
    return matchInvite || matchId;
  });

  if (matched) {
    return NextResponse.json({ success: true, game: matched });
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

    const key = (game.inviteCode || game.id).trim().toUpperCase();
    const diskCache = loadCache();
    diskCache[key] = game;
    memoryStore[key] = game;
    saveCache(diskCache);

    return NextResponse.json({ success: true, game });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error processing invitation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

