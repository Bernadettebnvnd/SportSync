-- Migration: Ensure game_chat_messages exists with RLS policies and Realtime enabled
CREATE TABLE IF NOT EXISTS public.game_chat_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    game_id TEXT NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    sender_avatar TEXT DEFAULT 'alex',
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_chat_messages_game_time
    ON public.game_chat_messages(game_id, created_at ASC);

ALTER TABLE public.game_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Game chat messages are viewable by authenticated users" ON public.game_chat_messages;
CREATE POLICY "Game chat messages are viewable by authenticated users"
    ON public.game_chat_messages
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert game chat messages" ON public.game_chat_messages;
CREATE POLICY "Authenticated users can insert game chat messages"
    ON public.game_chat_messages
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL OR sender_id IS NOT NULL);

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
