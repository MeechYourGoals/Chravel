-- Migration: Enforce media_upload_mode in RLS policies
-- CRITICAL: can_upload_media_to_trip() was created in 20260315000001 but never
-- referenced in any policy. This migration closes that gap by updating storage
-- bucket INSERT policies and trip_media_index INSERT policies.

-- ==========================================
-- STEP 1: Update trip-media storage bucket INSERT policy
-- ==========================================

-- Drop the existing membership-only policy
DROP POLICY IF EXISTS "Trip members can upload trip media" ON storage.objects;

-- Recreate with media_upload_mode enforcement
CREATE POLICY "Trip members can upload trip media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trip-media'
  AND (storage.foldername(name))[1] != 'trip-covers'
  AND can_upload_media_to_trip(
    auth.uid(),
    (storage.foldername(name))[1]  -- trip_id from path
  )
);

-- ==========================================
-- STEP 2: Update chat-media storage bucket INSERT policy
-- ==========================================

-- Drop the existing membership-only policy
DROP POLICY IF EXISTS "Trip members can upload chat media" ON storage.objects;

-- Recreate with media_upload_mode enforcement
CREATE POLICY "Trip members can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND can_upload_media_to_trip(
    auth.uid(),
    (storage.foldername(name))[1]  -- trip_id from path
  )
);

-- ==========================================
-- STEP 3: Update trip_media_index INSERT policy
-- ==========================================

-- Drop existing membership-only policies
DROP POLICY IF EXISTS "Members can insert trip media" ON trip_media_index;
DROP POLICY IF EXISTS "Users can insert media in their trips" ON trip_media_index;

-- Recreate with media_upload_mode enforcement
CREATE POLICY "Members can insert trip media"
ON trip_media_index FOR INSERT
WITH CHECK (
  can_upload_media_to_trip(auth.uid(), trip_id::text)
);
