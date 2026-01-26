-- Allow consumer trip members to manage invite links
-- Pro/Event trips remain restricted to creators/admins via existing policies.

DROP POLICY IF EXISTS "Consumer trip members can create invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Consumer trip members can update invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Consumer trip members can delete invites" ON public.trip_invites;

CREATE POLICY "Consumer trip members can create invites"
ON public.trip_invites
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = trip_invites.trip_id
      AND COALESCE(t.trip_type, 'consumer') = 'consumer'
      AND EXISTS (
        SELECT 1
        FROM public.trip_members tm
        WHERE tm.trip_id = t.id
          AND tm.user_id = auth.uid()
      )
  )
);

CREATE POLICY "Consumer trip members can update invites"
ON public.trip_invites
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = trip_invites.trip_id
      AND COALESCE(t.trip_type, 'consumer') = 'consumer'
      AND EXISTS (
        SELECT 1
        FROM public.trip_members tm
        WHERE tm.trip_id = t.id
          AND tm.user_id = auth.uid()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = trip_invites.trip_id
      AND COALESCE(t.trip_type, 'consumer') = 'consumer'
      AND EXISTS (
        SELECT 1
        FROM public.trip_members tm
        WHERE tm.trip_id = t.id
          AND tm.user_id = auth.uid()
      )
  )
);

CREATE POLICY "Consumer trip members can delete invites"
ON public.trip_invites
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = trip_invites.trip_id
      AND COALESCE(t.trip_type, 'consumer') = 'consumer'
      AND EXISTS (
        SELECT 1
        FROM public.trip_members tm
        WHERE tm.trip_id = t.id
          AND tm.user_id = auth.uid()
      )
  )
);
