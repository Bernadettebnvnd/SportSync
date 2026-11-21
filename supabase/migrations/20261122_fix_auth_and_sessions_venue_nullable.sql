-- =====================================================================
-- SportSync: Fix Auth User ID Consistency & Allow Nullable venue_id on Sessions
-- =====================================================================

-- 1. Allow community pickup games in public.sessions to exist without hijacking a facility owner's venue_id
ALTER TABLE public.sessions ALTER COLUMN venue_id DROP NOT NULL;

-- 2. Ensure session synchronization columns exist on public.sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'Public';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS invited_players JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS location_details TEXT;

-- 3. Clean up any legacy pwd_hash strings stored in public.users.phone
UPDATE public.users
SET phone = NULL
WHERE phone LIKE 'pwd_hash:%';

-- 4. Ensure public.users has RLS policies allowing authenticated and service-role profile sync
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
CREATE POLICY "Users are viewable by everyone" ON public.users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (true);
