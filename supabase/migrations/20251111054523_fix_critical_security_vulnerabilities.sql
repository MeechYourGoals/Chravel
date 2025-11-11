-- =====================================================
-- CRITICAL SECURITY FIXES
-- Generated: 2025-11-11
-- Addresses: Security Audit Report - Critical Vulnerabilities
-- Scope: RLS Policies, Authentication, Data Access Patterns
-- =====================================================

-- =====================================================
-- FIX 1: trip_files TABLE - ENSURE RLS IS ENABLED
-- Issue: trip_files table may have NO RLS policies
-- Impact: Any authenticated user can read/write/delete ANY file
-- =====================================================

-- Ensure RLS is enabled on trip_files
ALTER TABLE public.trip_files ENABLE ROW LEVEL SECURITY;

-- Drop any existing insecure policies
DROP POLICY IF EXISTS "Anyone can read trip_files" ON public.trip_files;
DROP POLICY IF EXISTS "Anyone can view trip_files" ON public.trip_files;
DROP POLICY IF EXISTS "Owners can insert trip_files" ON public.trip_files;
DROP POLICY IF EXISTS "Owners can update trip_files" ON public.trip_files;
DROP POLICY IF EXISTS "Owners can delete trip_files" ON public.trip_files;

-- Policy: Only trip members can view files
DROP POLICY IF EXISTS "Trip members can read trip_files" ON public.trip_files;
CREATE POLICY "Trip members can read trip_files"
ON public.trip_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = trip_files.trip_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- Policy: Only trip members can upload files
DROP POLICY IF EXISTS "Trip members can upload trip_files" ON public.trip_files;
CREATE POLICY "Trip members can upload trip_files"
ON public.trip_files
FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = trip_files.trip_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- Policy: Only trip members can update files
DROP POLICY IF EXISTS "Trip members can update trip_files" ON public.trip_files;
CREATE POLICY "Trip members can update trip_files"
ON public.trip_files
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = trip_files.trip_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = trip_files.trip_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- Policy: Only trip members can delete files (uploader has priority)
DROP POLICY IF EXISTS "Trip members can delete trip_files" ON public.trip_files;
CREATE POLICY "Trip members can delete trip_files"
ON public.trip_files
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = trip_files.trip_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- =====================================================
-- FIX 2: kb_documents AND kb_chunks - ENSURE ALL POLICIES
-- Issue: Missing INSERT/UPDATE/DELETE policies
-- Impact: Can read documents without proper membership verification
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

-- kb_documents: Ensure SELECT policy exists and is correct
DROP POLICY IF EXISTS "Users can view kb_documents for their trips" ON public.kb_documents;
CREATE POLICY "Users can view kb_documents for their trips"
ON public.kb_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = kb_documents.trip_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- kb_documents: INSERT policy (restrict to trip members)
DROP POLICY IF EXISTS "Users can insert kb_documents for their trips" ON public.kb_documents;
DROP POLICY IF EXISTS "Trip members can insert kb_documents" ON public.kb_documents;
CREATE POLICY "Trip members can insert kb_documents"
ON public.kb_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = kb_documents.trip_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- kb_documents: UPDATE policy
DROP POLICY IF EXISTS "Trip members can update kb_documents" ON public.kb_documents;
CREATE POLICY "Trip members can update kb_documents"
ON public.kb_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = kb_documents.trip_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = kb_documents.trip_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- kb_documents: DELETE policy
DROP POLICY IF EXISTS "Trip members can delete kb_documents" ON public.kb_documents;
CREATE POLICY "Trip members can delete kb_documents"
ON public.kb_documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id::text = kb_documents.trip_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- kb_chunks: Ensure SELECT policy exists
DROP POLICY IF EXISTS "Users can view kb_chunks for their trips" ON public.kb_chunks;
CREATE POLICY "Users can view kb_chunks for their trips"
ON public.kb_chunks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM kb_documents kd
    JOIN trip_members tm ON tm.trip_id::text = kd.trip_id
    WHERE kd.id = kb_chunks.doc_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- kb_chunks: INSERT policy
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
      AND tm.status = 'active'
  )
);

-- kb_chunks: UPDATE policy
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
      AND tm.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kb_documents kd
    JOIN trip_members tm ON tm.trip_id::text = kd.trip_id
    WHERE kd.id = kb_chunks.doc_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- kb_chunks: DELETE policy
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
      AND tm.status = 'active'
  )
);

-- =====================================================
-- FIX 3: Profile PII Exposure - Respect Privacy Flags
-- Issue: Privacy flags (show_email/show_phone) not enforced at RLS level
-- Impact: Users can bypass UI and query database directly for PII
-- =====================================================

-- Create security definer function to safely get profile based on privacy settings
CREATE OR REPLACE FUNCTION public.get_visible_profile_fields(
  profile_user_id UUID,
  viewer_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  bio TEXT,
  show_email BOOLEAN,
  show_phone BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.avatar_url,
    -- Only show email if privacy flag is true OR viewing own profile
    CASE 
      WHEN p.show_email = true OR p.user_id = viewer_id THEN p.email 
      ELSE NULL 
    END AS email,
    -- Only show phone if privacy flag is true OR viewing own profile
    CASE 
      WHEN p.show_phone = true OR p.user_id = viewer_id THEN p.phone 
      ELSE NULL 
    END AS phone,
    -- Only show name if viewing own profile OR they're trip co-members
    CASE 
      WHEN p.user_id = viewer_id THEN p.first_name 
      WHEN EXISTS (
        SELECT 1 FROM trip_members tm1
        JOIN trip_members tm2 ON tm1.trip_id = tm2.trip_id
        WHERE tm1.user_id = viewer_id
          AND tm2.user_id = p.user_id
          AND tm1.status = 'active'
          AND tm2.status = 'active'
      ) THEN p.first_name
      ELSE NULL 
    END AS first_name,
    CASE 
      WHEN p.user_id = viewer_id THEN p.last_name 
      WHEN EXISTS (
        SELECT 1 FROM trip_members tm1
        JOIN trip_members tm2 ON tm1.trip_id = tm2.trip_id
        WHERE tm1.user_id = viewer_id
          AND tm2.user_id = p.user_id
          AND tm1.status = 'active'
          AND tm2.status = 'active'
      ) THEN p.last_name
      ELSE NULL 
    END AS last_name,
    p.bio,
    p.show_email,
    p.show_phone,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.user_id = profile_user_id
    AND (
      p.user_id = viewer_id
      OR EXISTS (
        SELECT 1 FROM trip_members tm1
        JOIN trip_members tm2 ON tm1.trip_id = tm2.trip_id
        WHERE tm1.user_id = viewer_id
          AND tm2.user_id = p.user_id
          AND tm1.status = 'active'
          AND tm2.status = 'active'
      )
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_visible_profile_fields(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visible_profile_fields(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_visible_profile_fields IS 
  'Returns profile fields based on privacy settings. Respects show_email and show_phone flags unless viewing own profile. Only returns profiles for users who are trip co-members or the profile owner.';

-- =====================================================
-- FIX 4: SECURITY DEFINER Functions - Add search_path
-- Issue: Functions missing search_path vulnerable to privilege escalation
-- Impact: Potential search_path manipulation attacks
-- =====================================================

-- Fix auto_process_document function (from 20251107001035 migration)
CREATE OR REPLACE FUNCTION auto_process_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger for document file types
  IF NEW.file_type IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                        'application/msword', 'text/plain', 'image/jpeg', 'image/png', 'image/jpg') THEN
    
    -- Set initial processing status
    NEW.processing_status := 'queued';
    
    -- Trigger edge function asynchronously (we'll implement this via pg_net in production)
    -- For now, just log and mark as queued
    RAISE NOTICE 'Document queued for processing: %, file_id: %', NEW.file_name, NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix hybrid_search_trip_context function (from 20251107001035 migration)
CREATE OR REPLACE FUNCTION hybrid_search_trip_context(
  p_trip_id text,
  p_query_text text,
  p_query_embedding vector,
  p_match_threshold float DEFAULT 0.6,
  p_match_count integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  content_text text,
  similarity float,
  metadata jsonb,
  rank float,
  search_type text
)
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT 
      te.id,
      te.source_type,
      te.source_id,
      te.content_text,
      1 - (te.embedding <=> p_query_embedding) AS similarity,
      te.metadata,
      0.7 AS weight,
      'vector'::text AS search_type
    FROM trip_embeddings te
    WHERE te.trip_id = p_trip_id
      AND te.embedding IS NOT NULL
      AND 1 - (te.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY similarity DESC
    LIMIT p_match_count
  ),
  keyword_results AS (
    SELECT 
      kd.id,
      kd.source AS source_type,
      kd.source_id,
      kc.content AS content_text,
      0.0 AS similarity,
      kd.metadata,
      0.3 AS weight,
      'keyword'::text AS search_type
    FROM kb_chunks kc
    JOIN kb_documents kd ON kd.id = kc.doc_id
    WHERE kd.trip_id = p_trip_id
      AND kc.content_tsv @@ plainto_tsquery('english', p_query_text)
    ORDER BY ts_rank(kc.content_tsv, plainto_tsquery('english', p_query_text)) DESC
    LIMIT p_match_count / 2
  ),
  combined AS (
    SELECT *, vector_results.similarity * vector_results.weight AS rank
    FROM vector_results
    UNION ALL
    SELECT *, keyword_results.weight AS rank
    FROM keyword_results
  )
  SELECT 
    combined.id,
    combined.source_type,
    combined.source_id,
    combined.content_text,
    combined.similarity,
    combined.metadata,
    combined.rank,
    combined.search_type
  FROM combined
  ORDER BY rank DESC, similarity DESC
  LIMIT p_match_count;
END;
$$;

-- Fix match_kb_chunks function (if it exists)
CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  p_trip_id text,
  p_query_embedding vector,
  p_match_threshold float DEFAULT 0.6,
  p_match_count integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  doc_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id,
    kc.doc_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> p_query_embedding) AS similarity
  FROM kb_chunks kc
  JOIN kb_documents kd ON kd.id = kc.doc_id
  WHERE kd.trip_id = p_trip_id
    AND kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY similarity DESC
  LIMIT p_match_count;
END;
$$;

-- Fix update_updated_at_kb_documents function (if it exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_kb_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix get_safe_profile function (from 20251009200510 migration)
CREATE OR REPLACE FUNCTION public.get_safe_profile(profile_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  phone TEXT,
  show_email BOOLEAN,
  show_phone BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at,
    p.updated_at,
    p.email,
    p.phone,
    p.show_email,
    p.show_phone
  FROM profiles p
  WHERE p.user_id = profile_user_id;
END;
$$;

-- Fix check_profile_visibility function
CREATE OR REPLACE FUNCTION public.check_profile_visibility(viewer_id UUID, profile_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM trip_members tm1
    INNER JOIN trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = viewer_id 
      AND tm2.user_id = profile_user_id
      AND tm1.status = 'active'
      AND tm2.status = 'active'
  ) OR viewer_id = profile_user_id;
$$;

-- Fix increment_audio_summary_count function (from 001_audio_summaries.sql)
CREATE OR REPLACE FUNCTION increment_audio_summary_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET audio_summary_count = COALESCE(audio_summary_count, 0) + 1
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Fix check_audio_summary_limit function (from 001_audio_summaries.sql)
CREATE OR REPLACE FUNCTION check_audio_summary_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COALESCE(audio_summary_count, 0) INTO user_count
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  IF user_count >= 10 THEN
    RAISE EXCEPTION 'Audio summary limit reached for this user';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix increment_concierge_message_count function (from 20250115000002_ai_conversations_table.sql)
CREATE OR REPLACE FUNCTION increment_concierge_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE concierge_usage
    SET 
      message_count = message_count + 1,
      last_message_at = NOW()
    WHERE user_id = NEW.user_id AND trip_id = NEW.trip_id;
    
    IF NOT FOUND THEN
      INSERT INTO concierge_usage (user_id, trip_id, message_count, last_message_at)
      VALUES (NEW.user_id, NEW.trip_id, 1, NOW());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix increment_concierge_usage function (from 20250120000002_ai_concierge_usage_tracking.sql)
CREATE OR REPLACE FUNCTION public.increment_concierge_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO concierge_usage (user_id, trip_id, message_count, last_message_at)
  VALUES (NEW.user_id, NEW.trip_id, 1, NOW())
  ON CONFLICT (user_id, trip_id)
  DO UPDATE SET
    message_count = concierge_usage.message_count + 1,
    last_message_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix get_user_concierge_usage function (from 20250120000002_ai_concierge_usage_tracking.sql)
CREATE OR REPLACE FUNCTION public.get_user_concierge_usage(p_user_id UUID, p_trip_id TEXT)
RETURNS TABLE (
  message_count INTEGER,
  last_message_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT cu.message_count, cu.last_message_at
  FROM concierge_usage cu
  WHERE cu.user_id = p_user_id AND cu.trip_id = p_trip_id;
END;
$$;

-- Fix check_trip_access function
CREATE OR REPLACE FUNCTION public.check_trip_access(p_user_id UUID, p_trip_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members
    WHERE user_id = p_user_id 
      AND trip_id = p_trip_id 
      AND status = 'active'
  );
$$;

-- Fix is_trip_creator function
CREATE OR REPLACE FUNCTION public.is_trip_creator(p_user_id UUID, p_trip_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips
    WHERE id = p_trip_id AND creator_id = p_user_id
  );
$$;

-- =====================================================
-- VERIFICATION QUERIES (for manual testing)
-- =====================================================

-- Uncomment these to verify fixes:
-- 
-- -- 1. Verify trip_files RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'trip_files';
-- -- Should show rowsecurity = true
--
-- -- 2. Verify trip_files policies exist
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'trip_files';
-- -- Should show 4 policies: SELECT, INSERT, UPDATE, DELETE
--
-- -- 3. Verify kb_documents policies exist
-- SELECT policyname, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'kb_documents';
-- -- Should show 4 policies: SELECT, INSERT, UPDATE, DELETE
--
-- -- 4. Verify kb_chunks policies exist
-- SELECT policyname, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'kb_chunks';
-- -- Should show 4 policies: SELECT, INSERT, UPDATE, DELETE
--
-- -- 5. Verify get_visible_profile_fields function exists
-- SELECT proname, proconfig 
-- FROM pg_proc 
-- WHERE proname = 'get_visible_profile_fields';
-- -- Should return 1 row with search_path in proconfig
--
-- -- 6. Check all SECURITY DEFINER functions have search_path
-- SELECT 
--   p.proname,
--   CASE 
--     WHEN p.proconfig IS NULL THEN 'MISSING search_path'
--     WHEN array_to_string(p.proconfig, ',') LIKE '%search_path%' THEN 'HAS search_path'
--     ELSE 'MISSING search_path'
--   END as search_path_status
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE p.prosecdef = true  -- SECURITY DEFINER
--   AND n.nspname = 'public'
-- ORDER BY proname;
-- -- All should show 'HAS search_path'
