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
