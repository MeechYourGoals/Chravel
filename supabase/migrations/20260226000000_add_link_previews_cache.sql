-- Create link_previews table for caching URL metadata
CREATE TABLE IF NOT EXISTS public.link_previews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL UNIQUE,
    url_hash TEXT NOT NULL,
    title TEXT,
    description TEXT,
    image_url TEXT,
    favicon_url TEXT,
    site_name TEXT,
    resolved_url TEXT,
    content_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('ok', 'error', 'pending')) DEFAULT 'pending',
    error_reason TEXT
);

-- Index on url_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_link_previews_url_hash ON public.link_previews(url_hash);
CREATE INDEX IF NOT EXISTS idx_link_previews_expires_at ON public.link_previews(expires_at);

-- Enable RLS
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;

-- Policies
-- Authenticated users can read valid previews
CREATE POLICY "Authenticated users can read link previews"
    ON public.link_previews
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role has full access (for Edge Functions)
-- (Implicitly true for service role, but good to be explicit if we were locking it down further,
-- but Supabase service role bypasses RLS anyway. So we just need to ensure users can't write garbage.)

-- We might want to allow users to insert 'pending' records if we want to use the DB as a queue,
-- but the plan says the Edge Function handles fetching.
-- So we will NOT allow users to INSERT/UPDATE directly for now.
-- The Edge Function will handle population.

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_link_previews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_link_previews_updated_at
    BEFORE UPDATE ON public.link_previews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_link_previews_updated_at();
