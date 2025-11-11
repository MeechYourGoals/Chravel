-- =====================================================
-- SUPABASE-NATIVE DOCUMENT PROCESSING PIPELINE
-- Replicates Google File Search capabilities
-- =====================================================

-- Step 1: Enhance trip_files table with processing metadata
ALTER TABLE trip_files
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS content_text text,
ADD COLUMN IF NOT EXISTS ai_summary text,
ADD COLUMN IF NOT EXISTS chunk_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ocr_confidence numeric,
ADD COLUMN IF NOT EXISTS extracted_entities jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS file_structure jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS error_message text;

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_trip_files_processing_status ON trip_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_trip_files_trip_id_status ON trip_files(trip_id, processing_status);

-- Step 2: Create enhanced kb_documents with better metadata
-- (kb_documents already exists, just add indexes if missing)
CREATE INDEX IF NOT EXISTS idx_kb_documents_trip_source ON kb_documents(trip_id, source);
CREATE INDEX IF NOT EXISTS idx_kb_documents_source_id ON kb_documents(source_id);

-- Step 3: Add full-text search capability to kb_chunks
ALTER TABLE kb_chunks
ADD COLUMN IF NOT EXISTS content_tsv tsvector
GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_kb_chunks_content_tsv ON kb_chunks USING gin(content_tsv);

-- Step 4: Create trigger to auto-process uploaded files
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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_process_document ON trip_files;
CREATE TRIGGER trigger_auto_process_document
  BEFORE INSERT ON trip_files
  FOR EACH ROW
  EXECUTE FUNCTION auto_process_document();

-- Step 5: Create hybrid search function (vector + keyword)
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
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: Validate that the calling user is a member of the trip
  IF NOT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of this trip';
  END IF;

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

-- Step 6: Add comment documentation
COMMENT ON COLUMN trip_files.processing_status IS 'Status: pending, queued, processing, completed, failed';
COMMENT ON COLUMN trip_files.content_text IS 'Extracted plain text from document';
COMMENT ON COLUMN trip_files.ai_summary IS 'AI-generated summary of document content';
COMMENT ON COLUMN trip_files.chunk_count IS 'Number of chunks created from this document';
COMMENT ON COLUMN trip_files.ocr_confidence IS 'OCR confidence score (0-1) for image-based documents';
COMMENT ON COLUMN trip_files.extracted_entities IS 'Entities extracted: dates, locations, amounts, names, etc';
COMMENT ON COLUMN trip_files.file_structure IS 'Document structure: pages, sections, headings, etc';
COMMENT ON FUNCTION hybrid_search_trip_context IS 'Hybrid search combining vector similarity and keyword matching with re-ranking. Validates trip membership before allowing search access.';