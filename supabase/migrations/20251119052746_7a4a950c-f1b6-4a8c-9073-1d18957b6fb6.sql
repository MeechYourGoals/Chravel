-- =====================================================
-- CRITICAL SECURITY FIXES - Phase 1 (Corrected)
-- Date: 2025-01-19
-- Description: Fixes 4 critical security vulnerabilities
-- =====================================================

-- =====================================================
-- FIX 1: Profile PII Exposure
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view other profiles" ON public.profiles;

-- Create restricted policy that respects privacy settings and trip membership
CREATE POLICY "Users can view privacy-controlled profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always view their own profile
  user_id = auth.uid()
  OR
  -- Users can view profiles of trip members they share trips with
  user_id IN (
    SELECT tm.user_id 
    FROM public.trip_members tm
    WHERE tm.trip_id IN (
      SELECT trip_id 
      FROM public.trip_members 
      WHERE user_id = auth.uid()
    )
  )
);

-- =====================================================
-- FIX 2: Storage Bucket - Trip Photos
-- =====================================================

-- Drop public access policy
DROP POLICY IF EXISTS "Anyone can view trip photos" ON storage.objects;

-- Create trip-member-only access policy
CREATE POLICY "Trip members can view trip photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'trip-photos' 
  AND (storage.foldername(name))[1] IN (
    SELECT t.id::text 
    FROM public.trips t
    JOIN public.trip_members tm ON t.id = tm.trip_id
    WHERE tm.user_id = auth.uid()
  )
);

-- Also ensure only trip members can upload
CREATE POLICY "Trip members can upload trip photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trip-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT t.id::text 
    FROM public.trips t
    JOIN public.trip_members tm ON t.id = tm.trip_id
    WHERE tm.user_id = auth.uid()
  )
);

-- =====================================================
-- FIX 3: SECURITY DEFINER Functions - Add search_path
-- =====================================================

-- Fix log_basecamp_change if it exists
CREATE OR REPLACE FUNCTION public.log_basecamp_change(
  p_trip_id text,
  p_user_id uuid,
  p_scope text,
  p_action text,
  p_old_name text DEFAULT NULL,
  p_old_address text DEFAULT NULL,
  p_old_lat double precision DEFAULT NULL,
  p_old_lng double precision DEFAULT NULL,
  p_new_name text DEFAULT NULL,
  p_new_address text DEFAULT NULL,
  p_new_lat double precision DEFAULT NULL,
  p_new_lng double precision DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function implementation (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'basecamp_change_history') THEN
    INSERT INTO basecamp_change_history (
      trip_id, user_id, scope, action,
      old_name, old_address, old_latitude, old_longitude,
      new_name, new_address, new_latitude, new_longitude
    ) VALUES (
      p_trip_id, p_user_id, p_scope, p_action,
      p_old_name, p_old_address, p_old_lat, p_old_lng,
      p_new_name, p_new_address, p_new_lat, p_new_lng
    );
  END IF;
END;
$$;

-- Fix mark_broadcast_viewed if it exists
CREATE OR REPLACE FUNCTION public.mark_broadcast_viewed(
  p_broadcast_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'broadcast_views') THEN
    INSERT INTO broadcast_views (broadcast_id, user_id, viewed_at)
    VALUES (p_broadcast_id, p_user_id, NOW())
    ON CONFLICT (broadcast_id, user_id) DO NOTHING;
  END IF;
END;
$$;

-- Fix get_broadcast_read_count if it exists
CREATE OR REPLACE FUNCTION public.get_broadcast_read_count(p_broadcast_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  read_count integer;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'broadcast_views') THEN
    SELECT COUNT(*)::integer INTO read_count
    FROM broadcast_views
    WHERE broadcast_id = p_broadcast_id;
    RETURN COALESCE(read_count, 0);
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- =====================================================
-- FIX 4: Distributed Rate Limiting
-- =====================================================

-- Create rate_limits table for distributed rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count integer DEFAULT 1,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Add index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at 
ON public.rate_limits(expires_at);

-- RLS Policy: Service role can manage all rate limits
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  rate_key text,
  max_requests integer,
  window_seconds integer DEFAULT 60
)
RETURNS TABLE(count integer, remaining integer, allowed boolean) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  expiry timestamptz;
BEGIN
  -- Calculate expiry time
  expiry := NOW() + (window_seconds || ' seconds')::interval;
  
  -- Insert or update rate limit record
  INSERT INTO public.rate_limits (key, count, expires_at)
  VALUES (rate_key, 1, expiry)
  ON CONFLICT (key) DO UPDATE
  SET 
    count = CASE 
      WHEN rate_limits.expires_at < NOW() THEN 1
      ELSE rate_limits.count + 1
    END,
    expires_at = CASE
      WHEN rate_limits.expires_at < NOW() THEN expiry
      ELSE rate_limits.expires_at
    END
  RETURNING rate_limits.count INTO current_count;
  
  -- Return results
  RETURN QUERY SELECT 
    current_count,
    GREATEST(0, max_requests - current_count),
    (current_count <= max_requests);
END;
$$;

-- Cleanup function to remove expired rate limits
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE expires_at < NOW() - interval '1 hour';
END;
$$;

-- Add comments
COMMENT ON FUNCTION public.increment_rate_limit IS 'Distributed rate limiting function. Returns (count, remaining, allowed).';
COMMENT ON FUNCTION public.cleanup_rate_limits IS 'Removes expired rate limit records. Should be called periodically via cron.';