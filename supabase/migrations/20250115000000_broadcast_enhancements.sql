-- Broadcast Enhancements Migration
-- Adds read receipts, rich content support, and scheduled broadcast infrastructure

-- 1. Create broadcast_views table for read receipt tracking
CREATE TABLE IF NOT EXISTS public.broadcast_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(broadcast_id, user_id)
);

-- Enable RLS
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for broadcast_views
CREATE POLICY "Users can view their own broadcast views"
ON public.broadcast_views
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create broadcast views"
ON public.broadcast_views
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM broadcasts b
    JOIN trip_members tm ON tm.trip_id = b.trip_id
    WHERE b.id = broadcast_views.broadcast_id 
    AND tm.user_id = auth.uid()
  )
);

-- Trip members can view read receipts for broadcasts in their trips
CREATE POLICY "Trip members can view broadcast read receipts"
ON public.broadcast_views
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM broadcasts b
    JOIN trip_members tm ON tm.trip_id = b.trip_id
    WHERE b.id = broadcast_views.broadcast_id 
    AND tm.user_id = auth.uid()
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_broadcast_views_broadcast_id ON public.broadcast_views(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_views_user_id ON public.broadcast_views(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_views_viewed_at ON public.broadcast_views(viewed_at DESC);

-- 2. Add rich content columns to broadcasts table (if not exists)
DO $$ 
BEGIN
  -- Add attachment_urls column for images/videos/files
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'broadcasts' AND column_name = 'attachment_urls'
  ) THEN
    ALTER TABLE public.broadcasts 
    ADD COLUMN attachment_urls JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Ensure metadata column exists (should already exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'broadcasts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.broadcasts 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 3. Add index for scheduled broadcasts (for cron job efficiency)
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled_for 
ON public.broadcasts(scheduled_for) 
WHERE scheduled_for IS NOT NULL AND is_sent = false;

-- 4. Add index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_broadcasts_priority 
ON public.broadcasts(priority, created_at DESC);

-- 5. Function to mark broadcast as viewed (for read receipts)
CREATE OR REPLACE FUNCTION public.mark_broadcast_viewed(broadcast_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.broadcast_views (broadcast_id, user_id, viewed_at)
  VALUES (broadcast_uuid, auth.uid(), now())
  ON CONFLICT (broadcast_id, user_id) 
  DO UPDATE SET viewed_at = now();
END;
$$;

-- 6. Function to get read receipt counts for a broadcast
CREATE OR REPLACE FUNCTION public.get_broadcast_read_count(broadcast_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  read_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO read_count
  FROM public.broadcast_views
  WHERE broadcast_id = broadcast_uuid;
  
  RETURN read_count;
END;
$$;

-- 7. View for broadcast statistics (read receipts, reaction counts)
CREATE OR REPLACE VIEW public.broadcast_stats AS
SELECT 
  b.id as broadcast_id,
  b.trip_id,
  COUNT(DISTINCT bv.user_id) as read_count,
  COUNT(DISTINCT br.user_id) as reaction_count,
  COUNT(DISTINCT CASE WHEN br.reaction_type = 'coming' THEN br.user_id END) as coming_count,
  COUNT(DISTINCT CASE WHEN br.reaction_type = 'wait' THEN br.user_id END) as wait_count,
  COUNT(DISTINCT CASE WHEN br.reaction_type = 'cant' THEN br.user_id END) as cant_count
FROM public.broadcasts b
LEFT JOIN public.broadcast_views bv ON b.id = bv.broadcast_id
LEFT JOIN public.broadcast_reactions br ON b.id = br.broadcast_id
GROUP BY b.id, b.trip_id;

-- Grant access to view
GRANT SELECT ON public.broadcast_stats TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.broadcast_views IS 'Tracks when users view broadcasts for read receipt functionality';
COMMENT ON COLUMN public.broadcasts.attachment_urls IS 'JSON array of attachment URLs (images, videos, files)';
COMMENT ON COLUMN public.broadcasts.scheduled_for IS 'Timestamp when broadcast should be sent (null = send immediately)';
COMMENT ON COLUMN public.broadcasts.priority IS 'Priority level: fyi, reminder, urgent (affects push notification behavior)';
