-- Apply Trip Photos Bucket RLS Policy Fix
-- Generated: 2025-11-11
-- Addresses: Public bucket with overly permissive policy allowing anyone to view trip photos
-- 
-- This migration replaces the public access policy with a restricted policy that only
-- allows trip members to view photos in the trip-photos bucket.

-- ==========================================
-- FIX: Storage Bucket - Restrict trip-photos
-- ==========================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view trip photos" ON storage.objects;

-- Create policy that restricts viewing to trip members only
-- Only users who are active members of a trip can view photos in that trip's folder
CREATE POLICY "Trip members can view trip photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trip-photos' AND 
    (storage.foldername(name))[1] IN (
      SELECT tm.trip_id::text 
      FROM trip_members tm
      WHERE tm.user_id = auth.uid() 
        AND tm.status = 'active'
    )
  );

-- Add helpful comment
COMMENT ON POLICY "Trip members can view trip photos" ON storage.objects IS 
  'Restricts access to trip photos to only active trip members. Photos are organized by trip_id in folder structure.';
