-- Rate limit profile directory search to reduce harvesting risk.
--
-- Notes:
-- - This function intentionally searches `public.profiles_public` (already privacy-gated and co-member scoped).
-- - We add a per-user, per-minute limiter via `public.increment_rate_limit`.
-- - Keep return shape narrow to reduce accidental PII expansion.

CREATE OR REPLACE FUNCTION public.search_profiles_public(
  query_text TEXT,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query TEXT;
  v_limit INTEGER;
  v_rate_key TEXT;
  v_allowed BOOLEAN;
BEGIN
  -- Require auth (we do not provide a public user directory).
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_query := btrim(COALESCE(query_text, ''));
  IF length(v_query) < 2 THEN
    RETURN;
  END IF;

  v_limit := GREATEST(1, LEAST(COALESCE(limit_count, 10), 25));

  -- 30 searches per minute per user (defense-in-depth; UI already debounces + limits results).
  v_rate_key := 'profiles_public_search:' || auth.uid()::text;
  SELECT allowed INTO v_allowed
  FROM public.increment_rate_limit(v_rate_key, 30, 60);

  IF NOT COALESCE(v_allowed, false) THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.display_name,
    p.avatar_url
  FROM public.profiles_public p
  WHERE
    (
      COALESCE(p.display_name, '') ILIKE ('%' || v_query || '%')
      OR (
        position('@' in v_query) > 0
        AND COALESCE(p.email, '') ILIKE ('%' || v_query || '%')
      )
    )
  ORDER BY p.display_name NULLS LAST, p.id
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.search_profiles_public(TEXT, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_profiles_public(TEXT, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.search_profiles_public(TEXT, INTEGER) IS
'Rate-limited search over profiles_public (co-member scoped + privacy gated).';

