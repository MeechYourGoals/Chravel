-- Fix: Enable REPLICA IDENTITY FULL on trip_join_requests so that
-- Supabase Realtime delivers full old-row data in UPDATE payloads.
-- Without this, payload.old only contains the primary key, breaking
-- the approval->dashboard refresh path in useUserTripsRealtime.ts.
--
-- Root cause: The realtime handler checked payload.old.status === 'pending'
-- but with REPLICA IDENTITY DEFAULT, payload.old lacked the status field,
-- so the trips query was never invalidated on approval.
ALTER TABLE public.trip_join_requests REPLICA IDENTITY FULL;
