-- =====================================================================
-- SportSync: Fix users & sessions schema cache, onboarding column, and game creation
-- Run this in your Supabase Project -> SQL Editor to sync the schema cache
-- =====================================================================

-- 1. Ensure onboarding columns exist on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON public.users (onboarding_completed);

-- 2. Allow community pickup games in public.sessions to exist without requiring a facility venue_id
ALTER TABLE public.sessions ALTER COLUMN venue_id DROP NOT NULL;

-- 3. Ensure session synchronization columns exist on public.sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'Public';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS invited_players JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS location_details TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS coordinates DOUBLE PRECISION[] DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_invite_code ON public.sessions (invite_code);
CREATE INDEX IF NOT EXISTS idx_sessions_visibility ON public.sessions (visibility);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions (status);

-- 4. Ensure sport_type enum supports all current sports
DO $$ BEGIN
    ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'football';
    ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'billiards';
    ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'darts';
    ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'table_tennis';
    ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'other';
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- 5. Clean up any legacy password hash artifacts in public.users.phone
UPDATE public.users
SET phone = NULL
WHERE phone LIKE 'pwd_hash:%';

-- 6. Ensure public.session_participants table exists for multi-device roster sync
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

-- 7. Ensure RLS is enabled and policies are permissive for core operations
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (true);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sessions are viewable by everyone" ON public.sessions;
CREATE POLICY "Sessions are viewable by everyone" ON public.sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.sessions;
CREATE POLICY "Anyone can create sessions" ON public.sessions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users and staff can update sessions" ON public.sessions;
CREATE POLICY "Users and staff can update sessions" ON public.sessions FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Users and staff can delete sessions" ON public.sessions;
CREATE POLICY "Users and staff can delete sessions" ON public.sessions FOR DELETE USING (true);

ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Queues viewable by everyone" ON public.queues;
CREATE POLICY "Queues viewable by everyone" ON public.queues FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert into queue" ON public.queues;
CREATE POLICY "Anyone can insert into queue" ON public.queues FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update queues" ON public.queues;
CREATE POLICY "Anyone can update queues" ON public.queues FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anyone can delete queues" ON public.queues;
CREATE POLICY "Anyone can delete queues" ON public.queues FOR DELETE USING (true);

ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants viewable by everyone" ON public.session_participants;
CREATE POLICY "Participants viewable by everyone" ON public.session_participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert participants" ON public.session_participants;
CREATE POLICY "Anyone can insert participants" ON public.session_participants FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update participants" ON public.session_participants;
CREATE POLICY "Anyone can update participants" ON public.session_participants FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anyone can delete participants" ON public.session_participants;
CREATE POLICY "Anyone can delete participants" ON public.session_participants FOR DELETE USING (true);

-- 8. Add tables to Supabase Realtime publication if missing
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

-- 9. Force PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
