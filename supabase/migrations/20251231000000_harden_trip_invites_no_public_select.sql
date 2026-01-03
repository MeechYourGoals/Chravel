-- Harden trip invite codes: shareable links without public enumeration.
--
-- Problem:
--   A legacy RLS policy allowed anon/public SELECT over all active invites, making
--   invite codes enumerable (bulk harvesting risk).
--
-- Desired behavior:
--   - Invite links remain shareable via `/join/{code}`.
--   - The `trip_invites` table is NOT directly readable by `anon`.
--   - Public invite previews are served via the `get-invite-preview` edge function
--     (service role), which looks up exactly one code and returns a narrow payload.
--   - Joining requires authentication and can be approval-gated via `require_approval`.
--
-- This migration drops any legacy "public invite read" policies defensively.

ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;

-- Legacy policy names from older migrations / iterations:
DROP POLICY IF EXISTS "Public can view active invites by code" ON public.trip_invites;
DROP POLICY IF EXISTS "Anyone can view active trip invites" ON public.trip_invites;

COMMENT ON TABLE public.trip_invites IS
'Trip invite codes are shareable via /join/{code} links, but this table is not publicly readable. Use edge functions get-invite-preview (no auth) and join-trip (auth + optional approval) to resolve codes without enabling enumeration.';

