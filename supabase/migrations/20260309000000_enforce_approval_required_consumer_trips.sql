-- Migration: Enforce approval-required for all consumer trips
-- Date: 2026-03-09
--
-- Product decision: All trip types now require approval for join requests.
-- The share card / trip preview handles virality; the join boundary handles trust.
--
-- Changes:
-- 1. Drop legacy join_trip_via_invite() SECURITY DEFINER function (dead code, bypasses approval)
-- 2. Update all existing active consumer trip invites to require_approval = true
-- 3. Change column default from false to true

-- ============================================================
-- 1. Drop legacy join_trip_via_invite() function
-- This function was created in the original migration but never dropped.
-- It directly inserts into trip_members without any approval check,
-- which is a security risk even though it's not called from current code.
-- It queries by the old invite_token column (not the modern code column).
-- ============================================================
DROP FUNCTION IF EXISTS public.join_trip_via_invite(TEXT);

-- ============================================================
-- 2. Update existing active invites for consumer trips
-- Any active invite that currently has require_approval = false
-- is updated to require_approval = true so that the server-side
-- enforcement matches the database state.
-- ============================================================
UPDATE public.trip_invites
SET require_approval = true,
    updated_at = now()
WHERE require_approval = false
  AND is_active = true
  AND trip_id IN (
    SELECT id FROM public.trips
    WHERE trip_type = 'consumer' OR trip_type IS NULL
  );

-- ============================================================
-- 3. Change column default so new invites default to approval-required
-- ============================================================
ALTER TABLE public.trip_invites
  ALTER COLUMN require_approval SET DEFAULT true;
