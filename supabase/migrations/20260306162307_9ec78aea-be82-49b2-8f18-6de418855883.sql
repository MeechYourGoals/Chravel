
-- Migration: Smart Import - gmail_accounts table + is_all_day column on trip_events
-- Purpose: Support Gmail OAuth integration for Smart Import and formalize all-day event support

-- 1. Create gmail_accounts table for storing connected Gmail OAuth accounts
CREATE TABLE IF NOT EXISTS public.gmail_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Enable RLS
ALTER TABLE public.gmail_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connected accounts
CREATE POLICY "Users can view own gmail accounts"
  ON public.gmail_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own accounts
CREATE POLICY "Users can insert own gmail accounts"
  ON public.gmail_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own accounts
CREATE POLICY "Users can update own gmail accounts"
  ON public.gmail_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own accounts
CREATE POLICY "Users can delete own gmail accounts"
  ON public.gmail_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_user_id ON public.gmail_accounts(user_id);

-- Updated_at trigger
CREATE TRIGGER update_gmail_accounts_updated_at
  BEFORE UPDATE ON public.gmail_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add is_all_day column to trip_events (currently bridged via source_data JSON)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trip_events' AND column_name = 'is_all_day'
  ) THEN
    ALTER TABLE public.trip_events ADD COLUMN is_all_day BOOLEAN DEFAULT false;
  END IF;
END $$;
