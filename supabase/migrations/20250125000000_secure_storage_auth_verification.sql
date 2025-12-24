-- Enhanced Security for secure_storage Table
-- This migration adds additional security layers requiring recent authentication
-- and optional MFA verification before accessing sensitive encrypted data.

-- Create table to track authentication verification sessions
-- This allows us to track when users explicitly verify their identity for sensitive operations
CREATE TABLE IF NOT EXISTS public.auth_verification_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  verification_method TEXT NOT NULL DEFAULT 'password', -- 'password', 'mfa', 'biometric', etc.
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, verified_at)
);

-- Enable RLS on auth_verification_sessions
ALTER TABLE public.auth_verification_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own verification sessions
CREATE POLICY "Users can view their own verification sessions"
ON public.auth_verification_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_auth_verification_sessions_user_expires
ON public.auth_verification_sessions(user_id, expires_at DESC);

-- Function to check if user has recent authentication
-- Checks both last_sign_in_at from auth.users and active verification sessions
CREATE OR REPLACE FUNCTION public.has_recent_authentication(
  check_user_id UUID,
  max_age_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  last_sign_in TIMESTAMP WITH TIME ZONE;
  has_active_session BOOLEAN;
BEGIN
  -- Check last_sign_in_at from auth.users table
  SELECT last_sign_in_at INTO last_sign_in
  FROM auth.users
  WHERE id = check_user_id;

  -- If user has signed in recently (within max_age_minutes), allow access
  IF last_sign_in IS NOT NULL AND last_sign_in > (now() - (max_age_minutes || ' minutes')::INTERVAL) THEN
    RETURN TRUE;
  END IF;

  -- Check for active verification session
  SELECT EXISTS (
    SELECT 1
    FROM public.auth_verification_sessions
    WHERE user_id = check_user_id
      AND expires_at > now()
      AND verified_at > (now() - (max_age_minutes || ' minutes')::INTERVAL)
  ) INTO has_active_session;

  RETURN has_active_session;
END;
$$;

-- Function to check if user has MFA enabled and verified
-- This checks if MFA is enabled and if there's a recent MFA verification
CREATE OR REPLACE FUNCTION public.has_mfa_verification(
  check_user_id UUID,
  max_age_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  mfa_enabled BOOLEAN;
  has_recent_mfa BOOLEAN;
BEGIN
  -- Check if MFA is enabled for the user
  -- Note: Supabase stores MFA factors in auth.mfa_factors table
  -- If no MFA factors exist, user doesn't have MFA enabled
  SELECT EXISTS (
    SELECT 1
    FROM auth.mfa_factors
    WHERE user_id = check_user_id
      AND status = 'verified'
  ) INTO mfa_enabled;

  -- If MFA is not enabled, return true (no MFA requirement)
  IF NOT mfa_enabled THEN
    RETURN TRUE;
  END IF;

  -- If MFA is enabled, check for recent MFA verification session
  SELECT EXISTS (
    SELECT 1
    FROM public.auth_verification_sessions
    WHERE user_id = check_user_id
      AND verification_method = 'mfa'
      AND expires_at > now()
      AND verified_at > (now() - (max_age_minutes || ' minutes')::INTERVAL)
  ) INTO has_recent_mfa;

  -- If MFA is enabled but no recent verification, require re-authentication
  RETURN has_recent_mfa;
END;
$$;

-- Function to create a verification session (to be called after password/MFA verification)
-- This should be called from an edge function after successful authentication
CREATE OR REPLACE FUNCTION public.create_verification_session(
  verification_method TEXT DEFAULT 'password',
  ip_address INET DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  session_duration_minutes INTEGER DEFAULT 15
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Clean up expired sessions for this user
  DELETE FROM public.auth_verification_sessions
  WHERE user_id = current_user_id
    AND expires_at < now();

  -- Create new verification session
  INSERT INTO public.auth_verification_sessions (
    user_id,
    verification_method,
    ip_address,
    user_agent,
    expires_at
  )
  VALUES (
    current_user_id,
    verification_method,
    ip_address,
    user_agent,
    now() + (session_duration_minutes || ' minutes')::INTERVAL
  )
  RETURNING id INTO session_id;

  RETURN session_id;
END;
$$;

-- Drop existing secure_storage policies
DROP POLICY IF EXISTS "Users can access their own secure storage" ON public.secure_storage;

-- Create enhanced RLS policies for secure_storage
-- These policies require recent authentication AND (MFA if enabled OR no MFA requirement)

-- Policy for SELECT: Read access requires recent authentication
CREATE POLICY "Users can read their secure storage with recent auth"
ON public.secure_storage
FOR SELECT
USING (
  auth.uid() = user_id
  AND public.has_recent_authentication(auth.uid(), 15)
  AND public.has_mfa_verification(auth.uid(), 15)
);

-- Policy for INSERT: Write access requires recent authentication
CREATE POLICY "Users can insert secure storage with recent auth"
ON public.secure_storage
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.has_recent_authentication(auth.uid(), 15)
  AND public.has_mfa_verification(auth.uid(), 15)
);

-- Policy for UPDATE: Write access requires recent authentication
CREATE POLICY "Users can update their secure storage with recent auth"
ON public.secure_storage
FOR UPDATE
USING (
  auth.uid() = user_id
  AND public.has_recent_authentication(auth.uid(), 15)
  AND public.has_mfa_verification(auth.uid(), 15)
)
WITH CHECK (
  auth.uid() = user_id
  AND public.has_recent_authentication(auth.uid(), 15)
  AND public.has_mfa_verification(auth.uid(), 15)
);

-- Policy for DELETE: Write access requires recent authentication
CREATE POLICY "Users can delete their secure storage with recent auth"
ON public.secure_storage
FOR DELETE
USING (
  auth.uid() = user_id
  AND public.has_recent_authentication(auth.uid(), 15)
  AND public.has_mfa_verification(auth.uid(), 15)
);

-- Create cleanup function to remove expired verification sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.auth_verification_sessions
  WHERE expires_at < now() - INTERVAL '1 day';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE public.auth_verification_sessions IS 'Tracks authentication verification sessions for sensitive operations like secure_storage access. Sessions expire after 15 minutes by default.';
COMMENT ON FUNCTION public.has_recent_authentication IS 'Checks if user has authenticated recently (within specified minutes) or has an active verification session. Used by secure_storage RLS policies.';
COMMENT ON FUNCTION public.has_mfa_verification IS 'Checks if user has MFA enabled and verified recently. Returns true if MFA is not enabled (no requirement) or if MFA is enabled and recently verified.';
COMMENT ON FUNCTION public.create_verification_session IS 'Creates a verification session after successful password/MFA verification. Should be called from edge functions after authentication.';
COMMENT ON FUNCTION public.cleanup_expired_verification_sessions IS 'Removes expired verification sessions older than 1 day. Can be called periodically via cron job.';
