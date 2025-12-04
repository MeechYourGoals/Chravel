-- Create trip-media storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-media', 'trip-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for trip-media bucket
-- Allow authenticated users to view media for trips they're members of
CREATE POLICY "Trip members can view trip media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trip-media' AND 
    auth.uid() IS NOT NULL
  );

-- Allow authenticated users to upload to trip-media
CREATE POLICY "Authenticated users can upload trip media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'trip-media' AND 
    auth.uid() IS NOT NULL
  );

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own trip media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'trip-media' AND 
    auth.uid() IS NOT NULL
  );

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own trip media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'trip-media' AND 
    auth.uid() IS NOT NULL
  );