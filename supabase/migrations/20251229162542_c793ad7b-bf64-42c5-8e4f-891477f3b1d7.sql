-- Create user_entitlements table for unified subscription state
-- This is the single source of truth for what plan/features a user has

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('revenuecat', 'stripe', 'admin', 'demo')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'explorer', 'frequent-chraveler', 'pro-starter', 'pro-growth', 'pro-enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'expired', 'canceled')),
  current_period_end TIMESTAMPTZ,
  entitlements JSONB NOT NULL DEFAULT '[]'::jsonb,
  revenuecat_customer_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- Users can only read their own entitlements
CREATE POLICY "Users can read own entitlements" 
  ON public.user_entitlements 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Only service role can insert/update/delete (edge functions)
-- Note: We use a permissive policy that service_role bypasses via RLS bypass
CREATE POLICY "Service role manages entitlements"
  ON public.user_entitlements
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_entitlements_updated_at
  BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_user_entitlements_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_entitlements_source ON public.user_entitlements(source);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_plan ON public.user_entitlements(plan);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_status ON public.user_entitlements(status);