-- Add new columns to existing user_preferences table for system message visibility
ALTER TABLE public.user_preferences 
  ADD COLUMN IF NOT EXISTS show_system_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS system_message_categories jsonb NOT NULL DEFAULT '{
    "member": true,
    "basecamp": true,
    "uploads": true,
    "polls": true,
    "calendar": true,
    "tasks": false,
    "payments": false
  }'::jsonb;

-- Fix function search_path for security
CREATE OR REPLACE FUNCTION public.update_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;