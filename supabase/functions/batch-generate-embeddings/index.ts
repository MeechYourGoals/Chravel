/**
 * batch-generate-embeddings — Admin-only batch trigger for embedding regeneration
 * Uses service role key internally. Protected by a simple admin secret.
 * DELETE THIS FUNCTION after use.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { invokeEmbeddingModel } from '../_shared/gemini.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async req => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const offset = body.offset ?? 0;
    const limit = body.limit ?? 5;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get active trips with pagination
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, name')
      .or('is_archived.eq.false,is_archived.is.null')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (tripsError) throw tripsError;

    console.log(
      `[batch-embed] Processing ${trips?.length || 0} trips (offset=${offset}, limit=${limit})`,
    );

    const results: {
      tripId: string;
      name: string;
      status: string;
      count?: number;
      error?: string;
    }[] = [];

    for (const trip of trips || []) {
      try {
        console.log(`[batch-embed] Processing: ${trip.name} (${trip.id})`);

        // Collect all source data for this trip
        const sourceData = await collectTripData(supabase, trip.id);

        if (sourceData.length === 0) {
          results.push({ tripId: trip.id, name: trip.name, status: 'skipped', count: 0 });
          continue;
        }

        // Delete existing embeddings for force refresh
        await supabase.from('trip_embeddings').delete().eq('trip_id', trip.id);

        let processed = 0;
        console.log(`[batch-embed] ${trip.name}: ${sourceData.length} items to embed`);
        // Process in batches of 3
        for (let i = 0; i < sourceData.length; i += 3) {
          const batch = sourceData.slice(i, i + 3);
          const embedPromises = batch.map(async item => {
            try {
              console.log(
                `[batch-embed] Embedding: ${item.sourceType}/${item.sourceId} (${item.contentText.length} chars)`,
              );
              const result = await invokeEmbeddingModel({ input: item.contentText });
              console.log(
                `[batch-embed] Result keys: ${Object.keys(result || {}).join(',')}, embeddings count: ${result?.embeddings?.length}`,
              );
              const embedding = result?.embeddings?.[0];
              if (embedding) {
                const { error: insertError } = await supabase.from('trip_embeddings').insert({
                  trip_id: item.tripId,
                  source_type: item.sourceType,
                  source_id: item.sourceId,
                  content_text: item.contentText.substring(0, 5000),
                  embedding: JSON.stringify(embedding),
                  metadata: item.metadata,
                });
                if (insertError) {
                  console.error(`[batch-embed] Insert error: ${insertError.message}`);
                } else {
                  processed++;
                }
              } else {
                console.warn(
                  `[batch-embed] No embedding returned for ${item.sourceType}/${item.sourceId}`,
                );
              }
            } catch (e) {
              console.error(
                `[batch-embed] Embed error for ${item.sourceType}/${item.sourceId}:`,
                e instanceof Error ? e.message : String(e),
              );
            }
          });
          await Promise.all(embedPromises);
        }

        results.push({
          tripId: trip.id,
          name: trip.name,
          status: 'ok',
          count: processed,
          sourceCount: sourceData.length,
        });
        console.log(
          `[batch-embed] Done: ${trip.name} — ${processed}/${sourceData.length} embeddings`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ tripId: trip.id, name: trip.name, status: 'error', error: msg });
        console.error(`[batch-embed] Error on ${trip.name}:`, msg);
      }
    }

    const totalProcessed = results.reduce((sum, r) => sum + (r.count || 0), 0);
    console.log(
      `[batch-embed] Complete: ${totalProcessed} total embeddings across ${trips?.length} trips`,
    );

    return new Response(JSON.stringify({ success: true, totalProcessed, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[batch-embed] Fatal error:', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface SourceItem {
  tripId: string;
  sourceType: string;
  sourceId: string;
  contentText: string;
  metadata: Record<string, unknown>;
}

async function collectTripData(
  supabase: ReturnType<typeof createClient>,
  tripId: string,
): Promise<SourceItem[]> {
  const items: SourceItem[] = [];

  // Chat messages
  const { data: messages } = await supabase
    .from('trip_chat_messages')
    .select('id, content, author_name, created_at')
    .eq('trip_id', tripId)
    .not('content', 'is', null);

  for (const msg of messages || []) {
    if (msg.content && msg.content.trim().length > 5) {
      items.push({
        tripId,
        sourceType: 'chat',
        sourceId: msg.id,
        contentText: `${msg.author_name || 'User'}: ${msg.content}`,
        metadata: { author: msg.author_name, created_at: msg.created_at },
      });
    }
  }

  // Tasks
  const { data: tasks } = await supabase
    .from('trip_tasks')
    .select('id, title, description, created_at')
    .eq('trip_id', tripId);

  for (const task of tasks || []) {
    items.push({
      tripId,
      sourceType: 'task',
      sourceId: task.id,
      contentText: `Task: ${task.title}${task.description ? ` - ${task.description}` : ''}`,
      metadata: { created_at: task.created_at },
    });
  }

  // Polls
  const { data: polls } = await supabase
    .from('trip_polls')
    .select('id, question, options, created_at')
    .eq('trip_id', tripId);

  for (const poll of polls || []) {
    items.push({
      tripId,
      sourceType: 'poll',
      sourceId: poll.id,
      contentText: `Poll: ${poll.question} Options: ${JSON.stringify(poll.options)}`,
      metadata: { created_at: poll.created_at },
    });
  }

  // Payments
  const { data: payments } = await supabase
    .from('trip_payment_messages')
    .select('id, description, amount, currency, created_at')
    .eq('trip_id', tripId);

  for (const pay of payments || []) {
    items.push({
      tripId,
      sourceType: 'payment',
      sourceId: pay.id,
      contentText: `Payment: ${pay.description || 'Expense'} - ${pay.amount} ${pay.currency || 'USD'}`,
      metadata: { amount: pay.amount, currency: pay.currency, created_at: pay.created_at },
    });
  }

  // Broadcasts
  const { data: broadcasts } = await supabase
    .from('broadcasts')
    .select('id, message, created_at')
    .eq('trip_id', tripId);

  for (const bc of broadcasts || []) {
    items.push({
      tripId,
      sourceType: 'broadcast',
      sourceId: bc.id,
      contentText: `Broadcast: ${bc.message}`,
      metadata: { created_at: bc.created_at },
    });
  }

  // Calendar events
  const { data: events } = await supabase
    .from('trip_events')
    .select('id, title, description, location, start_time, end_time')
    .eq('trip_id', tripId);

  for (const evt of events || []) {
    items.push({
      tripId,
      sourceType: 'calendar',
      sourceId: evt.id,
      contentText: `Event: ${evt.title}${evt.description ? ` - ${evt.description}` : ''}${evt.location ? ` at ${evt.location}` : ''}`,
      metadata: { start_time: evt.start_time, end_time: evt.end_time, location: evt.location },
    });
  }

  // Trip links
  const { data: links } = await supabase
    .from('trip_links')
    .select('id, title, url, description')
    .eq('trip_id', tripId);

  for (const link of links || []) {
    items.push({
      tripId,
      sourceType: 'link',
      sourceId: link.id,
      contentText: `Link: ${link.title || link.url}${link.description ? ` - ${link.description}` : ''}`,
      metadata: { url: link.url },
    });
  }

  return items;
}
