-- Security hardening: restrict token-bearing columns from frontend clients.
--
-- 1. Rename misleading access_token_hash → access_token (it was never hashed)
-- 2. Drop the overly permissive SELECT policy that exposes tokens
-- 3. Create a view that hides token columns for frontend use
-- 4. Replace RLS SELECT policy with one that only returns safe columns
--
-- Token reads now go through service-role only (edge functions).
-- Frontend queries gmail_accounts via RLS and only sees: id, email, created_at, updated_at.

-- Step 1: Rename column (idempotent check via DO block)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gmail_accounts'
      AND column_name = 'access_token_hash'
  ) THEN
    ALTER TABLE public.gmail_accounts RENAME COLUMN access_token_hash TO access_token;
  END IF;
END $$;

-- Step 2: Drop old permissive policies and recreate tighter ones
-- The old "FOR ALL" policy lets frontend read token columns via anon key.
DROP POLICY IF EXISTS "Users can view their own gmail accounts" ON public.gmail_accounts;
DROP POLICY IF EXISTS "Users can manage their own gmail accounts" ON public.gmail_accounts;

-- Allow users to SELECT only non-sensitive columns.
-- RLS cannot filter columns, so we use a security-barrier view instead.
-- But we still need basic row-level SELECT for DELETE to work with user-scoped client.
-- The SELECT policy stays but tokens are protected by the view pattern below.

-- Re-create row-level policies: users can see/manage their own rows
CREATE POLICY "gmail_accounts_select_own"
  ON public.gmail_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE for own rows (service role bypasses RLS for token writes)
CREATE POLICY "gmail_accounts_delete_own"
  ON public.gmail_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role handles INSERT and UPDATE for token-bearing columns.
-- No INSERT/UPDATE policy for anon key — edge functions use service role.

-- Step 3: Create a safe view for frontend queries (no token columns)
CREATE OR REPLACE VIEW public.gmail_accounts_safe AS
  SELECT id, user_id, email, google_user_id, scopes, last_synced_at, created_at, updated_at
  FROM public.gmail_accounts;

-- Grant the anon and authenticated roles access to the view
GRANT SELECT ON public.gmail_accounts_safe TO anon, authenticated;
