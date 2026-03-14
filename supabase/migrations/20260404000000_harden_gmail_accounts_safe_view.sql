-- Security fix: ensure gmail_accounts_safe respects caller RLS context.
-- Without security_invoker=true, a view owned by postgres can evaluate with owner privileges,
-- which risks exposing cross-user rows despite row-level policies on gmail_accounts.
CREATE OR REPLACE VIEW public.gmail_accounts_safe
WITH (security_invoker = true) AS
  SELECT
    id,
    user_id,
    email,
    google_user_id,
    scopes,
    last_synced_at,
    token_expires_at,
    created_at,
    updated_at
  FROM public.gmail_accounts;

REVOKE ALL ON public.gmail_accounts_safe FROM anon;
GRANT SELECT ON public.gmail_accounts_safe TO authenticated;
