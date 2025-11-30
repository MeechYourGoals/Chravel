-- Fix task display: Add foreign key constraint for creator profile lookup
-- Migration: Add foreign key from trip_tasks.creator_id to profiles.user_id
-- Date: 2025-01-29

-- Add foreign key constraint to enable proper creator profile joins
ALTER TABLE public.trip_tasks
ADD CONSTRAINT trip_tasks_creator_id_fkey
FOREIGN KEY (creator_id)
REFERENCES public.profiles(user_id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_trip_tasks_creator_id 
ON public.trip_tasks(creator_id);

COMMENT ON CONSTRAINT trip_tasks_creator_id_fkey ON public.trip_tasks IS 
  'Enables Supabase embedded resource syntax for creator profile joins';