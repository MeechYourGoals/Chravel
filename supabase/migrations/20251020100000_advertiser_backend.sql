-- Advertiser backend core tables and policies
-- Simple, secure schema to power Chravel Recs ads

-- 1) Extend app_role enum to include 'advertiser' (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'app_role'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'app_role' AND e.enumlabel = 'advertiser'
    ) THEN
      ALTER TYPE public.app_role ADD VALUE 'advertiser';
    END IF;
  END IF;
END $$;

-- 2) Core tables
CREATE TABLE IF NOT EXISTS public.advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  website_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  discount TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of {url, alt?}
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT description_max_240 CHECK (description IS NULL OR char_length(description) <= 240)
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_advertiser ON public.ad_campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status_dates ON public.ad_campaigns(status, start_date, end_date);

-- 4) RLS
ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Advertisers can manage their own advertiser row
CREATE POLICY IF NOT EXISTS "advertisers_self_select" ON public.advertisers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "advertisers_self_modify" ON public.advertisers
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "advertisers_self_insert" ON public.advertisers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins may read/write all advertiser rows
CREATE POLICY IF NOT EXISTS "admin_all_advertisers" ON public.advertisers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'enterprise_admin')
  );

-- Campaign policies: owner can do everything
CREATE POLICY IF NOT EXISTS "campaigns_owner_rw" ON public.ad_campaigns
  FOR ALL USING (
    advertiser_id IN (
      SELECT id FROM public.advertisers WHERE user_id = auth.uid()
    )
  );

-- Public read for active campaigns (to power consumer display later)
CREATE POLICY IF NOT EXISTS "campaigns_public_read_active" ON public.ad_campaigns
  FOR SELECT USING (
    status = 'active' AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now())
  );

-- 5) Triggers to keep updated_at fresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_advertisers_updated_at ON public.advertisers;
CREATE TRIGGER trg_advertisers_updated_at
  BEFORE UPDATE ON public.advertisers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ad_campaigns_updated_at ON public.ad_campaigns;
CREATE TRIGGER trg_ad_campaigns_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
