-- =====================================================
-- SUPABASE MVP READINESS FIXES
-- Created: 2025-02-01
-- Purpose: Fix critical RLS policy gaps, add missing indexes,
--          and improve database security for production MVP
-- =====================================================

-- =====================================================
-- PART 1: FIX trip_files RLS POLICIES
-- Issue: Migration 20250807200405 has weak policy allowing anyone to read
-- Fix: Replace with proper trip membership check
-- =====================================================

-- Drop the insecure policy if it exists
DROP POLICY IF EXISTS "Anyone can read trip_files" ON public.trip_files;

-- Create secure RLS policy: Only trip members can read files
CREATE POLICY "Trip members can read trip_files"
ON public.trip_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = trip_files.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Ensure UPDATE policy checks trip membership (not just ownership)
DROP POLICY IF EXISTS "Owners can update trip_files" ON public.trip_files;

CREATE POLICY "Trip members can update trip_files"
ON public.trip_files
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = trip_files.trip_id
    AND tm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = trip_files.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Ensure DELETE policy checks trip membership
DROP POLICY IF EXISTS "Owners can delete trip_files" ON public.trip_files;

CREATE POLICY "Trip members can delete trip_files"
ON public.trip_files
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = trip_files.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- =====================================================
-- PART 2: ENHANCE trip_payment_messages RLS POLICIES
-- Issue: INSERT policy doesn't validate split_participants are trip members
-- Fix: Add validation function and enhance policy
-- =====================================================

-- Function to validate that all split participants are trip members
CREATE OR REPLACE FUNCTION validate_payment_split_participants(
  p_trip_id text,
  p_split_participants jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_id uuid;
  participant_count integer;
  valid_count integer;
BEGIN
  -- Extract user IDs from JSONB array
  -- Expected format: [{"user_id": "uuid", ...}, ...]
  SELECT COUNT(*)
  INTO participant_count
  FROM jsonb_array_elements(p_split_participants) AS elem;

  -- Validate each participant is a trip member
  SELECT COUNT(*)
  INTO valid_count
  FROM jsonb_array_elements(p_split_participants) AS elem
  WHERE EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = p_trip_id
    AND tm.user_id::text = elem->>'user_id'
  );

  -- All participants must be valid trip members
  RETURN participant_count = valid_count AND participant_count > 0;
END;
$$;

-- Enhance INSERT policy to validate split participants
DROP POLICY IF EXISTS "Trip members can create payment messages" ON public.trip_payment_messages;

CREATE POLICY "Trip members can create payment messages"
ON public.trip_payment_messages
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = trip_payment_messages.trip_id
    AND tm.user_id = auth.uid()
  )
  AND validate_payment_split_participants(
    trip_payment_messages.trip_id,
    trip_payment_messages.split_participants
  )
);

-- Add UPDATE policy validation
DROP POLICY IF EXISTS "Payment creators can update their messages" ON public.trip_payment_messages;

CREATE POLICY "Payment creators can update their messages"
ON public.trip_payment_messages
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (
  auth.uid() = created_by
  AND validate_payment_split_participants(
    trip_payment_messages.trip_id,
    trip_payment_messages.split_participants
  )
);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_payment_split_participants(text, jsonb) TO authenticated;

-- =====================================================
-- PART 3: ADD MISSING INDEXES FOR COMMON QUERIES
-- Issue: Missing composite indexes for common query patterns
-- Fix: Add optimized indexes
-- =====================================================

-- Index for trip_chat_messages: trip_id + created_at (most common query pattern)
-- Note: This may already exist, but ensure it's optimized
CREATE INDEX IF NOT EXISTS idx_trip_chat_messages_trip_created_optimized
ON public.trip_chat_messages(trip_id, created_at DESC)
WHERE trip_id IS NOT NULL;

-- Index for trip_files: trip_id + processing_status (for filtering pending files)
CREATE INDEX IF NOT EXISTS idx_trip_files_trip_status_optimized
ON public.trip_files(trip_id, processing_status)
WHERE trip_id IS NOT NULL AND processing_status IS NOT NULL;

-- Index for trip_payment_messages: trip_id + created_at (for chronological listing)
CREATE INDEX IF NOT EXISTS idx_trip_payment_messages_trip_created
ON public.trip_payment_messages(trip_id, created_at DESC)
WHERE trip_id IS NOT NULL;

-- Index for trip_payment_messages: trip_id + is_settled (for filtering unsettled payments)
CREATE INDEX IF NOT EXISTS idx_trip_payment_messages_trip_settled
ON public.trip_payment_messages(trip_id, is_settled)
WHERE trip_id IS NOT NULL;

-- =====================================================
-- PART 4: ADD MISSING UPDATE/DELETE POLICIES FOR kb_documents
-- Issue: kb_documents only has SELECT and INSERT policies
-- Fix: Add UPDATE and DELETE policies for completeness
-- =====================================================

-- Add UPDATE policy for kb_documents (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Trip members can update kb_documents" ON public.kb_documents;

CREATE POLICY "Trip members can update kb_documents"
ON public.kb_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = kb_documents.trip_id
    AND tm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = kb_documents.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Add DELETE policy for kb_documents
DROP POLICY IF EXISTS "Trip members can delete kb_documents" ON public.kb_documents;

CREATE POLICY "Trip members can delete kb_documents"
ON public.kb_documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = kb_documents.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Add INSERT policy for kb_chunks (if missing)
DROP POLICY IF EXISTS "Trip members can insert kb_chunks" ON public.kb_chunks;

CREATE POLICY "Trip members can insert kb_chunks"
ON public.kb_chunks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kb_documents kd
    JOIN trip_members tm ON tm.trip_id::text = kd.trip_id
    WHERE kd.id = kb_chunks.doc_id
    AND tm.user_id = auth.uid()
  )
);

-- Add UPDATE policy for kb_chunks
DROP POLICY IF EXISTS "Trip members can update kb_chunks" ON public.kb_chunks;

CREATE POLICY "Trip members can update kb_chunks"
ON public.kb_chunks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM kb_documents kd
    JOIN trip_members tm ON tm.trip_id::text = kd.trip_id
    WHERE kd.id = kb_chunks.doc_id
    AND tm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kb_documents kd
    JOIN trip_members tm ON tm.trip_id::text = kd.trip_id
    WHERE kd.id = kb_chunks.doc_id
    AND tm.user_id = auth.uid()
  )
);

-- Add DELETE policy for kb_chunks
DROP POLICY IF EXISTS "Trip members can delete kb_chunks" ON public.kb_chunks;

CREATE POLICY "Trip members can delete kb_chunks"
ON public.kb_chunks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM kb_documents kd
    JOIN trip_members tm ON tm.trip_id::text = kd.trip_id
    WHERE kd.id = kb_chunks.doc_id
    AND tm.user_id = auth.uid()
  )
);

-- =====================================================
-- PART 5: DOCUMENTATION COMMENTS
-- =====================================================

COMMENT ON FUNCTION validate_payment_split_participants IS 
'Validates that all participants in a payment split are members of the trip. 
Returns true if all participants are valid trip members, false otherwise.
Used by RLS policies to prevent invalid payment splits.';

COMMENT ON INDEX idx_trip_chat_messages_trip_created_optimized IS
'Optimized index for querying chat messages by trip in chronological order.
Most common query pattern: SELECT * FROM trip_chat_messages WHERE trip_id = ? ORDER BY created_at DESC';

COMMENT ON INDEX idx_trip_files_trip_status_optimized IS
'Optimized index for filtering files by trip and processing status.
Common query: SELECT * FROM trip_files WHERE trip_id = ? AND processing_status = ?';

COMMENT ON INDEX idx_trip_payment_messages_trip_created IS
'Index for chronological listing of payment messages by trip.
Common query: SELECT * FROM trip_payment_messages WHERE trip_id = ? ORDER BY created_at DESC';

COMMENT ON INDEX idx_trip_payment_messages_trip_settled IS
'Index for filtering settled/unsettled payments by trip.
Common query: SELECT * FROM trip_payment_messages WHERE trip_id = ? AND is_settled = false';
