-- Supabase linter: SUPA_security_definer_view
--
-- Postgres views without `security_invoker=true` can evaluate permissions/RLS as the view owner
-- (effectively "security definer"), which may unintentionally bypass intended access controls.
--
-- Remediation: enforce invoker security so base-table privileges/RLS are evaluated for the querying user.
-- https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

-- Profile directory view (privacy-gated; must still enforce RLS as the caller)
ALTER VIEW IF EXISTS public.profiles_public SET (security_invoker = true);

-- Broadcast analytics view (should respect caller membership policies)
ALTER VIEW IF EXISTS public.broadcast_stats SET (security_invoker = true);

