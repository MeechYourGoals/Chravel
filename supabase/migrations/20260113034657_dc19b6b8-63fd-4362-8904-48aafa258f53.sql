-- Clean up duplicate RLS policies on trip_events
-- Drop the older/redundant policies that reference trip_admins (which most trips don't populate)

-- Drop older policies that reference trip_admins view/table
DROP POLICY IF EXISTS "Allow event updates for creators and admins" ON public.trip_events;
DROP POLICY IF EXISTS "Allow event deletion for creators and admins" ON public.trip_events;

-- Drop duplicate insert policy
DROP POLICY IF EXISTS "Allow event creation for trip members and creators" ON public.trip_events;
DROP POLICY IF EXISTS "Allow viewing events for trip members and creators" ON public.trip_events;

-- Keep the simpler policies that check trip_members OR trips.created_by:
-- "Allow calendar event creation" - INSERT
-- "Allow calendar event deletion" - DELETE  
-- "Allow calendar event updates" - UPDATE
-- "Allow viewing calendar events" - SELECT

-- Verify the remaining policies allow any trip member (not just creator) to manage events