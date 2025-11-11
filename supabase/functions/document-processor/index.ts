import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

interface DocumentProcessingRequest {
  fileId: string;
  tripId: string;
  forceReprocess?: boolean;
}

/**
 * Validates that a file URL is from the Supabase storage bucket
 */
function validateFileUrl(fileUrl: string): boolean {
  if (!fileUrl || typeof fileUrl !== 'string') {
    return false;
  }
  
  // Extract Supabase project ID from SUPABASE_URL
  const supabaseUrl = new URL(SUPABASE_URL);
  const projectId = supabaseUrl.hostname.split('.')[0];
  
  // Allow Supabase storage URLs
  const storagePattern = new RegExp(`^https://${projectId}\\.supabase\\.co/storage/`);
  if (storagePattern.test(fileUrl)) {
    return true;
  }
  
  // Also allow the full storage path format
  if (fileUrl.includes('/storage/v1/object/public/')) {
    return true;
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 🔒 SECURITY: Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated client to verify user
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fileId, tripId, forceReprocess = false } = await req.json() as DocumentProcessingRequest;

    if (!fileId || !tripId) {
      throw new Error('fileId and tripId are required');
    }

    // 🔒 SECURITY: Verify user is a member of the trip
    const { data: membershipCheck, error: membershipError } = await supabaseAuth
      .from('trip_members')
      .select('user_id, status')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membershipCheck || membershipCheck.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Forbidden - you must be an active member of this trip' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to bypass RLS for file operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    // 🔒 SECURITY: Validate file URL is from Supabase storage
    if (!validateFileUrl(fileData.file_url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file URL - must be from Supabase storage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already processed
    if (fileData.processing_status === 'completed' && !forceReprocess) {
      return new Response(
        JSON.stringify({ success: true, message: 'File already processed', fileId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabase
      .from('trip_files')
      .update({ processing_status: 'processing' })
      .eq('id', fileId);

    console.log(`Processing file: ${fileData.file_name} (${fileData.file_type})`);

    let extractedText = '';
    let ocrConfidence = null;
    let extractedEntities = {};
    let fileStructure = {};

    // Step 1: Extract text based on file type
    if (fileData.file_type === 'application/pdf' || 
        fileData.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      
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
      separators: ['\n\n', '\n', '. ', ' ']
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
          summary: aiSummary
        },
        chunk_count: chunks.length
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
      modality: 'text'
    }));

    const { error: chunksError } = await supabase
      .from('kb_chunks')
      .insert(chunkInserts);

    if (chunksError) {
      throw new Error(`Failed to create chunks: ${chunksError.message}`);
    }

    // Step 6: Generate embeddings for all chunks
    await generateChunkEmbeddings(supabase, kbDoc.id, chunks, tripId, fileId);

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
        error_message: null
      })
      .eq('id', fileId);

    console.log(`✅ Successfully processed file: ${fileData.file_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        chunksCreated: chunks.length,
        textExtracted: extractedText.length,
        summary: aiSummary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Document processing error:', error);

    // Try to update file status to failed
    if (fileId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase
        .from('trip_files')
        .update({
          processing_status: 'failed',
          error_message: error.message
        })
        .eq('id', fileId)
        .catch(console.error);
    }

    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============= HELPER FUNCTIONS =============

async function extractWithGeminiVision(fileUrl: string, fileType: string) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
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
          }`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Extract all content from this ${fileType} document:` },
            { type: 'image_url', image_url: { url: fileUrl } }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini Vision extraction failed: ${response.status}`);
  }

  const result = await response.json();
  const parsed = JSON.parse(result.choices[0].message.content);

  return {
    text: parsed.text || '',
    confidence: parsed.confidence || 0.85,
    entities: parsed.entities || {},
    structure: parsed.structure || {}
  };
}

async function extractTextFromImage(imageUrl: string) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
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
          }`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all text from this image:' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`Image OCR failed: ${response.status}`);
  }

  const result = await response.json();
  const parsed = JSON.parse(result.choices[0].message.content);

  return {
    text: parsed.text || '',
    confidence: parsed.confidence || 0.80,
    entities: parsed.entities || {}
  };
}

async function fetchTextFile(fileUrl: string): Promise<string> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch text file: ${response.status}`);
  }
  return await response.text();
}

async function generateDocumentSummary(text: string, fileName: string): Promise<string> {
  const truncatedText = text.substring(0, 8000); // Limit input size

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'Generate a concise 2-3 sentence summary of this document for quick reference.'
        },
        {
          role: 'user',
          content: `Summarize this document (${fileName}):\n\n${truncatedText}`
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    return 'Summary generation failed';
  }

  const result = await response.json();
  return result.choices[0].message.content.trim();
}

function smartChunk(text: string, options: {
  chunkSize: number;
  chunkOverlap: number;
  separators: string[];
}): string[] {
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
  chunks: string[],
  tripId: string,
  fileId: string
) {
  // Generate embeddings in batches
  const batchSize = 10;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const embedResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/text-embedding-004',
        input: batch
      })
    });

    if (!embedResponse.ok) {
      console.error(`Failed to generate embeddings for batch ${i / batchSize + 1}`);
      continue;
    }

    const embedData = await embedResponse.json();

    // Insert embeddings into trip_embeddings table
    const embeddingInserts = embedData.data.map((item: any, idx: number) => ({
      trip_id: tripId,
      source_type: 'file',
      source_id: fileId,
      content_text: batch[idx],
      embedding: item.embedding,
      metadata: {
        doc_id: docId,
        chunk_index: i + idx
      }
    }));

    await supabase
      .from('trip_embeddings')
      .insert(embeddingInserts);
  }

  console.log(`Generated embeddings for ${chunks.length} chunks`);
}
