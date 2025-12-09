-- Allow public access to trip cover images for social media sharing (OG previews)
-- This enables social media crawlers (Facebook, Twitter, iMessage, LinkedIn) to fetch
-- cover images without authentication for link preview cards

CREATE POLICY "Public access to trip cover images for social sharing" 
ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'trip-media' AND 
  (storage.foldername(name))[1] = 'trip-covers'
);