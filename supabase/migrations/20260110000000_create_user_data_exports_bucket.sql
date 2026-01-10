-- GDPR Data Export Storage Bucket
-- Creates a private bucket for storing user data exports with auto-expiry

-- Create the storage bucket for user data exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-data-exports',
  'user-data-exports',
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY['application/json', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for user-data-exports bucket
-- Users can only access their own export files

-- Policy: Users can read their own exports
DROP POLICY IF EXISTS "Users can read own exports" ON storage.objects;
CREATE POLICY "Users can read own exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-data-exports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Service role can upload exports (Edge Function uses service role)
DROP POLICY IF EXISTS "Service role can upload exports" ON storage.objects;
CREATE POLICY "Service role can upload exports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-data-exports'
  AND (
    -- Service role can upload
    auth.jwt()->>'role' = 'service_role'
    OR
    -- Or user uploading to their own folder
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Policy: Service role can update exports
DROP POLICY IF EXISTS "Service role can update exports" ON storage.objects;
CREATE POLICY "Service role can update exports"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-data-exports'
  AND (
    auth.jwt()->>'role' = 'service_role'
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'user-data-exports'
  AND (
    auth.jwt()->>'role' = 'service_role'
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Policy: Service role can delete exports (for cleanup)
DROP POLICY IF EXISTS "Service role can delete exports" ON storage.objects;
CREATE POLICY "Service role can delete exports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-data-exports'
  AND (
    auth.jwt()->>'role' = 'service_role'
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Create a table to track export requests (for rate limiting and audit)
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  file_path TEXT,
  file_size_bytes BIGINT,
  tables_exported INTEGER,
  total_records INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  expires_at TIMESTAMPTZ
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id 
ON public.data_export_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_requested_at 
ON public.data_export_requests(requested_at DESC);

-- RLS for data_export_requests
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own export requests
DROP POLICY IF EXISTS "Users can view own export requests" ON public.data_export_requests;
CREATE POLICY "Users can view own export requests"
ON public.data_export_requests FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert/update (Edge Function)
DROP POLICY IF EXISTS "Service role can manage export requests" ON public.data_export_requests;
CREATE POLICY "Service role can manage export requests"
ON public.data_export_requests FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Function to clean up old export files (run daily via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_data_exports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_record RECORD;
BEGIN
  -- Find exports older than 24 hours
  FOR expired_record IN
    SELECT id, file_path
    FROM public.data_export_requests
    WHERE expires_at < now()
    AND status = 'completed'
    AND file_path IS NOT NULL
  LOOP
    -- Mark as expired (actual file deletion would be done via storage API)
    UPDATE public.data_export_requests
    SET status = 'expired'
    WHERE id = expired_record.id;
  END LOOP;
  
  -- Delete tracking records older than 30 days
  DELETE FROM public.data_export_requests
  WHERE requested_at < now() - interval '30 days';
END;
$$;

COMMENT ON TABLE public.data_export_requests IS 'Tracks GDPR data export requests for auditing and rate limiting';
COMMENT ON FUNCTION public.cleanup_expired_data_exports IS 'Cleans up expired data export files and old tracking records';
