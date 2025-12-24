-- Secure receipts by ensuring trip-files bucket is private
UPDATE storage.buckets
SET public = false
WHERE id = 'trip-files';

-- Also ensure trip-receipts bucket (if it exists) is private
UPDATE storage.buckets
SET public = false
WHERE id = 'trip_receipts';

-- Create a helper function to extract path from URL (for legacy data migration support if needed)
CREATE OR REPLACE FUNCTION public.extract_path_from_url(url text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- If it's a Supabase storage URL
  IF url LIKE '%/storage/v1/object/public/%' THEN
    RETURN substring(url from '%/storage/v1/object/public/[^/]+/(.*)');
  END IF;
  
  -- If it's already a path (doesn't start with http)
  IF url NOT LIKE 'http%' THEN
    RETURN url;
  END IF;

  RETURN url;
END;
$$;
