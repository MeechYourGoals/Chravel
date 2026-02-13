import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  DocumentProcessorSchema,
  validateInput,
  verifyTripMembership,
  validateExternalHttpsUrl,
} from '../_shared/validation.ts';
import {
  invokeChatModel,
  extractTextFromChatResponse,
  invokeEmbeddingModel,
} from '../_shared/gemini.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

function parseJsonSafely(raw: string): any {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    const block = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (block) {
      return JSON.parse(block[1]);
    }
    throw new Error('Failed to parse AI JSON response');
  }
}

async function runDocumentModel(
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content:
      | string
      | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
  }>,
  options?: {
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    responseFormat?: boolean;
  },
): Promise<string> {
  const aiResult = await invokeChatModel({
    model: 'gemini-3-flash-preview',
    messages,
    maxTokens: options?.maxTokens ?? 2000,
    temperature: options?.temperature ?? 0.1,
    timeoutMs: options?.timeoutMs ?? 45000,
    ...(options?.responseFormat === false ? {} : { responseFormat: { type: 'json_object' } }),
  });

  console.log(`[document-processor] AI provider=${aiResult.provider} model=${aiResult.model}`);
  return extractTextFromChatResponse(aiResult.raw, aiResult.provider);
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let fileId: string | undefined;

  try {
    // Use service role client for all operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate request body with Zod schema
    const rawBody = await req.json();
    const validation = validateInput(DocumentProcessorSchema, rawBody);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error, success: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validated = validation.data;
    fileId = validated.fileId;
    const { tripId, forceReprocess } = validated;

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required', success: false }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user: authenticatedUser },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);
    const userId: string | null = authenticatedUser?.id || null;

    if (authError || !userId) {
      return new Response(JSON.stringify({ error: 'Invalid authentication', success: false }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 🔒 SECURITY: Verify user is a member of the trip (only if authenticated)
    const { data: membershipCheck, error: membershipError } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .maybeSingle();

    if (membershipError || !membershipCheck) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - you must be a member of this trip' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch file metadata
    const { data: fileData, error: fileError } = await supabase
      .from('trip_files')
      .select('*')
      .eq('id', fileId)
      .eq('trip_id', tripId) // Ensure file belongs to the trip
      .single();

    if (fileError || !fileData) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Verify file belongs to the specified trip
    if (fileData.trip_id !== tripId) {
      return new Response(
        JSON.stringify({
          error: 'File does not belong to the specified trip',
          success: false,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Additional membership verification via helper function
    const tripMembership = await verifyTripMembership(supabase, userId, tripId);
    if (!tripMembership.isMember) {
      return new Response(
        JSON.stringify({
          error: tripMembership.error || 'Unauthorized access to trip',
          success: false,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate file_url is HTTPS and external (SSRF protection)
    if (fileData.file_url && !validateExternalHttpsUrl(fileData.file_url)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid file URL: must be HTTPS and external (no internal networks)',
          success: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Check if already processed
    if (fileData.processing_status === 'completed' && !forceReprocess) {
      return new Response(
        JSON.stringify({ success: true, message: 'File already processed', fileId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Update status to processing
    await supabase.from('trip_files').update({ processing_status: 'processing' }).eq('id', fileId);

    console.log(`Processing file: ${fileData.file_name} (${fileData.file_type})`);

    let extractedText = '';
    let ocrConfidence = null;
    let extractedEntities = {};
    let fileStructure = {};

    // Step 1: Extract text based on file type
    if (
      fileData.file_type === 'application/pdf' ||
      fileData.file_type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // For PDF/DOCX, use Gemini Vision for OCR
      const result = await extractWithGeminiVision(fileData.file_url, fileData.file_type);
      extractedText = result.text;
      ocrConfidence = result.confidence;
      extractedEntities = result.entities;
      fileStructure = result.structure;
    } else if (fileData.file_type.startsWith('image/')) {
      // For images, use Gemini Vision with OCR focus
      const result = await extractTextFromImage(fileData.file_url);
      extractedText = result.text;
      ocrConfidence = result.confidence;
      extractedEntities = result.entities;
    } else if (fileData.file_type === 'text/plain') {
      // For plain text, fetch directly
      extractedText = await fetchTextFile(fileData.file_url);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }

    console.log(`Extracted ${extractedText.length} characters from ${fileData.file_name}`);

    // Step 2: Generate AI summary
    const aiSummary = await generateDocumentSummary(extractedText, fileData.file_name);

    // Step 3: Smart chunking (recursive character-based with overlap)
    const chunks = smartChunk(extractedText, {
      chunkSize: 800,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' '],
    });

    console.log(`Created ${chunks.length} chunks from document`);

    // Step 4: Create kb_document entry
    const { data: kbDoc, error: kbError } = await supabase
      .from('kb_documents')
      .insert({
        trip_id: tripId,
        source: 'file',
        source_id: fileId,
        plain_text: extractedText,
        metadata: {
          file_name: fileData.file_name,
          file_type: fileData.file_type,
          file_size: fileData.file_size,
          extracted_entities: extractedEntities,
          file_structure: fileStructure,
          ocr_confidence: ocrConfidence,
          summary: aiSummary,
        },
        chunk_count: chunks.length,
      })
      .select()
      .single();

    if (kbError) {
      throw new Error(`Failed to create kb_document: ${kbError.message}`);
    }

    // Step 5: Create kb_chunks and generate embeddings
    const chunkInserts = chunks.map((chunk, index) => ({
      doc_id: kbDoc.id,
      content: chunk,
      chunk_index: index,
      modality: 'text',
    }));

    const { data: insertedChunks, error: chunksError } = await supabase
      .from('kb_chunks')
      .insert(chunkInserts)
      .select('id, content, chunk_index');

    if (chunksError || !insertedChunks) {
      throw new Error(`Failed to create chunks: ${chunksError?.message || 'No chunks inserted'}`);
    }

    // Step 6: Generate embeddings for all chunks
    await generateChunkEmbeddings(supabase, kbDoc.id, insertedChunks, tripId);

    // Step 7: Update trip_files with processing results
    await supabase
      .from('trip_files')
      .update({
        processing_status: 'completed',
        content_text: extractedText.substring(0, 10000), // Store first 10k chars
        ai_summary: aiSummary,
        chunk_count: chunks.length,
        ocr_confidence: ocrConfidence,
        extracted_entities: extractedEntities,
        file_structure: fileStructure,
        error_message: null,
      })
      .eq('id', fileId);

    console.log(`✅ Successfully processed file: ${fileData.file_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        chunksCreated: chunks.length,
        textExtracted: extractedText.length,
        summary: aiSummary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Document processing error:', error);

    // Try to update file status to failed (only if we have fileId)
    if (fileId) {
      try {
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { error: updateError } = await supabaseClient
          .from('trip_files')
          .update({
            processing_status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', fileId);

        if (updateError) {
          console.error('Failed to update file status:', updateError);
        }
      } catch (updateErr) {
        console.error('Error in error handling:', updateErr);
      }
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ============= HELPER FUNCTIONS =============

async function extractWithGeminiVision(fileUrl: string, fileType: string) {
  // Validate URL before fetching (SSRF protection)
  if (!validateExternalHttpsUrl(fileUrl)) {
    throw new Error('Invalid file URL: must be HTTPS and external');
  }

  const rawPayload = await runDocumentModel(
    [
      {
        role: 'system',
        content: `Extract ALL text from this document with high accuracy. Also extract structured data.
          
          Return JSON format:
          {
            "text": "complete extracted text",
            "entities": {
              "dates": ["YYYY-MM-DD"],
              "times": ["HH:MM"],
              "locations": ["place names"],
              "amounts": [{"value": number, "currency": "USD"}],
              "names": ["person/company names"],
              "emails": ["emails"],
              "phones": ["phone numbers"],
              "confirmation_codes": ["booking refs"]
            },
            "structure": {
              "has_tables": boolean,
              "page_count": number,
              "sections": ["section headings"]
            },
            "confidence": 0.95
          }`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Extract all content from this ${fileType} document:` },
          { type: 'image_url', image_url: { url: fileUrl } },
        ],
      },
    ],
    {
      maxTokens: 4000,
      temperature: 0.1,
      timeoutMs: 45000,
      responseFormat: true,
    },
  );
  const parsed = parseJsonSafely(rawPayload);

  return {
    text: parsed.text || '',
    confidence: parsed.confidence || 0.85,
    entities: parsed.entities || {},
    structure: parsed.structure || {},
  };
}

async function extractTextFromImage(imageUrl: string) {
  // Validate URL before fetching (SSRF protection)
  if (!validateExternalHttpsUrl(imageUrl)) {
    throw new Error('Invalid image URL: must be HTTPS and external');
  }

  const rawPayload = await runDocumentModel(
    [
      {
        role: 'system',
        content: `Perform OCR on this image and extract all visible text with high accuracy.
          
          Return JSON:
          {
            "text": "all extracted text",
            "entities": {
              "dates": [],
              "amounts": [],
              "locations": []
            },
            "confidence": 0.95
          }`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract all text from this image:' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    {
      maxTokens: 2000,
      temperature: 0.1,
      timeoutMs: 45000,
      responseFormat: true,
    },
  );
  const parsed = parseJsonSafely(rawPayload);

  return {
    text: parsed.text || '',
    confidence: parsed.confidence || 0.8,
    entities: parsed.entities || {},
  };
}

async function fetchTextFile(fileUrl: string): Promise<string> {
  // Additional validation before fetch (defense in depth)
  if (!validateExternalHttpsUrl(fileUrl)) {
    throw new Error('Invalid file URL: must be HTTPS and external');
  }

  const response = await fetch(fileUrl, {
    signal: AbortSignal.timeout(30000), // 30 second timeout
    headers: {
      'User-Agent': 'Chravel-DocumentProcessor/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch text file: ${response.status}`);
  }

  return await response.text();
}

async function generateDocumentSummary(text: string, fileName: string): Promise<string> {
  const truncatedText = text.substring(0, 8000); // Limit input size

  try {
    const summary = await runDocumentModel(
      [
        {
          role: 'system',
          content: 'Generate a concise 2-3 sentence summary of this document for quick reference.',
        },
        {
          role: 'user',
          content: `Summarize this document (${fileName}):\n\n${truncatedText}`,
        },
      ],
      {
        maxTokens: 200,
        temperature: 0.3,
        timeoutMs: 30000,
        responseFormat: false,
      },
    );
    return summary.trim();
  } catch (error) {
    console.error('Failed to generate document summary:', error);
    return 'Summary generation failed';
  }
}

function smartChunk(
  text: string,
  options: {
    chunkSize: number;
    chunkOverlap: number;
    separators: string[];
  },
): string[] {
  const { chunkSize, chunkOverlap, separators } = options;
  const chunks: string[] = [];

  // Recursive character-based splitting with overlap
  function splitText(text: string, separators: string[]): string[] {
    if (separators.length === 0) {
      // Base case: split by character
      return splitBySize(text, chunkSize, chunkOverlap);
    }

    const separator = separators[0];
    const parts = text.split(separator);
    const results: string[] = [];
    let currentChunk = '';

    for (const part of parts) {
      const testChunk = currentChunk + (currentChunk ? separator : '') + part;

      if (testChunk.length <= chunkSize) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) {
          results.push(currentChunk);
        }

        // If part itself is too large, recursively split with next separator
        if (part.length > chunkSize) {
          results.push(...splitText(part, separators.slice(1)));
        } else {
          currentChunk = part;
        }
      }
    }

    if (currentChunk) {
      results.push(currentChunk);
    }

    return results;
  }

  function splitBySize(text: string, size: number, overlap: number): string[] {
    const result: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + size, text.length);
      result.push(text.substring(start, end));
      start += size - overlap;
    }

    return result;
  }

  const splitChunks = splitText(text, separators);

  // Add overlap between chunks
  for (let i = 0; i < splitChunks.length; i++) {
    let chunk = splitChunks[i];

    // Add context from previous chunk
    if (i > 0 && chunkOverlap > 0) {
      const prevChunk = splitChunks[i - 1];
      const overlapText = prevChunk.substring(Math.max(0, prevChunk.length - chunkOverlap));
      chunk = overlapText + ' ' + chunk;
    }

    chunks.push(chunk.trim());
  }

  return chunks.filter(c => c.length > 50); // Filter out very small chunks
}

async function generateChunkEmbeddings(
  supabase: any,
  docId: string,
  chunkRows: Array<{ id: string; content: string; chunk_index: number }>,
  tripId: string,
) {
  // Generate embeddings in batches
  const batchSize = 10;

  for (let i = 0; i < chunkRows.length; i += batchSize) {
    const batch = chunkRows.slice(i, i + batchSize);
    let vectors: number[][];
    try {
      const embeddingResult = await invokeEmbeddingModel({
        model: 'text-embedding-004',
        input: batch.map(row => row.content),
        timeoutMs: 30000,
      });
      vectors = embeddingResult.embeddings;
      console.log(
        `[document-processor] embedding provider=${embeddingResult.provider} model=${embeddingResult.model}`,
      );
    } catch (error) {
      console.error(`Failed to generate embeddings for batch ${i / batchSize + 1}:`, error);
      continue;
    }

    // Insert embeddings into trip_embeddings table
    const embeddingInserts = vectors.map((vector: number[], idx: number) => ({
      trip_id: tripId,
      source_type: 'file',
      source_id: batch[idx].id,
      content_text: batch[idx].content,
      embedding: vector,
      metadata: {
        doc_id: docId,
        chunk_index: batch[idx].chunk_index,
      },
    }));

    const { error: embedInsertError } = await supabase
      .from('trip_embeddings')
      .upsert(embeddingInserts, {
        onConflict: 'trip_id,source_type,source_id',
      });

    if (embedInsertError) {
      throw new Error(`Failed to upsert chunk embeddings: ${embedInsertError.message}`);
    }
  }

  console.log(`Generated embeddings for ${chunkRows.length} chunks`);
}
