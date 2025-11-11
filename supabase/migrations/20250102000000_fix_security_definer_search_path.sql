-- =====================================================
-- SECURITY FIX: Add SET search_path to SECURITY DEFINER Functions
-- =====================================================
-- 
-- Issue: Functions with SECURITY DEFINER but no SET search_path 
--        can be exploited via search_path manipulation attacks
--
-- Exploitation Example:
--   CREATE SCHEMA attacker;
--   CREATE FUNCTION attacker.trip_members() RETURNS TABLE(...) AS $$
--     SELECT true; -- Malicious logic
--   $$ LANGUAGE SQL;
--   SET search_path = attacker, public;
--   SELECT * FROM vulnerable_function(); -- Uses attacker.trip_members()
--
-- Fix: Add SET search_path = public to all SECURITY DEFINER functions
-- =====================================================

-- =====================================================
-- FIX 1: Audio Summary Functions (001_audio_summaries.sql)
-- =====================================================

CREATE OR REPLACE FUNCTION check_audio_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER := 0;
  quota_limit INTEGER := 6000; -- 100 minutes in seconds (default free tier)
  last_reset DATE;
BEGIN
  -- Get or create quota record
  INSERT INTO audio_usage_quota (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current usage and last reset date
  SELECT monthly_usage, last_reset_date 
  INTO current_usage, last_reset
  FROM audio_usage_quota 
  WHERE user_id = p_user_id;
  
  -- Reset usage if it's a new month
  IF last_reset IS NULL OR DATE_TRUNC('month', last_reset) < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE audio_usage_quota 
    SET monthly_usage = 0, last_reset_date = CURRENT_DATE
    WHERE user_id = p_user_id;
    current_usage := 0;
  END IF;
  
  -- Check if under quota
  RETURN current_usage < quota_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_audio_usage(p_user_id UUID, p_duration INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audio_usage_quota (user_id, monthly_usage, last_reset_date)
  VALUES (p_user_id, p_duration, CURRENT_DATE)
  ON CONFLICT (user_id) 
  DO UPDATE SET monthly_usage = audio_usage_quota.monthly_usage + p_duration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FIX 2: AI Concierge Usage Tracking Functions
--        (20250120000002_ai_concierge_usage_tracking.sql)
-- =====================================================

CREATE OR REPLACE FUNCTION get_daily_concierge_usage(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM concierge_usage
    WHERE user_id = user_uuid
    AND DATE(created_at) = target_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION has_exceeded_concierge_limit(user_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_daily_concierge_usage(user_uuid) >= limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FIX 3: AI Conversations Function
--        (20250115000002_ai_conversations_table.sql)
-- =====================================================

CREATE OR REPLACE FUNCTION get_trip_conversation_history(trip_uuid UUID, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_message TEXT,
  ai_response TEXT,
  conversation_type TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_message,
    c.ai_response,
    c.conversation_type,
    c.created_at
  FROM public.ai_conversations c
  WHERE c.trip_id = trip_uuid
  ORDER BY c.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FIX 4: Enhance hybrid_search_trip_context with Trip Membership Check
--        (20251107001035_5087e291-c88b-4cf7-86f9-6672d86652df.sql)
-- =====================================================
--
-- Issue: Function already has SET search_path = public, but doesn't validate
--        that the calling user is a member of the trip being searched.
--        This allows users to query any trip's data if they know the trip_id.
--
-- Fix: Add trip membership validation at the start of the function

CREATE OR REPLACE FUNCTION hybrid_search_trip_context(
  p_trip_id text,
  p_query_text text,
  p_query_embedding vector,
  p_match_threshold float DEFAULT 0.6,
  p_match_count integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  content_text text,
  similarity float,
  metadata jsonb,
  rank float,
  search_type text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: Validate that the calling user is a member of the trip
  IF NOT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of this trip';
  END IF;

  RETURN QUERY
  WITH vector_results AS (
    SELECT 
      te.id,
      te.source_type,
      te.source_id,
      te.content_text,
      1 - (te.embedding <=> p_query_embedding) AS similarity,
      te.metadata,
      0.7 AS weight,
      'vector'::text AS search_type
    FROM trip_embeddings te
    WHERE te.trip_id = p_trip_id
      AND te.embedding IS NOT NULL
      AND 1 - (te.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY similarity DESC
    LIMIT p_match_count
  ),
  keyword_results AS (
    SELECT 
      kd.id,
      kd.source AS source_type,
      kd.source_id,
      kc.content AS content_text,
      0.0 AS similarity,
      kd.metadata,
      0.3 AS weight,
      'keyword'::text AS search_type
    FROM kb_chunks kc
    JOIN kb_documents kd ON kd.id = kc.doc_id
    WHERE kd.trip_id = p_trip_id
      AND kc.content_tsv @@ plainto_tsquery('english', p_query_text)
    ORDER BY ts_rank(kc.content_tsv, plainto_tsquery('english', p_query_text)) DESC
    LIMIT p_match_count / 2
  ),
  combined AS (
    SELECT *, vector_results.similarity * vector_results.weight AS rank
    FROM vector_results
    UNION ALL
    SELECT *, keyword_results.weight AS rank
    FROM keyword_results
  )
  SELECT 
    combined.id,
    combined.source_type,
    combined.source_id,
    combined.content_text,
    combined.similarity,
    combined.metadata,
    combined.rank,
    combined.search_type
  FROM combined
  ORDER BY rank DESC, similarity DESC
  LIMIT p_match_count;
END;
$$;

-- Update comment to reflect security enhancement
COMMENT ON FUNCTION hybrid_search_trip_context IS 
'Hybrid search combining vector similarity and keyword matching with re-ranking. 
Validates trip membership before allowing search access.';

-- =====================================================
-- FIX 5: Notification Badge Functions
--        (20251026_address_known_issues.sql)
-- =====================================================

CREATE OR REPLACE FUNCTION public.increment_badge_count(
  p_user_id UUID,
  p_trip_id UUID DEFAULT NULL,
  p_event_id UUID DEFAULT NULL,
  p_increment INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO public.notification_badges (user_id, trip_id, event_id, badge_count, last_increment_at)
  VALUES (p_user_id, p_trip_id, p_event_id, p_increment, now())
  ON CONFLICT (user_id, trip_id, event_id)
  DO UPDATE SET
    badge_count = public.notification_badges.badge_count + p_increment,
    last_increment_at = now(),
    updated_at = now()
  RETURNING badge_count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_badge_count(
  p_user_id UUID,
  p_trip_id UUID DEFAULT NULL,
  p_event_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notification_badges
  SET badge_count = 0, updated_at = now()
  WHERE user_id = p_user_id
    AND (p_trip_id IS NULL OR trip_id = p_trip_id)
    AND (p_event_id IS NULL OR event_id = p_event_id);

  RETURN FOUND;
END;
$$;

-- =====================================================
-- FIX 6: OCR Rate Limiting Functions
--        (20251026_address_known_issues.sql)
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_ocr_rate_limit(
  p_user_id UUID,
  p_tier TEXT DEFAULT 'free'
)
RETURNS TABLE(
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_current_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_allowed BOOLEAN;
  v_remaining INTEGER;
BEGIN
  -- Set limits based on tier
  v_limit := CASE p_tier
    WHEN 'free' THEN 5           -- 5 OCR requests per day
    WHEN 'explorer' THEN 20       -- 20 per day
    WHEN 'frequent-chraveler' THEN 100  -- 100 per day
    WHEN 'pro' THEN 999999        -- Unlimited
    ELSE 5
  END;

  -- Get current window start (daily reset)
  v_window_start := date_trunc('day', now());

  -- Get current count for today
  SELECT COALESCE(request_count, 0) INTO v_current_count
  FROM public.ocr_rate_limits
  WHERE user_id = p_user_id AND window_start = v_window_start;

  v_current_count := COALESCE(v_current_count, 0);
  v_allowed := v_current_count < v_limit;
  v_remaining := GREATEST(0, v_limit - v_current_count);

  RETURN QUERY SELECT v_allowed, v_remaining, v_window_start + INTERVAL '1 day';
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_ocr_usage(
  p_user_id UUID,
  p_tier TEXT DEFAULT 'free'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start := date_trunc('day', now());

  INSERT INTO public.ocr_rate_limits (user_id, request_count, window_start, tier)
  VALUES (p_user_id, 1, v_window_start, p_tier)
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET request_count = public.ocr_rate_limits.request_count + 1;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- FIX 7: Invite Rate Limiting Functions
--        (20251026_address_known_issues.sql)
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_invite_rate_limit(
  p_user_id UUID,
  p_tier TEXT DEFAULT 'free'
)
RETURNS TABLE(
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_current_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_allowed BOOLEAN;
  v_remaining INTEGER;
BEGIN
  -- Set limits based on tier (per hour)
  v_limit := CASE p_tier
    WHEN 'free' THEN 10           -- 10 invites per hour
    WHEN 'explorer' THEN 25       -- 25 per hour
    WHEN 'frequent-chraveler' THEN 50   -- 50 per hour
    WHEN 'pro' THEN 200           -- 200 per hour
    ELSE 10
  END;

  v_window_start := date_trunc('hour', now());

  SELECT COALESCE(invite_count, 0) INTO v_current_count
  FROM public.invite_rate_limits
  WHERE user_id = p_user_id AND window_start = v_window_start;

  v_current_count := COALESCE(v_current_count, 0);
  v_allowed := v_current_count < v_limit;
  v_remaining := GREATEST(0, v_limit - v_current_count);

  RETURN QUERY SELECT v_allowed, v_remaining, v_window_start + INTERVAL '1 hour';
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_invite_usage(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start := date_trunc('hour', now());

  INSERT INTO public.invite_rate_limits (user_id, invite_count, window_start)
  VALUES (p_user_id, 1, v_window_start)
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET invite_count = public.invite_rate_limits.invite_count + 1;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- FIX 8: Trip Member Management Function
--        (20251026_address_known_issues.sql)
-- =====================================================

CREATE OR REPLACE FUNCTION public.remove_trip_member_safe(
  p_trip_id UUID,
  p_user_id_to_remove UUID,
  p_removing_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removing_user_role TEXT;
  v_target_user_role TEXT;
  v_owner_count INTEGER;
BEGIN
  -- Get roles
  SELECT role INTO v_removing_user_role
  FROM trip_members
  WHERE trip_id = p_trip_id AND user_id = p_removing_user_id;

  SELECT role INTO v_target_user_role
  FROM trip_members
  WHERE trip_id = p_trip_id AND user_id = p_user_id_to_remove;

  -- Check permissions
  IF v_removing_user_role NOT IN ('admin', 'owner') THEN
    RETURN QUERY SELECT FALSE, 'Only admins and owners can remove members';
    RETURN;
  END IF;

  -- Cannot remove an owner
  IF v_target_user_role = 'owner' THEN
    RETURN QUERY SELECT FALSE, 'Cannot remove trip owner';
    RETURN;
  END IF;

  -- Cannot remove yourself (use leave_trip instead)
  IF p_user_id_to_remove = p_removing_user_id THEN
    RETURN QUERY SELECT FALSE, 'Use leave_trip to remove yourself';
    RETURN;
  END IF;

  -- Remove the member
  DELETE FROM trip_members
  WHERE trip_id = p_trip_id AND user_id = p_user_id_to_remove;

  -- Log the removal (in notification_logs or audit table)
  INSERT INTO notification_logs (user_id, type, title, body, data)
  VALUES (
    p_user_id_to_remove,
    'member_removed',
    'Removed from trip',
    COALESCE(p_reason, 'No reason provided'),
    jsonb_build_object('trip_id', p_trip_id, 'removed_by', p_removing_user_id)
  );

  RETURN QUERY SELECT TRUE, 'Member removed successfully';
END;
$$;

-- =====================================================
-- FIX 9: Cleanup Functions
--        (20251026_address_known_issues.sql)
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_prefetch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.offline_prefetch_metadata
  WHERE expires_at < now() AND status = 'downloaded';

  UPDATE public.offline_prefetch_metadata
  SET status = 'expired'
  WHERE expires_at < now() AND status != 'expired';
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ocr_rate_limits WHERE window_start < now() - INTERVAL '7 days';
  DELETE FROM public.invite_rate_limits WHERE window_start < now() - INTERVAL '7 days';
END;
$$;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this query to verify all SECURITY DEFINER functions have search_path set:
--
-- SELECT 
--   p.proname AS function_name,
--   CASE 
--     WHEN p.proconfig IS NULL THEN '❌ MISSING search_path'
--     WHEN array_to_string(p.proconfig, ',') LIKE '%search_path%' THEN '✅ HAS search_path'
--     ELSE '❌ MISSING search_path'
--   END as search_path_status
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE p.prosecdef = true  -- SECURITY DEFINER
--   AND n.nspname = 'public'
-- ORDER BY proname;
--
-- All functions should show '✅ HAS search_path'
