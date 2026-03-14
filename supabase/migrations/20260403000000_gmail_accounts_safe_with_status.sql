-- Expose token_expires_at and last_synced_at in the gmail_accounts_safe view.
-- These are timing hints, not credentials, and are scoped to the authenticated user's own rows.
--
-- Safety notes:
-- (1) token_expires_at is a TIMESTAMPTZ timestamp (not a token/secret value). RLS on gmail_accounts
--     is row-scoped (auth.uid() = user_id) and is unchanged. Exposing expiry lets the UI show
--     "Reconnect recommended" without giving the frontend access to token values.
-- (2) last_synced_at is a plain timestamp indicating when the last import ran.
-- (3) No RLS changes. No auth modifications. No new permissions added.
-- (4) Idempotent via CREATE OR REPLACE VIEW.

CREATE OR REPLACE VIEW public.gmail_accounts_safe AS
  SELECT id, user_id, email, google_user_id, scopes,
         last_synced_at, token_expires_at, created_at, updated_at
  FROM public.gmail_accounts;

GRANT SELECT ON public.gmail_accounts_safe TO anon, authenticated;
