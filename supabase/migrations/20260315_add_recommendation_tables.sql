-- ============================================================================
-- Recommendation System Tables
-- Creates organic inventory, impression/click tracking, and user feedback
-- ============================================================================

-- recommendation_items: Organic recommendation inventory
CREATE TABLE IF NOT EXISTS public.recommendation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('hotel', 'restaurant', 'activity', 'tour', 'experience', 'transportation')),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  city TEXT,
  country TEXT DEFAULT 'US',
  latitude NUMERIC,
  longitude NUMERIC,
  rating NUMERIC CHECK (rating >= 0 AND rating <= 5),
  price_level INT CHECK (price_level >= 1 AND price_level <= 4),
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  external_link TEXT,
  affiliate_provider TEXT,
  affiliate_id TEXT,
  source TEXT NOT NULL DEFAULT 'curated' CHECK (source IN ('curated', 'api', 'partner_feed', 'user_submitted')),
  sponsor_badge TEXT,
  promo_text TEXT,
  cta_text TEXT NOT NULL DEFAULT 'View',
  cta_action TEXT NOT NULL DEFAULT 'view' CHECK (cta_action IN ('book', 'reserve', 'view', 'save')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for recommendation_items
CREATE INDEX IF NOT EXISTS idx_recommendation_items_city ON public.recommendation_items (city);
CREATE INDEX IF NOT EXISTS idx_recommendation_items_type_active ON public.recommendation_items (type, is_active);
CREATE INDEX IF NOT EXISTS idx_recommendation_items_active ON public.recommendation_items (is_active) WHERE is_active = true;

-- RLS for recommendation_items
ALTER TABLE public.recommendation_items ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active items
CREATE POLICY "recommendation_items_select_authenticated"
  ON public.recommendation_items
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only service role (admin) can insert/update/delete
CREATE POLICY "recommendation_items_insert_service"
  ON public.recommendation_items
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "recommendation_items_update_service"
  ON public.recommendation_items
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "recommendation_items_delete_service"
  ON public.recommendation_items
  FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- recommendation_impressions: Track when items are shown to users
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recommendation_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('organic', 'sponsored')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trip_id UUID,
  surface TEXT NOT NULL CHECK (surface IN ('recs_page', 'trip_detail', 'concierge', 'home')),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for impressions
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_item ON public.recommendation_impressions (item_id, created_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_user ON public.recommendation_impressions (user_id, created_at);

-- RLS for impressions
ALTER TABLE public.recommendation_impressions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert impressions
CREATE POLICY "recommendation_impressions_insert_authenticated"
  ON public.recommendation_impressions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only service role can read all impressions (for analytics)
CREATE POLICY "recommendation_impressions_select_service"
  ON public.recommendation_impressions
  FOR SELECT
  TO service_role
  USING (true);

-- ============================================================================
-- recommendation_clicks: Track actions taken on impressions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recommendation_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  impression_id UUID NOT NULL REFERENCES public.recommendation_impressions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('view', 'save', 'book', 'external_link', 'add_to_trip', 'hide')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for clicks
CREATE INDEX IF NOT EXISTS idx_recommendation_clicks_impression ON public.recommendation_clicks (impression_id);

-- RLS for clicks
ALTER TABLE public.recommendation_clicks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert clicks
CREATE POLICY "recommendation_clicks_insert_authenticated"
  ON public.recommendation_clicks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only service role can read all clicks (for analytics)
CREATE POLICY "recommendation_clicks_select_service"
  ON public.recommendation_clicks
  FOR SELECT
  TO service_role
  USING (true);

-- ============================================================================
-- recommendation_feedback: User feedback on recommendations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('organic', 'sponsored')),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('not_interested', 'hide', 'report', 'save', 'love')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_id, feedback_type)
);

-- Indexes for feedback
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user_item ON public.recommendation_feedback (user_id, item_id);

-- RLS for feedback
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

-- Users can manage their own feedback
CREATE POLICY "recommendation_feedback_select_own"
  ON public.recommendation_feedback
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "recommendation_feedback_insert_own"
  ON public.recommendation_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "recommendation_feedback_delete_own"
  ON public.recommendation_feedback
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role can read all feedback (for analytics)
CREATE POLICY "recommendation_feedback_select_service"
  ON public.recommendation_feedback
  FOR SELECT
  TO service_role
  USING (true);

-- ============================================================================
-- recommendation_items_public: Safe public view (strips admin fields)
-- ============================================================================

CREATE OR REPLACE VIEW public.recommendation_items_public AS
SELECT
  id,
  type,
  title,
  description,
  location,
  city,
  country,
  latitude,
  longitude,
  rating,
  price_level,
  images,
  tags,
  external_link,
  source,
  sponsor_badge,
  promo_text,
  cta_text,
  cta_action,
  created_at,
  updated_at
FROM public.recommendation_items
WHERE is_active = true;

-- Updated_at trigger for recommendation_items
CREATE OR REPLACE FUNCTION public.update_recommendation_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_recommendation_items_updated_at
  BEFORE UPDATE ON public.recommendation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_recommendation_items_updated_at();
