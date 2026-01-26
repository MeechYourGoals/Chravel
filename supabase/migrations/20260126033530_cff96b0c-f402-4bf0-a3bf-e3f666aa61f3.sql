-- Consumer trip invite permissions fix
-- Allow consumer trip members to create/update/delete invites
-- Pro/Event trips remain restricted to creator/admins only

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Trip admins can create invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Trip admins can update invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Trip admins can delete invites" ON public.trip_invites;

-- Create new INSERT policy that branches by trip_type
CREATE POLICY "Members or admins can create invites based on trip type"
ON public.trip_invites
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the created_by of the invite
  auth.uid() = created_by
  AND
  EXISTS (
    SELECT 1 FROM trips t WHERE t.id = trip_invites.trip_id
    AND (
      -- Trip creator can always create invites
      t.created_by = auth.uid()
      OR
      -- For consumer trips (or legacy NULL): any trip member
      (COALESCE(t.trip_type, 'consumer') = 'consumer' 
       AND EXISTS (
         SELECT 1 FROM trip_members tm 
         WHERE tm.trip_id = t.id AND tm.user_id = auth.uid()
       ))
      OR
      -- For pro/event trips: only admins
      (COALESCE(t.trip_type, 'consumer') IN ('pro', 'event')
       AND EXISTS (
         SELECT 1 FROM trip_admins ta 
         WHERE ta.trip_id = t.id AND ta.user_id = auth.uid()
       ))
    )
  )
);

-- Create new UPDATE policy with same logic
CREATE POLICY "Members or admins can update invites based on trip type"
ON public.trip_invites
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR
      (COALESCE(t.trip_type, 'consumer') = 'consumer' 
       AND EXISTS (
         SELECT 1 FROM trip_members tm 
         WHERE tm.trip_id = t.id AND tm.user_id = auth.uid()
       ))
      OR
      (COALESCE(t.trip_type, 'consumer') IN ('pro', 'event')
       AND EXISTS (
         SELECT 1 FROM trip_admins ta 
         WHERE ta.trip_id = t.id AND ta.user_id = auth.uid()
       ))
    )
  )
);

-- Create new DELETE policy with same logic
CREATE POLICY "Members or admins can delete invites based on trip type"
ON public.trip_invites
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR
      (COALESCE(t.trip_type, 'consumer') = 'consumer' 
       AND EXISTS (
         SELECT 1 FROM trip_members tm 
         WHERE tm.trip_id = t.id AND tm.user_id = auth.uid()
       ))
      OR
      (COALESCE(t.trip_type, 'consumer') IN ('pro', 'event')
       AND EXISTS (
         SELECT 1 FROM trip_admins ta 
         WHERE ta.trip_id = t.id AND ta.user_id = auth.uid()
       ))
    )
  )
);