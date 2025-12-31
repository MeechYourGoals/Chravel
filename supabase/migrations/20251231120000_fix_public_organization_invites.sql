-- Tighten RLS for organization_invites
-- Problem: prior policy allowed unauthenticated users to view pending invites,
-- exposing emails + tokens and enabling invite discovery/interception.

BEGIN;

-- Remove overly-broad public SELECT access
DROP POLICY IF EXISTS "Anyone can view pending invites by token" ON public.organization_invites;

-- Allow invited users (authenticated) to view only their own pending, unexpired invites.
-- This supports an "accept invite" flow while preventing broad invite enumeration.
CREATE POLICY "Invitees can view their pending invites"
  ON public.organization_invites FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND status = 'pending'
    AND expires_at > now()
    AND lower(email) = lower((auth.jwt() ->> 'email'))
  );

COMMIT;

