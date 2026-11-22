-- =====================================================================
-- SportSync: Cleanup Orphaned Sessions from Deleted Hosts (Inah, Xian,
-- Shea, Marianne, Alex, Jan, etc.) and Enforce Cascade Delete Constraints
-- Idempotent migration: safe to run multiple times in Supabase SQL Editor.
-- =====================================================================

-- 1. Delete existing orphaned sessions and dependent chat/notification/roster rows
DO $$
DECLARE
  v_orphan_session_ids UUID[];
BEGIN
  SELECT COALESCE(ARRAY_AGG(s.id), ARRAY[]::UUID[])
  INTO v_orphan_session_ids
  FROM public.sessions s
  WHERE
    s.host_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = s.host_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = s.host_id
        AND u.auth_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM auth.users au WHERE au.id = u.auth_id OR au.id = u.id
        )
    )
    OR (
      (
        COALESCE(s.description, '') ~* '\[HOST:\s*(inah|xian|shea|marianne|alex|jan)(\s|\]|$)'
        OR EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = s.host_id
            AND (
              COALESCE(u.full_name, '') ~* '^\s*(inah|xian|shea|marianne|alex|jan)(\s|$)'
              OR COALESCE(u.nickname, '') ~* '^\s*(inah|xian|shea|marianne|alex|jan)(\s|$)'
            )
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.users u2
        JOIN auth.users au ON (au.id = u2.id OR au.id = u2.auth_id)
        WHERE u2.id = s.host_id
      )
    );

  IF cardinality(v_orphan_session_ids) > 0 THEN
    IF to_regclass('public.game_chat_messages') IS NOT NULL THEN
      DELETE FROM public.game_chat_messages
      WHERE game_id = ANY(v_orphan_session_ids::text[]);
    END IF;

    IF to_regclass('public.notifications') IS NOT NULL THEN
      DELETE FROM public.notifications
      WHERE (metadata->>'gameId') = ANY(v_orphan_session_ids::text[])
         OR (metadata->>'game_id') = ANY(v_orphan_session_ids::text[])
         OR (metadata->>'sessionId') = ANY(v_orphan_session_ids::text[]);
    END IF;

    IF to_regclass('public.session_participants') IS NOT NULL THEN
      DELETE FROM public.session_participants
      WHERE session_id = ANY(v_orphan_session_ids);
    END IF;

    IF to_regclass('public.queues') IS NOT NULL THEN
      DELETE FROM public.queues
      WHERE session_id = ANY(v_orphan_session_ids);
    END IF;

    DELETE FROM public.sessions
    WHERE id = ANY(v_orphan_session_ids);
  END IF;

  -- Remove stale orphaned public.users rows whose auth.users account no longer exists
  DELETE FROM public.users u
  WHERE
    (
      u.auth_id IS NOT NULL
      OR COALESCE(u.full_name, '') ~* '^\s*(inah|xian|shea|marianne|alex|jan)(\s|$)'
      OR COALESCE(u.nickname, '') ~* '^\s*(inah|xian|shea|marianne|alex|jan)(\s|$)'
    )
    AND NOT EXISTS (
      SELECT 1 FROM auth.users au WHERE au.id = u.id OR au.id = u.auth_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.venues v WHERE v.owner_id = u.id
    );
END $$;

-- 2. Enforce ON DELETE CASCADE on public.sessions.host_id
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  FOR v_conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.sessions'::regclass
      AND c.contype = 'f'
      AND a.attname = 'host_id'
  LOOP
    EXECUTE format('ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;

  ALTER TABLE public.sessions
    ADD CONSTRAINT sessions_host_id_fkey
    FOREIGN KEY (host_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_host_id ON public.sessions(host_id);

-- 3. Automatic cascade cleanup triggers for future session or auth user deletions
CREATE OR REPLACE FUNCTION public.cleanup_deleted_session_dependents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.game_chat_messages') IS NOT NULL THEN
    DELETE FROM public.game_chat_messages
    WHERE game_id = OLD.id::text;
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    DELETE FROM public.notifications
    WHERE (metadata->>'gameId') = OLD.id::text
       OR (metadata->>'game_id') = OLD.id::text
       OR (metadata->>'sessionId') = OLD.id::text;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_deleted_session_dependents ON public.sessions;
CREATE TRIGGER trg_cleanup_deleted_session_dependents
  AFTER DELETE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_deleted_session_dependents();

CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.sessions
  WHERE host_id = OLD.id
     OR host_id IN (SELECT id FROM public.users WHERE auth_id = OLD.id);

  DELETE FROM public.users
  WHERE id = OLD.id OR auth_id = OLD.id;

  RETURN OLD;
END;
$$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_on_auth_user_deleted ON auth.users;
  CREATE TRIGGER trg_on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_deleted();
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipped trigger creation on auth.users due to insufficient_privilege';
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
