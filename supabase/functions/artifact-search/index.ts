/**
 * artifact-search — Trip-scoped semantic retrieval over multimodal artifacts
 *
 * Embeds the query using Gemini Embedding 2, then performs cosine similarity
 * search over trip_artifacts with optional filters.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { sanitizeErrorForClient, logError } from '../_shared/errorHandling.ts';
import { embedText } from '../_shared/multimodalEmbeddings.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface SearchRequest {
  tripId: string;
  query: string;
  artifactTypes?: string[];
  sourceTypes?: string[];
  createdAfter?: string;
  createdBefore?: string;
  creatorId?: string;
  limit?: number;
  threshold?: number;
}

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: SearchRequest = await req.json();
    const { tripId, query, limit = 10, threshold = 0.5 } = body;

    if (!tripId || !query) {
      return new Response(
        JSON.stringify({ success: false, error: 'tripId and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Trip membership check
    const { data: membership, error: membershipError } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ success: false, error: 'Not a member of this trip' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `[artifact-search] Query: trip=${tripId} q="${query.substring(0, 80)}" limit=${limit}`,
    );

    // Embed the query
    const queryEmbedding = await embedText(query);

    // Search using the RPC
    const { data: results, error: searchError } = await supabase.rpc('search_trip_artifacts', {
      p_trip_id: tripId,
      p_query_embedding: queryEmbedding.embedding,
      p_match_threshold: threshold,
      p_match_count: limit,
      p_artifact_types: body.artifactTypes || null,
      p_source_types: body.sourceTypes || null,
      p_created_after: body.createdAfter || null,
      p_created_before: body.createdBefore || null,
      p_creator_id: body.creatorId || null,
    });

    if (searchError) {
      throw new Error(`Search RPC failed: ${searchError.message}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[artifact-search] Found ${results?.length || 0} results in ${elapsed}ms`);

    // Format results with grounded snippets
    const formattedResults = (results || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      tripId: r.trip_id,
      artifactType: r.artifact_type,
      sourceType: r.source_type,
      fileName: r.file_name,
      snippet: truncateSnippet(r.extracted_text as string | null, 300),
      summary: r.ai_summary,
      similarity: r.similarity,
      metadata: r.metadata,
      createdAt: r.created_at,
      creatorId: r.creator_id,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        results: formattedResults,
        query,
        elapsed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    logError('ARTIFACT_SEARCH', error, {});
    return new Response(
      JSON.stringify({ success: false, error: sanitizeErrorForClient(error), results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

function truncateSnippet(text: string | null, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
