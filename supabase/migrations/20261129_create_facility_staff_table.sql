-- Migration: 20261129_create_facility_staff_table.sql
-- Create facility_staff table to support multi-staff court management and venue assignments

CREATE TABLE IF NOT EXISTS public.facility_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff', 'coach')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(facility_id, user_id)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_facility_staff_facility_id ON public.facility_staff(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_staff_user_id ON public.facility_staff(user_id);

-- Enable RLS
ALTER TABLE public.facility_staff ENABLE ROW LEVEL SECURITY;

-- Policies:
-- 1. Anyone authenticated can view facility staff for venues
CREATE POLICY "Allow authenticated read facility_staff"
  ON public.facility_staff
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Service role / admin full access
CREATE POLICY "Allow service role full access to facility_staff"
  ON public.facility_staff
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
