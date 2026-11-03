ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'Public';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS invited_players JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_sessions_invite_code ON public.sessions (invite_code);
