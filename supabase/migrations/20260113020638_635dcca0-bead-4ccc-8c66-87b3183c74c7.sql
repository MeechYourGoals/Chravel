-- Backfill existing pending requests with requester info from profiles
-- This ensures existing requests display correctly after the code fix
UPDATE public.trip_join_requests tjr
SET 
  requester_name = COALESCE(
    p.display_name, 
    CONCAT_WS(' ', p.first_name, p.last_name),
    p.first_name,
    p.email,
    'Unknown'
  ),
  requester_email = p.email
FROM public.profiles p
WHERE tjr.user_id = p.user_id
  AND tjr.requester_name IS NULL;