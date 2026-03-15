-- Migration: Add shared_inbound_items table for Share Extension intake
-- This table stores normalized shared content from the iOS Share Extension
-- before it is materialized into trip-specific entities (chat, links, tasks, etc.)

CREATE TABLE IF NOT EXISTS public.shared_inbound_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('url', 'plain_text', 'rich_text', 'image', 'pdf', 'file', 'multiple')),
    destination TEXT NOT NULL CHECK (destination IN ('explore_links', 'chat', 'tasks', 'calendar', 'concierge')),
    normalized_url TEXT,
    normalized_text TEXT,
    preview_title TEXT,
    preview_subtitle TEXT,
    user_note TEXT,
    source_app TEXT,
    routing_confidence TEXT CHECK (routing_confidence IN ('high', 'medium', 'low')),
    ingestion_status TEXT NOT NULL DEFAULT 'pending' CHECK (ingestion_status IN ('pending', 'queued', 'uploading', 'processing', 'completed', 'failed')),
    materialized_id UUID,
    materialized_type TEXT,
    dedupe_fingerprint TEXT,
    error_message TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by user + trip
CREATE INDEX IF NOT EXISTS idx_shared_inbound_items_user_trip
    ON public.shared_inbound_items(user_id, trip_id);

-- Index for pending items that need processing
CREATE INDEX IF NOT EXISTS idx_shared_inbound_items_pending
    ON public.shared_inbound_items(ingestion_status)
    WHERE ingestion_status IN ('pending', 'queued', 'processing');

-- Index for dedupe lookups
CREATE INDEX IF NOT EXISTS idx_shared_inbound_items_dedupe
    ON public.shared_inbound_items(dedupe_fingerprint, trip_id)
    WHERE dedupe_fingerprint IS NOT NULL;

-- RLS: Users can only access their own shared items
ALTER TABLE public.shared_inbound_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shared items"
    ON public.shared_inbound_items
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shared items"
    ON public.shared_inbound_items
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shared items"
    ON public.shared_inbound_items
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shared items"
    ON public.shared_inbound_items
    FOR DELETE
    USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_shared_inbound_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shared_inbound_items_updated_at
    BEFORE UPDATE ON public.shared_inbound_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_shared_inbound_items_updated_at();
