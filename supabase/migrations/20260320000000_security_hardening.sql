-- ============================================================================
-- Security Hardening Migration
-- Created: 2026-03-20
-- Purpose: Fix is_super_admin() to match all 4 founder emails (was only 1),
--          and create admin_audit_logs table for privileged action auditing.
-- ============================================================================

-- ── 1. Fix is_super_admin() ──────────────────────────────────────────────────
-- Previous definition only included ccamechi@gmail.com, causing 3 founders to
-- be denied super admin access server-side despite having it client-side.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = ANY (
    ARRAY[
      'ccamechi@gmail.com',
      'christian@chravelapp.com',
      'phil@philquist.com',
      'darren.hartgee@gmail.com'
    ]
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

COMMENT ON FUNCTION public.is_super_admin IS
  'Returns true if the calling user is a Chravel super admin. '
  'Source of truth for all server-side privilege checks. '
  'Must always match src/constants/admins.ts SUPER_ADMIN_EMAILS list exactly.';

-- ── 2. Create admin_audit_logs ───────────────────────────────────────────────
-- Captures all privileged admin actions for incident investigation.
-- The security_audit_log table exists but captures runtime security events;
-- admin_audit_logs is specifically for deliberate admin mutations.

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT        NOT NULL,
  trip_id         TEXT,
  target_user_id  UUID,
  old_state       JSONB,
  new_state       JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can read all audit logs
CREATE POLICY "super_admins_read_admin_audit_logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (is_super_admin());

-- Service role (edge functions) can insert — restricted to service_role only
-- to prevent authenticated users from forging audit entries
CREATE POLICY "service_role_insert_admin_audit_logs"
  ON public.admin_audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id
  ON public.admin_audit_logs (admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_trip_id
  ON public.admin_audit_logs (trip_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
  ON public.admin_audit_logs (action, created_at DESC);

COMMENT ON TABLE public.admin_audit_logs IS
  'Immutable log of all deliberate privileged admin actions. '
  'Required for incident investigation and insider threat detection.';
