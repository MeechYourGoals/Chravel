-- Migration: DB-level guard against concurrent Gmail import jobs
--
-- Without this, a user clicking "Import" rapidly can launch multiple parallel
-- gmail-import-worker invocations for the same trip+account. Although the
-- dedupe_key in smart_import_candidates prevents individual reservation
-- duplicates, the concurrent jobs waste Gemini API quota and create a race
-- window in the status='running' → status='completed' transition.
--
-- This partial unique index enforces that at most one job with status='running'
-- can exist per (user_id, gmail_account_id, trip_id) at the DB level.
-- When a second INSERT attempts to create a 'running' job, Postgres raises
-- a unique violation (error code 23505) which the edge function catches
-- and converts to a 409 "Import already in progress" response.
--
-- Safety notes:
-- (1) Partial index only covers status='running' rows — no constraint on
--     completed/failed/pending jobs, which are historical audit records.
-- (2) Idempotent via IF NOT EXISTS.
-- (3) No schema changes, no RLS changes, no data migrations.

CREATE UNIQUE INDEX IF NOT EXISTS idx_gmail_import_jobs_one_running
  ON public.gmail_import_jobs(user_id, gmail_account_id, trip_id)
  WHERE status = 'running';

COMMENT ON INDEX idx_gmail_import_jobs_one_running IS
  'Prevents concurrent running import jobs for the same user+account+trip. '
  'Edge function catches unique violation (23505) and returns 409.';
