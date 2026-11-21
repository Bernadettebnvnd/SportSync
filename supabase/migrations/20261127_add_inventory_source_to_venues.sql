-- =====================================================================
-- SportSync: Add inventory_source to Venues and Schema Cache Refresh
-- =====================================================================

-- 1. Ensure inventory_source column exists on public.venues
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS inventory_source TEXT DEFAULT 'manual';

COMMENT ON COLUMN public.venues.inventory_source IS 'Source of venue court inventory: manual, api, or synced';

-- 2. Clean up any legacy pwd_hash strings stored in public.users.phone
UPDATE public.users
SET phone = NULL
WHERE phone LIKE 'pwd_hash:%' OR phone LIKE '%hash%';

-- 3. Ensure PostgREST schema cache is refreshed
NOTIFY pgrst, 'reload schema';
