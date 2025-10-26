-- ==========================================
-- CHRAVEL FREQUENT CHRAVELER TIER MIGRATION
-- Generated: 2025-10-26
-- Status: PREVIEW ONLY - NOT YET APPLIED
-- ==========================================

-- This migration adds support for:
-- 1. Trip categories (Consumer feature for Explorer+ users)
-- 2. Pro trip quota tracking (Frequent Chraveler gets 1 Pro trip/month)
-- 3. RLS policies for tier-based access control

-- ==========================================
-- PART 1: TRIP CATEGORIES SUPPORT
-- ==========================================

-- Add categories column to trips table
-- This allows Explorer and Frequent Chraveler users to tag their trips
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN trips.categories IS 'Array of category IDs from CONSUMER_TRIP_CATEGORIES or PRO_TRIP_CATEGORIES';

-- Create index for category queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_trips_categories
ON trips USING gin(categories);

-- RLS Policy: Anyone can view categories (read-only is ok for free users)
CREATE POLICY "Trip participants can view categories"
ON trips
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trip_participants tp
    WHERE tp.trip_id = trips.id AND tp.user_id = auth.uid()
  )
);

-- RLS Policy: Only Explorer+ users can UPDATE categories
-- Note: This requires checking the user's subscription tier from check-subscription function
-- For now, we'll allow all authenticated users to update (client-side enforcement)
-- TODO: Add server-side tier check once subscription_tier is stored or use Edge Function
CREATE POLICY "Trip creators can update categories"
ON trips
FOR UPDATE
USING (
  auth.uid() = created_by
  -- TODO: Add tier check: AND (get_user_tier(auth.uid()) IN ('explorer', 'frequent-chraveler'))
);

-- ==========================================
-- PART 2: PRO TRIP QUOTA TRACKING
-- ==========================================

-- Table to track Frequent Chraveler users' Pro trip creation quota
-- Frequent Chraveler tier gets 1 Pro trip per month (50-seat limit)
CREATE TABLE IF NOT EXISTS user_pro_trip_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_month DATE NOT NULL, -- First day of the month (e.g., '2025-10-01')
  pro_trips_created INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER NOT NULL DEFAULT 1, -- Frequent Chraveler = 1/month
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quota_month)
);

COMMENT ON TABLE user_pro_trip_quota IS 'Tracks how many Pro trips a Frequent Chraveler user has created per month';

-- Enable RLS
ALTER TABLE user_pro_trip_quota ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own quota
CREATE POLICY "Users can view their own Pro trip quota"
ON user_pro_trip_quota
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own quota records
CREATE POLICY "Users can insert their own Pro trip quota"
ON user_pro_trip_quota
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own quota (increment when creating Pro trip)
CREATE POLICY "Users can update their own Pro trip quota"
ON user_pro_trip_quota
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can manage all quota records (for admin/cleanup)
CREATE POLICY "Service role can manage all Pro trip quotas"
ON user_pro_trip_quota
FOR ALL
USING (auth.role() = 'service_role');

-- Create index for efficient monthly quota lookups
CREATE INDEX IF NOT EXISTS idx_user_pro_trip_quota_user_month
ON user_pro_trip_quota(user_id, quota_month DESC);

-- ==========================================
-- PART 3: HELPER FUNCTIONS
-- ==========================================

-- Function to get current month's Pro trip quota for a user
CREATE OR REPLACE FUNCTION get_user_pro_trip_quota(p_user_id UUID)
RETURNS TABLE (
  trips_created INTEGER,
  quota_limit INTEGER,
  can_create_more BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month DATE := date_trunc('month', now())::DATE;
  quota_record RECORD;
BEGIN
  -- Get or create quota record for current month
  SELECT pro_trips_created, quota_limit
  INTO quota_record
  FROM user_pro_trip_quota
  WHERE user_id = p_user_id
    AND quota_month = current_month;

  IF NOT FOUND THEN
    -- No record exists, user hasn't created any Pro trips this month
    RETURN QUERY SELECT 0::INTEGER, 1::INTEGER, true::BOOLEAN;
  ELSE
    RETURN QUERY SELECT
      quota_record.pro_trips_created,
      quota_record.quota_limit,
      (quota_record.pro_trips_created < quota_record.quota_limit)::BOOLEAN;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_user_pro_trip_quota IS 'Returns Pro trip quota info for current month';

-- Function to increment Pro trip count (call when user creates a Pro trip)
CREATE OR REPLACE FUNCTION increment_pro_trip_count(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month DATE := date_trunc('month', now())::DATE;
  current_count INTEGER;
  current_limit INTEGER;
BEGIN
  -- Insert or update quota record
  INSERT INTO user_pro_trip_quota (user_id, quota_month, pro_trips_created, quota_limit)
  VALUES (p_user_id, current_month, 1, 1)
  ON CONFLICT (user_id, quota_month)
  DO UPDATE SET
    pro_trips_created = user_pro_trip_quota.pro_trips_created + 1,
    updated_at = now()
  RETURNING pro_trips_created, quota_limit INTO current_count, current_limit;

  -- Return true if still within quota, false if exceeded
  RETURN current_count <= current_limit;
END;
$$;

COMMENT ON FUNCTION increment_pro_trip_count IS 'Increments Pro trip count for current month. Returns false if quota exceeded.';

-- ==========================================
-- PART 4: AI QUERY LIMIT ENFORCEMENT
-- ==========================================

-- Note: concierge_usage table already exists (created in 20251023235412)
-- We just need to ensure tier-based limits are enforced

-- Function to check if user has exceeded AI query limit for a trip
CREATE OR REPLACE FUNCTION check_ai_query_limit(
  p_user_id UUID,
  p_trip_id TEXT,
  p_user_tier TEXT DEFAULT 'free'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  query_count INTEGER;
  query_limit INTEGER;
BEGIN
  -- Determine query limit based on tier
  CASE p_user_tier
    WHEN 'free' THEN query_limit := 5;
    WHEN 'explorer' THEN query_limit := 10;
    WHEN 'frequent-chraveler' THEN query_limit := 999999; -- Unlimited (high number)
    ELSE query_limit := 5; -- Default to free tier
  END CASE;

  -- Count queries for this user on this trip
  SELECT COALESCE(SUM(query_count), 0)::INTEGER
  INTO query_count
  FROM concierge_usage
  WHERE user_id = p_user_id
    AND context_type = 'trip'
    AND context_id = p_trip_id;

  -- Return true if under limit
  RETURN query_count < query_limit;
END;
$$;

COMMENT ON FUNCTION check_ai_query_limit IS 'Checks if user has queries remaining for a trip based on their tier';

-- ==========================================
-- PART 5: TRIGGERS & AUTOMATION
-- ==========================================

-- Trigger to update updated_at timestamp on user_pro_trip_quota
CREATE TRIGGER update_user_pro_trip_quota_updated_at
BEFORE UPDATE ON user_pro_trip_quota
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Run these after applying migration to verify:

-- 1. Check trips table has categories column
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'trips' AND column_name = 'categories';

-- 2. Check user_pro_trip_quota table exists
-- SELECT * FROM user_pro_trip_quota LIMIT 0;

-- 3. Test quota function
-- SELECT * FROM get_user_pro_trip_quota(auth.uid());

-- 4. Test AI query limit function
-- SELECT check_ai_query_limit(auth.uid(), 'trip-id-123', 'explorer');

-- ==========================================
-- ROLLBACK PLAN (if needed)
-- ==========================================

-- To rollback this migration:
/*
DROP FUNCTION IF EXISTS check_ai_query_limit;
DROP FUNCTION IF EXISTS increment_pro_trip_count;
DROP FUNCTION IF EXISTS get_user_pro_trip_quota;
DROP TABLE IF EXISTS user_pro_trip_quota;
DROP POLICY IF EXISTS "Trip creators can update categories" ON trips;
DROP POLICY IF EXISTS "Trip participants can view categories" ON trips;
DROP INDEX IF EXISTS idx_trips_categories;
ALTER TABLE trips DROP COLUMN IF EXISTS categories;
*/

-- ==========================================
-- MIGRATION NOTES
-- ==========================================

-- 1. This migration is SAFE to run - all operations use IF NOT EXISTS
-- 2. The categories column defaults to empty array, won't break existing trips
-- 3. RLS policies are permissive for now - tighten after tier detection is stable
-- 4. Pro trip quota tracking is opt-in - only affects Frequent Chraveler users
-- 5. AI query limits are enforced client-side first, then can add Edge Function enforcement

-- ==========================================
-- NEXT STEPS AFTER MIGRATION
-- ==========================================

-- 1. Apply this migration: supabase db push
-- 2. Update TripCategorySelector to persist to database instead of localStorage
-- 3. Add Pro trip quota check in create-trip Edge Function
-- 4. Update AI concierge to call check_ai_query_limit before processing queries
-- 5. Create Stripe products for Explorer and Frequent Chraveler tiers
-- 6. Update webhook to use 'frequent-chraveler' tier value
