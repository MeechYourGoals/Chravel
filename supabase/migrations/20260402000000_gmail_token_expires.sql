-- Add token_expires_at to gmail_accounts so the import worker can skip
-- the live /profile test request when the token is known to still be valid.
--
-- Safety notes:
-- (1) token_expires_at is a plain TIMESTAMPTZ (timing hint), not a credential.
--     RLS on gmail_accounts is row-scoped (auth.uid() = user_id) and is unaffected.
-- (2) gmail_accounts_safe view explicitly enumerates its columns and does NOT
--     expose token_expires_at — access control is unchanged.
-- (3) Column is nullable with no default — existing rows get NULL, no auth desync.
-- Idempotent via IF NOT EXISTS.

ALTER TABLE public.gmail_accounts
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Recreate safe view (no-op: same columns as before, explicitly excludes token fields)
CREATE OR REPLACE VIEW public.gmail_accounts_safe AS
  SELECT id, user_id, email, google_user_id, scopes, last_synced_at, created_at, updated_at
  FROM public.gmail_accounts;

GRANT SELECT ON public.gmail_accounts_safe TO anon, authenticated;
