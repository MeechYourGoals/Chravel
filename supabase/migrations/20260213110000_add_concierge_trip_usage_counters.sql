-- =====================================================
-- Concierge per-user, per-trip usage counters
-- Limits:
--   free: 5 queries/trip
--   explorer: 10 queries/trip
--   frequent chraveler/pro: unlimited
-- =====================================================

CREATE TABLE IF NOT EXISTS public.concierge_trip_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, trip_id)
);

CREATE INDEX IF NOT EXISTS idx_concierge_trip_usage_user_id
  ON public.concierge_trip_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_concierge_trip_usage_trip_id
  ON public.concierge_trip_usage(trip_id);

ALTER TABLE public.concierge_trip_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own concierge trip usage" ON public.concierge_trip_usage;
CREATE POLICY "Users can view their own concierge trip usage"
  ON public.concierge_trip_usage
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own concierge trip usage" ON public.concierge_trip_usage;
CREATE POLICY "Users can insert their own concierge trip usage"
  ON public.concierge_trip_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own concierge trip usage" ON public.concierge_trip_usage;
CREATE POLICY "Users can update their own concierge trip usage"
  ON public.concierge_trip_usage
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage concierge trip usage" ON public.concierge_trip_usage;
CREATE POLICY "Service role can manage concierge trip usage"
  ON public.concierge_trip_usage
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.get_concierge_trip_usage(p_trip_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_used_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_trip_id IS NULL OR btrim(p_trip_id) = '' THEN
    RAISE EXCEPTION 'Trip ID is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.trip_members tm
    WHERE tm.trip_id = p_trip_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = p_trip_id
      AND t.creator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied for trip %', p_trip_id;
  END IF;

  INSERT INTO public.concierge_trip_usage (user_id, trip_id, used_count)
  VALUES (v_user_id, p_trip_id, 0)
  ON CONFLICT (user_id, trip_id) DO NOTHING;

  SELECT ctu.used_count
  INTO v_used_count
  FROM public.concierge_trip_usage ctu
  WHERE ctu.user_id = v_user_id
    AND ctu.trip_id = p_trip_id;

  RETURN COALESCE(v_used_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_concierge_trip_usage(
  p_trip_id TEXT,
  p_limit INTEGER DEFAULT NULL
)
RETURNS TABLE (
  used_count INTEGER,
  remaining INTEGER,
  incremented BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_trip_id IS NULL OR btrim(p_trip_id) = '' THEN
    RAISE EXCEPTION 'Trip ID is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.trip_members tm
    WHERE tm.trip_id = p_trip_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = p_trip_id
      AND t.creator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied for trip %', p_trip_id;
  END IF;

  INSERT INTO public.concierge_trip_usage (user_id, trip_id, used_count)
  VALUES (v_user_id, p_trip_id, 0)
  ON CONFLICT (user_id, trip_id) DO NOTHING;

  IF p_limit IS NULL OR p_limit <= 0 THEN
    UPDATE public.concierge_trip_usage
    SET used_count = concierge_trip_usage.used_count + 1,
        updated_at = NOW()
    WHERE concierge_trip_usage.user_id = v_user_id
      AND concierge_trip_usage.trip_id = p_trip_id
    RETURNING concierge_trip_usage.used_count INTO used_count;

    remaining := NULL;
    incremented := TRUE;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.concierge_trip_usage
  SET used_count = concierge_trip_usage.used_count + 1,
      updated_at = NOW()
  WHERE concierge_trip_usage.user_id = v_user_id
    AND concierge_trip_usage.trip_id = p_trip_id
    AND concierge_trip_usage.used_count < p_limit
  RETURNING concierge_trip_usage.used_count INTO used_count;

  IF FOUND THEN
    remaining := GREATEST(p_limit - used_count, 0);
    incremented := TRUE;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT ctu.used_count
  INTO used_count
  FROM public.concierge_trip_usage ctu
  WHERE ctu.user_id = v_user_id
    AND ctu.trip_id = p_trip_id;

  used_count := COALESCE(used_count, 0);
  remaining := GREATEST(p_limit - used_count, 0);
  incremented := FALSE;
  RETURN NEXT;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON public.concierge_trip_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_concierge_trip_usage(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_concierge_trip_usage(TEXT, INTEGER) TO authenticated;
