-- =====================================================
-- COMPREHENSIVE FIX FOR TRIP INVITATION BUGS
-- Date: 2026-01-21
-- Issues Fixed:
--   1. Missing foreign key constraint on trip_invites.trip_id
--   2. Overly restrictive RLS policies blocking invite preview
--   3. Missing performance indexes
--   4. Orphaned invites cleanup
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Clean up orphaned invites
-- (Invites pointing to trips that no longer exist)
-- =====================================================

-- Log how many orphaned invites we're about to delete
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM public.trip_invites ti
  WHERE NOT EXISTS (
    SELECT 1 FROM public.trips t WHERE t.id = ti.trip_id
  );

  RAISE NOTICE 'Found % orphaned invite(s) to clean up', orphaned_count;
END $$;

-- Delete orphaned invites
DELETE FROM public.trip_invites
WHERE trip_id NOT IN (SELECT id FROM public.trips);

-- =====================================================
-- STEP 2: Add foreign key constraint with CASCADE
-- =====================================================

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trip_invites_trip_id_fkey'
  ) THEN
    ALTER TABLE public.trip_invites
      ADD CONSTRAINT trip_invites_trip_id_fkey
      FOREIGN KEY (trip_id)
      REFERENCES public.trips(id)
      ON DELETE CASCADE;  -- Auto-delete invites when trip is deleted

    RAISE NOTICE 'Added foreign key constraint: trip_invites_trip_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists: trip_invites_trip_id_fkey';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Add performance indexes
-- =====================================================

-- Index for fast trip_id lookups (used in JOINs)
CREATE INDEX IF NOT EXISTS idx_trip_invites_trip_id
  ON public.trip_invites(trip_id);

-- Composite index for "find active invites for a trip" queries
CREATE INDEX IF NOT EXISTS idx_trip_invites_active_by_trip
  ON public.trip_invites(trip_id, is_active)
  WHERE is_active = true;

-- Index for fast code lookups (beyond unique constraint)
-- This helps with concurrent insert checks
CREATE INDEX IF NOT EXISTS idx_trip_invites_code
  ON public.trip_invites(code)
  WHERE is_active = true;

RAISE NOTICE 'Created performance indexes on trip_invites';

-- =====================================================
-- STEP 4: Fix RLS policies
-- =====================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Trip members can view trip invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Trip members can view invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Anyone can view active trip invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Public can view active invites by code" ON public.trip_invites;
DROP POLICY IF EXISTS "Anyone can view active invites by code" ON public.trip_invites;
DROP POLICY IF EXISTS "Authenticated users can view active invites by code" ON public.trip_invites;

-- Policy 1: Service role has full access (used by edge functions)
CREATE POLICY "Service role can manage all invites"
ON public.trip_invites
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Trip members can view invites for their trips
CREATE POLICY "Trip members can view their trip invites"
ON public.trip_invites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_invites.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy 3: Trip creators and admins can INSERT invites
CREATE POLICY "Trip admins can create invites"
ON public.trip_invites
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id AND ta.user_id = auth.uid()
      )
    )
  )
);

-- Policy 4: Trip creators and admins can UPDATE invites
CREATE POLICY "Trip admins can update invites"
ON public.trip_invites
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id AND ta.user_id = auth.uid()
      )
    )
  )
);

-- Policy 5: Trip creators and admins can DELETE invites
CREATE POLICY "Trip admins can delete invites"
ON public.trip_invites
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id AND ta.user_id = auth.uid()
      )
    )
  )
);

RAISE NOTICE 'Updated RLS policies for trip_invites';

-- =====================================================
-- STEP 5: Add helpful comments
-- =====================================================

COMMENT ON CONSTRAINT trip_invites_trip_id_fkey ON public.trip_invites IS
  'Ensures invites can only be created for existing trips. CASCADE delete removes invites when trip is deleted.';

COMMENT ON INDEX idx_trip_invites_trip_id IS
  'Performance index for JOIN operations between trip_invites and trips';

COMMENT ON INDEX idx_trip_invites_active_by_trip IS
  'Performance index for queries like "find all active invites for trip X"';

-- =====================================================
-- STEP 6: Verify data integrity
-- =====================================================

DO $$
DECLARE
  total_invites INTEGER;
  active_invites INTEGER;
  trips_with_invites INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_invites FROM public.trip_invites;
  SELECT COUNT(*) INTO active_invites FROM public.trip_invites WHERE is_active = true;
  SELECT COUNT(DISTINCT trip_id) INTO trips_with_invites FROM public.trip_invites;

  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - Total invites: %', total_invites;
  RAISE NOTICE '  - Active invites: %', active_invites;
  RAISE NOTICE '  - Trips with invites: %', trips_with_invites;
  RAISE NOTICE '  - All invites now have valid trip_id references';
END $$;

COMMIT;
