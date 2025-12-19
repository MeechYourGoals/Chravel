-- Add requester_name column to trip_join_requests table
-- This stores the requester's display name at the time of request creation
-- Solves the "Unknown User" issue where notification-based name lookup fails due to RLS

-- Add the column (nullable to not break existing rows)
ALTER TABLE public.trip_join_requests
ADD COLUMN IF NOT EXISTS requester_name TEXT;

-- Add requester_email as a fallback
ALTER TABLE public.trip_join_requests
ADD COLUMN IF NOT EXISTS requester_email TEXT;

-- Backfill existing rows from profiles where possible
UPDATE public.trip_join_requests tjr
SET
  requester_name = COALESCE(
    p.display_name,
    CONCAT(NULLIF(p.first_name, ''), ' ', NULLIF(p.last_name, '')),
    p.email
  ),
  requester_email = p.email
FROM public.profiles p
WHERE tjr.user_id = p.user_id
AND tjr.requester_name IS NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trip_join_requests_requester ON public.trip_join_requests(trip_id, requester_name);

COMMENT ON COLUMN public.trip_join_requests.requester_name IS 'Display name of the user who requested to join, captured at request creation time';
COMMENT ON COLUMN public.trip_join_requests.requester_email IS 'Email of the user who requested to join, captured at request creation time as fallback';
