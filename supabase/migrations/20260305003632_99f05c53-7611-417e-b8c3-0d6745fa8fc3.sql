
-- Create dashboard_card_order table for cross-device card order persistence
CREATE TABLE IF NOT EXISTS public.dashboard_card_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_type text NOT NULL CHECK (dashboard_type IN ('my_trips', 'pro', 'events')),
  ordered_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dashboard_type)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_dashboard_card_order_user_id ON public.dashboard_card_order(user_id);

-- Enable RLS
ALTER TABLE public.dashboard_card_order ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own rows
CREATE POLICY "Users can read own card order"
  ON public.dashboard_card_order FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own card order"
  ON public.dashboard_card_order FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own card order"
  ON public.dashboard_card_order FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
