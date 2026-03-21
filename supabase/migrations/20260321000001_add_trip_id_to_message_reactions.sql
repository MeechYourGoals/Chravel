-- Add trip_id column to message_reactions for server-side realtime filtering.
-- Without this column, the realtime subscription on message_reactions receives
-- ALL reactions globally — every trip, every user. Client-side filtering via
-- knownMessageIds Set works but wastes bandwidth and CPU at scale.
--
-- Phase: Messaging Architecture Review — Phase 1c

-- 1. Add nullable trip_id column (nullable for backward compat with existing rows)
ALTER TABLE public.message_reactions
  ADD COLUMN IF NOT EXISTS trip_id uuid;

-- 2. Backfill trip_id from the related message's trip_id
UPDATE public.message_reactions mr
SET trip_id = tcm.trip_id
FROM public.trip_chat_messages tcm
WHERE mr.message_id = tcm.id
  AND mr.trip_id IS NULL;

-- 3. Auto-populate trip_id on INSERT via trigger (so clients don't need to pass it)
CREATE OR REPLACE FUNCTION public.set_reaction_trip_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trip_id IS NULL THEN
    SELECT trip_id INTO NEW.trip_id
    FROM public.trip_chat_messages
    WHERE id = NEW.message_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_reaction_trip_id ON public.message_reactions;
CREATE TRIGGER trg_set_reaction_trip_id
  BEFORE INSERT ON public.message_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_reaction_trip_id();

-- 4. Index for realtime subscription filter
CREATE INDEX IF NOT EXISTS idx_message_reactions_trip_id
  ON public.message_reactions (trip_id);
