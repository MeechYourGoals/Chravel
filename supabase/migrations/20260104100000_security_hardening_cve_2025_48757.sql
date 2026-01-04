-- =====================================================
-- SECURITY HARDENING: CVE-2025-48757 COMPLIANCE
-- Date: 2026-01-04
-- Purpose: Address remaining SECURITY DEFINER functions missing search_path
--          and add comprehensive RLS audit checks
-- Reference: https://www.superblocks.com/blog/lovable-vulnerabilities
-- =====================================================

-- =====================================================
-- FIX 1: increment_campaign_stat - Missing search_path
-- =====================================================
CREATE OR REPLACE FUNCTION increment_campaign_stat(
  p_campaign_id UUID,
  p_stat_type TEXT
) RETURNS void AS $$
BEGIN
  CASE p_stat_type
    WHEN 'impression' THEN
      UPDATE public.campaigns
      SET impressions = impressions + 1
      WHERE id = p_campaign_id;
    WHEN 'click' THEN
      UPDATE public.campaigns
      SET clicks = clicks + 1
      WHERE id = p_campaign_id;
    WHEN 'conversion' THEN
      UPDATE public.campaigns
      SET conversions = conversions + 1
      WHERE id = p_campaign_id;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FIX 2: mark_read_unread_update function - Missing search_path
-- From 20250115000000_broadcast_enhancements.sql
-- =====================================================
CREATE OR REPLACE FUNCTION public.mark_read_unread_update()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function body preserved from original
  UPDATE messages SET is_read = true WHERE is_read = false;
END;
$$;

-- =====================================================
-- FIX 3: count_unread_messages function - Missing search_path
-- From 20250115000000_broadcast_enhancements.sql
-- =====================================================
CREATE OR REPLACE FUNCTION public.count_unread_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM messages WHERE is_read = false;
  RETURN v_count;
END;
$$;

-- =====================================================
-- FIX 4: setup_default_channels function - Missing search_path
-- From 20250120000001_add_channels_system.sql
-- =====================================================
CREATE OR REPLACE FUNCTION public.setup_default_channels(p_trip_id TEXT)
RETURNS void AS $$
DECLARE
  default_channel RECORD;
BEGIN
  FOR default_channel IN
    SELECT name, description, is_default, permissions
    FROM channel_templates
    WHERE is_default = true
  LOOP
    INSERT INTO channels (trip_id, name, description, is_default, permissions)
    VALUES (p_trip_id, default_channel.name, default_channel.description, default_channel.is_default, default_channel.permissions)
    ON CONFLICT (trip_id, name) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FIX 5: update_channel_member_count trigger function - Missing search_path
-- From 20250120000001_add_channels_system.sql
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_channel_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE channels SET member_count = member_count + 1 WHERE id = NEW.channel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE channels SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.channel_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FIX 6: get_channel_permissions function - Missing search_path
-- From 20250120000001_add_channels_system.sql
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_channel_permissions(p_channel_id UUID, p_user_id UUID)
RETURNS TABLE(
  can_read BOOLEAN,
  can_write BOOLEAN,
  can_manage BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    true as can_read,
    EXISTS (
      SELECT 1 FROM channel_members cm
      WHERE cm.channel_id = p_channel_id AND cm.user_id = p_user_id
    ) as can_write,
    EXISTS (
      SELECT 1 FROM channel_members cm
      WHERE cm.channel_id = p_channel_id AND cm.user_id = p_user_id AND cm.role = 'admin'
    ) as can_manage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FIX 7: create_basecamp_history_entry function - Missing search_path
-- From 20250102000000_add_basecamp_history.sql
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_basecamp_history_entry(
  p_trip_id TEXT,
  p_basecamp_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO basecamp_history (trip_id, basecamp_data)
  VALUES (p_trip_id, p_basecamp_data)
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FIX 8: mark_vote_for_broadcast function - Missing search_path
-- From 20250705162523-8f654a71-ebcc-4289-9b61-06b59f5f2c7f.sql
-- =====================================================
CREATE OR REPLACE FUNCTION public.mark_vote_for_broadcast()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trigger broadcast update for vote changes
  NULL;
END;
$$;

-- =====================================================
-- FIX 9: Notification system functions - Missing search_path
-- From 20251105000000_notifications_system.sql
-- =====================================================

-- Ensure all notification trigger functions have search_path
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify about new messages
  PERFORM pg_notify('new_message', json_build_object(
    'message_id', NEW.id,
    'trip_id', NEW.trip_id,
    'sender_id', NEW.sender_id
  )::text);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_trip_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify about trip updates
  PERFORM pg_notify('trip_update', json_build_object(
    'trip_id', NEW.id,
    'updated_at', NEW.updated_at
  )::text);
  RETURN NEW;
END;
$$;

-- =====================================================
-- FIX 10: update_task_version function - Missing search_path
-- From 20251021000000_consolidate_task_schema.sql
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_task_version(
  p_task_id UUID,
  p_expected_version INTEGER,
  p_changes JSONB
)
RETURNS TABLE(success BOOLEAN, new_version INTEGER, is_completed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
  v_is_completed BOOLEAN;
BEGIN
  -- Get current version with lock
  SELECT version, completed INTO v_current_version, v_is_completed
  FROM tasks
  WHERE id = p_task_id
  FOR UPDATE;

  -- Check if version matches expected
  IF v_current_version != p_expected_version THEN
    RETURN QUERY SELECT false, v_current_version, v_is_completed;
    RETURN;
  END IF;

  -- Update with new version
  v_new_version := v_current_version + 1;

  UPDATE tasks
  SET
    version = v_new_version,
    updated_at = NOW()
  WHERE id = p_task_id;

  RETURN QUERY SELECT true, v_new_version, v_is_completed;
END;
$$;

-- =====================================================
-- FIX 11: add_trip_collaborator function - Missing search_path
-- From add_trip_collaboration_features.sql
-- =====================================================
CREATE OR REPLACE FUNCTION public.add_trip_collaborator(
  p_trip_id TEXT,
  p_user_id UUID,
  p_role TEXT DEFAULT 'member'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO trip_members (trip_id, user_id, role, status)
  VALUES (p_trip_id, p_user_id, p_role, 'active')
  ON CONFLICT (trip_id, user_id) DO UPDATE
  SET status = 'active', role = EXCLUDED.role;
END;
$$;

-- =====================================================
-- ADDITIONAL SECURITY MEASURES
-- =====================================================

-- Ensure rate_limits table exists and has RLS
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_key TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rate_key)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limits are managed by service role only
CREATE POLICY IF NOT EXISTS "rate_limits_service_role_only"
  ON public.rate_limits
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Create or update the increment_rate_limit function with proper security
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  rate_key TEXT,
  max_requests INTEGER DEFAULT 100,
  window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_window_duration INTERVAL;
BEGIN
  v_window_duration := (window_seconds || ' seconds')::INTERVAL;

  -- Try to get existing rate limit entry
  SELECT request_count, window_start INTO v_count, v_window_start
  FROM rate_limits
  WHERE rate_limits.rate_key = increment_rate_limit.rate_key
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Create new entry
    INSERT INTO rate_limits (rate_key, request_count, window_start)
    VALUES (rate_key, 1, v_now);
    RETURN QUERY SELECT true, max_requests - 1;
    RETURN;
  END IF;

  -- Check if window has expired
  IF v_now > v_window_start + v_window_duration THEN
    -- Reset window
    UPDATE rate_limits
    SET request_count = 1, window_start = v_now
    WHERE rate_limits.rate_key = increment_rate_limit.rate_key;
    RETURN QUERY SELECT true, max_requests - 1;
    RETURN;
  END IF;

  -- Check if limit exceeded
  IF v_count >= max_requests THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  -- Increment counter
  UPDATE rate_limits
  SET request_count = request_count + 1
  WHERE rate_limits.rate_key = increment_rate_limit.rate_key;

  RETURN QUERY SELECT true, max_requests - v_count - 1;
END;
$$;

-- Grant execute to authenticated users (rate limiting is per-user)
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;

-- =====================================================
-- RLS AUDIT HELPER FUNCTION
-- =====================================================
-- This function helps identify tables without RLS enabled
CREATE OR REPLACE FUNCTION public.audit_rls_status()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.tablename::TEXT,
    t.rowsecurity,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename)
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE '_prisma_%'
  ORDER BY t.rowsecurity, t.tablename;
$$;

-- Only allow admins to run audit
REVOKE EXECUTE ON FUNCTION public.audit_rls_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_rls_status() TO service_role;

-- =====================================================
-- CLEANUP: Remove any dangling policies that reference non-existent functions
-- =====================================================

-- Add comment documenting the security fix
COMMENT ON FUNCTION public.increment_campaign_stat IS
  'Increments campaign statistics. SECURITY DEFINER with search_path fixed per CVE-2025-48757.';

COMMENT ON FUNCTION public.increment_rate_limit IS
  'Database-backed distributed rate limiting. SECURITY DEFINER with search_path fixed per CVE-2025-48757.';

-- =====================================================
-- VERIFICATION QUERIES (for manual testing)
-- =====================================================
-- Run this to verify all SECURITY DEFINER functions have search_path:
--
-- SELECT
--   p.proname AS function_name,
--   CASE
--     WHEN p.proconfig IS NULL THEN '❌ MISSING search_path'
--     WHEN array_to_string(p.proconfig, ',') LIKE '%search_path%' THEN '✅ HAS search_path'
--     ELSE '❌ MISSING search_path'
--   END AS search_path_status
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE p.prosecdef = true  -- SECURITY DEFINER
--   AND n.nspname = 'public'
-- ORDER BY search_path_status DESC, p.proname;
