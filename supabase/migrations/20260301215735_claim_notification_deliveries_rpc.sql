-- ============================================================================
-- Add claim_notification_deliveries RPC for idempotent queue processing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_notification_deliveries(p_limit INTEGER DEFAULT 100)
RETURNS SETOF public.notification_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.notification_deliveries
  SET
    status = 'processing',
    updated_at = NOW()
  WHERE id IN (
    SELECT id
    FROM public.notification_deliveries
    WHERE status = 'queued'
      AND next_attempt_at <= NOW()
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;