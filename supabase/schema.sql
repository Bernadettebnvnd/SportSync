-- =====================================================================
-- MATCHI: Supabase PostgreSQL Database Schema
-- Multi-Sport Discovery, Court Availability, Booking & Venue Operations
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Custom ENUM Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('player', 'organizer', 'venue_owner', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
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
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE match_format AS ENUM ('singles', 'doubles', 'mixed_doubles');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE skill_level AS ENUM ('all_levels', 'beginner', 'intermediate', 'advanced', 'competitive');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_type AS ENUM ('open_play', 'private_booking', 'clinic', 'tournament');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE queue_status AS ENUM ('waiting', 'warming_up', 'on_court', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE match_status AS ENUM ('warmup', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected', 'cash_at_venue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('gcash', 'maya', 'grabpay', 'bdo', 'bpi', 'unionbank', 'cash');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Sports Entity Table
CREATE TABLE IF NOT EXISTS public.sports (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    description TEXT,
    default_duration_minutes INT NOT NULL DEFAULT 60,
    supports_doubles BOOLEAN DEFAULT TRUE,
    supports_singles BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Users / Profiles Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    nickname TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'player',
    primary_sport sport_type DEFAULT 'pickleball',
    preferred_sports sport_type[] DEFAULT ARRAY['pickleball', 'badminton']::sport_type[],
    preferred_format match_format DEFAULT 'doubles',
    skill_level skill_level DEFAULT 'intermediate',
    phone TEXT,
    city TEXT DEFAULT 'Metro Manila',
    matches_played INT NOT NULL DEFAULT 0,
    matches_won INT NOT NULL DEFAULT 0,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Venues / Facilities Table
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
    operating_hours JSONB NOT NULL DEFAULT '{"mon_sun": "06:00 - 23:00"}'::jsonb,
    amenities TEXT[] DEFAULT ARRAY['Air Conditioning', 'Free Parking', 'Shower Rooms', 'Pro Shop', 'Locker Rooms'],
    featured_sports sport_type[] DEFAULT ARRAY['pickleball', 'badminton']::sport_type[],
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    payment_info JSONB DEFAULT '{"accepts_cash": true}'::jsonb,
    gcash_number TEXT,
    gcash_name TEXT,
    rating NUMERIC(2,1) DEFAULT NULL,
    review_count INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT TRUE,
    inventory_source TEXT DEFAULT 'manual',
    external_booking_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Facility Staff Junction (Authorizes users for facility management)
CREATE TABLE IF NOT EXISTS public.facility_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner', -- 'owner', 'manager', 'desk_staff'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(facility_id, user_id)
);

-- 7. Courts / Playing Areas Table
CREATE TABLE IF NOT EXISTS public.courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sport sport_type NOT NULL DEFAULT 'pickleball',
    floor_type TEXT DEFAULT 'Standard Synthetic',
    court_type TEXT DEFAULT 'standard', -- 'full', 'half', 'standard'
    capacity INT DEFAULT 4,
    hourly_rate_cents INT NOT NULL DEFAULT 45000,
    supports_doubles BOOLEAN DEFAULT TRUE,
    supports_singles BOOLEAN DEFAULT TRUE,
    is_indoor BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Direct Court Bookings (P0 Core Transaction)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
    sport sport_type NOT NULL DEFAULT 'pickleball',
    booking_date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60,
    court_rate_cents INT NOT NULL,
    booking_amount_cents INT NOT NULL,
    platform_fee_cents INT NOT NULL DEFAULT 0,
    total_amount_cents INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'approved', 'rejected', 'cash_at_venue'
    payment_method payment_method NOT NULL DEFAULT 'gcash',
    reference_code TEXT,
    receipt_image_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Court Availability & Slot Locking (Prevents double booking)
CREATE TABLE IF NOT EXISTS public.court_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    block_type TEXT NOT NULL DEFAULT 'booked', -- 'booked', 'maintenance', 'reserved', 'open_play'
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT no_overlapping_court_slots EXCLUDE USING gist (
        court_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    )
);

-- 10. Sessions Table (Open Play Rotations)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    host_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    sport sport_type NOT NULL DEFAULT 'pickleball',
    session_type session_type NOT NULL DEFAULT 'open_play',
    allowed_formats match_format[] DEFAULT ARRAY['doubles', 'singles']::match_format[],
    skill_level skill_level NOT NULL DEFAULT 'all_levels',
    court_ids UUID[] DEFAULT ARRAY[]::UUID[],
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    fee_cents INT NOT NULL DEFAULT 25000,
    max_players INT NOT NULL DEFAULT 16,
    current_players_count INT NOT NULL DEFAULT 0,
    rotation_format TEXT DEFAULT 'King of the Court Doubles',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Queues Table (Waitlists for Open Play)
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

-- 12. Matches Table (Scoring & Historic Results)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
    sport sport_type NOT NULL DEFAULT 'pickleball',
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

-- 13. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
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

-- 14. First-Party Verified Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    comment TEXT,
    verified_booking BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Database Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_venues_city ON public.venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_sports ON public.venues USING GIN (featured_sports);
CREATE INDEX IF NOT EXISTS idx_courts_venue ON public.courts(venue_id);
CREATE INDEX IF NOT EXISTS idx_sessions_venue ON public.sessions(venue_id);
CREATE INDEX IF NOT EXISTS idx_sessions_time ON public.sessions(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_sessions_sport ON public.sessions(sport);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_venue ON public.bookings(venue_id);
CREATE INDEX IF NOT EXISTS idx_bookings_court ON public.bookings(court_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_court_avail_court_time ON public.court_availability(court_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_facility_staff_user ON public.facility_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_venue ON public.reviews(venue_id);

-- 16. Trigger: Auto-sync Supabase Auth Signups with public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (auth_id, email, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'player@matchi.ph'), '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'player')
    )
    ON CONFLICT (auth_id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Updated_at timestamp handler
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

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.sessions;
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 17. Row Level Security (RLS) Enablement
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 18. RLS Policies
-- Users
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
CREATE POLICY "Public profiles are viewable by everyone" ON public.users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Venues
DROP POLICY IF EXISTS "Venues are viewable by everyone" ON public.venues;
CREATE POLICY "Venues are viewable by everyone" ON public.venues
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Venue owners can manage venues" ON public.venues;
CREATE POLICY "Venue owners can manage venues" ON public.venues
    FOR ALL USING (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = owner_id) OR
        auth.uid() IN (
            SELECT u.auth_id FROM public.users u
            JOIN public.facility_staff fs ON fs.user_id = u.id
            WHERE fs.facility_id = id
        )
    );

-- Courts
DROP POLICY IF EXISTS "Courts are viewable by everyone" ON public.courts;
CREATE POLICY "Courts are viewable by everyone" ON public.courts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Facility staff can manage courts" ON public.courts;
CREATE POLICY "Facility staff can manage courts" ON public.courts
    FOR ALL USING (
        auth.uid() IN (
            SELECT u.auth_id FROM public.users u
            JOIN public.facility_staff fs ON fs.user_id = u.id
            WHERE fs.facility_id = venue_id
        ) OR
        auth.uid() IN (
            SELECT u.auth_id FROM public.users u
            JOIN public.venues v ON v.owner_id = u.id
            WHERE v.id = venue_id
        )
    );

-- Sports
DROP POLICY IF EXISTS "Sports are viewable by everyone" ON public.sports;
CREATE POLICY "Sports are viewable by everyone" ON public.sports
    FOR SELECT USING (true);

-- Facility Staff
DROP POLICY IF EXISTS "Facility staff viewable by members" ON public.facility_staff;
CREATE POLICY "Facility staff viewable by members" ON public.facility_staff
    FOR SELECT USING (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id) OR
        auth.uid() IN (
            SELECT u.auth_id FROM public.users u
            JOIN public.venues v ON v.owner_id = u.id
            WHERE v.id = facility_id
        )
    );

-- Court Availability
DROP POLICY IF EXISTS "Public can view court availability" ON public.court_availability;
CREATE POLICY "Public can view court availability" ON public.court_availability
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage court availability" ON public.court_availability;
CREATE POLICY "Staff can manage court availability" ON public.court_availability
    FOR ALL USING (
        auth.uid() IN (
            SELECT u.auth_id FROM public.users u
            JOIN public.courts c ON c.id = court_id
            JOIN public.venues v ON v.id = c.venue_id
            LEFT JOIN public.facility_staff fs ON fs.facility_id = v.id AND fs.user_id = u.id
            WHERE v.owner_id = u.id OR fs.id IS NOT NULL
        )
    );

-- Bookings
DROP POLICY IF EXISTS "Players can view own bookings" ON public.bookings;
CREATE POLICY "Players can view own bookings" ON public.bookings
    FOR SELECT USING (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id) OR
        auth.uid() IN (
            SELECT u.auth_id FROM public.users u
            LEFT JOIN public.facility_staff fs ON fs.user_id = u.id AND fs.facility_id = venue_id
            LEFT JOIN public.venues v ON v.id = venue_id AND v.owner_id = u.id
            WHERE fs.id IS NOT NULL OR v.id IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id)
    );

DROP POLICY IF EXISTS "Staff can update facility bookings" ON public.bookings;
CREATE POLICY "Staff can update facility bookings" ON public.bookings
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT u.auth_id FROM public.users u
            LEFT JOIN public.facility_staff fs ON fs.user_id = u.id AND fs.facility_id = venue_id
            LEFT JOIN public.venues v ON v.id = venue_id AND v.owner_id = u.id
            WHERE fs.id IS NOT NULL OR v.id IS NOT NULL
        ) OR
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id)
    );

-- Sessions (Open Play)
DROP POLICY IF EXISTS "Sessions are viewable by everyone" ON public.sessions;
CREATE POLICY "Sessions are viewable by everyone" ON public.sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage sessions" ON public.sessions;
CREATE POLICY "Staff can manage sessions" ON public.sessions
    FOR ALL USING (
        auth.uid() IN (
            SELECT u.auth_id FROM public.users u
            LEFT JOIN public.facility_staff fs ON fs.user_id = u.id AND fs.facility_id = venue_id
            LEFT JOIN public.venues v ON v.id = venue_id AND v.owner_id = u.id
            WHERE fs.id IS NOT NULL OR v.id IS NOT NULL OR u.role IN ('organizer', 'admin')
        )
    );

-- Queues
DROP POLICY IF EXISTS "Queues viewable by everyone" ON public.queues;
CREATE POLICY "Queues viewable by everyone" ON public.queues
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players can insert into queue" ON public.queues;
CREATE POLICY "Players can insert into queue" ON public.queues
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id)
    );

DROP POLICY IF EXISTS "Players or staff can update queues" ON public.queues;
CREATE POLICY "Players or staff can update queues" ON public.queues
    FOR UPDATE USING (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id) OR
        auth.uid() IN (
            SELECT u.auth_id FROM public.users u
            JOIN public.sessions s ON s.id = session_id
            LEFT JOIN public.facility_staff fs ON fs.facility_id = s.venue_id AND fs.user_id = u.id
            WHERE fs.id IS NOT NULL OR u.role IN ('organizer', 'admin')
        )
    );

-- Payments
DROP POLICY IF EXISTS "Users see own payments or facility payments" ON public.payments;
CREATE POLICY "Users see own payments or facility payments" ON public.payments
    FOR SELECT USING (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id) OR
        auth.uid() IN (
            SELECT u.auth_id FROM public.users u
            LEFT JOIN public.bookings b ON b.id = booking_id
            LEFT JOIN public.facility_staff fs ON fs.facility_id = b.venue_id AND fs.user_id = u.id
            WHERE fs.id IS NOT NULL OR u.role IN ('organizer', 'admin')
        )
    );

DROP POLICY IF EXISTS "Users can submit payments" ON public.payments;
CREATE POLICY "Users can submit payments" ON public.payments
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id)
    );

-- Reviews
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert reviews" ON public.reviews;
CREATE POLICY "Users can insert reviews" ON public.reviews
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id)
    );

-- 19. Enable Realtime Publications
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queues;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
