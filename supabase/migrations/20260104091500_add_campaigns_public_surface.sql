-- Create a safe public surface for campaigns (ad creative only).
-- Rationale: we removed anon SELECT on public.campaigns to protect budgets/targeting/metrics,
-- but we still need anonymous clients to display ads. This derived table exposes only the
-- fields that are intentionally public, and stays in sync via triggers.

-- Public-facing campaigns (creative only; no advertiser_id, budgets, or performance metrics)
CREATE TABLE IF NOT EXISTS public.campaigns_public (
  campaign_id UUID PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  discount_details TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  destination_info JSONB,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.campaigns_public ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads of *active* public campaigns only (for ad display)
DROP POLICY IF EXISTS "campaigns_public_select_active" ON public.campaigns_public;
CREATE POLICY "campaigns_public_select_active"
  ON public.campaigns_public FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW())
  );

-- Ensure PostgREST roles can read the table (RLS still applies)
GRANT SELECT ON public.campaigns_public TO anon, authenticated;

-- Keep campaigns_public in sync with campaigns
CREATE OR REPLACE FUNCTION public.sync_campaigns_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.campaigns_public WHERE campaign_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.campaigns_public (
    campaign_id,
    name,
    description,
    discount_details,
    images,
    destination_info,
    tags,
    status,
    start_date,
    end_date,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.name,
    NEW.description,
    NEW.discount_details,
    NEW.images,
    NEW.destination_info,
    NEW.tags,
    NEW.status,
    NEW.start_date,
    NEW.end_date,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (campaign_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    discount_details = EXCLUDED.discount_details,
    images = EXCLUDED.images,
    destination_info = EXCLUDED.destination_info,
    tags = EXCLUDED.tags,
    status = EXCLUDED.status,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_campaigns_public ON public.campaigns;
CREATE TRIGGER trigger_sync_campaigns_public
AFTER INSERT OR UPDATE OR DELETE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.sync_campaigns_public();

-- Backfill existing campaigns into campaigns_public (idempotent)
INSERT INTO public.campaigns_public (
  campaign_id,
  name,
  description,
  discount_details,
  images,
  destination_info,
  tags,
  status,
  start_date,
  end_date,
  created_at,
  updated_at
)
SELECT
  c.id,
  c.name,
  c.description,
  c.discount_details,
  c.images,
  c.destination_info,
  c.tags,
  c.status,
  c.start_date,
  c.end_date,
  c.created_at,
  c.updated_at
FROM public.campaigns c
ON CONFLICT (campaign_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  discount_details = EXCLUDED.discount_details,
  images = EXCLUDED.images,
  destination_info = EXCLUDED.destination_info,
  tags = EXCLUDED.tags,
  status = EXCLUDED.status,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

