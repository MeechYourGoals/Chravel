-- Migration: Add is_private column to trip_artifacts + update RLS
-- This allows imported personal data (reservations, loyalty info) to be
-- private to the uploader by default, not immediately visible to all trip members.
--
-- Safety notes:
-- (1) is_private defaults to false — all existing trip_artifacts remain visible
--     to trip members exactly as before. No change to existing behavior.
-- (2) The SELECT policy is replaced with a version that respects is_private.
--     Parentheses are explicit to avoid operator-precedence ambiguity.
-- (3) The service_role policy "Service role full access to artifacts" is unchanged.
--     Edge functions using service_role continue to have full access.
-- (4) INSERT/UPDATE/DELETE policies are unchanged — no blast radius there.
-- (5) Idempotent via IF NOT EXISTS and OR REPLACE patterns.

-- Step 1: Add is_private column (idempotent)
ALTER TABLE trip_artifacts
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Index for privacy-scoped queries
CREATE INDEX IF NOT EXISTS idx_trip_artifacts_privacy
  ON trip_artifacts(trip_id, creator_id, is_private);

-- Step 3: Drop the existing SELECT policy and replace with privacy-aware version
-- Old policy: all trip members can see all artifacts
-- New policy: creator always sees own artifacts; non-creators see only public artifacts
DROP POLICY IF EXISTS "Trip members can view artifacts" ON trip_artifacts;

CREATE POLICY "Trip members can view artifacts"
  ON trip_artifacts FOR SELECT
  USING (
    creator_id = auth.uid()
    OR (
      is_private = false
      AND EXISTS (
        SELECT 1 FROM trip_members tm
        WHERE tm.trip_id = trip_artifacts.trip_id
          AND tm.user_id = auth.uid()
      )
    )
  );

COMMENT ON COLUMN trip_artifacts.is_private IS
  'When true, only the creator can see this artifact. '
  'When false (default), all trip members can see it. '
  'Enforced by RLS. Service role bypasses this for edge function operations.';
