-- Migration: Add get_concierge_trip_history RPC
-- Purpose: Returns the authenticated user's concierge chat history for a given trip,
--          formatted as alternating user/assistant message pairs for injection into
--          the AI Concierge prompt context.
-- Security: Uses auth.uid() — never trusts client-provided user_id.
--           RLS on ai_queries (auth.uid() = user_id) remains enforced.
--           EXECUTE granted to authenticated only (not anon).

CREATE OR REPLACE FUNCTION public.get_concierge_trip_history(
  p_trip_id TEXT,
  p_limit   INTEGER DEFAULT 10
)
RETURNS TABLE (
  role       TEXT,
  content    TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- For each row in ai_queries (one exchange = one user query + one assistant response),
  -- emit TWO output rows via CROSS JOIN LATERAL VALUES so the caller gets a flat
  -- chronological message list ready for use as chatHistory.
  --
  -- p_limit is the number of *exchanges* to return (each becomes 2 messages).
  -- We apply the LIMIT on the subquery before unnesting so we cap exchanges, not rows.
  SELECT
    pair.role,
    pair.content,
    pair.created_at
  FROM (
    SELECT
      q.query_text,
      q.response_text,
      q.created_at
    FROM public.ai_queries q
    WHERE q.trip_id   = p_trip_id
      AND q.user_id   = auth.uid()
      AND q.query_text    IS NOT NULL
      AND q.response_text IS NOT NULL
    ORDER BY q.created_at ASC
    LIMIT p_limit
  ) exchanges
  CROSS JOIN LATERAL (
    VALUES
      ('user'::TEXT,      exchanges.query_text,    exchanges.created_at),
      ('assistant'::TEXT, exchanges.response_text, exchanges.created_at)
  ) AS pair(role, content, created_at)
  ORDER BY pair.created_at ASC, pair.role DESC;
  -- Secondary sort: 'user' (DESC) sorts before 'assistant' when timestamps are equal,
  -- ensuring user message appears first in each exchange pair.
$$;

-- Grant EXECUTE to authenticated users only. Anon cannot call this function.
GRANT EXECUTE ON FUNCTION public.get_concierge_trip_history(TEXT, INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_concierge_trip_history(TEXT, INTEGER) FROM anon;

-- Composite index so the RPC lookup stays fast as ai_queries grows.
-- Covers the WHERE (trip_id, user_id) filter and ORDER BY created_at in one scan.
CREATE INDEX IF NOT EXISTS idx_ai_queries_trip_user_created
  ON public.ai_queries (trip_id, user_id, created_at ASC);
