-- Add idempotency_key to relevant trip tables to support safe multi-step tool calls

-- 1. trip_events
ALTER TABLE trip_events ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS trip_events_idempotency_key_idx ON trip_events (trip_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. trip_tasks
ALTER TABLE trip_tasks ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS trip_tasks_idempotency_key_idx ON trip_tasks (trip_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3. trip_polls
ALTER TABLE trip_polls ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS trip_polls_idempotency_key_idx ON trip_polls (trip_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 4. trip_links
ALTER TABLE trip_links ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS trip_links_idempotency_key_idx ON trip_links (trip_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 5. broadcasts
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS broadcasts_idempotency_key_idx ON broadcasts (trip_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
