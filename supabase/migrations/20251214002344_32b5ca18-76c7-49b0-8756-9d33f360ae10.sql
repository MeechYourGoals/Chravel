-- Allow trip members to see fellow members of trips they belong to
-- This fixes: collaborators display, chat message sending, and member count accuracy

CREATE POLICY "Trip members can view fellow members"
ON public.trip_members
FOR SELECT
TO authenticated
USING (
  trip_id IN (
    SELECT tm.trip_id 
    FROM public.trip_members tm 
    WHERE tm.user_id = auth.uid()
  )
);