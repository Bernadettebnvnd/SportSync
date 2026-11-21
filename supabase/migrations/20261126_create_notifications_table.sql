-- Migration: 20261126_create_notifications_table.sql
-- Description: Create public.notifications table with RLS policies and Realtime publication.

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    user_identifier TEXT,
    type TEXT NOT NULL DEFAULT 'match',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    link_screen TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_identifier ON public.notifications(user_identifier);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow reading notifications
DROP POLICY IF EXISTS "Public select notifications" ON public.notifications;
CREATE POLICY "Public select notifications" ON public.notifications
    FOR SELECT USING (true);

-- Allow inserting notifications
DROP POLICY IF EXISTS "Public insert notifications" ON public.notifications;
CREATE POLICY "Public insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Allow updating notifications (e.g. read status)
DROP POLICY IF EXISTS "Public update notifications" ON public.notifications;
CREATE POLICY "Public update notifications" ON public.notifications
    FOR UPDATE USING (true);

-- Allow deleting notifications
DROP POLICY IF EXISTS "Public delete notifications" ON public.notifications;
CREATE POLICY "Public delete notifications" ON public.notifications
    FOR DELETE USING (true);

-- Enable Realtime for notifications table
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
