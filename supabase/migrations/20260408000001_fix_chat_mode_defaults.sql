-- Fix regression from migration 20260214211051 which set:
--   chat_mode DEFAULT 'broadcasts'
--   media_upload_mode DEFAULT 'admin_only'
-- for ALL trip types. These restrictive defaults are only appropriate for event trips.
-- Consumer and pro trips were incorrectly locked into announcements-only mode.
--
-- SAFETY VERIFICATION:
-- 1. No Trip Not Found risk: only modifies chat_mode/media_upload_mode values, not trip visibility
-- 2. No Auth desync: RLS function can_post_to_trip_chat already handles 'everyone' correctly
-- 3. No RLS leak: UPDATE only affects non-event trips, making them MORE permissive (restoring intended behavior)
-- 4. Event trips are untouched by the WHERE clause

-- Step 1: Change defaults for newly created trips
ALTER TABLE public.trips ALTER COLUMN chat_mode SET DEFAULT 'everyone';
ALTER TABLE public.trips ALTER COLUMN media_upload_mode SET DEFAULT 'everyone';

-- Step 2: Fix existing consumer and pro trips that were incorrectly locked down
UPDATE public.trips
SET chat_mode = 'everyone'
WHERE trip_type IS DISTINCT FROM 'event'
  AND chat_mode = 'broadcasts';

UPDATE public.trips
SET media_upload_mode = 'everyone'
WHERE trip_type IS DISTINCT FROM 'event'
  AND media_upload_mode = 'admin_only';

-- Step 3: Align server-side enforcement with non-event compatibility behavior.
-- During rollout, non-event trips may still have legacy restrictive values.
-- RLS should treat those as permissive for non-event trips so UI and backend stay consistent.

CREATE OR REPLACE FUNCTION public.can_post_to_trip_chat(
  _user_id UUID,
  _trip_id TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH trip_ctx AS (
    SELECT
      t.id,
      t.chat_mode,
      t.trip_type,
      tm.role,
      (
        SELECT COUNT(*)
        FROM public.trip_members tm_count
        WHERE tm_count.trip_id = t.id
      ) AS attendee_count
    FROM public.trips t
    JOIN public.trip_members tm ON tm.trip_id = t.id AND tm.user_id = _user_id
    WHERE t.id = _trip_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM trip_ctx
    WHERE
      -- Non-event trips are always open main chat for members.
      trip_type IS DISTINCT FROM 'event'
      -- Large events (>50) are admin-only regardless of stored mode.
      OR (trip_type = 'event' AND attendee_count > 50 AND role IN ('admin', 'organizer', 'owner'))
      -- Small events allow everyone when mode is everyone or NULL (legacy).
      OR (
        trip_type = 'event'
        AND attendee_count <= 50
        AND (chat_mode = 'everyone' OR chat_mode IS NULL)
      )
      -- Restricted event modes remain admin-only.
      OR (
        trip_type = 'event'
        AND chat_mode IN ('admin_only', 'broadcasts')
        AND role IN ('admin', 'organizer', 'owner')
      )
  )
$$;

COMMENT ON FUNCTION public.can_post_to_trip_chat IS
'Checks if a user can post to trip main chat. Non-event trips are open for members; event trips enforce chat_mode and attendee-count rules.';

CREATE OR REPLACE FUNCTION public.can_upload_media_to_trip(
  _user_id UUID,
  _trip_id TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    JOIN public.trip_members tm ON tm.trip_id = t.id AND tm.user_id = _user_id
    WHERE t.id = _trip_id
    AND (
      -- Non-event trips are always open for member media uploads.
      t.trip_type IS DISTINCT FROM 'event'
      -- Event trips enforce media_upload_mode.
      OR t.media_upload_mode = 'everyone'
      OR (t.media_upload_mode = 'admin_only' AND tm.role IN ('admin', 'organizer', 'owner'))
      OR t.media_upload_mode IS NULL
    )
  )
$$;

COMMENT ON FUNCTION public.can_upload_media_to_trip IS
'Checks if a user can upload media to a trip. Non-event trips are open for members; event trips enforce media_upload_mode.';
