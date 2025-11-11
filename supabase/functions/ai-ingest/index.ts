import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface IngestRequest {
  source: 'message' | 'poll' | 'broadcast' | 'file' | 'calendar' | 'link' | 'trip_batch';
  sourceId: string;
  tripId: string;
  content?: string;
}

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createOptionsResponse();
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { source, sourceId, tripId, content }: IngestRequest = await req.json();

    // Handle batch ingestion for entire trip
    if (source === 'trip_batch') {
      const batchResults = await Promise.all([
        ingestTripMessages(supabase, tripId),
        ingestTripPolls(supabase, tripId),
        ingestTripFiles(supabase, tripId),
        ingestTripLinks(supabase, tripId)
      ]);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Batch ingestion completed',
          results: batchResults
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!source || !sourceId || !tripId) {
      return new Response(
        JSON.stringify({ error: 'Source, sourceId, and tripId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
            const options = Array.isArray(poll.options) ? poll.options.map((opt: any) => opt.text || opt).join(', ') : '';
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
      return new Response(
        JSON.stringify({ error: 'No content to ingest' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: textContent.slice(0, 8000), // Limit input length
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // Create or update knowledge base document
    const { data: doc, error: docError } = await supabase
      .from('kb_documents')
      .upsert({
        trip_id: tripId,
        source: source,
        source_id: sourceId,
        modality: 'text',
        plain_text: textContent,
        metadata: { source, sourceId, ingested_at: new Date().toISOString() },
        chunk_count: 1
      }, {
        onConflict: 'source,source_id,trip_id'
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document:', docError);
      return new Response(
        JSON.stringify({ error: 'Failed to create document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete existing chunks for this document
    await supabase
      .from('kb_chunks')
      .delete()
      .eq('doc_id', doc.id);

    // Create new chunk with embedding
    const { error: chunkError } = await supabase
      .from('kb_chunks')
      .insert({
        doc_id: doc.id,
        chunk_index: 0,
        content: textContent,
        embedding: embedding,
        modality: 'text'
      });

    if (chunkError) {
      console.error('Error creating chunk:', chunkError);
      return new Response(
        JSON.stringify({ error: 'Failed to create chunk' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        docId: doc.id,
        contentLength: textContent.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-ingest function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Batch ingestion helpers
async function ingestTripMessages(supabase: any, tripId: string) {
  const { data: messages } = await supabase
    .from('trip_chat_messages')
    .select('*')
    .eq('trip_id', tripId);
    
  if (!messages?.length) return { type: 'messages', count: 0 };
  
  const results = await Promise.all(
    messages.map((msg: any) => ingestSingleItem(supabase, 'trip_chat_messages', msg.id, tripId, `${msg.author_name}: ${msg.content}`))
  );
  
  return { type: 'messages', count: results.length };
}

async function ingestTripPolls(supabase: any, tripId: string) {
  const { data: polls } = await supabase
    .from('trip_polls')
    .select('*')
    .eq('trip_id', tripId);
    
  if (!polls?.length) return { type: 'polls', count: 0 };
  
  const results = await Promise.all(
    polls.map((poll: any) => {
      const content = `Poll: ${poll.question}. Options: ${JSON.stringify(poll.options)}. Status: ${poll.status}. Total votes: ${poll.total_votes}`;
      return ingestSingleItem(supabase, 'trip_polls', poll.id, tripId, content);
    })
  );
  
  return { type: 'polls', count: results.length };
}

async function ingestTripFiles(supabase: any, tripId: string) {
  const { data: files } = await supabase
    .from('trip_files')
    .select('*')
    .eq('trip_id', tripId);
    
  if (!files?.length) return { type: 'files', count: 0 };
  
  const results = await Promise.all(
    files.map((file: any) => {
      const content = `File: ${file.name} (${file.file_type}). Summary: ${file.ai_summary || 'No summary'}. Content: ${file.content_text || 'No text content'}`;
      return ingestSingleItem(supabase, 'trip_files', file.id, tripId, content);
    })
  );
  
  return { type: 'files', count: results.length };
}

async function ingestTripLinks(supabase: any, tripId: string) {
  const { data: links } = await supabase
    .from('trip_links')
    .select('*')
    .eq('trip_id', tripId);
    
  if (!links?.length) return { type: 'links', count: 0 };
  
  const results = await Promise.all(
    links.map((link: any) => {
      const content = `Link: ${link.title}. URL: ${link.url}. Description: ${link.description || 'No description'}. Category: ${link.category || 'uncategorized'}. Votes: ${link.votes}`;
      return ingestSingleItem(supabase, 'trip_links', link.id, tripId, content);
    })
  );
  
  return { type: 'links', count: results.length };
}

async function ingestSingleItem(supabase: any, source: string, sourceId: string, tripId: string, content: string) {
  try {
    const embedding = await generateEmbedding(content);
    
    const { data: doc, error: docError } = await supabase
      .from('kb_documents')
      .upsert({
        trip_id: tripId,
        source: source,
        source_id: sourceId,
        plain_text: content,
        metadata: { ingested_at: new Date().toISOString() }
      })
      .select()
      .single();

    if (docError) throw docError;

    await supabase
      .from('kb_chunks')
      .delete()
      .eq('doc_id', doc.id);

    const { error: chunkError } = await supabase
      .from('kb_chunks')
      .insert({
        doc_id: doc.id,
        content: content,
        embedding: embedding,
        chunk_index: 0
      });

    if (chunkError) throw chunkError;
    
    return { success: true, docId: doc.id };
  } catch (error) {
    console.error(`Error ingesting ${source} ${sourceId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

async function generateEmbedding(text: string) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-ada-002',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}