-- =====================================================================
-- Migration: Ensure bookings, court_availability, and payments tables exist
-- Reloads PostgREST schema cache to ensure endpoints recognize public.bookings
-- =====================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom ENUM Types (Idempotent)
DO $$ BEGIN
    CREATE TYPE sport_type AS ENUM (
        'badminton',
        'pickleball',
        'basketball',
        'padel',
        'tennis',
        'volleyball',
        'football',
        'billiards',
        'darts',
        'other',
        'table_tennis'
    );
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

-- 3. Create Bookings Table
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
    court_rate_cents INT NOT NULL DEFAULT 0,
    booking_amount_cents INT NOT NULL DEFAULT 0,
    platform_fee_cents INT NOT NULL DEFAULT 0,
    total_amount_cents INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_method payment_method NOT NULL DEFAULT 'gcash',
    reference_code TEXT,
    receipt_image_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Court Availability Table
CREATE TABLE IF NOT EXISTS public.court_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    block_type TEXT NOT NULL DEFAULT 'booked',
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount_cents INT NOT NULL DEFAULT 0,
    payment_method payment_method NOT NULL DEFAULT 'gcash',
    reference_code TEXT,
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

-- 6. Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for Bookings
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

-- 8. RLS Policies for Court Availability
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

-- 9. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
