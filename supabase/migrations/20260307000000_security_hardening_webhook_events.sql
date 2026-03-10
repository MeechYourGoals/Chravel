-- Security Hardening: Webhook event idempotency table
-- Prevents duplicate processing of Stripe (and other) webhook events

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookups by event_id
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events (event_id);

-- Auto-cleanup: remove events older than 30 days to prevent unbounded growth
-- This can be run by a cron job or pg_cron extension
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events (created_at);

-- RLS: Only service role should access this table (no user-facing queries)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed — service_role bypasses RLS automatically.
-- This ensures webhook_events is only accessible via edge functions with service_role key.

COMMENT ON TABLE public.webhook_events IS 'Idempotency table for webhook event processing. Prevents duplicate handling of Stripe/RevenueCat webhooks during retries or storms.';
