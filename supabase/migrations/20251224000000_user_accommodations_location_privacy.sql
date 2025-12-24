-- Privacy hardening: reduce physical safety risk from precise lodging coordinates.
--
-- Problem:
-- - `user_accommodations` historically allowed trip members to SELECT rows (including precise lat/lng),
--   and stored high-precision coordinates alongside check-in/check-out dates.
--
-- Fix:
-- 1) Remove overly-permissive SELECT policy for trip members (keep accommodations private by default).
-- 2) Enforce storage of only approximate coordinates (rounded to ~1km) at the database layer.
--
-- NOTE: We intentionally keep this conservative. If we later add "share with trip" UX,
-- implement an explicit consent model via a dedicated SECURITY DEFINER RPC that returns
-- masked vs precise fields, rather than exposing raw columns via RLS.

-- -----------------------------------------------------------------------------
-- 1) Lock down RLS: only the owner can read/manage their accommodation row.
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.user_accommodations ENABLE ROW LEVEL SECURITY;

-- Drop historical permissive policies (policy effects are OR'ed; leaving these in place is unsafe).
DROP POLICY IF EXISTS "Users can view accommodations for their trips" ON public.user_accommodations;
DROP POLICY IF EXISTS "Users can manage their own accommodations" ON public.user_accommodations;

-- Drop other legacy policy names to avoid unexpected combined access.
DROP POLICY IF EXISTS "Users can view their own accommodations" ON public.user_accommodations;
DROP POLICY IF EXISTS "Users can insert their own accommodations" ON public.user_accommodations;
DROP POLICY IF EXISTS "Users can update their own accommodations" ON public.user_accommodations;
DROP POLICY IF EXISTS "Users can delete their own accommodations" ON public.user_accommodations;
DROP POLICY IF EXISTS "user_accommodations_select_own" ON public.user_accommodations;
DROP POLICY IF EXISTS "user_accommodations_insert_own" ON public.user_accommodations;
DROP POLICY IF EXISTS "user_accommodations_update_own" ON public.user_accommodations;
DROP POLICY IF EXISTS "user_accommodations_delete_own" ON public.user_accommodations;

-- Recreate a minimal, least-privilege policy set.
CREATE POLICY "user_accommodations_select_own"
  ON public.user_accommodations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_accommodations_insert_own"
  ON public.user_accommodations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_accommodations_update_own"
  ON public.user_accommodations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_accommodations_delete_own"
  ON public.user_accommodations
  FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 2) Enforce approximate-only coordinate storage (server-side, cannot be bypassed).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.round_user_accommodations_coordinates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 2 decimal places ~= 1.1km latitude resolution (approximate neighborhood-level).
  IF NEW.latitude IS NOT NULL THEN
    NEW.latitude := round(NEW.latitude::numeric, 2)::double precision;
  END IF;

  IF NEW.longitude IS NOT NULL THEN
    NEW.longitude := round(NEW.longitude::numeric, 2)::double precision;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_round_user_accommodations_coordinates ON public.user_accommodations;
CREATE TRIGGER trigger_round_user_accommodations_coordinates
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.user_accommodations
FOR EACH ROW
EXECUTE FUNCTION public.round_user_accommodations_coordinates();

-- Backfill existing rows to approximate precision (idempotent).
UPDATE public.user_accommodations
SET
  latitude = CASE
    WHEN latitude IS NULL THEN NULL
    ELSE round(latitude::numeric, 2)::double precision
  END,
  longitude = CASE
    WHEN longitude IS NULL THEN NULL
    ELSE round(longitude::numeric, 2)::double precision
  END;

