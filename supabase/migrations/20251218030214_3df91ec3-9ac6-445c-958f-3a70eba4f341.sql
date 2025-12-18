-- Drop the existing non-unique index
DROP INDEX IF EXISTS idx_trip_members_trip_user;

-- Add unique constraint on (trip_id, user_id) to allow ON CONFLICT to work
ALTER TABLE public.trip_members
ADD CONSTRAINT trip_members_trip_id_user_id_key UNIQUE (trip_id, user_id);