-- Performance indexes for Gmail Smart Import tables.
-- All indexes are conditional (IF NOT EXISTS) and non-destructive.
--
-- Safety notes:
-- (1) Index-only changes — no table structure, RLS, or auth modifications.
-- (2) All indexes use existing columns; no schema drift introduced.

CREATE INDEX IF NOT EXISTS idx_gmail_import_jobs_user_trip
  ON public.gmail_import_jobs(user_id, trip_id);

CREATE INDEX IF NOT EXISTS idx_gmail_import_message_logs_job
  ON public.gmail_import_message_logs(job_id);

CREATE INDEX IF NOT EXISTS idx_smart_import_candidates_trip_dedupe
  ON public.smart_import_candidates(trip_id, dedupe_key);
