-- Add last_seen_at to trip_members for lightweight "last seen" UX
-- Safe to run on existing environments with varying trip_members schemas

ALTER TABLE public.trip_members
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Backfill last_seen_at for existing rows using the best available timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trip_members'
      AND column_name = 'joined_at'
  ) THEN
    EXECUTE $$
      UPDATE public.trip_members
      SET last_seen_at = COALESCE(last_seen_at, joined_at)
      WHERE last_seen_at IS NULL
    $$;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trip_members'
      AND column_name = 'created_at'
  ) THEN
    EXECUTE $$
      UPDATE public.trip_members
      SET last_seen_at = COALESCE(last_seen_at, created_at)
      WHERE last_seen_at IS NULL
    $$;
  END IF;
END;
$$;

-- Index for fast ordering / “seen recently” queries
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_last_seen
ON public.trip_members (trip_id, last_seen_at DESC);
