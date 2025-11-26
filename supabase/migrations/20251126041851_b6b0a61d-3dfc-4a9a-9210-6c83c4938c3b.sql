-- Clean up any blob URLs that were incorrectly saved to the database
UPDATE trips 
SET cover_image_url = NULL 
WHERE cover_image_url LIKE 'blob:%';