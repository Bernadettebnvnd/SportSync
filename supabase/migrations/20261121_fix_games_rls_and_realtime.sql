-- =====================================================================
-- SportSync: Fix Game Synchronization, Sessions & Queues RLS, and Realtime
-- =====================================================================

-- 1. Ensure columns exist on public.sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'Public';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS invited_players JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS location_details TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_invite_code ON public.sessions (invite_code);
CREATE INDEX IF NOT EXISTS idx_sessions_visibility ON public.sessions (visibility);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions (status);

-- 2. Open RLS policies on public.sessions to allow players, organizers, and server clients
-- to create, view, and update game sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sessions are viewable by everyone" ON public.sessions;
CREATE POLICY "Sessions are viewable by everyone" ON public.sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.sessions;
CREATE POLICY "Anyone can create sessions" ON public.sessions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users and staff can update sessions" ON public.sessions;
CREATE POLICY "Users and staff can update sessions" ON public.sessions
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users and staff can delete sessions" ON public.sessions;
CREATE POLICY "Users and staff can delete sessions" ON public.sessions
    FOR DELETE USING (true);

-- 3. Open RLS policies on public.queues to allow players to join and leave matches
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Queues viewable by everyone" ON public.queues;
CREATE POLICY "Queues viewable by everyone" ON public.queues
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players can insert into queue" ON public.queues;
DROP POLICY IF EXISTS "Anyone can insert into queue" ON public.queues;
CREATE POLICY "Anyone can insert into queue" ON public.queues
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Players or staff can update queues" ON public.queues;
DROP POLICY IF EXISTS "Anyone can update queues" ON public.queues;
CREATE POLICY "Anyone can update queues" ON public.queues
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete queues" ON public.queues;
CREATE POLICY "Anyone can delete queues" ON public.queues
    FOR DELETE USING (true);

-- 4. Create session_participants table if not exists
CREATE TABLE IF NOT EXISTS public.session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_avatar TEXT,
    status TEXT NOT NULL DEFAULT 'joined',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants viewable by everyone" ON public.session_participants;
CREATE POLICY "Participants viewable by everyone" ON public.session_participants
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert participants" ON public.session_participants;
CREATE POLICY "Anyone can insert participants" ON public.session_participants
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update participants" ON public.session_participants;
CREATE POLICY "Anyone can update participants" ON public.session_participants
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete participants" ON public.session_participants;
CREATE POLICY "Anyone can delete participants" ON public.session_participants
    FOR DELETE USING (true);

-- 5. Enable Realtime Publications for all game/session synchronization tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'queues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queues;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'session_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;
  END IF;
END $$;
