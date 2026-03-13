-- Gmail Smart Import hardening:
-- - Add token expiry column compatibility
-- - Add audit log table for token lifecycle events
-- - Add helpful indexes for import queries

ALTER TABLE public.gmail_accounts
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.gmail_token_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_account_email TEXT,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gmail_token_audit_logs_user_id_created_at
  ON public.gmail_token_audit_logs(user_id, created_at DESC);

ALTER TABLE public.gmail_token_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own token audit logs" ON public.gmail_token_audit_logs;
CREATE POLICY "Users can view own token audit logs"
  ON public.gmail_token_audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_smart_import_candidates_trip_status
  ON public.smart_import_candidates(trip_id, status);

CREATE INDEX IF NOT EXISTS idx_gmail_import_jobs_user_trip_created
  ON public.gmail_import_jobs(user_id, trip_id, created_at DESC);
