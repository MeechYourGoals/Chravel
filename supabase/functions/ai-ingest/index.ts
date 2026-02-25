import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { invokeEmbeddingModel } from '../_shared/gemini.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface IngestRequest {
  source: 'message' | 'poll' | 'broadcast' | 'file' | 'calendar' | 'link' | 'trip_batch';
  sourceId?: string;
  tripId?: string;
  content?: string;
}

interface SingleIngestResult {
  success: boolean;
  sourceId: string;
  docId?: string;
  error?: string;
}

interface BatchIngestResult {
  type: 'messages' | 'polls' | 'files' | 'links';
  attempted: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

serve(async req => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createOptionsResponse(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { source, sourceId, tripId, content }: IngestRequest = await req.json();

    // Handle batch ingestion for entire trip
    if (source === 'trip_batch') {
      if (!tripId) {
        return new Response(
          JSON.stringify({ error: 'tripId is required for trip_batch ingestion' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const batchResults = await Promise.all([
        ingestTripMessages(supabase, tripId),
        ingestTripPolls(supabase, tripId),
        ingestTripFiles(supabase, tripId),
        ingestTripLinks(supabase, tripId),
      ]);

      const totals = batchResults.reduce(
        (acc, result) => {
          acc.attempted += result.attempted;
          acc.succeeded += result.succeeded;
          acc.failed += result.failed;
          return acc;
        },
        { attempted: 0, succeeded: 0, failed: 0 },
      );
      const isFullySuccessful = totals.failed === 0;

      return new Response(
        JSON.stringify({
          success: isFullySuccessful,
          message: isFullySuccessful
            ? 'Batch ingestion completed successfully'
            : 'Batch ingestion completed with partial failures',
          totals,
          results: batchResults,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!source || !sourceId || !tripId) {
      return new Response(JSON.stringify({ error: 'Source, sourceId, and tripId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let textContent = content || '';

    // If content not provided, fetch from source table
    if (!textContent) {
      switch (source) {
        case 'message':
          const { data: message } = await supabase
            .from('trip_chat_messages')
            .select('content, author_name')
            .eq('id', sourceId)
            .single();
          if (message) {
            textContent = `${message.author_name}: ${message.content}`;
          }
          break;

        case 'poll':
          const { data: poll } = await supabase
            .from('trip_polls')
            .select('question, options, total_votes')
            .eq('id', sourceId)
            .single();
          if (poll) {
            const options = Array.isArray(poll.options)
              ? poll.options.map((opt: any) => opt.text || opt).join(', ')
              : '';
            textContent = `POLL: ${poll.question}\nOptions: ${options}\nTotal votes: ${poll.total_votes}`;
          }
          break;

        case 'broadcast':
          // Note: broadcasts table doesn't exist yet, this is placeholder
          textContent = `Broadcast content for ${sourceId}`;
          break;

        case 'file':
          const { data: file } = await supabase
            .from('trip_files')
            .select('name, content_text, ai_summary')
            .eq('id', sourceId)
            .single();
          if (file) {
            textContent = `FILE: ${file.name}\n${file.ai_summary || file.content_text || 'No content available'}`;
          }
          break;

        case 'link':
          const { data: link } = await supabase
            .from('trip_links')
            .select('title, description, url')
            .eq('id', sourceId)
            .single();
          if (link) {
            textContent = `LINK: ${link.title}\n${link.description || ''}\nURL: ${link.url}`;
          }
          break;

        default:
          textContent = `Content from ${source}: ${sourceId}`;
      }
    }

    if (!textContent.trim()) {
      return new Response(JSON.stringify({ error: 'No content to ingest' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const embedding = await generateEmbedding(textContent);

    // Create or update knowledge base document
    const { data: doc, error: docError } = await supabase
      .from('kb_documents')
      .upsert(
        {
          trip_id: tripId,
          source: source,
          source_id: sourceId,
          modality: 'text',
          plain_text: textContent,
          metadata: { source, sourceId, ingested_at: new Date().toISOString() },
          chunk_count: 1,
        },
        {
          onConflict: 'source,source_id,trip_id',
        },
      )
      .select()
      .single();

    if (docError) {
      console.error('Error creating document:', docError);
      return new Response(JSON.stringify({ error: 'Failed to create document' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete existing chunks for this document
    await supabase.from('kb_chunks').delete().eq('doc_id', doc.id);

    // Create new chunk with embedding (and gracefully degrade if vector dimensions differ).
    const chunkError = await insertKbChunk(
      supabase,
      {
        doc_id: doc.id,
        chunk_index: 0,
        content: textContent,
        modality: 'text',
      },
      embedding,
    );

    if (chunkError) {
      console.error('Error creating chunk:', chunkError);
      return new Response(JSON.stringify({ error: 'Failed to create chunk' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        docId: doc.id,
        contentLength: textContent.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in ai-ingest function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Batch ingestion helpers
async function ingestTripMessages(supabase: any, tripId: string): Promise<BatchIngestResult> {
  const { data: messages, error: messagesError } = await supabase
    .from('trip_chat_messages')
    .select('*')
    .eq('trip_id', tripId);

  if (messagesError) {
    return {
      type: 'messages',
      attempted: 0,
      succeeded: 0,
      failed: 1,
      errors: [`Failed to load trip_chat_messages: ${messagesError.message}`],
    };
  }

  if (!messages?.length)
    return { type: 'messages', attempted: 0, succeeded: 0, failed: 0, errors: [] };

  const results: SingleIngestResult[] = await Promise.all(
    messages.map((msg: any) =>
      ingestSingleItem(supabase, 'message', msg.id, tripId, `${msg.author_name}: ${msg.content}`),
    ),
  );

  return summarizeBatchResults('messages', results);
}

async function ingestTripPolls(supabase: any, tripId: string): Promise<BatchIngestResult> {
  const { data: polls, error: pollsError } = await supabase
    .from('trip_polls')
    .select('*')
    .eq('trip_id', tripId);

  if (pollsError) {
    return {
      type: 'polls',
      attempted: 0,
      succeeded: 0,
      failed: 1,
      errors: [`Failed to load trip_polls: ${pollsError.message}`],
    };
  }

  if (!polls?.length) return { type: 'polls', attempted: 0, succeeded: 0, failed: 0, errors: [] };

  const results: SingleIngestResult[] = await Promise.all(
    polls.map((poll: any) => {
      const content = `Poll: ${poll.question}. Options: ${JSON.stringify(poll.options)}. Status: ${poll.status}. Total votes: ${poll.total_votes}`;
      return ingestSingleItem(supabase, 'poll', poll.id, tripId, content);
    }),
  );

  return summarizeBatchResults('polls', results);
}

async function ingestTripFiles(supabase: any, tripId: string): Promise<BatchIngestResult> {
  const { data: files, error: filesError } = await supabase
    .from('trip_files')
    .select('*')
    .eq('trip_id', tripId);

  if (filesError) {
    return {
      type: 'files',
      attempted: 0,
      succeeded: 0,
      failed: 1,
      errors: [`Failed to load trip_files: ${filesError.message}`],
    };
  }

  if (!files?.length) return { type: 'files', attempted: 0, succeeded: 0, failed: 0, errors: [] };

  const results: SingleIngestResult[] = await Promise.all(
    files.map((file: any) => {
      const content = `File: ${file.name} (${file.file_type}). Summary: ${file.ai_summary || 'No summary'}. Content: ${file.content_text || 'No text content'}`;
      return ingestSingleItem(supabase, 'file', file.id, tripId, content);
    }),
  );

  return summarizeBatchResults('files', results);
}

async function ingestTripLinks(supabase: any, tripId: string): Promise<BatchIngestResult> {
  const { data: links, error: linksError } = await supabase
    .from('trip_links')
    .select('*')
    .eq('trip_id', tripId);

  if (linksError) {
    return {
      type: 'links',
      attempted: 0,
      succeeded: 0,
      failed: 1,
      errors: [`Failed to load trip_links: ${linksError.message}`],
    };
  }

  if (!links?.length) return { type: 'links', attempted: 0, succeeded: 0, failed: 0, errors: [] };

  const results: SingleIngestResult[] = await Promise.all(
    links.map((link: any) => {
      const content = `Link: ${link.title}. URL: ${link.url}. Description: ${link.description || 'No description'}. Category: ${link.category || 'uncategorized'}. Votes: ${link.votes}`;
      return ingestSingleItem(supabase, 'link', link.id, tripId, content);
    }),
  );

  return summarizeBatchResults('links', results);
}

async function ingestSingleItem(
  supabase: any,
  source: string,
  sourceId: string,
  tripId: string,
  content: string,
): Promise<SingleIngestResult> {
  try {
    const embedding = await generateEmbedding(content);

    const { data: doc, error: docError } = await supabase
      .from('kb_documents')
      .upsert({
        trip_id: tripId,
        source: source,
        source_id: sourceId,
        plain_text: content,
        metadata: { ingested_at: new Date().toISOString() },
      })
      .select()
      .single();

    if (docError) throw docError;

    await supabase.from('kb_chunks').delete().eq('doc_id', doc.id);

    const chunkError = await insertKbChunk(
      supabase,
      {
        doc_id: doc.id,
        content: content,
        chunk_index: 0,
      },
      embedding,
    );

    if (chunkError) throw chunkError;

    return { success: true, docId: doc.id, sourceId };
  } catch (error) {
    console.error(`Error ingesting ${source} ${sourceId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, sourceId, error: errorMessage };
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const result = await invokeEmbeddingModel({
    input: text.slice(0, 8000),
    model: 'text-embedding-004',
    timeoutMs: 30_000,
  });

  const embedding = result.embeddings[0];
  if (!Array.isArray(embedding)) {
    throw new Error('Invalid embedding response payload');
  }

  return embedding;
}

async function insertKbChunk(
  supabase: any,
  chunkData: {
    doc_id: string;
    content: string;
    chunk_index: number;
    modality?: string;
  },
  embedding: number[],
) {
  const { error: insertWithEmbeddingError } = await supabase.from('kb_chunks').insert({
    ...chunkData,
    embedding,
  });

  if (!insertWithEmbeddingError) {
    return null;
  }

  const errorMessage = String(insertWithEmbeddingError.message || '').toLowerCase();
  const shouldRetryWithoutEmbedding =
    errorMessage.includes('vector') || errorMessage.includes('dimension');

  if (!shouldRetryWithoutEmbedding) {
    return insertWithEmbeddingError;
  }

  console.warn(
    'Embedding insert failed; retrying kb_chunks insert without embedding:',
    insertWithEmbeddingError.message,
  );

  const { error: insertWithoutEmbeddingError } = await supabase.from('kb_chunks').insert(chunkData);
  return insertWithoutEmbeddingError ?? null;
}

function summarizeBatchResults(
  type: BatchIngestResult['type'],
  results: SingleIngestResult[],
): BatchIngestResult {
  const failedResults = results.filter(result => !result.success);

  return {
    type,
    attempted: results.length,
    succeeded: results.length - failedResults.length,
    failed: failedResults.length,
    errors: failedResults.map(result => `${result.sourceId}: ${result.error ?? 'Unknown error'}`),
  };
}
