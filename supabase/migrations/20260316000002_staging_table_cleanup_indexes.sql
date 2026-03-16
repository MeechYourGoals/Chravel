-- Migration: Cleanup indexes for staging tables + webhook_events retention comment
--
-- Staging tables (smart_import_candidates, shared_inbound_items) accumulate
-- rows indefinitely. Accepted/rejected candidates contain PII (reservation data,
-- email subject lines). A scheduled cleanup job needs these indexes to be
-- efficient.
--
-- webhook_events also grows without bound. The 30-day cleanup is documented
-- here and should be scheduled via pg_cron or Supabase Edge Function cron.
--
-- Safety notes:
-- (1) Index-only changes — no schema, RLS, or auth modifications.
-- (2) All IF NOT EXISTS — fully idempotent.

-- smart_import_candidates: efficient cleanup of old accepted/rejected rows
CREATE INDEX IF NOT EXISTS idx_smart_import_candidates_cleanup
  ON public.smart_import_candidates(status, updated_at)
  WHERE status IN ('accepted', 'rejected');

-- shared_inbound_items: efficient cleanup of old completed/failed items
CREATE INDEX IF NOT EXISTS idx_shared_inbound_items_cleanup
  ON public.shared_inbound_items(ingestion_status, updated_at)
  WHERE ingestion_status IN ('completed', 'failed');

-- webhook_events: efficient TTL-based cleanup
CREATE INDEX IF NOT EXISTS idx_webhook_events_cleanup
  ON public.webhook_events(created_at);

-- Document cleanup schedule for ops team
COMMENT ON TABLE public.webhook_events IS
  'Idempotency table for Stripe (and future) webhook events. '
  'Prevents duplicate processing during retries or storms. '
  'CLEANUP REQUIRED (weekly): DELETE FROM webhook_events WHERE created_at < NOW() - INTERVAL ''30 days''; '
  'Run via pg_cron or a scheduled Supabase Edge Function.';

COMMENT ON TABLE public.smart_import_candidates IS
  'Staging table for AI-parsed Gmail import candidates awaiting user review. '
  'Accepted/rejected rows are safe to clean after 90 days. '
  'CLEANUP: DELETE FROM smart_import_candidates WHERE status IN (''accepted'',''rejected'') AND updated_at < NOW() - INTERVAL ''90 days'';';

COMMENT ON TABLE public.shared_inbound_items IS
  'Staging table for iOS Share Extension intake. '
  'Completed/failed rows are safe to clean after 30 days. '
  'CLEANUP: DELETE FROM shared_inbound_items WHERE ingestion_status IN (''completed'',''failed'') AND updated_at < NOW() - INTERVAL ''30 days'';';
