# Supabase-Native Document Processing Pipeline

## Overview

This document processing system replicates Google File Search capabilities while keeping everything in your Supabase infrastructure. It provides automatic document parsing, OCR, smart chunking, semantic search, and AI-powered document understanding.

## Architecture

```
User uploads file → Supabase Storage
                   ↓
           Auto-trigger (database trigger)
                   ↓
        document-processor Edge Function
                   ↓
    ├─ PDF/DOCX → Gemini Vision OCR
    ├─ Images → Gemini OCR
    └─ Text → Direct extraction
                   ↓
        Smart Chunking (800 tokens + 200 overlap)
                   ↓
        Generate Embeddings (text-embedding-004)
                   ↓
    Store in: trip_embeddings + kb_documents + kb_chunks
                   ↓
        Hybrid Search Available (vector + keyword)
                   ↓
        lovable-concierge uses for Q&A
```

## Key Features

### ✅ What This System Does

1. **Automatic Document Processing**
   - Triggered automatically on file upload
   - Supports: PDF, DOCX, TXT, JPG, PNG
   - No manual processing required

2. **Advanced OCR & Text Extraction**
   - Powered by Gemini Vision 2.5 Flash
   - Handles images, scanned PDFs, and native documents
   - Extracts structured data: dates, amounts, locations, names

3. **Smart Chunking**
   - Recursive character-based splitting
   - 800-token chunks with 200-token overlap
   - Preserves context across boundaries
   - Respects natural breakpoints (paragraphs, sentences)

4. **Hybrid Search**
   - **Vector Search**: Semantic similarity using pgvector
   - **Keyword Search**: Full-text search using PostgreSQL tsvector
   - **Re-ranking**: Combines both with weighted scores
   - Better recall than vector-only or keyword-only

5. **AI-Powered Document Understanding**
   - Auto-generates summaries
   - Extracts entities (dates, locations, amounts, names)
   - Detects document structure (tables, sections, pages)
   - Provides OCR confidence scores

## Database Schema

### Enhanced `trip_files` Table

New columns added:
```sql
- processing_status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed'
- content_text: Extracted plain text (first 10k chars)
- ai_summary: AI-generated 2-3 sentence summary
- chunk_count: Number of chunks created
- ocr_confidence: OCR accuracy score (0-1)
- extracted_entities: JSON with dates, locations, amounts, etc.
- file_structure: JSON with tables, sections, page count
- error_message: Error details if processing failed
```

### `kb_chunks` Enhancement

New column:
```sql
- content_tsv: Full-text search vector (auto-generated from content)
```

### New Database Function: `hybrid_search_trip_context`

Combines vector similarity and keyword matching:

```sql
SELECT * FROM hybrid_search_trip_context(
  p_trip_id := '1',
  p_query_text := 'What time is my flight?',
  p_query_embedding := [embedding_vector],
  p_match_threshold := 0.6,
  p_match_count := 10
);
```

Returns results with:
- `similarity`: Vector similarity score
- `rank`: Combined weighted score
- `search_type`: 'vector' or 'keyword'

## Edge Functions

### `document-processor`

**Purpose**: Process uploaded documents into searchable chunks

**Flow**:
1. Fetch file metadata from `trip_files`
2. Extract text based on file type:
   - PDF/DOCX: Gemini Vision OCR
   - Images: Gemini OCR
   - Text: Direct fetch
3. Generate AI summary
4. Smart chunk (800 + 200 overlap)
5. Create `kb_document` entry
6. Create `kb_chunks` entries
7. Generate embeddings for all chunks
8. Update `trip_files` with results

**Invocation**:
```typescript
await supabase.functions.invoke('document-processor', {
  body: {
    fileId: 'uuid',
    tripId: '1',
    forceReprocess: false
  }
});
```

**Response**:
```json
{
  "success": true,
  "fileId": "uuid",
  "chunksCreated": 15,
  "textExtracted": 12450,
  "summary": "Flight confirmation for AA123..."
}
```

### `lovable-concierge` (Enhanced)

**New Feature**: Hybrid RAG retrieval

Instead of just vector search, now uses:
```typescript
const { data: hybridResults } = await supabase.rpc('hybrid_search_trip_context', {
  p_trip_id: tripId,
  p_query_text: userMessage,
  p_query_embedding: embedding,
  p_match_threshold: 0.55,
  p_match_count: 15
});
```

Results include both:
- 🔍 Vector matches (semantic similarity)
- 🔤 Keyword matches (exact/partial text matches)

This improves recall for:
- Specific names, codes, numbers
- Exact phrases user mentioned before
- Data that might not embed well

### `enhanced-ai-parser` (Enhanced)

**New Feature**: Better OCR and structure extraction

Now extracts:
- Complete document text with line breaks
- Tables with headers and rows
- Document sections with headings
- Structured data (dates, times, amounts, contacts)
- Key travel details (flight numbers, confirmation codes, etc.)
- OCR confidence scores
- Page counts and language detection

## How to Use

### 1. Automatic Processing (Recommended)

Files are automatically processed when uploaded to Supabase Storage:

```typescript
// Upload file
const { data: fileData } = await supabase.storage
  .from('trip-files')
  .upload(`${tripId}/${fileName}`, file);

// Insert record (triggers auto-processing)
const { data: fileRecord } = await supabase
  .from('trip_files')
  .insert({
    trip_id: tripId,
    file_name: fileName,
    file_type: file.type,
    file_url: fileData.path,
    file_size: file.size
  });

// File is now queued for processing
// Check status: fileRecord.processing_status === 'queued'
```

### 2. Manual Processing

Trigger processing manually:

```typescript
const { data } = await supabase.functions.invoke('document-processor', {
  body: {
    fileId: fileRecord.id,
    tripId: tripId,
    forceReprocess: true // Re-process even if already done
  }
});
```

### 3. Query Processed Documents

Use the AI Concierge - it automatically uses hybrid search:

```typescript
const { data } = await supabase.functions.invoke('lovable-concierge', {
  body: {
    message: 'What time is my flight to New York?',
    tripId: tripId
  }
});

// Response will cite sources:
// "According to your flight confirmation document, 
//  your flight AA123 departs at 2:45 PM."
```

### 4. Check Processing Status

```typescript
const { data: files } = await supabase
  .from('trip_files')
  .select('file_name, processing_status, ai_summary, chunk_count')
  .eq('trip_id', tripId)
  .eq('processing_status', 'completed');

// View summaries
files.forEach(file => {
  console.log(`${file.file_name}: ${file.ai_summary}`);
  console.log(`  - ${file.chunk_count} chunks created`);
});
```

## Performance & Costs

### Processing Time
- **Small files** (< 1 page): ~2-3 seconds
- **Medium files** (1-5 pages): ~5-10 seconds
- **Large files** (5+ pages): ~15-30 seconds

### Token Usage (per document)
- **OCR/Extraction**: 500-2000 tokens
- **Summary Generation**: 200-500 tokens
- **Embeddings**: 50-100 tokens per chunk

### Cost Estimates (using Gemini Flash)
- **Small document** (1 page): $0.002-0.005
- **Medium document** (5 pages): $0.01-0.02
- **Large document** (20 pages): $0.05-0.10

Much cheaper than storing files in Google File API!

## Advantages Over Google File Search

### ✅ Pros

1. **Data Control**: Everything stays in your Supabase
2. **Privacy**: No third-party file storage
3. **Customization**: Full control over chunking, embeddings, search
4. **Integration**: Direct access to your database
5. **Cost**: Lower costs for storage, no file expiration
6. **Hybrid Search**: Better than vector-only search
7. **Metadata**: Rich extracted entities and structure

### ⚠️ Considerations

1. **Manual Scaling**: Need to manage chunking/embedding logic
2. **Storage**: Uses your Supabase storage quota
3. **Processing**: Requires edge function invocations

## Monitoring & Debugging

### Check Processing Status

```sql
-- View processing stats
SELECT 
  processing_status,
  COUNT(*) as count,
  AVG(chunk_count) as avg_chunks,
  AVG(ocr_confidence) as avg_confidence
FROM trip_files
WHERE trip_id = '1'
GROUP BY processing_status;
```

### View Failed Processings

```sql
SELECT file_name, error_message, created_at
FROM trip_files
WHERE processing_status = 'failed'
ORDER BY created_at DESC;
```

### Test Hybrid Search

```sql
-- Generate a test embedding first (use your actual embedding)
SELECT * FROM hybrid_search_trip_context(
  p_trip_id := '1',
  p_query_text := 'flight confirmation',
  p_query_embedding := '[your_embedding_vector]'::vector,
  p_match_threshold := 0.5,
  p_match_count := 10
);
```

### View Document Chunks

```sql
SELECT 
  kd.source as document_source,
  kd.metadata->>'file_name' as file_name,
  kc.chunk_index,
  LEFT(kc.content, 100) as preview,
  LENGTH(kc.content) as char_count
FROM kb_chunks kc
JOIN kb_documents kd ON kd.id = kc.doc_id
WHERE kd.trip_id = '1'
  AND kd.source = 'file'
ORDER BY kd.created_at DESC, kc.chunk_index ASC
LIMIT 20;
```

## Troubleshooting

### File Not Processing?

1. Check file type is supported:
   ```sql
   SELECT file_type, processing_status 
   FROM trip_files 
   WHERE id = 'file_uuid';
   ```

2. Check error message:
   ```sql
   SELECT error_message 
   FROM trip_files 
   WHERE processing_status = 'failed';
   ```

3. Manually trigger reprocessing:
   ```typescript
   await supabase.functions.invoke('document-processor', {
     body: { fileId, tripId, forceReprocess: true }
   });
   ```

### Poor Search Results?

1. **Lower threshold**: Try `match_threshold: 0.5` instead of 0.6
2. **Increase count**: Try `match_count: 20` instead of 10
3. **Check embeddings exist**:
   ```sql
   SELECT COUNT(*) 
   FROM trip_embeddings 
   WHERE trip_id = '1' 
     AND source_type = 'file';
   ```

4. **Test keyword search directly**:
   ```sql
   SELECT content 
   FROM kb_chunks 
   WHERE content_tsv @@ plainto_tsquery('english', 'flight number')
   LIMIT 5;
   ```

### OCR Confidence Too Low?

- Acceptable: > 0.75
- Good: > 0.85
- Excellent: > 0.90

If confidence < 0.75:
1. Check image quality (resolution, contrast)
2. Ensure text is clearly readable
3. Try rescanning at higher DPI
4. Use native PDFs instead of scanned images

## Next Steps

1. **Frontend Integration**: Add file upload UI to trips
2. **Status Display**: Show processing status in UI
3. **Document Viewer**: Display uploaded documents with summaries
4. **Batch Processing**: Process multiple files at once
5. **Scheduled Refresh**: Periodically re-process updated documents
6. **Analytics**: Track most-queried documents and search patterns

## Related Documentation

- [RAG System Setup](./RAG_CRON_SETUP.md)
- [AI Concierge Setup](./AI_CONCIERGE_SETUP.md)
- [Google Ecosystem Migration](../GOOGLE_ECOSYSTEM_MIGRATION_SUMMARY.md)
