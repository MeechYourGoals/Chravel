-- Migration: Address Known Issues & Gaps
-- Date: 2025-10-26
-- Description: Addresses known issues including push notifications, timezone handling,
--              OCR receipts, offline caching, email deliverability, search, abuse/safety

-- ============================================================================
-- ISSUE #1: Push Notifications - Membership-Scoped Topics & Badge Counts
-- ============================================================================

-- Add trip subscription topics to push_tokens
ALTER TABLE public.push_tokens
ADD COLUMN IF NOT EXISTS subscribed_topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create notification badge tracking table (per trip per user)
CREATE TABLE IF NOT EXISTS public.notification_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  event_id UUID, -- Optional reference to events table if it exists
  badge_count INTEGER DEFAULT 0,
  last_increment_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, trip_id, event_id)
);

CREATE INDEX IF NOT EXISTS notification_badges_user_trip_idx ON public.notification_badges (user_id, trip_id);
CREATE INDEX IF NOT EXISTS notification_badges_count_idx ON public.notification_badges (badge_count) WHERE badge_count > 0;

-- Enable RLS
ALTER TABLE public.notification_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policy for notification badges
CREATE POLICY "Users can manage their own badge counts"
ON public.notification_badges
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to increment badge count
CREATE OR REPLACE FUNCTION public.increment_badge_count(
  p_user_id UUID,
  p_trip_id UUID DEFAULT NULL,
  p_event_id UUID DEFAULT NULL,
  p_increment INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to reset badge count
CREATE OR REPLACE FUNCTION public.reset_badge_count(
  p_user_id UUID,
  p_trip_id UUID DEFAULT NULL,
  p_event_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to get total badge count for a user
CREATE OR REPLACE FUNCTION public.get_total_badge_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(badge_count), 0) INTO v_total
  FROM public.notification_badges
  WHERE user_id = p_user_id;

  RETURN v_total;
END;
$$;

-- ============================================================================
-- ISSUE #2: Timezone Edge Cases - Multi-TZ Trips & DST Transitions
-- ============================================================================

-- Add timezone tracking to trips (for multi-timezone trips)
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS primary_timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS timezone_mode TEXT DEFAULT 'single' CHECK (timezone_mode IN ('single', 'multi', 'auto'));

-- Create trip timezone tracking for multi-TZ events
CREATE TABLE IF NOT EXISTS public.trip_timezones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(trip_id, location_name)
);

CREATE INDEX IF NOT EXISTS trip_timezones_trip_id_idx ON public.trip_timezones (trip_id);

ALTER TABLE public.trip_timezones ENABLE ROW LEVEL SECURITY;

-- RLS: Trip members can view timezones
CREATE POLICY "Trip members can view timezones"
ON public.trip_timezones FOR SELECT
USING (
  trip_id IN (
    SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
  )
);

-- RLS: Trip admins can manage timezones
CREATE POLICY "Trip admins can manage timezones"
ON public.trip_timezones FOR ALL
USING (
  trip_id IN (
    SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
)
WITH CHECK (
  trip_id IN (
    SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

-- Function to detect DST transitions in a date range
CREATE OR REPLACE FUNCTION public.check_dst_transition(
  p_timezone TEXT,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
  has_transition BOOLEAN,
  transition_dates TIMESTAMP WITH TIME ZONE[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_offset INTERVAL;
  v_end_offset INTERVAL;
  v_has_transition BOOLEAN;
BEGIN
  -- Get timezone offset at start and end
  v_start_offset := (p_start_date AT TIME ZONE p_timezone) - p_start_date;
  v_end_offset := (p_end_date AT TIME ZONE p_timezone) - p_end_date;

  -- Check if offsets differ (indicates DST transition)
  v_has_transition := v_start_offset != v_end_offset;

  RETURN QUERY SELECT v_has_transition, ARRAY[]::TIMESTAMP WITH TIME ZONE[];
END;
$$;

-- ============================================================================
-- ISSUE #4: Receipts OCR - Rate Limiting & PII Protection
-- ============================================================================

-- Add OCR-specific fields to receipts table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='receipts' AND column_name='ocr_provider') THEN
    ALTER TABLE receipts
    ADD COLUMN ocr_provider TEXT,
    ADD COLUMN ocr_confidence DECIMAL(5, 4),
    ADD COLUMN ocr_processed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN ocr_error TEXT,
    ADD COLUMN pii_redacted BOOLEAN DEFAULT false,
    ADD COLUMN raw_ocr_data JSONB,
    ADD COLUMN redacted_fields TEXT[];
  END IF;
END $$;

-- Create OCR rate limiting table
CREATE TABLE IF NOT EXISTS public.ocr_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'explorer', 'frequent-chraveler', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, window_start)
);

CREATE INDEX IF NOT EXISTS ocr_rate_limits_user_window_idx ON public.ocr_rate_limits (user_id, window_start);

ALTER TABLE public.ocr_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own OCR rate limits"
ON public.ocr_rate_limits FOR SELECT
USING (auth.uid() = user_id);

-- Function to check OCR rate limit
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

-- Function to increment OCR usage
CREATE OR REPLACE FUNCTION public.increment_ocr_usage(
  p_user_id UUID,
  p_tier TEXT DEFAULT 'free'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to redact PII from OCR text
CREATE OR REPLACE FUNCTION public.redact_pii_from_text(p_text TEXT)
RETURNS TABLE(
  redacted_text TEXT,
  redacted_fields TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_redacted TEXT;
  v_fields TEXT[] := '{}';
BEGIN
  v_redacted := p_text;

  -- Redact credit card numbers (basic pattern)
  IF v_redacted ~ '\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}' THEN
    v_redacted := regexp_replace(v_redacted, '\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}', '****-****-****-****', 'g');
    v_fields := array_append(v_fields, 'credit_card');
  END IF;

  -- Redact SSN patterns
  IF v_redacted ~ '\d{3}-\d{2}-\d{4}' THEN
    v_redacted := regexp_replace(v_redacted, '\d{3}-\d{2}-\d{4}', '***-**-****', 'g');
    v_fields := array_append(v_fields, 'ssn');
  END IF;

  -- Redact email addresses
  IF v_redacted ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}' THEN
    v_redacted := regexp_replace(v_redacted, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}', '[EMAIL REDACTED]', 'gi');
    v_fields := array_append(v_fields, 'email');
  END IF;

  RETURN QUERY SELECT v_redacted, v_fields;
END;
$$;

-- ============================================================================
-- ISSUE #6: Offline/Caching - Prefetch Metadata
-- ============================================================================

-- Create table to track what data should be prefetched for offline use
CREATE TABLE IF NOT EXISTS public.offline_prefetch_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('trip_data', 'map_tiles', 'itinerary', 'messages', 'files', 'images')),
  resource_url TEXT,
  resource_size_bytes BIGINT,
  priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'downloaded', 'failed', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE,
  downloaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offline_prefetch_user_trip_idx ON public.offline_prefetch_metadata (user_id, trip_id);
CREATE INDEX IF NOT EXISTS offline_prefetch_status_priority_idx ON public.offline_prefetch_metadata (status, priority);

ALTER TABLE public.offline_prefetch_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own prefetch data"
ON public.offline_prefetch_metadata FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- ISSUE #7: Email Deliverability - Retry Logic & Bounce Tracking
-- ============================================================================

-- Add email retry tracking
ALTER TABLE public.notification_logs
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft', 'complaint', NULL)),
ADD COLUMN IF NOT EXISTS bounce_reason TEXT,
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'bounced', 'failed'));

-- Create email bounce tracking table
CREATE TABLE IF NOT EXISTS public.email_bounces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  bounce_type TEXT NOT NULL CHECK (bounce_type IN ('hard', 'soft', 'complaint')),
  bounce_count INTEGER DEFAULT 1,
  last_bounce_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  suppressed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(email, bounce_type)
);

CREATE INDEX IF NOT EXISTS email_bounces_email_idx ON public.email_bounces (email);
CREATE INDEX IF NOT EXISTS email_bounces_suppressed_idx ON public.email_bounces (suppressed) WHERE suppressed = true;

-- Function to check if email should be suppressed
CREATE OR REPLACE FUNCTION public.should_suppress_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_hard_bounces INTEGER;
  v_soft_bounces INTEGER;
BEGIN
  -- Check for hard bounces
  SELECT COALESCE(bounce_count, 0) INTO v_hard_bounces
  FROM public.email_bounces
  WHERE email = p_email AND bounce_type = 'hard' AND suppressed = true;

  IF v_hard_bounces > 0 THEN
    RETURN TRUE;
  END IF;

  -- Check for excessive soft bounces (>5 in last 30 days)
  SELECT COUNT(*) INTO v_soft_bounces
  FROM public.email_bounces
  WHERE email = p_email
    AND bounce_type = 'soft'
    AND last_bounce_at > now() - INTERVAL '30 days';

  IF v_soft_bounces > 5 THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- ============================================================================
-- ISSUE #8: Search - Full-Text Index for Cross-Trip Search
-- ============================================================================

-- Add full-text search columns to search_index
ALTER TABLE search_index
ADD COLUMN IF NOT EXISTS tsv_title tsvector GENERATED ALWAYS AS (to_tsvector('english', COALESCE(title, ''))) STORED,
ADD COLUMN IF NOT EXISTS tsv_description tsvector GENERATED ALWAYS AS (to_tsvector('english', COALESCE(description, ''))) STORED,
ADD COLUMN IF NOT EXISTS tsv_full_text tsvector GENERATED ALWAYS AS (to_tsvector('english', COALESCE(full_text, ''))) STORED;

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS search_index_tsv_title_idx ON search_index USING GIN (tsv_title);
CREATE INDEX IF NOT EXISTS search_index_tsv_description_idx ON search_index USING GIN (tsv_description);
CREATE INDEX IF NOT EXISTS search_index_tsv_full_text_idx ON search_index USING GIN (tsv_full_text);

-- Create combined search function
CREATE OR REPLACE FUNCTION public.search_trips_fulltext(
  p_query TEXT,
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  trip_id VARCHAR,
  title VARCHAR,
  description TEXT,
  rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.trip_id,
    si.title,
    si.description,
    ts_rank(si.tsv_full_text, plainto_tsquery('english', p_query)) AS rank
  FROM search_index si
  WHERE si.tsv_full_text @@ plainto_tsquery('english', p_query)
    AND (p_user_id IS NULL OR si.trip_id IN (
      SELECT trip_id::varchar FROM trip_members WHERE user_id = p_user_id
    ))
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- ISSUE #9: Abuse/Safety - Rate Limits on Invites & Report/Remove Member
-- ============================================================================

-- Create invite rate limiting table
CREATE TABLE IF NOT EXISTS public.invite_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('hour', now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, window_start)
);

CREATE INDEX IF NOT EXISTS invite_rate_limits_user_window_idx ON public.invite_rate_limits (user_id, window_start);

ALTER TABLE public.invite_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invite rate limits"
ON public.invite_rate_limits FOR SELECT
USING (auth.uid() = user_id);

-- Function to check invite rate limit
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

-- Function to increment invite usage
CREATE OR REPLACE FUNCTION public.increment_invite_usage(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create member reports table (for abuse reporting)
CREATE TABLE IF NOT EXISTS public.member_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate_content', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  action_taken TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CHECK (reported_user_id != reporter_user_id)
);

CREATE INDEX IF NOT EXISTS member_reports_trip_idx ON public.member_reports (trip_id);
CREATE INDEX IF NOT EXISTS member_reports_reported_user_idx ON public.member_reports (reported_user_id);
CREATE INDEX IF NOT EXISTS member_reports_status_idx ON public.member_reports (status);

ALTER TABLE public.member_reports ENABLE ROW LEVEL SECURITY;

-- RLS: Trip members can create reports
CREATE POLICY "Trip members can create reports"
ON public.member_reports FOR INSERT
WITH CHECK (
  reporter_user_id = auth.uid() AND
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
);

-- RLS: Users can view reports they created
CREATE POLICY "Users can view their own reports"
ON public.member_reports FOR SELECT
USING (reporter_user_id = auth.uid());

-- RLS: Trip admins can view all reports for their trips
CREATE POLICY "Trip admins can view trip reports"
ON public.member_reports FOR SELECT
USING (
  trip_id IN (
    SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

-- Function to remove member from trip (with safety checks)
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
    'email',
    'Removed from Trip',
    'You have been removed from a trip',
    jsonb_build_object('trip_id', p_trip_id, 'reason', p_reason)
  );

  RETURN QUERY SELECT TRUE, 'Member removed successfully';
END;
$$;

-- ============================================================================
-- ISSUE #5: Payments Settlement - External Settle Events
-- ============================================================================

-- Add external settlement tracking
ALTER TABLE payment_splits
ADD COLUMN IF NOT EXISTS external_settlement_id TEXT,
ADD COLUMN IF NOT EXISTS external_settlement_provider TEXT CHECK (external_settlement_provider IN ('venmo', 'zelle', 'paypal', 'cash-app', 'manual', NULL)),
ADD COLUMN IF NOT EXISTS external_settlement_metadata JSONB;

-- Create settlement events table (canonical ledger)
CREATE TABLE IF NOT EXISTS public.settlement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_split_id UUID REFERENCES payment_splits(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  creditor_user_id UUID NOT NULL REFERENCES auth.users(id),
  debtor_user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  settlement_method TEXT NOT NULL CHECK (settlement_method IN ('venmo', 'zelle', 'paypal', 'cash-app', 'stripe', 'manual')),
  external_transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  metadata JSONB,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS settlement_events_trip_idx ON public.settlement_events (trip_id);
CREATE INDEX IF NOT EXISTS settlement_events_creditor_idx ON public.settlement_events (creditor_user_id);
CREATE INDEX IF NOT EXISTS settlement_events_debtor_idx ON public.settlement_events (debtor_user_id);
CREATE INDEX IF NOT EXISTS settlement_events_status_idx ON public.settlement_events (status);

ALTER TABLE public.settlement_events ENABLE ROW LEVEL SECURITY;

-- RLS: Trip members can view settlement events
CREATE POLICY "Trip members can view settlement events"
ON public.settlement_events FOR SELECT
USING (
  creditor_user_id = auth.uid() OR
  debtor_user_id = auth.uid() OR
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
);

-- RLS: Only involved parties can create settlement events
CREATE POLICY "Involved parties can create settlement events"
ON public.settlement_events FOR INSERT
WITH CHECK (
  creditor_user_id = auth.uid() OR debtor_user_id = auth.uid()
);

-- Trigger to update payment_splits when settlement completes
CREATE OR REPLACE FUNCTION public.update_payment_split_on_settlement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE payment_splits
    SET
      is_settled = TRUE,
      settled_at = NEW.completed_at,
      settlement_method = NEW.settlement_method,
      external_settlement_id = NEW.external_transaction_id,
      external_settlement_provider = NEW.settlement_method,
      external_settlement_metadata = NEW.metadata
    WHERE id = NEW.payment_split_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settlement_event_completed
  AFTER UPDATE ON public.settlement_events
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION public.update_payment_split_on_settlement();

-- ============================================================================
-- Cleanup and Maintenance Functions
-- ============================================================================

-- Function to cleanup expired prefetch metadata
CREATE OR REPLACE FUNCTION public.cleanup_expired_prefetch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.offline_prefetch_metadata
  WHERE expires_at < now() AND status = 'downloaded';

  UPDATE public.offline_prefetch_metadata
  SET status = 'expired'
  WHERE expires_at < now() AND status != 'expired';
END;
$$;

-- Function to cleanup old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.ocr_rate_limits WHERE window_start < now() - INTERVAL '7 days';
  DELETE FROM public.invite_rate_limits WHERE window_start < now() - INTERVAL '7 days';
END;
$$;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.notification_badges IS 'Tracks unread notification badge counts per trip/event per user';
COMMENT ON TABLE public.trip_timezones IS 'Handles multi-timezone trips with location-specific timezones';
COMMENT ON TABLE public.ocr_rate_limits IS 'Rate limiting for OCR receipt processing to control costs';
COMMENT ON TABLE public.offline_prefetch_metadata IS 'Metadata for offline-first caching and prefetching';
COMMENT ON TABLE public.email_bounces IS 'Tracks email bounces and suppression for deliverability';
COMMENT ON TABLE public.invite_rate_limits IS 'Rate limiting for trip invitations to prevent abuse';
COMMENT ON TABLE public.member_reports IS 'User reporting system for abuse and moderation';
COMMENT ON TABLE public.settlement_events IS 'Canonical ledger for payment settlements (Chravel source of truth)';

COMMENT ON FUNCTION public.increment_badge_count IS 'Increments notification badge count for a user/trip/event';
COMMENT ON FUNCTION public.check_ocr_rate_limit IS 'Checks if user can perform OCR request based on tier limits';
COMMENT ON FUNCTION public.check_invite_rate_limit IS 'Checks if user can send more invites based on hourly limits';
COMMENT ON FUNCTION public.remove_trip_member_safe IS 'Safely removes a member from a trip with permission checks';
COMMENT ON FUNCTION public.redact_pii_from_text IS 'Redacts PII (credit cards, SSN, emails) from OCR text';
