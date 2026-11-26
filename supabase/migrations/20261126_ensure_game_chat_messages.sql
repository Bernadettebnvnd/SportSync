-- =====================================================================
-- SportSync: Ensure public.game_chat_messages table, columns, grants,
-- RLS policies, Realtime publication, and PostgREST schema cache reload.
-- Safe and idempotent to run in Supabase SQL Editor.
-- =====================================================================

-- 1. Create table if missing
CREATE TABLE IF NOT EXISTS public.game_chat_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    game_id TEXT NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL DEFAULT 'Player',
    sender_avatar TEXT DEFAULT 'alex',
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Ensure all expected columns exist (handles legacy partial schemas)
ALTER TABLE public.game_chat_messages ADD COLUMN IF NOT EXISTS game_id TEXT;
ALTER TABLE public.game_chat_messages ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE public.game_chat_messages ADD COLUMN IF NOT EXISTS sender_name TEXT NOT NULL DEFAULT 'Player';
ALTER TABLE public.game_chat_messages ADD COLUMN IF NOT EXISTS sender_avatar TEXT DEFAULT 'alex';
ALTER TABLE public.game_chat_messages ADD COLUMN IF NOT EXISTS message_text TEXT;
ALTER TABLE public.game_chat_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Ensure sender_id FK uses ON DELETE SET NULL so deleted accounts never break chat history
ALTER TABLE public.game_chat_messages
  DROP CONSTRAINT IF EXISTS game_chat_messages_sender_id_fkey;

ALTER TABLE public.game_chat_messages
  ADD CONSTRAINT game_chat_messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. Index for fast chronological room queries
CREATE INDEX IF NOT EXISTS idx_game_chat_messages_game_time
    ON public.game_chat_messages(game_id, created_at ASC);

-- 4. Grants & RLS policies (authorization is enforced server-side in /api/games/[id]/chat)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.game_chat_messages TO service_role;
GRANT SELECT, INSERT ON TABLE public.game_chat_messages TO authenticated, anon;

ALTER TABLE public.game_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Game chat messages are viewable by authenticated users" ON public.game_chat_messages;
DROP POLICY IF EXISTS "Game chat messages are viewable" ON public.game_chat_messages;
CREATE POLICY "Game chat messages are viewable"
    ON public.game_chat_messages
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert game chat messages" ON public.game_chat_messages;
DROP POLICY IF EXISTS "Game chat messages can be inserted" ON public.game_chat_messages;
CREATE POLICY "Game chat messages can be inserted"
    ON public.game_chat_messages
    FOR INSERT
    WITH CHECK (true);

-- 5. Ensure table is included in Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'game_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_chat_messages;
  END IF;
END $$;

-- 6. Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
