import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sanitizeErrorForClient, logError } from '../_shared/errorHandling.ts';
import { invokeEmbeddingModel } from '../_shared/gemini.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface SourceData {
  tripId: string;
  sourceType: string;
  sourceId: string;
  contentText: string;
  metadata: Record<string, unknown>;
}

interface TripResult {
  tripId: string;
  tripName: string;
  totalProcessed: number;
  results: Record<string, number>;
  error?: string;
}

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== Starting batch embedding regeneration ===');

    // Require service role key via Authorization header for admin-only access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required — use service role key' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Parse optional request body
    let batchSize = 5;
    let dryRun = false;
    try {
      const body = await req.json();
      if (body.batchSize) batchSize = Math.min(body.batchSize, 20);
      if (body.dryRun) dryRun = true;
    } catch {
      // No body or invalid JSON — use defaults
    }

    // Fetch all active (non-archived) trips
    const { data: activeTrips, error: tripsError } = await supabase
      .from('trips')
      .select('id, title')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (tripsError) {
      throw new Error(`Failed to fetch active trips: ${tripsError.message}`);
    }

    if (!activeTrips || activeTrips.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active trips found', tripsProcessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Found ${activeTrips.length} active trips to process`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          activeTripsCount: activeTrips.length,
          trips: activeTrips.map((t: { id: string; title: string }) => ({
            id: t.id,
            title: t.title,
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const sourceTypes = [
      'chat',
      'task',
      'poll',
      'payment',
      'broadcast',
      'calendar',
      'link',
      'file',
    ];
    const tripResults: TripResult[] = [];
    let totalEmbeddingsGenerated = 0;

    // Process trips in batches to avoid timeouts
    for (let batchStart = 0; batchStart < activeTrips.length; batchStart += batchSize) {
      const batch = activeTrips.slice(batchStart, batchStart + batchSize);
      console.log(
        `Processing trip batch ${Math.floor(batchStart / batchSize) + 1} of ${Math.ceil(activeTrips.length / batchSize)} (${batch.length} trips)`,
      );

      const batchPromises = batch.map(async (trip: { id: string; title: string }) => {
        const tripResult: TripResult = {
          tripId: trip.id,
          tripName: trip.title || 'Untitled',
          totalProcessed: 0,
          results: {},
        };

        try {
          for (const type of sourceTypes) {
            try {
              const sourceData = await fetchSourceData(supabase as any, trip.id, type);

              if (sourceData.length === 0) {
                tripResult.results[type] = 0;
                continue;
              }

              const embeddings = await generateEmbeddings(sourceData);

              // forceRefresh=true: ignoreDuplicates=false to overwrite existing
              const { error } = await supabase.from('trip_embeddings').upsert(embeddings, {
                onConflict: 'trip_id,source_type,source_id',
                ignoreDuplicates: false,
              });

              if (error) {
                console.error(`Error upserting ${type} embeddings for trip ${trip.id}:`, error);
                tripResult.results[type] = -1;
                continue;
              }

              tripResult.results[type] = embeddings.length;
              tripResult.totalProcessed += embeddings.length;
            } catch (err) {
              console.error(`Error processing ${type} for trip ${trip.id}:`, err);
              tripResult.results[type] = -1;
            }
          }
        } catch (err) {
          tripResult.error = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Failed to process trip ${trip.id}:`, err);
        }

        return tripResult;
      });

      const batchResults = await Promise.all(batchPromises);
      tripResults.push(...batchResults);

      for (const r of batchResults) {
        totalEmbeddingsGenerated += r.totalProcessed;
      }

      console.log(
        `Batch complete. Running total: ${totalEmbeddingsGenerated} embeddings across ${tripResults.length} trips`,
      );
    }

    const successCount = tripResults.filter(r => !r.error).length;
    const failCount = tripResults.filter(r => r.error).length;

    console.log('=== Batch embedding regeneration complete ===');
    console.log(`Trips: ${successCount} succeeded, ${failCount} failed`);
    console.log(`Total embeddings generated: ${totalEmbeddingsGenerated}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalTripsProcessed: activeTrips.length,
        successCount,
        failCount,
        totalEmbeddingsGenerated,
        tripResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    logError('BATCH_EMBEDDING_REGENERATION', error, {});

    return new Response(
      JSON.stringify({
        success: false,
        error: sanitizeErrorForClient(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function fetchSourceData(
  supabase: any, // intentional: bypass deep generic inference (TS2345)
  tripId: string,
  sourceType: string,
): Promise<SourceData[]> {
  if (sourceType === 'file') {
    const { data: docs, error: docsError } = await supabase
      .from('kb_documents')
      .select('id, source_id')
      .eq('trip_id', tripId)
      .eq('source', 'file');

    if (docsError) {
      throw docsError;
    }

    if (!docs || docs.length === 0) {
      return [];
    }

    const docIds = docs.map((doc: { id: string }) => doc.id);
    const { data: chunks, error: chunksError } = await supabase
      .from('kb_chunks')
      .select('id, doc_id, content, chunk_index')
      .in('doc_id', docIds);

    if (chunksError) {
      throw chunksError;
    }

    if (!chunks || chunks.length === 0) {
      return [];
    }

    const docsById = new Map(docs.map((doc: { id: string; source_id: string }) => [doc.id, doc]));
    return chunks.map(
      (chunk: { id: string; doc_id: string; content: string; chunk_index: number }) => {
        const doc = docsById.get(chunk.doc_id) as { id: string; source_id: string } | undefined;
        return {
          tripId,
          sourceType: 'file',
          sourceId: chunk.id,
          contentText: chunk.content || '',
          metadata: {
            source_type: 'file',
            source_id: chunk.id,
            doc_id: chunk.doc_id,
            file_id: doc?.source_id || null,
            chunk_index: chunk.chunk_index ?? null,
          },
        };
      },
    );
  }

  const queries: Record<string, () => Promise<{ data: unknown[] | null; error: unknown }>> = {
    chat: async () => {
      const { data, error } = await supabase
        .from('trip_chat_messages')
        .select('id, content, author_name, created_at')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(100);
      return { data, error };
    },
    task: async () => {
      const { data, error } = await supabase
        .from('trip_tasks')
        .select('id, title, description, creator_id, created_at')
        .eq('trip_id', tripId);
      return { data, error };
    },
    poll: async () => {
      const { data, error } = await supabase
        .from('trip_polls')
        .select('id, question, options, created_at')
        .eq('trip_id', tripId);
      return { data, error };
    },
    payment: async () => {
      const { data, error } = await supabase
        .from('trip_payment_messages')
        .select('id, description, amount, currency, created_at')
        .eq('trip_id', tripId);
      return { data, error };
    },
    broadcast: async () => {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('id, message, priority, created_at')
        .eq('trip_id', tripId);
      return { data, error };
    },
    calendar: async () => {
      const { data, error } = await supabase
        .from('trip_events')
        .select('id, title, description, location, start_time')
        .eq('trip_id', tripId);
      return { data, error };
    },
    link: async () => {
      const { data, error } = await supabase
        .from('trip_links')
        .select('id, url, title, description, created_at')
        .eq('trip_id', tripId);
      return { data, error };
    },
  };

  const query = queries[sourceType];
  if (!query) {
    throw new Error(`Unknown source type: ${sourceType}`);
  }

  const { data, error } = await query();
  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as Record<string, unknown>[]).map((item: Record<string, unknown>) => ({
    tripId,
    sourceType,
    sourceId: item.id as string,
    contentText: buildContentText(item, sourceType),
    metadata: buildMetadata(item, sourceType),
  }));
}

function buildContentText(item: Record<string, unknown>, sourceType: string): string {
  switch (sourceType) {
    case 'chat':
      return `${item.author_name}: ${item.content}`;
    case 'task':
      return `Task: ${item.title}${item.description ? `. ${item.description}` : ''}`;
    case 'poll': {
      const options = Array.isArray(item.options)
        ? item.options.map((o: { text?: string }) => o.text || o).join(', ')
        : 'No options';
      return `Poll: ${item.question}. Options: ${options}`;
    }
    case 'payment':
      return `Payment: ${item.description || 'Payment'}. Amount: ${item.currency} ${item.amount}`;
    case 'broadcast':
      return `Broadcast [${item.priority || 'normal'}]: ${item.message}`;
    case 'calendar':
      return `Event: ${item.title}${item.location ? ` at ${item.location}` : ''}${item.description ? `. ${item.description}` : ''}`;
    case 'link':
      return `Link: ${item.title || item.url}${item.description ? `. ${item.description}` : ''}`;
    case 'file':
      return `File: ${item.file_name}`;
    default:
      return JSON.stringify(item);
  }
}

function buildMetadata(item: Record<string, unknown>, sourceType: string): Record<string, unknown> {
  const base: Record<string, unknown> = {
    source_type: sourceType,
    source_id: item.id,
    created_at: item.created_at,
  };

  switch (sourceType) {
    case 'chat':
      return { ...base, author: item.author_name };
    case 'payment':
      return { ...base, amount: item.amount, currency: item.currency };
    case 'calendar':
      return { ...base, location: item.location, start_time: item.start_time };
    case 'link':
      return { ...base, url: item.url };
    default:
      return base;
  }
}

async function generateEmbeddings(sourceData: SourceData[]): Promise<Record<string, unknown>[]> {
  const embeddings: Record<string, unknown>[] = [];

  // Batch requests (max 100 per batch)
  for (let i = 0; i < sourceData.length; i += 100) {
    const batch = sourceData.slice(i, i + 100);

    const embeddingResult = await invokeEmbeddingModel({
      input: batch.map(item => item.contentText),
      timeoutMs: 30000,
    });
    const vectors = embeddingResult.embeddings;

    if (!Array.isArray(vectors) || vectors.length !== batch.length) {
      throw new Error(
        `Invalid embedding response: expected ${batch.length} vectors, got ${vectors?.length ?? 0}`,
      );
    }

    batch.forEach((item, idx) => {
      embeddings.push({
        trip_id: item.tripId,
        source_type: item.sourceType,
        source_id: item.sourceId,
        content_text: item.contentText,
        embedding: vectors[idx],
        metadata: item.metadata,
      });
    });
  }

  return embeddings;
}
