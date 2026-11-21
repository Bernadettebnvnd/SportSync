-- =====================================================================
-- SportSync: Fix sessions schema cache & ensure allowed_formats exists
-- Run this in your Supabase Project -> SQL Editor
-- =====================================================================

-- 1. Ensure match_format enum exists
DO $$ BEGIN
    CREATE TYPE match_format AS ENUM ('singles', 'doubles', 'mixed_doubles');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Add allowed_formats column to public.sessions if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sessions' 
          AND column_name = 'allowed_formats'
    ) THEN
        BEGIN
            ALTER TABLE public.sessions ADD COLUMN allowed_formats match_format[] DEFAULT ARRAY['doubles', 'singles']::match_format[];
        EXCEPTION WHEN OTHERS THEN
            ALTER TABLE public.sessions ADD COLUMN allowed_formats TEXT[] DEFAULT ARRAY['doubles', 'singles'];
        END;
    END IF;
END $$;

-- 3. Ensure users table has preferred_format and onboarding columns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'preferred_format'
    ) THEN
        BEGIN
            ALTER TABLE public.users ADD COLUMN preferred_format match_format DEFAULT 'doubles';
        EXCEPTION WHEN OTHERS THEN
            ALTER TABLE public.users ADD COLUMN preferred_format TEXT DEFAULT 'doubles';
        END;
    END IF;
END $$;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;

-- 4. Allow community games to exist without requiring a facility venue_id
ALTER TABLE public.sessions ALTER COLUMN venue_id DROP NOT NULL;

-- 5. Ensure extended session sync columns exist
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'Public';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS invited_players JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS location_details TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS coordinates DOUBLE PRECISION[] DEFAULT NULL;

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
