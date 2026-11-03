import { NextResponse } from 'next/server';
import { createAdminClient, createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

const MOCK_SESSION_IDS = [
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'sess_test_01',
  'sess_test_02',
];

export async function POST() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ success: true, message: 'Supabase not configured' });
  }

  try {
    const dbClient = createAdminClient() || createServerClient();
    if (!dbClient) {
      return NextResponse.json({ success: true, message: 'No database client available' });
    }

    // 1. Delete associated participation/queues, matches, payments for mock sessions
    try {
      await dbClient.from('queues').delete().in('session_id', MOCK_SESSION_IDS);
    } catch {}

    try {
      await dbClient.from('matches').delete().in('session_id', MOCK_SESSION_IDS);
    } catch {}

    try {
      await dbClient.from('payments').delete().in('session_id', MOCK_SESSION_IDS);
    } catch {}

    // 2. Delete mock sessions by primary key ID
    try {
      await dbClient.from('sessions').delete().in('id', MOCK_SESSION_IDS);
    } catch {}

    // 3. Delete any legacy template sessions matching mock title patterns
    try {
      await dbClient.from('sessions').delete().ilike('title', '%Friday Night Smash%');
    } catch {}

    try {
      await dbClient.from('sessions').delete().ilike('title', '%Dinking & Rally%');
    } catch {}

    return NextResponse.json({ success: true, purged: true });
  } catch (err: any) {
    console.warn('[clean-mock] Cleanup notice:', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 200 });
  }
}

export async function GET() {
  return POST();
}

