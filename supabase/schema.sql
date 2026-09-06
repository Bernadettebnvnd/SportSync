-- =====================================================================
-- MATCHI: Supabase PostgreSQL Database Schema
-- Multi-Sport Discovery, Badminton Doubles/Singles, Live Queue & Venue Management
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom ENUM Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('player', 'organizer', 'venue_owner', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sport_type AS ENUM (
        'badminton',
        'pickleball',
        'basketball',
        'padel',
        'tennis',
        'volleyball',
        'table_tennis'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE match_format AS ENUM ('singles', 'doubles', 'mixed_doubles');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE skill_level AS ENUM ('all_levels', 'beginner', 'intermediate', 'advanced', 'competitive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_type AS ENUM ('open_play', 'private_booking', 'clinic', 'tournament');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE queue_status AS ENUM ('waiting', 'warming_up', 'on_court', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE match_status AS ENUM ('warmup', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected', 'cash_at_venue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('gcash', 'maya', 'grabpay', 'bdo', 'bpi', 'unionbank', 'cash');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Users / Profiles Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    nickname TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'player',
    primary_sport sport_type DEFAULT 'badminton',
    preferred_format match_format DEFAULT 'doubles',
    skill_level skill_level DEFAULT 'intermediate',
    phone TEXT,
    city TEXT DEFAULT 'Taguig, Metro Manila',
    matches_played INT NOT NULL DEFAULT 0,
    matches_won INT NOT NULL DEFAULT 0,
    win_streak INT NOT NULL DEFAULT 0,
    highest_streak INT NOT NULL DEFAULT 0,
    banana_points INT NOT NULL DEFAULT 150,
    equipped_gear JSONB DEFAULT '{"headband": "vine_band", "racket": "voltric_pro", "mascot_outfit": "canopy_tee"}'::jsonb,
    unlocked_gear JSONB DEFAULT '["vine_band", "voltric_pro", "canopy_tee"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Venues Table
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    operating_hours JSONB NOT NULL DEFAULT '{"mon_fri": "06:00 - 23:00", "sat_sun": "06:00 - 24:00"}'::jsonb,
    amenities TEXT[] DEFAULT ARRAY['Air Conditioning', 'Free Parking', 'Shower Rooms', 'Pro Shop', 'Water Station', 'Locker Rooms'],
    featured_sports sport_type[] DEFAULT ARRAY['badminton', 'pickleball']::sport_type[],
    images TEXT[] DEFAULT ARRAY['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'],
    payment_info JSONB DEFAULT '{"gcash_number": "0917-888-8773", "maya_number": "0917-888-8773", "accepts_cash": true}'::jsonb,
    gcash_number TEXT,
    gcash_name TEXT,
    rating NUMERIC(2,1) DEFAULT 4.8,
    review_count INT DEFAULT 42,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Courts Table
CREATE TABLE IF NOT EXISTS public.courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sport sport_type NOT NULL DEFAULT 'badminton',
    floor_type TEXT DEFAULT 'BWF Taraflex Rubber Mat',
    hourly_rate_cents INT NOT NULL DEFAULT 45000,
    supports_doubles BOOLEAN DEFAULT TRUE,
    supports_singles BOOLEAN DEFAULT TRUE,
    is_indoor BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Sessions Table (Open Play Events or Court Bookings)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    host_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    sport sport_type NOT NULL DEFAULT 'badminton',
    session_type session_type NOT NULL DEFAULT 'open_play',
    allowed_formats match_format[] DEFAULT ARRAY['doubles', 'singles']::match_format[],
    skill_level skill_level NOT NULL DEFAULT 'all_levels',
    court_ids UUID[] DEFAULT ARRAY[]::UUID[],
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    fee_cents INT NOT NULL DEFAULT 25000,
    max_players INT NOT NULL DEFAULT 16,
    current_players_count INT NOT NULL DEFAULT 0,
    rotation_format TEXT DEFAULT 'King of the Court Doubles (15 pts sudden death)',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Queues Table (Real-Time Live Waitlists for Open Play Rotations)
CREATE TABLE IF NOT EXISTS public.queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
    queue_number INT NOT NULL,
    group_size INT NOT NULL DEFAULT 2,
    match_format match_format NOT NULL DEFAULT 'doubles',
    partner_names TEXT[] DEFAULT ARRAY[]::TEXT[],
    needs_partner BOOLEAN DEFAULT FALSE,
    status queue_status NOT NULL DEFAULT 'waiting',
    estimated_wait_minutes INT DEFAULT 10,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    called_at TIMESTAMPTZ,
    court_assigned_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- 8. Matches Table (Live Scoring & Historic Results)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
    sport sport_type NOT NULL DEFAULT 'badminton',
    match_format match_format NOT NULL DEFAULT 'doubles',
    team_a_player_ids UUID[] NOT NULL,
    team_b_player_ids UUID[] NOT NULL,
    team_a_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    team_b_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    score_a INT NOT NULL DEFAULT 0,
    score_b INT NOT NULL DEFAULT 0,
    target_points INT NOT NULL DEFAULT 15,
    winner_team TEXT,
    status match_status NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Payments Table (Diversified E-wallets, Banks, Cash at Venue)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount_cents INT NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'gcash',
    reference_code TEXT NOT NULL,
    receipt_image_url TEXT,
    cash_voucher_code TEXT,
    status payment_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    rejection_reason TEXT,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Database Indexes for High-Traffic Queries
CREATE INDEX IF NOT EXISTS idx_venues_city ON public.venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_sports ON public.venues USING GIN (featured_sports);
CREATE INDEX IF NOT EXISTS idx_courts_venue ON public.courts(venue_id);
CREATE INDEX IF NOT EXISTS idx_sessions_venue ON public.sessions(venue_id);
CREATE INDEX IF NOT EXISTS idx_sessions_time ON public.sessions(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_sessions_sport ON public.sessions(sport);
CREATE INDEX IF NOT EXISTS idx_queues_session_status ON public.queues(session_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_session ON public.matches(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_session ON public.payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 11. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies (Idempotent: Drop if exists then create)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
CREATE POLICY "Public profiles are viewable by everyone" ON public.users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Venues are viewable by everyone" ON public.venues;
CREATE POLICY "Venues are viewable by everyone" ON public.venues
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Venue owners can manage venues" ON public.venues;
CREATE POLICY "Venue owners can manage venues" ON public.venues
    FOR ALL USING (auth.uid() IN (SELECT auth_id FROM public.users WHERE id = owner_id));

DROP POLICY IF EXISTS "Courts are viewable by everyone" ON public.courts;
CREATE POLICY "Courts are viewable by everyone" ON public.courts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Sessions are viewable by everyone" ON public.sessions;
CREATE POLICY "Sessions are viewable by everyone" ON public.sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizers can create and manage sessions" ON public.sessions;
CREATE POLICY "Organizers can create and manage sessions" ON public.sessions
    FOR ALL USING (auth.uid() IN (SELECT auth_id FROM public.users WHERE role IN ('organizer', 'venue_owner', 'admin')));

DROP POLICY IF EXISTS "Queues viewable by everyone" ON public.queues;
CREATE POLICY "Queues viewable by everyone" ON public.queues
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players can insert themselves into queue" ON public.queues;
CREATE POLICY "Players can insert themselves into queue" ON public.queues
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id));

DROP POLICY IF EXISTS "Players or organizers can update queues" ON public.queues;
CREATE POLICY "Players or organizers can update queues" ON public.queues
    FOR UPDATE USING (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id) OR
        auth.uid() IN (SELECT auth_id FROM public.users WHERE role IN ('organizer', 'venue_owner', 'admin'))
    );

DROP POLICY IF EXISTS "Matches viewable by everyone" ON public.matches;
CREATE POLICY "Matches viewable by everyone" ON public.matches
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players and organizers can score matches" ON public.matches;
CREATE POLICY "Players and organizers can score matches" ON public.matches
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Users see own payments" ON public.payments;
CREATE POLICY "Users see own payments" ON public.payments
    FOR SELECT USING (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id) OR
        auth.uid() IN (SELECT auth_id FROM public.users WHERE role IN ('organizer', 'venue_owner', 'admin'))
    );

DROP POLICY IF EXISTS "Users can submit payments" ON public.payments;
CREATE POLICY "Users can submit payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id));

DROP POLICY IF EXISTS "Organizers can verify payments" ON public.payments;
CREATE POLICY "Organizers can verify payments" ON public.payments
    FOR UPDATE USING (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE role IN ('organizer', 'venue_owner', 'admin'))
    );

-- 13. Enable Supabase Realtime for Live Queues and Matches (Safe DO block)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queues;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 14. Triggers: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_venues_updated_at ON public.venues;
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_courts_updated_at ON public.courts;
CREATE TRIGGER update_courts_updated_at BEFORE UPDATE ON public.courts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.sessions;
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_queues_updated_at ON public.queues;
CREATE TRIGGER update_queues_updated_at BEFORE UPDATE ON public.queues
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_matches_updated_at ON public.matches;
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 15. Realistic Seed Data for Philippine Sports Scene
INSERT INTO public.users (id, email, full_name, nickname, role, primary_sport, preferred_format, skill_level, matches_played, matches_won, win_streak, highest_streak, banana_points)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'miki@matchi.ph', 'Miki Del Rosario', 'Miki', 'player', 'badminton', 'doubles', 'intermediate', 38, 30, 6, 9, 480),
    ('a0000000-0000-0000-0000-000000000002', 'coach.basty@matchi.ph', 'Sebastian Santos', 'Coach Basty', 'organizer', 'pickleball', 'doubles', 'advanced', 64, 52, 6, 12, 980),
    ('a0000000-0000-0000-0000-000000000003', 'owner.upperdeck@matchi.ph', 'Carlos Tan', 'Charlie', 'venue_owner', 'badminton', 'doubles', 'intermediate', 12, 8, 2, 4, 450)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.venues (id, owner_id, name, slug, description, address, city, latitude, longitude, operating_hours, amenities, featured_sports, gcash_number, gcash_name, rating, review_count)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'The Upper Deck Sports Center', 'upper-deck-pasig', 'Premier multi-sports facility in Ortigas/Pasig. Features 8 BWF standard badminton courts for Doubles and Singles, indoor pickleball courts, and recovery facilities.', '1 Ortigas Ave, Pasig, Metro Manila', 'Pasig City', 14.5828, 121.0664, '{"mon_sun": "06:00 - 24:00"}'::jsonb, ARRAY['Air Conditioning', 'Free Parking', 'Hot Showers', 'Pro Shop', 'Locker Rooms', 'Cafe & Smoothies'], ARRAY['badminton', 'pickleball', 'basketball']::sport_type[], '0917-888-UPPR', 'UPPER DECK SPORTS INC', 4.9, 88),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Smash Zone BGC', 'smash-zone-bgc', 'High-energy badminton hub in Bonifacio Global City. Non-slip shock-absorbent courts, high-bay LED lighting, dedicated doubles and singles queuing.', '32nd St cor 9th Ave, Bonifacio Global City, Taguig', 'Taguig City', 14.5515, 121.0494, '{"mon_sun": "07:00 - 23:00"}'::jsonb, ARRAY['BWF Taraflex Floors', 'Air Conditioning', 'Shower Rooms', 'Racket Stringing', 'Parking'], ARRAY['badminton']::sport_type[], '0917-555-SMASH', 'SMASH ZONE BGC', 4.8, 114),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Padel Club Manila - Rockwell', 'padel-club-rockwell', 'State of the art panoramic glass padel courts with tournament blue turf, sports lounge, and doubles mixers.', 'Estrella St, Rockwell Center, Makati', 'Makati City', 14.5654, 121.0367, '{"mon_sun": "06:00 - 23:00"}'::jsonb, ARRAY['Panoramic Glass', 'Lounge Bar', 'Valet Parking', 'Gear Rental', 'Coaching'], ARRAY['padel']::sport_type[], '0917-777-PADEL', 'PADEL CLUB PH', 4.9, 65),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'Pickleball PlayGround QC', 'pickleball-playground-qc', 'Metro Manila''s favorite community pickleball haven. Cushioned outdoor covered courts for doubles and singles.', 'Tomas Morato Ave, Quezon City', 'Quezon City', 14.6292, 121.0336, '{"mon_sun": "06:00 - 22:00"}'::jsonb, ARRAY['Cushioned Acrylic Surface', 'LED Night Lights', 'Parking', 'Equipment Rental'], ARRAY['pickleball']::sport_type[], '0918-123-PICKLE', 'PICKLEBALL PLAYGROUND', 4.7, 53),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'Cebu Smash Arena', 'cebu-smash-arena', 'Premier badminton and racket hub in Metro Cebu. 6 BWF tournament rubber mats, pro racket restringing, and active doubles open play queues.', 'Gov. M. Cuenco Ave, Banilad, Cebu City', 'Cebu City', 10.3541, 123.9114, '{"mon_sun": "06:00 - 23:00"}'::jsonb, ARRAY['Taraflex Flooring', 'Shower Rooms', 'Pro Shop', 'Parking'], ARRAY['badminton', 'pickleball']::sport_type[], '0917-321-CEBU', 'CEBU SMASH ARENA', 4.9, 112),
    ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'Davao Racket & Pickleball Hub', 'davao-racket-hub', 'The heart of racket sports in Mindanao. High-ceiling tournament lighting, sprung hardwood courts, and vibrant community rotations.', 'J.P. Laurel Ave, Lanang, Davao City', 'Davao City', 7.0982, 125.6321, '{"mon_sun": "06:00 - 22:00"}'::jsonb, ARRAY['Hardwood Flooring', 'Air Conditioned Lounge', 'Parking'], ARRAY['badminton', 'pickleball', 'tennis']::sport_type[], '0918-987-DVO', 'DAVAO RACKET HUB', 4.8, 76),
    ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 'Baguio Pines Court Club', 'baguio-pines-club', 'Cool mountain breeze badminton and tennis center in Camp John Hay. Cushioned courts designed for high-altitude endurance and training.', 'Loakan Rd, Camp John Hay, Baguio City', 'Baguio City', 16.4023, 120.6133, '{"mon_sun": "07:00 - 21:00"}'::jsonb, ARRAY['Mountain Climate', 'Hot Showers', 'Cafe', 'Parking'], ARRAY['badminton', 'tennis']::sport_type[], '0919-444-BAGUIO', 'BAGUIO PINES CLUB', 4.9, 64),
    ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 'Nuvali South Sports Arena', 'nuvali-south-sports', 'Modern open-air and indoor sports complex in Santa Rosa, Laguna. Dedicated pickleball and padel courts with tournament scoring consoles.', 'Nuvali Blvd, Santa Rosa, Laguna', 'Santa Rosa, Laguna', 14.2417, 121.0625, '{"mon_sun": "06:00 - 23:00"}'::jsonb, ARRAY['Tournament Lighting', 'Pro Shop', 'Cafe', 'Parking'], ARRAY['pickleball', 'padel', 'badminton']::sport_type[], '0917-889-NUVALI', 'NUVALI SPORTS ARENA', 4.8, 89)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courts (id, venue_id, name, sport, hourly_rate_cents, floor_type, supports_doubles, supports_singles, is_indoor)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Court 1 (Yonex Pro)', 'badminton', 45000, 'Yonex BWF Taraflex', TRUE, TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Court 2 (Yonex Pro)', 'badminton', 45000, 'Yonex BWF Taraflex', TRUE, TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Court 3 (Pickle Center)', 'pickleball', 50000, 'Cushioned Acrylic', TRUE, TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'BGC Center Court', 'badminton', 55000, 'Green Taraflex Mat', TRUE, TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'Padel Court Alpha', 'padel', 120000, 'Mondo Supercourt Pro', TRUE, FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sessions (id, venue_id, host_id, title, description, sport, session_type, allowed_formats, skill_level, court_ids, start_time, end_time, fee_cents, max_players, current_players_count, rotation_format, status)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Friday Night Smash: Doubles Open Play', 'Energetic doubles rotation across 2 courts. King of the Court doubles format, feather shuttles provided, beginner & intermediate friendly!', 'badminton', 'open_play', ARRAY['doubles', 'mixed_doubles']::match_format[], 'all_levels', ARRAY['c0000000-0000-0000-0000-000000000001'::UUID, 'c0000000-0000-0000-0000-000000000002'::UUID], NOW() - INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 28000, 16, 12, 'King of the Court Doubles (15 pts sudden death)', 'active'),
    ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Dinking & Rally: Pickleball Doubles Social', 'Fast paced pickleball doubles social queue. 11-point games, win by 2, rotation after each match. Demo paddles available.', 'pickleball', 'open_play', ARRAY['doubles']::match_format[], 'intermediate', ARRAY['c0000000-0000-0000-0000-000000000003'::UUID], NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', 25000, 12, 7, 'Rally Rotation Doubles (11 pts win by 2)', 'upcoming')
ON CONFLICT (id) DO NOTHING;
