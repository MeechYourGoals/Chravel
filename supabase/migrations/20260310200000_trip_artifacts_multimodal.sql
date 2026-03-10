-- =====================================================
-- TRIP ARTIFACTS: Multimodal Retrieval Layer
-- Gemini Embedding 2 — text, image, PDF in unified 1536-dim space
-- =====================================================

-- 1. Create trip_artifacts table for multimodal artifact storage
CREATE TABLE IF NOT EXISTS trip_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source and content metadata
  source_type TEXT NOT NULL CHECK (source_type IN (
    'upload', 'gmail_import', 'smart_import', 'chat_attachment', 'link_extract', 'manual'
  )),
  mime_type TEXT,
  file_name TEXT,
  file_url TEXT,
  file_size_bytes INTEGER,

  -- Classification
  artifact_type TEXT NOT NULL DEFAULT 'unknown' CHECK (artifact_type IN (
    'flight', 'hotel', 'restaurant_reservation', 'event_ticket',
    'itinerary', 'schedule', 'place_recommendation', 'payment_proof',
    'roster', 'credential', 'generic_document', 'generic_image', 'unknown'
  )),
  artifact_type_confidence FLOAT DEFAULT 0.0,
  classification_method TEXT CHECK (classification_method IN (
    'deterministic', 'embedding', 'llm', 'user_override'
  )),

  -- Extracted content
  extracted_text TEXT,
  extracted_entities JSONB DEFAULT '{}'::jsonb,
  ai_summary TEXT,

  -- Embedding
  embedding extensions.vector(1536),
  embedding_model TEXT DEFAULT 'gemini-embedding-exp-03-07',
  embedding_dimensions INTEGER DEFAULT 1536,
  embedding_status TEXT NOT NULL DEFAULT 'pending' CHECK (embedding_status IN (
    'pending', 'processing', 'completed', 'failed', 'skipped'
  )),
  embedding_error TEXT,
  embedding_input_modality TEXT CHECK (embedding_input_modality IN (
    'text', 'image', 'pdf', 'audio', 'video'
  )),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  parent_artifact_id UUID REFERENCES trip_artifacts(id) ON DELETE SET NULL,
  chunk_index INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_trip_artifacts_trip_id ON trip_artifacts(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_artifacts_creator ON trip_artifacts(creator_id);
CREATE INDEX IF NOT EXISTS idx_trip_artifacts_type ON trip_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_trip_artifacts_source ON trip_artifacts(source_type);
CREATE INDEX IF NOT EXISTS idx_trip_artifacts_status ON trip_artifacts(embedding_status);
CREATE INDEX IF NOT EXISTS idx_trip_artifacts_parent ON trip_artifacts(parent_artifact_id);
CREATE INDEX IF NOT EXISTS idx_trip_artifacts_trip_type ON trip_artifacts(trip_id, artifact_type);

-- Vector similarity index (IVFFlat for moderate corpus sizes)
-- Use lists=50 initially; scale to lists=100+ as corpus grows
CREATE INDEX IF NOT EXISTS idx_trip_artifacts_vector
  ON trip_artifacts
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 50);

-- 3. Updated_at trigger
CREATE TRIGGER update_trip_artifacts_updated_at
  BEFORE UPDATE ON trip_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS
ALTER TABLE trip_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view artifacts"
  ON trip_artifacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trip_artifacts.trip_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can insert artifacts"
  ON trip_artifacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trip_artifacts.trip_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Artifact creator can update own artifacts"
  ON trip_artifacts FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Artifact creator can delete own artifacts"
  ON trip_artifacts FOR DELETE
  USING (creator_id = auth.uid());

-- Service role bypass for edge functions
CREATE POLICY "Service role full access to artifacts"
  ON trip_artifacts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5. Semantic search RPC
CREATE OR REPLACE FUNCTION search_trip_artifacts(
  p_trip_id TEXT,
  p_query_embedding extensions.vector(1536),
  p_match_threshold FLOAT DEFAULT 0.5,
  p_match_count INT DEFAULT 10,
  p_artifact_types TEXT[] DEFAULT NULL,
  p_source_types TEXT[] DEFAULT NULL,
  p_created_after TIMESTAMPTZ DEFAULT NULL,
  p_created_before TIMESTAMPTZ DEFAULT NULL,
  p_creator_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  trip_id TEXT,
  artifact_type TEXT,
  source_type TEXT,
  file_name TEXT,
  extracted_text TEXT,
  ai_summary TEXT,
  similarity FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  creator_id UUID
)
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Security: caller must be trip member
  IF NOT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = p_trip_id
      AND trip_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a trip member';
  END IF;

  RETURN QUERY
  SELECT
    ta.id,
    ta.trip_id,
    ta.artifact_type,
    ta.source_type,
    ta.file_name,
    ta.extracted_text,
    ta.ai_summary,
    (1 - (ta.embedding <=> p_query_embedding))::FLOAT AS similarity,
    ta.metadata,
    ta.created_at,
    ta.creator_id
  FROM trip_artifacts ta
  WHERE ta.trip_id = p_trip_id
    AND ta.embedding IS NOT NULL
    AND ta.embedding_status = 'completed'
    AND (1 - (ta.embedding <=> p_query_embedding)) > p_match_threshold
    AND (p_artifact_types IS NULL OR ta.artifact_type = ANY(p_artifact_types))
    AND (p_source_types IS NULL OR ta.source_type = ANY(p_source_types))
    AND (p_created_after IS NULL OR ta.created_at >= p_created_after)
    AND (p_created_before IS NULL OR ta.created_at <= p_created_before)
    AND (p_creator_id IS NULL OR ta.creator_id = p_creator_id)
  ORDER BY similarity DESC
  LIMIT p_match_count;
END;
$$;

-- 6. Find duplicate artifacts RPC
CREATE OR REPLACE FUNCTION find_similar_artifacts(
  p_trip_id TEXT,
  p_artifact_id UUID,
  p_threshold FLOAT DEFAULT 0.85,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  artifact_type TEXT,
  file_name TEXT,
  ai_summary TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_embedding extensions.vector(1536);
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = p_trip_id
      AND trip_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a trip member';
  END IF;

  -- Get the source artifact embedding
  SELECT ta.embedding INTO v_embedding
  FROM trip_artifacts ta
  WHERE ta.id = p_artifact_id AND ta.trip_id = p_trip_id;

  IF v_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ta.id,
    ta.artifact_type,
    ta.file_name,
    ta.ai_summary,
    (1 - (ta.embedding <=> v_embedding))::FLOAT AS similarity,
    ta.created_at
  FROM trip_artifacts ta
  WHERE ta.trip_id = p_trip_id
    AND ta.id != p_artifact_id
    AND ta.embedding IS NOT NULL
    AND ta.embedding_status = 'completed'
    AND (1 - (ta.embedding <=> v_embedding)) > p_threshold
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

-- 7. Comments
COMMENT ON TABLE trip_artifacts IS 'Multimodal trip artifacts with Gemini Embedding 2 vectors (1536-dim). Supports text, image, PDF inputs for semantic retrieval.';
COMMENT ON FUNCTION search_trip_artifacts IS 'Trip-scoped cosine similarity search over artifact embeddings with optional filters.';
COMMENT ON FUNCTION find_similar_artifacts IS 'Find artifacts similar to a given artifact within a trip (useful for dedup detection).';
