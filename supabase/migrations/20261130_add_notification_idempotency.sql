-- Migration: 20261130_add_notification_idempotency.sql
-- Description: Clean up duplicate notifications and enforce database-level idempotency via a unique partial index on metadata->>'dedupeKey'.

-- 1. Remove duplicate notification rows, keeping the most recent row per dedupeKey
DELETE FROM public.notifications
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY (metadata->>'dedupeKey')
                   ORDER BY created_at DESC, id DESC
               ) as rnum
        FROM public.notifications
        WHERE (metadata->>'dedupeKey') IS NOT NULL
    ) ranked
    WHERE ranked.rnum > 1
);

-- 2. Create unique partial index on dedupeKey to prevent concurrent duplicate inserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
ON public.notifications ((metadata->>'dedupeKey'))
WHERE (metadata->>'dedupeKey') IS NOT NULL;

-- 3. Additional index for fast querying by recipient and created_at
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
ON public.notifications (user_id, created_at DESC);
