-- Security hardening: remove public read access to advertiser campaigns.
-- The existing "campaigns_select_own" policy already allows authenticated advertisers
-- to read their own campaigns. Dropping the public policy prevents competitors from
-- reading active campaigns (budgets/targeting/performance) without authentication.

DROP POLICY IF EXISTS "campaigns_select_active_public" ON public.campaigns;

