-- =====================================================
-- DATABASE FUNCTIONS DOCUMENTATION
-- Created: 2025-02-01
-- Purpose: Add comprehensive documentation and usage examples
--          for critical database functions
-- =====================================================

-- =====================================================
-- FUNCTION: create_event_with_conflict_check
-- Purpose: Creates a trip event with automatic conflict detection
-- Security: SECURITY DEFINER (runs with elevated privileges)
-- =====================================================

COMMENT ON FUNCTION create_event_with_conflict_check(
  text, text, text, text, timestamptz, timestamptz, uuid
) IS 
'Creates a trip event and checks for time conflicts with existing events.

Parameters:
- p_trip_id: The trip ID (text)
- p_title: Event title
- p_description: Event description
- p_location: Event location
- p_start_time: Event start time (timestamptz)
- p_end_time: Event end time (timestamptz)
- p_created_by: User ID who created the event

Returns:
- UUID of the created event

Throws:
- EXCEPTION if a time conflict is detected

Usage Example:
SELECT create_event_with_conflict_check(
  ''trip-123'',
  ''Dinner at Restaurant'',
  ''Group dinner'',
  ''123 Main St'',
  ''2025-02-15 19:00:00+00'',
  ''2025-02-15 21:00:00+00'',
  ''user-uuid-here''
);

Edge Cases Handled:
- NULL end_time (all-day events)
- Overlapping events (start overlaps, end overlaps, fully contained)
- Events that start before and end after the new event

Testing Recommendations:
1. Test with overlapping events (should fail)
2. Test with adjacent events (should succeed)
3. Test with NULL end_time (all-day event)
4. Test with events in different trips (should succeed)
5. Test concurrent inserts (race condition handling)
';

-- =====================================================
-- FUNCTION: hybrid_search_trip_context
-- Purpose: Performs hybrid search combining vector similarity and keyword matching
-- Security: SECURITY DEFINER (runs with elevated privileges)
-- =====================================================

COMMENT ON FUNCTION hybrid_search_trip_context(
  text, text, vector, float, integer
) IS 
'Performs hybrid search across trip context using both vector similarity and keyword matching.

Parameters:
- p_trip_id: The trip ID to search within
- p_query_text: Text query for keyword search
- p_query_embedding: Vector embedding for similarity search (1536 dimensions)
- p_match_threshold: Minimum similarity threshold (default 0.6)
- p_match_count: Maximum number of results (default 10)

Returns:
- TABLE with columns: id, source_type, source_id, content_text, similarity, metadata, rank, search_type

Algorithm:
1. Vector search: Finds similar embeddings using cosine distance
2. Keyword search: Full-text search using PostgreSQL tsvector
3. Re-ranking: Combines results with weighted scores (vector: 0.7, keyword: 0.3)
4. Returns top N results sorted by combined rank

Usage Example:
SELECT * FROM hybrid_search_trip_context(
  ''trip-123'',
  ''restaurant recommendations'',
  (SELECT embedding FROM generate_embedding(''restaurant recommendations'')),
  0.6,
  10
);

Performance Considerations:
- Vector search uses IVFFlat index (requires sufficient data)
- Keyword search uses GIN index on content_tsv
- Both searches are limited independently before combining
- Consider increasing match_count if results seem incomplete

Testing Recommendations:
1. Test with empty trip (should return empty)
2. Test with only vector matches (no keyword matches)
3. Test with only keyword matches (no vector matches)
4. Test with both types of matches (should combine)
5. Test with very low threshold (should return more results)
6. Benchmark with large datasets (1000+ documents)
';

-- =====================================================
-- FUNCTION: match_kb_chunks
-- Purpose: Vector similarity search for knowledge base chunks
-- Security: STABLE (does not modify data)
-- =====================================================

COMMENT ON FUNCTION match_kb_chunks(
  vector, integer, text
) IS 
'Performs vector similarity search on knowledge base chunks.

Parameters:
- query_embedding: Vector embedding to search for (1536 dimensions)
- match_count: Maximum number of results (default 16)
- filter_trip: Optional trip ID to filter results (NULL = all trips)

Returns:
- TABLE with columns: id, doc_id, content, similarity, trip_id, source, metadata

Usage Example:
SELECT * FROM match_kb_chunks(
  (SELECT embedding FROM generate_embedding(''beach vacation'')),
  10,
  ''trip-123''
);

Performance:
- Uses IVFFlat index for fast approximate nearest neighbor search
- Similarity calculated as 1 - cosine_distance
- Results sorted by similarity descending

Testing Recommendations:
1. Test with exact match (should return similarity ~1.0)
2. Test with unrelated query (should return low similarity)
3. Test with trip filter (should only return results from that trip)
4. Test with NULL trip filter (should return results from all trips)
5. Benchmark query time with large datasets
';

-- =====================================================
-- FUNCTION: upsert_payment_split_pattern
-- Purpose: Records or updates payment split patterns for ML suggestions
-- Security: SECURITY DEFINER (runs with elevated privileges)
-- =====================================================

COMMENT ON FUNCTION upsert_payment_split_pattern(
  uuid, uuid, uuid
) IS 
'Records or updates a payment split pattern for ML-based participant suggestions.

Parameters:
- p_trip_id: The trip ID
- p_user_id: The user who created the payment
- p_participant_id: The participant who split the payment

Behavior:
- If pattern exists: Increments frequency and updates last_split_at
- If pattern doesn''t exist: Creates new pattern with frequency = 1

Usage Example:
SELECT upsert_payment_split_pattern(
  ''trip-uuid'',
  ''user-uuid'',
  ''participant-uuid''
);

This function is typically called automatically when a payment is created
to track historical patterns for future suggestions.

Testing Recommendations:
1. Test first insert (should create new pattern)
2. Test subsequent inserts (should increment frequency)
3. Test with same user/participant across different trips (should be separate patterns)
4. Test concurrent upserts (should handle race conditions)
';
