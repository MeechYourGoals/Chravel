-- Add trip_id column to message_read_receipts for server-side realtime filtering.
-- Without this column, realtime subscriptions on message_read_receipts receive ALL
-- inserts globally (every trip), forcing expensive client-side filtering. This becomes
-- a bandwidth/CPU crisis at scale (4000+ member events).
--
-- Phase: Messaging Architecture Review — Phase 1b

-- 1. Add nullable trip_id column (nullable for backward compat with existing rows)
ALTER TABLE public.message_read_receipts
  ADD COLUMN IF NOT EXISTS trip_id uuid;

-- 2. Backfill trip_id from the related message's trip_id
UPDATE public.message_read_receipts mrr
SET trip_id = tcm.trip_id
FROM public.trip_chat_messages tcm
WHERE mrr.message_id = tcm.id
  AND mrr.trip_id IS NULL;

-- 3. Index for realtime subscription filter (trip_id=eq.{tripId})
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_trip_id
  ON public.message_read_receipts (trip_id);

-- 4. Composite index for the common query pattern: "unread counts for user in trip"
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_trip_user
  ON public.message_read_receipts (trip_id, user_id);
