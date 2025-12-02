-- Add DELETE policies for trip_members table to allow collaborator removal

-- Policy 1: Users can remove themselves from any trip (leave trip)
CREATE POLICY "Users can leave trips"
ON public.trip_members
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Trip creators can remove any member
CREATE POLICY "Trip creators can remove members"
ON public.trip_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_members.trip_id
    AND t.created_by = auth.uid()
  )
);

-- Policy 3: Trip admins can remove members
CREATE POLICY "Trip admins can remove members"
ON public.trip_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_admins ta
    WHERE ta.trip_id = trip_members.trip_id
    AND ta.user_id = auth.uid()
  )
);