-- Add image/jpg to avatars bucket allowed_mime_types for browser compatibility
-- Some browsers report JPG files as image/jpg instead of image/jpeg
-- Client-side also normalizes image/jpg -> image/jpeg; this migration provides defense in depth
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']
WHERE id = 'avatars';
