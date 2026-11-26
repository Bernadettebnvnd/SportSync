-- =====================================================================
-- SportSync: Optional session end time (ends_at) & nullable capacity
-- (NULL max_players = Unlimited / Open to all)
-- Safe and idempotent to run in Supabase SQL Editor.
-- =====================================================================

-- 1. Add nullable ends_at column for explicit optional end times (existing rows remain NULL)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ DEFAULT NULL;

-- Ensure ends_at is strictly after start_time whenever provided
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_ends_at_after_start_chk;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_ends_at_after_start_chk
  CHECK (ends_at IS NULL OR ends_at > start_time);

-- 2. Allow max_players to be NULL to represent "Open for all / Unlimited" capacity
ALTER TABLE public.sessions
  ALTER COLUMN max_players DROP NOT NULL;

ALTER TABLE public.sessions
  ALTER COLUMN max_players DROP DEFAULT;

-- Normalize any legacy out-of-range values before adding check constraint
UPDATE public.sessions
SET max_players = NULL
WHERE max_players IS NOT NULL AND (max_players < 2 OR max_players > 24);

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_max_players_valid_chk;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_max_players_valid_chk
  CHECK (max_players IS NULL OR (max_players >= 2 AND max_players <= 24));

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
