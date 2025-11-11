-- Google Maps API Cache and Quota Tracking Tables
-- Created: 2025-02-01
-- Purpose: Server-side caching for Google Places API responses (30-day TTL)
--          and quota/usage tracking to prevent unexpected costs

-- Table: google_places_cache
-- Caches place API responses for 30 days to reduce API calls and costs
CREATE TABLE IF NOT EXISTS google_places_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE, -- Hash of query + origin + API endpoint
  place_id TEXT, -- Google Place ID if available
  query_text TEXT NOT NULL, -- Original search query
  origin_lat DECIMAL(10, 8), -- Optional origin latitude
  origin_lng DECIMAL(11, 8), -- Optional origin longitude
  api_endpoint TEXT NOT NULL, -- 'autocomplete', 'text-search', 'place-details', 'nearby-search'
  response_data JSONB NOT NULL, -- Cached API response
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'), -- 30-day TTL
  
  -- Indexes for fast lookups
  CONSTRAINT google_places_cache_cache_key_key UNIQUE (cache_key)
);

-- Index for cache key lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_google_places_cache_key ON google_places_cache(cache_key) WHERE expires_at > NOW();

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_google_places_cache_expires ON google_places_cache(expires_at);

-- Index for place_id lookups (useful for place details caching)
CREATE INDEX IF NOT EXISTS idx_google_places_cache_place_id ON google_places_cache(place_id) WHERE expires_at > NOW();

-- Table: google_maps_api_usage
-- Tracks API usage for quota monitoring and cost control
CREATE TABLE IF NOT EXISTS google_maps_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional: track per-user usage
  api_endpoint TEXT NOT NULL, -- 'autocomplete', 'text-search', 'place-details', 'nearby-search', 'geocode'
  request_count INTEGER NOT NULL DEFAULT 1,
  date_hour TIMESTAMPTZ NOT NULL, -- Hourly bucket (YYYY-MM-DD HH:00:00)
  date_day DATE NOT NULL, -- Daily bucket (YYYY-MM-DD)
  estimated_cost_usd DECIMAL(10, 6) DEFAULT 0, -- Estimated cost in USD (for monitoring)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one row per user/endpoint/hour
  CONSTRAINT google_maps_api_usage_unique UNIQUE (user_id, api_endpoint, date_hour)
);

-- Index for hourly quota checks
CREATE INDEX IF NOT EXISTS idx_google_maps_api_usage_hour ON google_maps_api_usage(date_hour, api_endpoint);

-- Index for daily quota checks
CREATE INDEX IF NOT EXISTS idx_google_maps_api_usage_day ON google_maps_api_usage(date_day, api_endpoint);

-- Index for user-specific usage tracking
CREATE INDEX IF NOT EXISTS idx_google_maps_api_usage_user ON google_maps_api_usage(user_id, date_day) WHERE user_id IS NOT NULL;

-- Function: Clean up expired cache entries
-- Run this periodically (e.g., daily cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_places_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM google_places_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function: Get cache entry (returns null if expired or not found)
CREATE OR REPLACE FUNCTION get_places_cache(p_cache_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  cached_data JSONB;
BEGIN
  SELECT response_data INTO cached_data
  FROM google_places_cache
  WHERE cache_key = p_cache_key
    AND expires_at > NOW()
  LIMIT 1;
  
  RETURN cached_data;
END;
$$;

-- Function: Set cache entry (with 30-day TTL)
CREATE OR REPLACE FUNCTION set_places_cache(
  p_cache_key TEXT,
  p_query_text TEXT,
  p_api_endpoint TEXT,
  p_response_data JSONB,
  p_place_id TEXT DEFAULT NULL,
  p_origin_lat DECIMAL DEFAULT NULL,
  p_origin_lng DECIMAL DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  cache_id UUID;
BEGIN
  INSERT INTO google_places_cache (
    cache_key,
    query_text,
    api_endpoint,
    response_data,
    place_id,
    origin_lat,
    origin_lng,
    expires_at
  ) VALUES (
    p_cache_key,
    p_query_text,
    p_api_endpoint,
    p_response_data,
    p_place_id,
    p_origin_lat,
    p_origin_lng,
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (cache_key) DO UPDATE SET
    response_data = EXCLUDED.response_data,
    expires_at = NOW() + INTERVAL '30 days',
    created_at = NOW()
  RETURNING id INTO cache_id;
  
  RETURN cache_id;
END;
$$;

-- Function: Record API usage (increment counter for hour/day)
CREATE OR REPLACE FUNCTION record_api_usage(
  p_api_endpoint TEXT,
  p_user_id UUID DEFAULT NULL,
  p_estimated_cost_usd DECIMAL DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_hour TIMESTAMPTZ;
  v_date_day DATE;
BEGIN
  -- Round to hour: YYYY-MM-DD HH:00:00
  v_date_hour := date_trunc('hour', NOW());
  v_date_day := CURRENT_DATE;
  
  INSERT INTO google_maps_api_usage (
    user_id,
    api_endpoint,
    request_count,
    date_hour,
    date_day,
    estimated_cost_usd
  ) VALUES (
    p_user_id,
    p_api_endpoint,
    1,
    v_date_hour,
    v_date_day,
    p_estimated_cost_usd
  )
  ON CONFLICT (user_id, api_endpoint, date_hour) DO UPDATE SET
    request_count = google_maps_api_usage.request_count + 1,
    estimated_cost_usd = google_maps_api_usage.estimated_cost_usd + p_estimated_cost_usd;
END;
$$;

-- Function: Get hourly usage for an endpoint
CREATE OR REPLACE FUNCTION get_hourly_usage(
  p_api_endpoint TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  request_count BIGINT,
  estimated_cost_usd DECIMAL,
  date_hour TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(u.request_count)::BIGINT as request_count,
    SUM(u.estimated_cost_usd) as estimated_cost_usd,
    u.date_hour
  FROM google_maps_api_usage u
  WHERE u.api_endpoint = p_api_endpoint
    AND (p_user_id IS NULL OR u.user_id = p_user_id)
    AND u.date_hour >= date_trunc('hour', NOW() - INTERVAL '24 hours')
  GROUP BY u.date_hour
  ORDER BY u.date_hour DESC;
END;
$$;

-- Function: Get daily usage for an endpoint
CREATE OR REPLACE FUNCTION get_daily_usage(
  p_api_endpoint TEXT,
  p_user_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  request_count BIGINT,
  estimated_cost_usd DECIMAL,
  date_day DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(u.request_count)::BIGINT as request_count,
    SUM(u.estimated_cost_usd) as estimated_cost_usd,
    u.date_day
  FROM google_maps_api_usage u
  WHERE u.api_endpoint = p_api_endpoint
    AND (p_user_id IS NULL OR u.user_id = p_user_id)
    AND u.date_day >= CURRENT_DATE - (p_days || 7)::INTEGER
  GROUP BY u.date_day
  ORDER BY u.date_day DESC;
END;
$$;

-- RLS Policies (if needed for multi-tenant)
-- For now, allow service role access only (via Supabase client)
ALTER TABLE google_places_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_maps_api_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to read/write cache
CREATE POLICY "Service role can manage cache"
  ON google_places_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Allow service role to read/write usage
CREATE POLICY "Service role can manage usage"
  ON google_maps_api_usage
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Allow authenticated users to read their own usage
CREATE POLICY "Users can read own usage"
  ON google_maps_api_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE google_places_cache IS 'Caches Google Places API responses for 30 days to reduce API calls and costs. Cache key is hash of query + origin + endpoint.';
COMMENT ON TABLE google_maps_api_usage IS 'Tracks Google Maps API usage for quota monitoring and cost control. Hourly and daily buckets.';
COMMENT ON FUNCTION cleanup_expired_places_cache() IS 'Cleans up expired cache entries. Run daily via cron.';
COMMENT ON FUNCTION get_places_cache(TEXT) IS 'Retrieves cached place data if not expired. Returns NULL if not found or expired.';
COMMENT ON FUNCTION set_places_cache(TEXT, TEXT, TEXT, JSONB, TEXT, DECIMAL, DECIMAL) IS 'Stores place API response in cache with 30-day TTL. Upserts on cache_key conflict.';
COMMENT ON FUNCTION record_api_usage(TEXT, UUID, DECIMAL) IS 'Records API usage in hourly and daily buckets. Increments counter on conflict.';
COMMENT ON FUNCTION get_hourly_usage(TEXT, UUID) IS 'Returns hourly usage stats for last 24 hours for an endpoint.';
COMMENT ON FUNCTION get_daily_usage(TEXT, UUID, INTEGER) IS 'Returns daily usage stats for last N days (default 7) for an endpoint.';
