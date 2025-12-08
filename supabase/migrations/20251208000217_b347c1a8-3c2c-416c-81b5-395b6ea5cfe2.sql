-- Fix RLS policy: Allow trip CREATORS (not just members) to view their trips
DROP POLICY IF EXISTS "Trip members can view trips" ON trips;

CREATE POLICY "Trip creators and members can view trips"
ON trips
FOR SELECT
USING (
  auth.uid() = created_by 
  OR EXISTS (
    SELECT 1 FROM trip_members tm 
    WHERE tm.trip_id = trips.id AND tm.user_id = auth.uid()
  )
);