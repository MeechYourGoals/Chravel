ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS chat_mode text NOT NULL DEFAULT 'broadcasts'
    CHECK (chat_mode IN ('broadcasts', 'admin_only', 'everyone')),
  ADD COLUMN IF NOT EXISTS media_upload_mode text NOT NULL DEFAULT 'admin_only'
    CHECK (media_upload_mode IN ('admin_only', 'everyone'));