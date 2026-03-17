-- Revoke anon access to check_invite_code_exists().
--
-- The function was originally granted to anon in 20251221_fix_security_definer_search_path.sql.
-- A subsequent grant to authenticated+service_role was added in 20260107200000, but GRANT is
-- additive in PostgreSQL — anon access remained in effect.
--
-- Unauthenticated callers can silently enumerate invite codes by checking whether a code
-- "exists" without ever completing the join flow. Removing anon access closes this probe.
-- All legitimate callers are authenticated (the invite join flow requires auth).

REVOKE EXECUTE ON FUNCTION public.check_invite_code_exists(TEXT) FROM anon;
