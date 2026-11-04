-- =====================================================================
-- SPORTSYNC: Community Games, Participants Roster, and Realtime Match Chat
-- =====================================================================

-- 1. Community Games Table
CREATE TABLE IF NOT EXISTS public.community_games (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    sport TEXT NOT NULL DEFAULT 'football',
    format TEXT NOT NULL DEFAULT '5v5',
    skill_level TEXT NOT NULL DEFAULT 'Casual',
    date TEXT NOT NULL DEFAULT 'Today',
    time TEXT NOT NULL DEFAULT '18:00',
    location_name TEXT NOT NULL,
    location_details TEXT,
    distance TEXT DEFAULT 'Naga City',
    host_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    host_name TEXT NOT NULL,
    host_avatar TEXT DEFAULT 'alex',
    spots_total INT NOT NULL DEFAULT 10,
    spots_joined INT NOT NULL DEFAULT 1,
    price_per_player NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    visibility TEXT NOT NULL DEFAULT 'Public', -- 'Public', 'Friends', 'Invite'
    invite_code TEXT,
    invited_player_ids UUID[] DEFAULT ARRAY[]::UUID[],
    invited_players JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Game Participants (Roster) Table
CREATE TABLE IF NOT EXISTS public.game_participants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    game_id TEXT NOT NULL REFERENCES public.community_games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_avatar TEXT DEFAULT 'alex',
    role TEXT NOT NULL DEFAULT 'player', -- 'host', 'player'
    status TEXT NOT NULL DEFAULT 'joined', -- 'joined', 'left', 'invited'
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(game_id, user_id)
);

-- 3. Game Chat Messages Table
CREATE TABLE IF NOT EXISTS public.game_chat_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    game_id TEXT NOT NULL REFERENCES public.community_games(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    sender_avatar TEXT DEFAULT 'alex',
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-performance separation & ordering
CREATE INDEX IF NOT EXISTS idx_community_games_visibility ON public.community_games(visibility, is_public);
CREATE INDEX IF NOT EXISTS idx_community_games_invite_code ON public.community_games(invite_code);
CREATE INDEX IF NOT EXISTS idx_community_games_host_id ON public.community_games(host_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_game_id ON public.game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_user_id ON public.game_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_game_chat_messages_game_time ON public.game_chat_messages(game_id, created_at ASC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.community_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Privacy, Access Control, and Chat Isolation

-- Community Games Policies
-- Public games viewable by everyone; invite-only games viewable ONLY by host, invited players, or joined participants
DROP POLICY IF EXISTS "Public games are viewable by everyone" ON public.community_games;
CREATE POLICY "Public games are viewable by everyone" ON public.community_games
    FOR SELECT USING (
        (is_public = true AND visibility != 'Invite') OR
        (auth.uid() IN (SELECT auth_id FROM public.users WHERE id = host_id)) OR
        (auth.uid() IN (SELECT auth_id FROM public.users WHERE id = ANY(invited_player_ids))) OR
        (auth.uid() IN (
            SELECT u.auth_id FROM public.users u
            JOIN public.game_participants gp ON gp.user_id = u.id
            WHERE gp.game_id = community_games.id AND gp.status = 'joined'
        ))
    );

DROP POLICY IF EXISTS "Authenticated users can create games" ON public.community_games;
CREATE POLICY "Authenticated users can create games" ON public.community_games
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Host can update own games" ON public.community_games;
CREATE POLICY "Host can update own games" ON public.community_games
    FOR UPDATE USING (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = host_id)
    );

DROP POLICY IF EXISTS "Host can delete own games" ON public.community_games;
CREATE POLICY "Host can delete own games" ON public.community_games
    FOR DELETE USING (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = host_id)
    );

-- Game Participants Policies
DROP POLICY IF EXISTS "Participants viewable by authorized players" ON public.game_participants;
CREATE POLICY "Participants viewable by authorized players" ON public.game_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.community_games cg
            WHERE cg.id = game_id AND (
                (cg.is_public = true AND cg.visibility != 'Invite') OR
                auth.uid() IN (SELECT auth_id FROM public.users WHERE id = cg.host_id) OR
                auth.uid() IN (SELECT auth_id FROM public.users WHERE id = ANY(cg.invited_player_ids)) OR
                auth.uid() IN (SELECT u.auth_id FROM public.users u WHERE u.id = user_id)
            )
        )
    );

DROP POLICY IF EXISTS "Players can join if authorized" ON public.game_participants;
CREATE POLICY "Players can join if authorized" ON public.game_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.community_games cg
            WHERE cg.id = game_id AND (
                (cg.is_public = true AND cg.visibility != 'Invite') OR
                (auth.uid() IN (SELECT auth_id FROM public.users WHERE id = cg.host_id)) OR
                (auth.uid() IN (SELECT auth_id FROM public.users WHERE id = ANY(cg.invited_player_ids)))
            )
        )
    );

DROP POLICY IF EXISTS "Participants or host can delete participant" ON public.game_participants;
CREATE POLICY "Participants or host can delete participant" ON public.game_participants
    FOR DELETE USING (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id) OR
        EXISTS (
            SELECT 1 FROM public.community_games cg
            WHERE cg.id = game_id AND auth.uid() IN (SELECT auth_id FROM public.users WHERE id = cg.host_id)
        )
    );

-- Game Chat Messages Policies
-- Restrict chat reading and sending strictly to host and successfully joined players
DROP POLICY IF EXISTS "Chat viewable by host and joined participants" ON public.game_chat_messages;
CREATE POLICY "Chat viewable by host and joined participants" ON public.game_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.community_games cg
            WHERE cg.id = game_id AND auth.uid() IN (SELECT auth_id FROM public.users WHERE id = cg.host_id)
        ) OR
        EXISTS (
            SELECT 1 FROM public.game_participants gp
            JOIN public.users u ON u.id = gp.user_id
            WHERE gp.game_id = game_chat_messages.game_id AND gp.status = 'joined' AND u.auth_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Chat insertable by host and joined participants" ON public.game_chat_messages;
CREATE POLICY "Chat insertable by host and joined participants" ON public.game_chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.community_games cg
            WHERE cg.id = game_id AND auth.uid() IN (SELECT auth_id FROM public.users WHERE id = cg.host_id)
        ) OR
        EXISTS (
            SELECT 1 FROM public.game_participants gp
            JOIN public.users u ON u.id = gp.user_id
            WHERE gp.game_id = game_chat_messages.game_id AND gp.status = 'joined' AND u.auth_id = auth.uid()
        )
    );

-- 5. Enable Supabase Realtime Publications
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_games;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_participants;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_chat_messages;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
