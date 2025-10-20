-- Add attachment support columns to trip_chat_messages
ALTER TABLE public.trip_chat_messages
  ADD COLUMN IF NOT EXISTS attachment_type text CHECK (attachment_type IN ('image', 'video', 'file', 'link')),
  ADD COLUMN IF NOT EXISTS attachment_ref_id uuid,
  ADD COLUMN IF NOT EXISTS attachment_url text;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tcm_trip ON public.trip_chat_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_tcm_attachment ON public.trip_chat_messages(attachment_type, attachment_ref_id) WHERE attachment_type IS NOT NULL;

-- Add missing columns to trip_media_index if needed
ALTER TABLE public.trip_media_index
  ADD COLUMN IF NOT EXISTS width integer,
  ADD COLUMN IF NOT EXISTS height integer,
  ADD COLUMN IF NOT EXISTS duration_sec integer,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id);

-- Create indexes for trip_media_index
CREATE INDEX IF NOT EXISTS idx_tmi_trip ON public.trip_media_index(trip_id);
CREATE INDEX IF NOT EXISTS idx_tmi_type ON public.trip_media_index(media_type);
CREATE INDEX IF NOT EXISTS idx_tmi_created ON public.trip_media_index(created_at DESC);

-- Add missing columns to trip_files if needed
ALTER TABLE public.trip_files
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS size_bytes bigint;

-- Create indexes for trip_files
CREATE INDEX IF NOT EXISTS idx_tf_trip ON public.trip_files(trip_id);
CREATE INDEX IF NOT EXISTS idx_tf_created ON public.trip_files(created_at DESC);

-- Add missing columns to trip_link_index if needed
ALTER TABLE public.trip_link_index
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id);

-- Create indexes for trip_link_index
CREATE INDEX IF NOT EXISTS idx_tli_trip ON public.trip_link_index(trip_id);
CREATE INDEX IF NOT EXISTS idx_tli_created ON public.trip_link_index(created_at DESC);

-- Add RLS policies for new columns
ALTER TABLE public.trip_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_media_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_link_index ENABLE ROW LEVEL SECURITY;

-- Policy for trip_chat_messages (users can see messages in trips they're members of)
CREATE POLICY "Users can view messages in their trips" ON public.trip_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_chat_messages.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Policy for trip_media_index
CREATE POLICY "Users can view media in their trips" ON public.trip_media_index
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_media_index.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Policy for trip_files
CREATE POLICY "Users can view files in their trips" ON public.trip_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_files.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Policy for trip_link_index
CREATE POLICY "Users can view links in their trips" ON public.trip_link_index
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_link_index.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Insert policies for authenticated users in their trips
CREATE POLICY "Users can insert messages in their trips" ON public.trip_chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_chat_messages.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert media in their trips" ON public.trip_media_index
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_media_index.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert files in their trips" ON public.trip_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_files.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert links in their trips" ON public.trip_link_index
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_link_index.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Storage bucket policies for advertiser-assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('advertiser-assets', 'advertiser-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their trip folders
CREATE POLICY "Users can upload to their trip folders" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'advertiser-assets' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = SPLIT_PART(name, '/', 1)::uuid
      AND trip_members.user_id = auth.uid()
    )
  );

-- Allow public read access to advertiser-assets
CREATE POLICY "Public read access to advertiser-assets" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'advertiser-assets');