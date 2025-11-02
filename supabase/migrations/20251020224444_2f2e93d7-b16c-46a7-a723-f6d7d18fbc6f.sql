-- Create advertisers table
CREATE TABLE public.advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  discount_details TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  destination_info JSONB,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  budget_total DECIMAL(10,2),
  budget_daily DECIMAL(10,2),
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaign targeting table
CREATE TABLE public.campaign_targeting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  age_min INTEGER,
  age_max INTEGER,
  genders TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  locations TEXT[] DEFAULT '{}',
  trip_types TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id)
);

-- Create campaign analytics table
CREATE TABLE public.campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'conversion')),
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_targeting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advertisers
CREATE POLICY "advertisers_select_own"
  ON public.advertisers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "advertisers_insert_own"
  ON public.advertisers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "advertisers_update_own"
  ON public.advertisers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for campaigns
CREATE POLICY "campaigns_select_own"
  ON public.campaigns FOR SELECT
  USING (
    advertiser_id IN (
      SELECT id FROM public.advertisers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "campaigns_insert_own"
  ON public.campaigns FOR INSERT
  WITH CHECK (
    advertiser_id IN (
      SELECT id FROM public.advertisers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "campaigns_update_own"
  ON public.campaigns FOR UPDATE
  USING (
    advertiser_id IN (
      SELECT id FROM public.advertisers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "campaigns_delete_own"
  ON public.campaigns FOR DELETE
  USING (
    advertiser_id IN (
      SELECT id FROM public.advertisers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "campaigns_select_active_public"
  ON public.campaigns FOR SELECT
  USING (
    status = 'active' 
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW())
  );

-- RLS Policies for targeting
CREATE POLICY "targeting_manage_own"
  ON public.campaign_targeting FOR ALL
  USING (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.advertisers a ON c.advertiser_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- RLS Policies for analytics
CREATE POLICY "analytics_insert_any"
  ON public.campaign_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "analytics_select_own"
  ON public.campaign_analytics FOR SELECT
  USING (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.advertisers a ON c.advertiser_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_advertisers_user ON public.advertisers(user_id);
CREATE INDEX idx_campaigns_advertiser ON public.campaigns(advertiser_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_dates ON public.campaigns(start_date, end_date);
CREATE INDEX idx_campaign_targeting_campaign ON public.campaign_targeting(campaign_id);
CREATE INDEX idx_analytics_campaign ON public.campaign_analytics(campaign_id);
CREATE INDEX idx_analytics_created ON public.campaign_analytics(created_at);

-- Triggers
CREATE TRIGGER update_advertisers_updated_at
  BEFORE UPDATE ON public.advertisers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_targeting_updated_at
  BEFORE UPDATE ON public.campaign_targeting
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment stats
CREATE OR REPLACE FUNCTION increment_campaign_stat(
  p_campaign_id UUID,
  p_stat_type TEXT
) RETURNS void AS $$
BEGIN
  CASE p_stat_type
    WHEN 'impression' THEN
      UPDATE public.campaigns 
      SET impressions = impressions + 1 
      WHERE id = p_campaign_id;
    WHEN 'click' THEN
      UPDATE public.campaigns 
      SET clicks = clicks + 1 
      WHERE id = p_campaign_id;
    WHEN 'conversion' THEN
      UPDATE public.campaigns 
      SET conversions = conversions + 1 
      WHERE id = p_campaign_id;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('advertiser-assets', 'advertiser-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Advertisers can upload their own assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'advertiser-assets' AND
  auth.uid() IN (
    SELECT user_id FROM public.advertisers
  )
);

CREATE POLICY "Advertisers can update their own assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'advertiser-assets' AND
  auth.uid() IN (
    SELECT user_id FROM public.advertisers
  )
);

CREATE POLICY "Advertisers can delete their own assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'advertiser-assets' AND
  auth.uid() IN (
    SELECT user_id FROM public.advertisers
  )
);

CREATE POLICY "Anyone can view advertiser assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'advertiser-assets');