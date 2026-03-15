-- Add source_type to trip_tasks and trip_polls for actor attribution
-- (trip_events already has source_type)
ALTER TABLE trip_tasks ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE trip_polls ADD COLUMN IF NOT EXISTS source_type text;

-- Add idempotency_key to all three tables for voice tool deduplication.
-- Nullable so existing manual-creation paths are unaffected.
-- Partial unique index ensures the same idempotency_key cannot create duplicates within a trip.
ALTER TABLE trip_events ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE trip_tasks ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE trip_polls ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_events_idempotency
  ON trip_events (trip_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_tasks_idempotency
  ON trip_tasks (trip_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_polls_idempotency
  ON trip_polls (trip_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
