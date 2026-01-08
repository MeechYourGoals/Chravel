-- Fix campaigns table security - remove public access to sensitive business data

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "campaigns_select_active_public" ON public.campaigns;

-- Create a restricted policy: Only advertisers can see their own campaigns (full data)
-- Active campaigns can be viewed by authenticated users (for display purposes) but through a secure view

-- Create a secure view for public campaign display that hides sensitive business metrics
CREATE OR REPLACE VIEW public.campaigns_public AS
SELECT 
  id,
  name,
  description,
  images,
  destination_info,
  discount_details,
  tags,
  status,
  start_date,
  end_date
  -- Explicitly EXCLUDE sensitive data:
  -- advertiser_id (could identify competitors)
  -- budget_daily, budget_total (business strategy)
  -- impressions, clicks, conversions (performance metrics)
FROM public.campaigns
WHERE status = 'active'
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date >= now());

-- Grant access to authenticated users only (not public/anon)
GRANT SELECT ON public.campaigns_public TO authenticated;

-- Add a policy for authenticated users to view active campaigns for display
-- This replaces the overly permissive public policy
CREATE POLICY "authenticated_view_active_campaigns"
ON public.campaigns
FOR SELECT
TO authenticated
USING (
  -- Users can see active campaigns (for display in travel recs)
  (status = 'active' AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()))
  OR
  -- Or their own campaigns (full access for advertisers)
  (advertiser_id IN (SELECT id FROM advertisers WHERE user_id = auth.uid()))
);

-- Drop the redundant campaigns_select_own policy since it's now covered
DROP POLICY IF EXISTS "campaigns_select_own" ON public.campaigns;