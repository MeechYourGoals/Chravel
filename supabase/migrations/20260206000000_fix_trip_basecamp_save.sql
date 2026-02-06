-- =====================================================
-- FIX: Trip basecamp save failure
-- Date: 2026-02-06
-- Description:
--   The update_trip_basecamp_with_version RPC calls log_basecamp_change() internally.
--   The exception handler only catches WHEN undefined_function, but the actual failure
--   is an undefined_column error caused by a migration conflict:
--     - Migration 20250102000000 created log_basecamp_change returning UUID
--       with correct column names (basecamp_type, previous_*)
--     - Migration 20251119052746 tried to CREATE OR REPLACE with return void
--       and different column names (scope, old_*)
--   The column mismatch causes INSERT failures that propagate up and crash the RPC.
--
--   Fix 1: Widen the exception handler to WHEN OTHERS
--   Fix 2: Drop and recreate log_basecamp_change with correct column names
-- =====================================================

-- =====================================================
-- FIX 1: Drop and recreate log_basecamp_change
-- Must DROP first because CREATE OR REPLACE cannot change return type.
-- =====================================================

-- Drop existing function (handle both possible return types)
DROP FUNCTION IF EXISTS public.log_basecamp_change(text, uuid, text, text, text, text, double precision, double precision, text, text, double precision, double precision);

-- Recreate with correct column names matching basecamp_change_history table
-- Returns void (history logging should not return data)
CREATE OR REPLACE FUNCTION public.log_basecamp_change(
  p_trip_id text,
  p_user_id uuid,
  p_basecamp_type text,
  p_action text,
  p_previous_name text DEFAULT NULL,
  p_previous_address text DEFAULT NULL,
  p_previous_latitude double precision DEFAULT NULL,
  p_previous_longitude double precision DEFAULT NULL,
  p_new_name text DEFAULT NULL,
  p_new_address text DEFAULT NULL,
  p_new_latitude double precision DEFAULT NULL,
  p_new_longitude double precision DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert if the table exists (defensive check)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'basecamp_change_history') THEN
    INSERT INTO public.basecamp_change_history (
      trip_id, user_id, basecamp_type, action,
      previous_name, previous_address, previous_latitude, previous_longitude,
      new_name, new_address, new_latitude, new_longitude
    ) VALUES (
      p_trip_id, p_user_id, p_basecamp_type, p_action,
      p_previous_name, p_previous_address, p_previous_latitude, p_previous_longitude,
      p_new_name, p_new_address, p_new_latitude, p_new_longitude
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- History logging must never block the main operation
    RAISE WARNING 'log_basecamp_change failed (non-critical): %', SQLERRM;
END;
$$;

-- =====================================================
-- FIX 2: Recreate update_trip_basecamp_with_version
-- Widen exception handler from WHEN undefined_function to WHEN OTHERS
-- so that ANY error from log_basecamp_change is caught and ignored.
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_trip_basecamp_with_version(
  p_trip_id text,
  p_current_version integer,
  p_name text,
  p_address text,
  p_latitude double precision,
  p_longitude double precision,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
BEGIN
  -- Lock row and get current version
  SELECT basecamp_version INTO v_current_version
  FROM trips
  WHERE id = p_trip_id
  FOR UPDATE;

  -- Handle NULL basecamp_version (trips created before the column existed)
  IF v_current_version IS NULL THEN
    v_current_version := 0;
  END IF;

  -- Check version match (skip for first save where client sends 1 and DB has 0 or NULL)
  IF v_current_version != p_current_version AND v_current_version > 0 AND p_current_version > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'conflict', true,
      'current_version', v_current_version,
      'message', 'Basecamp was modified by another user'
    );
  END IF;

  -- Update with version increment
  v_new_version := COALESCE(v_current_version, 0) + 1;

  UPDATE trips SET
    basecamp_name = p_name,
    basecamp_address = p_address,
    basecamp_latitude = p_latitude,
    basecamp_longitude = p_longitude,
    basecamp_version = v_new_version,
    updated_at = NOW()
  WHERE id = p_trip_id;

  -- Log change to history (NEVER block the main operation)
  BEGIN
    PERFORM log_basecamp_change(
      p_trip_id,
      p_user_id,
      'trip',
      'updated',
      NULL, NULL, NULL, NULL,
      p_name, p_address, p_latitude, p_longitude
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Catch ALL errors from history logging, not just undefined_function.
      -- This was the root cause of the trip basecamp save failure.
      RAISE WARNING 'History logging failed in update_trip_basecamp_with_version (non-critical): %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'new_version', v_new_version
  );
END;
$$;
