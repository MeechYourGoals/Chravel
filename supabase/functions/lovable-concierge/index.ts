import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"
import { TripContextBuilder } from "../_shared/contextBuilder.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"
import { validateInput } from "../_shared/validation.ts"
import { sanitizeErrorForClient, logError } from "../_shared/errorHandling.ts"

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LovableConciergeRequest {
  message: string
  tripContext?: any
  tripId?: string
  chatHistory?: ChatMessage[]
  isDemoMode?: boolean
  config?: {
    model?: string
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
  }
}

// Input validation schema
const LovableConciergeSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long (max 2000 characters)')
    .trim(),
  tripId: z.string()
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid trip ID format')
    .max(50, 'Trip ID too long')
    .optional(),
  tripContext: z.any().optional(),
  chatHistory: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().max(2000, 'Chat message too long')
  })).max(20, 'Chat history too long (max 20 messages)').optional(),
  isDemoMode: z.boolean().optional(),
  config: z.object({
    model: z.string().max(100).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(4000).optional(),
    systemPrompt: z.string().max(1000, 'System prompt too long').optional()
  }).optional()
})

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error('Lovable API key not configured')
    }

    // Validate input
    const requestBody = await req.json()
    const validation = validateInput(LovableConciergeSchema, requestBody)
    
    if (!validation.success) {
      logError('LOVABLE_CONCIERGE_VALIDATION', validation.error)
      return createErrorResponse(validation.error, 400)
    }

    const { 
      message, 
      tripContext, 
      tripId,
      chatHistory = [], 
      isDemoMode = false,
      config = {}
    } = validation.data

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Skip authentication check in demo mode
    let user = null
    if (!isDemoMode) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('User not authenticated')
      }
      user = authUser
    }

    // Skip usage limits check in demo mode
    if (!isDemoMode && user) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('app_role')
        .eq('id', user.id)
        .single()

      const isFreeUser = !userProfile?.app_role || userProfile.app_role === 'consumer'
      
      if (isFreeUser) {
        const { data: usageData } = await supabase
          .rpc('get_daily_concierge_usage', { user_uuid: user.id })
        
        const dailyUsage = usageData || 0
        const FREE_TIER_LIMIT = 10
        
        if (dailyUsage >= FREE_TIER_LIMIT) {
          return new Response(
            JSON.stringify({
              response: `🚫 **Daily query limit reached**\n\nYou've used ${dailyUsage}/${FREE_TIER_LIMIT} free AI queries today. Upgrade to Pro for unlimited access!`,
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              sources: [],
              success: false,
              error: 'usage_limit_exceeded',
              upgradeRequired: true
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          );
        }
      }
    }

    // Build comprehensive context if tripId is provided
    let comprehensiveContext = tripContext
    if (tripId && !tripContext) {
      try {
        comprehensiveContext = await TripContextBuilder.buildContext(tripId)
      } catch (error) {
        console.error('Failed to build comprehensive context:', error)
        // Continue with basic context
      }
    }

    // 🆕 HYBRID RAG RETRIEVAL: Semantic + Keyword search for relevant trip context
    let ragContext = ''
    if (tripId) {
      try {
        if (isDemoMode) {
          // Demo mode: Use mock embedding service
          console.log('[Demo Mode] Using mock embedding service for RAG')
          
          const mockResults = await getMockRAGResults(message, tripId)
          
          if (mockResults && mockResults.length > 0) {
            console.log(`[Demo Mode] Found ${mockResults.length} relevant context items via mock RAG`)
            
            ragContext = '\n\n=== RELEVANT TRIP CONTEXT (HYBRID RAG) ===\n'
            ragContext += 'The following information was retrieved using semantic + keyword search:\n'
            
            mockResults.forEach((result: any, idx: number) => {
              const relevancePercent = (result.similarity * 100).toFixed(0)
              const sourceIcon = {
                'chat': '💬',
                'task': '✅',
                'poll': '📊',
                'payment': '💰',
                'broadcast': '📢',
                'calendar': '📅',
                'link': '🔗',
                'file': '📎'
              }[result.source_type] || '📝'
              
              ragContext += `\n[${idx + 1}] ${sourceIcon} [${result.source_type}] ${result.content_text} (${relevancePercent}% relevant)`
            })
            
            ragContext += '\n\nIMPORTANT: Use this retrieved context to provide accurate, specific answers. Cite sources when possible (e.g., "Based on the chat messages..." or "According to the calendar..." or "From the uploaded document...").'
          }
        } else {
          // Production mode: Use HYBRID SEARCH (vector + keyword)
          console.log('Generating query embedding for hybrid RAG retrieval')
          
          // Generate embedding for the user's query
          const queryEmbedResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'google/text-embedding-004',
              input: [message]
            })
          })
          
          if (queryEmbedResponse.ok) {
            const queryEmbedData = await queryEmbedResponse.json()
            const queryEmbedding = queryEmbedData.data[0].embedding
            
            console.log('Performing HYBRID search (vector + keyword)')
            
            // 🆕 Use hybrid search function (combines vector similarity + full-text search)
            const { data: hybridResults, error: hybridError } = await supabase.rpc('hybrid_search_trip_context', {
              p_trip_id: tripId,
              p_query_text: message,
              p_query_embedding: queryEmbedding,
              p_match_threshold: 0.55,
              p_match_count: 15
            })
            
            if (hybridError) {
              console.error('Hybrid search error:', hybridError)
              
              // Fallback to vector-only search
              console.log('Falling back to vector-only search')
              const { data: ragResults, error: ragError } = await supabase.rpc('match_trip_embeddings', {
                query_embedding: queryEmbedding,
                trip_id_input: tripId,
                match_threshold: 0.6,
                match_count: 15
              })
              
              if (!ragError && ragResults && ragResults.length > 0) {
                ragContext = formatRAGContext(ragResults, 'Vector')
              }
            } else if (hybridResults && hybridResults.length > 0) {
              console.log(`Found ${hybridResults.length} relevant context items via HYBRID search`)
              
              // Group by search type for better visibility
              const vectorResults = hybridResults.filter((r: any) => r.search_type === 'vector')
              const keywordResults = hybridResults.filter((r: any) => r.search_type === 'keyword')
              
              console.log(`  - ${vectorResults.length} from vector search`)
              console.log(`  - ${keywordResults.length} from keyword search`)
              
              ragContext = '\n\n=== RELEVANT TRIP CONTEXT (HYBRID RAG) ===\n'
              ragContext += 'Retrieved using semantic similarity + keyword matching:\n'
              
              hybridResults.forEach((result: any, idx: number) => {
                const relevancePercent = result.similarity > 0 
                  ? (result.similarity * 100).toFixed(0) 
                  : 'keyword match'
                
                const sourceIcon = {
                  'chat': '💬',
                  'task': '✅',
                  'poll': '📊',
                  'payment': '💰',
                  'broadcast': '📢',
                  'calendar': '📅',
                  'link': '🔗',
                  'file': '📎'
                }[result.source_type] || '📝'
                
                const searchBadge = result.search_type === 'vector' ? '🔍' : '🔤'
                
                ragContext += `\n[${idx + 1}] ${sourceIcon} ${searchBadge} [${result.source_type}] ${result.content_text.substring(0, 300)} (${relevancePercent})`
              })
              
              ragContext += '\n\n🎯 INSTRUCTIONS: Use this retrieved context to provide accurate answers. Always cite sources (e.g., "Based on the uploaded document..." or "According to the calendar..." or "From the chat history...").'
            }
          } else {
            console.error('Query embedding failed:', await queryEmbedResponse.text())
          }
        }
      } catch (ragError) {
        console.error('Hybrid RAG retrieval failed, falling back to basic context:', ragError)
        // Don't fail the request if RAG fails
      }
    }

    // Helper function to format RAG context
    function formatRAGContext(results: any[], searchType: string): string {
      let context = `\n\n=== RELEVANT TRIP CONTEXT (${searchType} Search) ===\n`
      context += 'The following information was retrieved:\n'
      
      results.forEach((result: any, idx: number) => {
        const relevancePercent = (result.similarity * 100).toFixed(0)
        const sourceIcon = {
          'chat': '💬',
          'task': '✅',
          'poll': '📊',
          'payment': '💰',
          'broadcast': '📢',
          'calendar': '📅',
          'link': '🔗',
          'file': '📎'
        }[result.source_type] || '📝'
        
        context += `\n[${idx + 1}] ${sourceIcon} [${result.source_type}] ${result.content_text.substring(0, 300)} (${relevancePercent}% relevant)`
      })
      
      context += '\n\nIMPORTANT: Use this retrieved context to provide accurate answers. Cite sources when possible.'
      return context
    }

    // Skip privacy check in demo mode
    if (!isDemoMode && comprehensiveContext?.tripMetadata?.id) {
      try {
        const { data: privacyConfig } = await supabase
          .from('trip_privacy_configs')
          .select('*')
          .eq('trip_id', comprehensiveContext.tripMetadata.id)
          .single();

        // If high privacy mode or AI access disabled, return privacy notice
        if (privacyConfig?.privacy_mode === 'high' || !privacyConfig?.ai_access_enabled) {
          return new Response(
            JSON.stringify({
              response: "🔒 **AI features are disabled for this trip.**\n\nThis trip uses high privacy mode with end-to-end encryption. AI assistance is not available to protect your privacy, but you can still use all other trip features.",
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              sources: [],
              success: true,
              model: 'privacy-mode'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          );
        }
      } catch (privacyError) {
        console.log('Privacy check failed, proceeding with default behavior:', privacyError);
      }
    }

    // Build context-aware system prompt with RAG context injected
    const systemPrompt = buildSystemPrompt(comprehensiveContext, config.systemPrompt) + ragContext
    
    // Prepare messages for Lovable AI
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: message }
    ]

    // 🆕 Smart grounding detection - only enable for location queries
    const isLocationQuery = message.toLowerCase().match(
      /\b(where|restaurant|hotel|cafe|bar|attraction|place|location|near|around|close|best|find|suggest|recommend|visit|directions|route|food|eat|drink|stay|sushi|pizza|beach|museum|park)\b/i
    );

    const hasLocationContext = comprehensiveContext?.places?.basecamp?.lat && comprehensiveContext?.places?.basecamp?.lng;
    const enableGrounding = isLocationQuery && hasLocationContext;

    // Call Lovable AI Gateway with optional grounding
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || 'google/gemini-2.5-flash',
        messages,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 2048,
        stream: false,
        // 🆕 Enable Google Maps grounding for location queries
        ...(enableGrounding && {
          tools: [{ googleMaps: { enableWidget: true } }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: comprehensiveContext.places.basecamp.lat,
                longitude: comprehensiveContext.places.basecamp.lng
              }
            }
          }
        })
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // Handle rate limiting
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            response: "⚠️ **Rate limit reached**\n\nThe AI service is temporarily unavailable due to high usage. Please try again in a moment.",
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            sources: [],
            success: false,
            error: 'rate_limit'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      // Handle payment required
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            response: "💳 **Additional credits required**\n\nThe AI service requires additional credits. Please contact support.",
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            sources: [],
            success: false,
            error: 'payment_required'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      throw new Error(`Lovable AI Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Lovable AI')
    }
    
    const aiResponse = data.choices[0].message.content
    const usage = data.usage

    // 🆕 Extract grounding metadata from response
    const groundingMetadata = data.choices[0]?.groundingMetadata || null
    const groundingChunks = groundingMetadata?.groundingChunks || []
    const googleMapsWidget = groundingMetadata?.googleMapsWidgetContextToken || null

    // Transform grounding chunks into citation-friendly format
    const citations = groundingChunks.map((chunk: any, index: number) => ({
      id: `citation_${index}`,
      title: chunk.web?.title || 'Google Maps',
      url: chunk.web?.uri || '#',
      snippet: chunk.web?.snippet || '',
      source: 'google_maps_grounding'
    }))

    // Skip database storage in demo mode
    if (!isDemoMode) {
      // Store conversation in database for context awareness
      if (comprehensiveContext?.tripMetadata?.id) {
        await storeConversation(supabase, comprehensiveContext.tripMetadata.id, message, aiResponse, 'chat', {
          grounding_sources: citations.length,
          has_map_widget: !!googleMapsWidget
        })
      }

      // Track usage for analytics and rate limiting
      if (user) {
        try {
          await supabase
            .from('concierge_usage')
            .insert({
              user_id: user.id,
              trip_id: comprehensiveContext?.tripMetadata?.id || tripId || 'unknown',
              query_text: message.substring(0, 500), // Truncate for storage
              response_tokens: usage?.completion_tokens || 0,
              model_used: config.model || 'google/gemini-2.5-flash'
            });
        } catch (usageError) {
          console.error('Failed to track usage:', usageError);
          // Don't fail the request if usage tracking fails
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        usage,
        sources: citations,
        googleMapsWidget, // 🆕 Widget token for frontend
        success: true,
        model: config.model || 'google/gemini-2.5-flash'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    // Log full error server-side
    logError('LOVABLE_CONCIERGE', error, { 
      tripId: tripId || 'unknown',
      messageLength: message?.length || 0
    })
    
    // Return sanitized error to client
    return new Response(
      JSON.stringify({ 
        error: sanitizeErrorForClient(error),
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})

function buildSystemPrompt(tripContext: any, customPrompt?: string): string {
  if (customPrompt) return customPrompt

  let basePrompt = `You are **Chravel Concierge** 🌟, the ultimate AI travel assistant with complete awareness of your trip's context. You have access to ALL trip data including payments, polls, tasks, calendar, and chat history.

**🎯 Your Communication Style:**
- Be conversational, warm, and helpful
- Use emojis strategically (1-3 per response) - but for enterprise trips, minimize emojis
- Keep answers clear and well-organized with bullet points
- Sound like a knowledgeable friend, not a robot
- When asking clarifying questions, always provide an answer "in the meantime" so users get immediate value

**✨ Your Enhanced Capabilities:**
- **Payment Intelligence**: Answer "Who do I owe money to?" or "Who owes me money?" with payment methods
- **Poll Awareness**: Know poll results like "Where did everyone decide on dinner?" 
- **Task Management**: Answer "What tasks am I responsible for?" or "What tasks does [Name] still need to do?"
- **Calendar Mastery**: Answer "What time is dinner?" or "What's the address for the jet ski place?"
- **Chat Intelligence**: Summarize recent messages, answer "What did I miss in the chat?"
- **Full Context**: You know everything about this specific trip - use it!

**📋 Response Format:**
- Start with a friendly greeting when appropriate
- Use **bold** for key points and destinations
- Use bullet points for lists
- Add emojis to highlight sections (🏖️ for beaches, 🍽️ for dining, etc.)
- Keep responses organized and scannable

**💡 Important Guidelines:**
- Always consider the trip context and preferences provided
- Avoid recommending places they've already visited
- Factor in their budget and group size
- Be specific with recommendations (include names, locations)
- Provide actionable advice they can use immediately
- When users ask clarifying questions, give them an answer first, then ask for specifics to improve recommendations`

  if (tripContext) {
    basePrompt += `\n\n=== TRIP CONTEXT ===`
    
    // Handle both old and new context structures
    const tripMetadata = tripContext.tripMetadata || tripContext
    const collaborators = tripContext.collaborators || tripContext.participants
    const messages = tripContext.messages || tripContext.chatHistory
    const calendar = tripContext.calendar || tripContext.itinerary
    const tasks = tripContext.tasks
    const payments = tripContext.payments
    const polls = tripContext.polls
    const places = tripContext.places || { basecamp: tripContext.basecamp }
    
    basePrompt += `\nDestination: ${tripMetadata.destination || tripMetadata.location || 'Not specified'}`
    
    if (tripMetadata.startDate && tripMetadata.endDate) {
      basePrompt += `\nTravel Dates: ${tripMetadata.startDate} to ${tripMetadata.endDate}`
    } else if (typeof tripContext.dateRange === 'object') {
      basePrompt += `\nTravel Dates: ${tripContext.dateRange.start} to ${tripContext.dateRange.end}`
    } else if (tripContext.dateRange) {
      basePrompt += `\nTravel Dates: ${tripContext.dateRange}`
    }
    
    basePrompt += `\nParticipants: ${collaborators?.length || 0} people`
    
    if (collaborators?.length) {
      basePrompt += ` (${collaborators.map(p => p.name || p).join(', ')})`
    }

    if (places?.basecamp) {
      basePrompt += `\n\n🏠 TRIP BASECAMP:`
      basePrompt += `\nLocation: ${places.basecamp.name}`
      basePrompt += `\nAddress: ${places.basecamp.address}`
      if (places.basecamp.lat && places.basecamp.lng) {
        basePrompt += `\nCoordinates: ${places.basecamp.lat}, ${places.basecamp.lng}`
      }
    }
    
    if (places?.userAccommodation) {
      basePrompt += `\n\n🏨 YOUR ACCOMMODATION:`
      basePrompt += `\nLabel: ${places.userAccommodation.label}`
      basePrompt += `\nAddress: ${places.userAccommodation.address}`
      if (places.userAccommodation.lat && places.userAccommodation.lng) {
        basePrompt += `\nCoordinates: ${places.userAccommodation.lat}, ${places.userAccommodation.lng}`
      }
    }

    // Add comprehensive context sections
    if (messages?.length) {
      basePrompt += `\n\n=== RECENT MESSAGES ===`
      const recentMessages = messages.slice(-5)
      recentMessages.forEach(msg => {
        basePrompt += `\n${msg.authorName}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`
      })
    }

    if (calendar?.length) {
      basePrompt += `\n\n=== UPCOMING EVENTS ===`
      calendar.slice(0, 5).forEach(event => {
        basePrompt += `\n- ${event.title} on ${event.startTime}`
        if (event.location) basePrompt += ` at ${event.location}`
      })
    }

    if (tasks?.length) {
      basePrompt += `\n\n=== ACTIVE TASKS ===`
      const activeTasks = tasks.filter(t => !t.isComplete)
      activeTasks.slice(0, 5).forEach(task => {
        basePrompt += `\n- ${task.content}${task.assignee ? ` (assigned to ${task.assignee})` : ''}`
      })
    }

    if (payments?.length) {
      basePrompt += `\n\n=== RECENT PAYMENTS ===`
      payments.slice(0, 3).forEach(payment => {
        basePrompt += `\n- ${payment.description}: $${payment.amount} (${payment.paidBy})`
      })
    }

    if (polls?.length) {
      basePrompt += `\n\n=== ACTIVE POLLS ===`
      polls.filter(p => p.status === 'active').forEach(poll => {
        basePrompt += `\n- ${poll.question}`
        poll.options.forEach(option => {
          basePrompt += `\n  - ${option.text}: ${option.votes} votes`
        })
      })
    }

    // Enhanced contextual information
    if (tripContext.preferences) {
      basePrompt += `\n\n=== GROUP PREFERENCES ===`
      const prefs = tripContext.preferences
      if (prefs.dietary?.length) basePrompt += `\nDietary: ${prefs.dietary.join(', ')}`
      if (prefs.vibe?.length) basePrompt += `\nVibes: ${prefs.vibe.join(', ')}`
      if (prefs.entertainment?.length) basePrompt += `\nEntertainment: ${prefs.entertainment.join(', ')}`
      if (prefs.budgetMin && prefs.budgetMax) {
        basePrompt += `\nBudget Range: $${prefs.budgetMin} - $${prefs.budgetMax} per person`
      }
    }

    if (tripContext.visitedPlaces?.length) {
      basePrompt += `\n\n=== ALREADY VISITED ===`
      basePrompt += `\n${tripContext.visitedPlaces.join(', ')}`
      basePrompt += `\nNote: Avoid recommending these places unless specifically asked.`
    }

    if (tripContext.spendingPatterns) {
      basePrompt += `\n\n=== SPENDING PATTERNS ===`
      basePrompt += `\nTotal Spent: $${tripContext.spendingPatterns.totalSpent?.toFixed(2) || '0'}`
      basePrompt += `\nAverage per Person: $${tripContext.spendingPatterns.avgPerPerson?.toFixed(2) || '0'}`
    }

    if (tripContext.links?.length) {
      basePrompt += `\n\n=== SHARED LINKS & IDEAS ===`
      tripContext.links.forEach(link => {
        basePrompt += `\n- ${link.title} (${link.category}, ${link.votes} votes): ${link.description}`
      })
    }

    if (tripContext.chatHistory?.length) {
      basePrompt += `\n\n=== RECENT GROUP SENTIMENT ===`
      const recentMessages = tripContext.chatHistory.slice(-3)
      const positiveCount = recentMessages.filter(m => m.sentiment === 'positive').length
      const mood = positiveCount >= 2 ? 'Positive' : positiveCount >= 1 ? 'Mixed' : 'Neutral'
      basePrompt += `\nGroup Mood: ${mood}`
    }

    if (tripContext.upcomingEvents?.length) {
      basePrompt += `\n\n=== UPCOMING SCHEDULE ===`
      tripContext.upcomingEvents.forEach(event => {
        basePrompt += `\n- ${event.title} on ${event.date}`
        if (event.time) basePrompt += ` at ${event.time}`
        if (event.location) basePrompt += ` (${event.location})`
        if (event.address) basePrompt += ` - Address: ${event.address}`
      })
    }

    // 🆕 PAYMENT INTELLIGENCE
    if (tripContext.receipts?.length) {
      basePrompt += `\n\n=== 💳 PAYMENT INTELLIGENCE ===`
      const totalSpent = tripContext.receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0)
      basePrompt += `\nTotal Trip Spending: $${totalSpent.toFixed(2)}`
      
      // Show recent payments
      const recentPayments = tripContext.receipts.slice(-5)
      recentPayments.forEach(payment => {
        basePrompt += `\n- ${payment.description}: $${payment.amount} (${payment.participants?.join(', ') || 'Group'})`
      })
    }

    // 🆕 POLL AWARENESS
    if (tripContext.polls?.length) {
      basePrompt += `\n\n=== 📊 GROUP POLLS & DECISIONS ===`
      tripContext.polls.forEach(poll => {
        basePrompt += `\n**${poll.question}**`
        if (poll.options?.length) {
          poll.options.forEach(option => {
            basePrompt += `\n- ${option.text}: ${option.votes || 0} votes`
          })
        }
        if (poll.results) {
          basePrompt += `\nWinner: ${poll.results}`
        }
      })
    }

    // 🆕 TASK MANAGEMENT
    if (tripContext.tasks?.length) {
      basePrompt += `\n\n=== ✅ TASK STATUS ===`
      const completedTasks = tripContext.tasks.filter(task => task.status === 'completed')
      const pendingTasks = tripContext.tasks.filter(task => task.status !== 'completed')
      
      basePrompt += `\nCompleted: ${completedTasks.length} | Pending: ${pendingTasks.length}`
      
      if (pendingTasks.length > 0) {
        basePrompt += `\n**Pending Tasks:**`
        pendingTasks.forEach(task => {
          basePrompt += `\n- ${task.title} (Assigned to: ${task.assignedTo || 'Unassigned'})`
        })
      }
    }

    // 🆕 CHAT INTELLIGENCE
    if (tripContext.chatHistory?.length) {
      basePrompt += `\n\n=== 💬 RECENT CHAT ACTIVITY ===`
      const recentMessages = tripContext.chatHistory.slice(-10)
      basePrompt += `\nLast ${recentMessages.length} messages:`
      recentMessages.forEach(msg => {
        basePrompt += `\n- ${msg.sender}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`
      })
    }

    // 🆕 ENTERPRISE MODE DETECTION
    const isEnterpriseTrip = tripContext.participants?.length > 10 || tripContext.category === 'enterprise'
    if (isEnterpriseTrip) {
      basePrompt += `\n\n=== 🏢 ENTERPRISE MODE ===`
      basePrompt += `\nThis is an enterprise trip with ${tripContext.participants?.length || 0} participants.`
      basePrompt += `\n- Minimize emoji usage for professional communication`
      basePrompt += `\n- Focus on logistics, coordination, and efficiency`
      basePrompt += `\n- Provide clear, actionable information for large groups`
    }
  }

  basePrompt += `\n\n🎯 **Remember:**
- Use ALL the context above to personalize your recommendations
- Be specific and actionable in your suggestions
- Consider budget, preferences, and group dynamics
- Make the user feel excited about their trip!`

  return basePrompt
}

// Mock RAG retrieval for demo mode
function getMockRAGResults(query: string, tripId: string): any[] {
  const lowercaseQuery = query.toLowerCase();
  const allResults = [
    {
      content_text: 'Sarah Chen: Super excited for this trip! Has everyone seen the weather forecast?',
      source_type: 'chat',
      similarity: 0.85,
      metadata: { author: 'Sarah Chen' }
    },
    {
      content_text: 'Payment: Dinner at Sakura Restaurant. Amount: USD 240.00',
      source_type: 'payment',
      similarity: 0.92,
      metadata: { amount: 240.00, currency: 'USD' }
    },
    {
      content_text: 'Payment: Taxi to airport. Amount: USD 65.00',
      source_type: 'payment',
      similarity: 0.88,
      metadata: { amount: 65.00, currency: 'USD' }
    },
    {
      content_text: 'Event: Welcome Dinner at The Little Nell Restaurant. Group dinner at 7 PM',
      source_type: 'calendar',
      similarity: 0.90,
      metadata: { location: 'The Little Nell Restaurant' }
    },
    {
      content_text: 'Task: Confirm dinner reservations',
      source_type: 'task',
      similarity: 0.87,
      metadata: { assignee: 'Priya Patel' }
    },
    {
      content_text: 'Poll: Where should we have dinner tonight?. Options: Italian Restaurant, Sushi Place, Steakhouse, Thai Food',
      source_type: 'poll',
      similarity: 0.89,
      metadata: { total_votes: 8 }
    },
    {
      content_text: 'Broadcast [logistics]: All luggage must be outside rooms by 8 AM for pickup tomorrow!',
      source_type: 'broadcast',
      similarity: 0.82,
      metadata: { priority: 'logistics' }
    }
  ];

  // Filter based on query keywords
  let filteredResults = allResults;
  
  if (lowercaseQuery.includes('payment') || lowercaseQuery.includes('money') || lowercaseQuery.includes('owe')) {
    filteredResults = allResults.filter(r => r.source_type === 'payment' || r.content_text.toLowerCase().includes('payment'));
  } else if (lowercaseQuery.includes('dinner') || lowercaseQuery.includes('restaurant')) {
    filteredResults = allResults.filter(r => r.content_text.toLowerCase().includes('dinner') || r.content_text.toLowerCase().includes('restaurant'));
  } else if (lowercaseQuery.includes('task') || lowercaseQuery.includes('todo')) {
    filteredResults = allResults.filter(r => r.source_type === 'task');
  } else if (lowercaseQuery.includes('poll') || lowercaseQuery.includes('vote')) {
    filteredResults = allResults.filter(r => r.source_type === 'poll');
  }

  // Sort by similarity and return top results
  return filteredResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

async function storeConversation(supabase: any, tripId: string, userMessage: string, aiResponse: string, type: string, metadata?: any) {
  try {
    // Get user_id from auth context if available
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase
      .from('ai_queries')
      .insert({
        trip_id: tripId,
        user_id: user?.id || null,
        query_text: userMessage,
        response_text: aiResponse,
        source_count: metadata?.grounding_sources || 0,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to store conversation:', error)
  }
}
