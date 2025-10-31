import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface EmbeddingRequest {
  tripId: string
  sourceType?: 'chat' | 'task' | 'poll' | 'payment' | 'broadcast' | 'file' | 'link' | 'calendar' | 'all'
  forceRefresh?: boolean
}

interface SourceData {
  tripId: string
  sourceType: string
  sourceId: string
  contentText: string
  metadata: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting embedding generation')
    const { tripId, sourceType = 'all', forceRefresh = false, isDemoMode = false }: EmbeddingRequest & { isDemoMode?: boolean } = await req.json()
    
    if (!tripId) {
      throw new Error('tripId is required')
    }

    // Demo mode: Return mock success without processing
    if (isDemoMode) {
      console.log(`[Demo Mode] Skipping embedding generation for trip ${tripId} (using mock data)`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          totalProcessed: 15,
          results: { 
            chat: 5, 
            payment: 3, 
            calendar: 2, 
            task: 2, 
            poll: 1, 
            broadcast: 2 
          },
          tripId,
          sourceType,
          demoMode: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing embeddings for trip ${tripId}, sourceType: ${sourceType}, forceRefresh: ${forceRefresh}`)
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Determine which source types to process
    const sourceTypes = sourceType === 'all' 
      ? ['chat', 'task', 'poll', 'payment', 'broadcast', 'calendar', 'link', 'file']
      : [sourceType]

    let totalProcessed = 0
    const results: Record<string, number> = {}

    // Process each source type
    for (const type of sourceTypes) {
      try {
        console.log(`Fetching ${type} data for trip ${tripId}`)
        const sourceData = await fetchSourceData(supabase, tripId, type)
        
        if (sourceData.length === 0) {
          console.log(`No ${type} data found for trip ${tripId}`)
          results[type] = 0
          continue
        }

        console.log(`Generating embeddings for ${sourceData.length} ${type} items`)
        const embeddings = await generateEmbeddings(sourceData)
        
        // Upsert embeddings to database
        const { error } = await supabase
          .from('trip_embeddings')
          .upsert(embeddings, { 
            onConflict: 'trip_id,source_type,source_id',
            ignoreDuplicates: !forceRefresh 
          })

        if (error) {
          console.error(`Error upserting ${type} embeddings:`, error)
          throw error
        }

        console.log(`Successfully processed ${embeddings.length} ${type} embeddings`)
        results[type] = embeddings.length
        totalProcessed += embeddings.length
      } catch (error) {
        console.error(`Error processing ${type}:`, error)
        results[type] = -1 // Indicate error
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalProcessed,
        results,
        tripId,
        sourceType 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Embedding generation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function fetchSourceData(supabase: any, tripId: string, sourceType: string): Promise<SourceData[]> {
  const queries: Record<string, () => Promise<any>> = {
    chat: async () => {
      const { data, error } = await supabase
        .from('trip_chat_messages')
        .select('id, content, author_name, created_at')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(100) // Limit to recent messages
      return { data, error }
    },
    task: async () => {
      const { data, error } = await supabase
        .from('trip_tasks')
        .select('id, title, description, creator_id, created_at')
        .eq('trip_id', tripId)
      return { data, error }
    },
    poll: async () => {
      const { data, error } = await supabase
        .from('trip_polls')
        .select('id, question, options, created_at')
        .eq('trip_id', tripId)
      return { data, error }
    },
    payment: async () => {
      const { data, error } = await supabase
        .from('trip_payment_messages')
        .select('id, description, amount, currency, created_at')
        .eq('trip_id', tripId)
      return { data, error }
    },
    broadcast: async () => {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('id, message, priority, created_at')
        .eq('trip_id', tripId)
      return { data, error }
    },
    calendar: async () => {
      const { data, error } = await supabase
        .from('trip_events')
        .select('id, title, description, location, start_time')
        .eq('trip_id', tripId)
      return { data, error }
    },
    link: async () => {
      const { data, error } = await supabase
        .from('trip_links')
        .select('id, url, title, description, created_at')
        .eq('trip_id', tripId)
      return { data, error }
    },
    file: async () => {
      const { data, error } = await supabase
        .from('trip_files')
        .select('id, file_name, created_at')
        .eq('trip_id', tripId)
      return { data, error }
    }
  }

  const query = queries[sourceType]
  if (!query) {
    throw new Error(`Unknown source type: ${sourceType}`)
  }

  const { data, error } = await query()
  if (error) {
    console.error(`Error fetching ${sourceType} data:`, error)
    throw error
  }
  
  if (!data || data.length === 0) {
    return []
  }

  return data.map((item: any) => ({
    tripId,
    sourceType,
    sourceId: item.id,
    contentText: buildContentText(item, sourceType),
    metadata: buildMetadata(item, sourceType)
  }))
}

function buildContentText(item: any, sourceType: string): string {
  switch (sourceType) {
    case 'chat':
      return `${item.author_name}: ${item.content}`
    case 'task':
      return `Task: ${item.title}${item.description ? `. ${item.description}` : ''}`
    case 'poll':
      const options = Array.isArray(item.options) 
        ? item.options.map((o: any) => o.text || o).join(', ')
        : 'No options'
      return `Poll: ${item.question}. Options: ${options}`
    case 'payment':
      return `Payment: ${item.description || 'Payment'}. Amount: ${item.currency} ${item.amount}`
    case 'broadcast':
      return `Broadcast [${item.priority || 'normal'}]: ${item.message}`
    case 'calendar':
      return `Event: ${item.title}${item.location ? ` at ${item.location}` : ''}${item.description ? `. ${item.description}` : ''}`
    case 'link':
      return `Link: ${item.title || item.url}${item.description ? `. ${item.description}` : ''}`
    case 'file':
      return `File: ${item.file_name}`
    default:
      return JSON.stringify(item)
  }
}

function buildMetadata(item: any, sourceType: string): any {
  const base = { 
    source_type: sourceType, 
    source_id: item.id,
    created_at: item.created_at
  }
  
  switch (sourceType) {
    case 'chat':
      return { ...base, author: item.author_name }
    case 'payment':
      return { ...base, amount: item.amount, currency: item.currency }
    case 'calendar':
      return { ...base, location: item.location, start_time: item.start_time }
    case 'link':
      return { ...base, url: item.url }
    default:
      return base
  }
}

async function generateEmbeddings(sourceData: SourceData[]): Promise<any[]> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured')
  }

  const embeddings = []
  
  // Batch requests to Lovable AI (max 100 per batch)
  for (let i = 0; i < sourceData.length; i += 100) {
    const batch = sourceData.slice(i, i + 100)
    
    console.log(`Processing batch ${Math.floor(i / 100) + 1} of ${Math.ceil(sourceData.length / 100)}`)
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/text-embedding-004',
        input: batch.map(item => item.contentText)
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Embedding API error: ${response.status} - ${errorText}`)
      throw new Error(`Embedding API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.data || !Array.isArray(data.data)) {
      console.error('Invalid embedding response:', data)
      throw new Error('Invalid embedding response from API')
    }

    batch.forEach((item, idx) => {
      embeddings.push({
        trip_id: item.tripId,
        source_type: item.sourceType,
        source_id: item.sourceId,
        content_text: item.contentText,
        embedding: data.data[idx].embedding,
        metadata: item.metadata
      })
    })
  }
  
  return embeddings
}
