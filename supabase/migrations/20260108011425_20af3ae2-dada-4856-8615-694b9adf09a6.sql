-- =============================================
-- Fix Rate Limits RLS Policies
-- =============================================
-- Add proper RLS policies to prevent abuse if service role credentials are compromised
-- and allow users to view their own rate limit status

-- Service role can manage all rate limits (required for rate limiting functions)
CREATE POLICY "Service role manages rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users CANNOT insert rate limits (prevent manipulation)
CREATE POLICY "Authenticated users cannot insert rate limits"
ON public.rate_limits
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Authenticated users CANNOT update rate limits
CREATE POLICY "Authenticated users cannot update rate limits"
ON public.rate_limits
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Authenticated users CANNOT delete rate limits
CREATE POLICY "Authenticated users cannot delete rate limits"
ON public.rate_limits
FOR DELETE
TO authenticated
USING (false);

-- Allow users to view their own rate limit status (read-only visibility)
CREATE POLICY "Users can view own rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (
  -- User-specific rate limits (format: user:{user_id}:action)
  key LIKE 'user:' || auth.uid()::text || ':%'
);