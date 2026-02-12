import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { TripContextBuilder } from '../_shared/contextBuilder.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { validateInput } from '../_shared/validation.ts';
import { sanitizeErrorForClient, logError } from '../_shared/errorHandling.ts';
import {
  analyzeQueryComplexity,
  filterProfanity,
  redactPII,
  buildEnhancedSystemPrompt,
  requiresChainOfThought,
} from '../_shared/aiUtils.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LovableConciergeRequest {
  message: string;
  tripContext?: any;
  tripId?: string;
  chatHistory?: ChatMessage[];
  isDemoMode?: boolean;
  config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

// Input validation schema - increased limits for better context handling
const LovableConciergeSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message too long (max 4000 characters)')
    .trim(),
  tripId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid trip ID format')
    .max(50, 'Trip ID too long')
    .optional(),
  tripContext: z.any().optional(),
  // 🆕 Accept preferences from client as fallback
  preferences: z
    .object({
      dietary: z.array(z.string()).optional(),
      vibe: z.array(z.string()).optional(),
      accessibility: z.array(z.string()).optional(),
      business: z.array(z.string()).optional(),
      entertainment: z.array(z.string()).optional(),
      lifestyle: z.array(z.string()).optional(),
      budgetMin: z.number().optional(),
      budgetMax: z.number().optional(),
      timePreference: z.string().optional(),
    })
    .optional(),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().max(20000, 'Chat message too long'),
      }),
    )
    .max(20, 'Chat history too long (max 20 messages)')
    .optional(),
  isDemoMode: z.boolean().optional(),
  config: z
    .object({
      model: z.string().max(100).optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(4000).optional(),
      systemPrompt: z.string().max(2000, 'System prompt too long').optional(),
    })
    .optional(),
});

const TRIP_SCOPED_QUERY_PATTERN =
  /\b(trip|itinerary|schedule|calendar|event|dinner|lunch|breakfast|reservation|basecamp|hotel|flight|task|todo|payment|owe|expense|poll|vote|chat|message|broadcast|address|meeting|check[- ]?in|check[- ]?out)\b/i;

function shouldRunRAGRetrieval(query: string, tripId: string): boolean {
  if (!tripId || tripId === 'unknown') return false;

  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 6) return false;

  return TRIP_SCOPED_QUERY_PATTERN.test(normalizedQuery);
}

serve(async req => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let message = '';
  let tripId = 'unknown';

  try {
    // Early health check path - responds immediately without AI processing
    if (req.method === 'GET') {
      return createSecureResponse({
        status: 'healthy',
        service: 'lovable-concierge',
        timestamp: new Date().toISOString(),
        message: 'AI Concierge service is online',
      });
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('Lovable API key not configured');
    }

    // Validate input
    const requestBody = await req.json();

    // Handle ping/health check via POST with simple response
    if (requestBody.message === 'ping' || requestBody.message === 'health_check') {
      return createSecureResponse({
        status: 'healthy',
        service: 'lovable-concierge',
        timestamp: new Date().toISOString(),
        message: 'AI Concierge service is online',
      });
    }
    const validation = validateInput(LovableConciergeSchema, requestBody);

    if (!validation.success) {
      logError('LOVABLE_CONCIERGE_VALIDATION', validation.error);
      return createErrorResponse(validation.error, 400);
    }

    const validatedData = validation.data;
    message = validatedData.message;
    tripId = validatedData.tripId || 'unknown';
    const { tripContext, chatHistory = [], config = {}, isDemoMode = false } = validatedData;

    // 🆕 SAFETY: Content filtering and PII redaction
    const profanityCheck = filterProfanity(message);
    if (!profanityCheck.isClean) {
      console.warn('[Safety] Profanity detected in query:', profanityCheck.violations);
      // Log but don't block - allow user to proceed with filtered text
    }

    // Redact PII from logs (but keep original for AI processing)
    const piiRedaction = redactPII(message, {
      redactEmails: true,
      redactPhones: true,
      redactCreditCards: true,
      redactSSN: true,
      redactIPs: true,
    });

    // Use redacted text for logging
    const logMessage = piiRedaction.redactions.length > 0 ? piiRedaction.redactedText : message;

    if (piiRedaction.redactions.length > 0) {
      console.log(
        '[Safety] PII redacted from logs:',
        piiRedaction.redactions.map(r => r.type),
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 🔒 SECURITY FIX: Server-side demo mode determination
    // Never trust client for auth decisions - prevent API quota abuse
    const DEMO_MODE_ENABLED = Deno.env.get('ENABLE_DEMO_MODE') === 'true';
    const hasAuthHeader = !!req.headers.get('Authorization');
    const serverDemoMode = DEMO_MODE_ENABLED && !hasAuthHeader;

    let user = null;
    if (!serverDemoMode) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return createErrorResponse('Authentication required', 401);
      }

      const {
        data: { user: authenticatedUser },
        error: authError,
      } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

      if (authError || !authenticatedUser) {
        return createErrorResponse('Invalid authentication', 401);
      }

      user = authenticatedUser;
    } else {
      // 🔒 Demo mode: Apply aggressive rate limiting by IP
      const clientIp =
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

      // Use database-backed rate limiting for demo mode
      const { data: rateLimitData, error: rateLimitError } = await supabase.rpc(
        'increment_rate_limit',
        {
          rate_key: `demo_concierge:${clientIp}`,
          max_requests: 5, // Only 5 requests per hour in demo mode
          window_seconds: 3600,
        },
      );

      if (
        !rateLimitError &&
        rateLimitData &&
        rateLimitData.length > 0 &&
        !rateLimitData[0]?.allowed
      ) {
        return createErrorResponse(
          'Rate limit exceeded. Demo mode allows 5 requests per hour.',
          429,
        );
      }
    }

    // Skip usage limits check in demo mode
    if (!serverDemoMode && user) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('app_role')
        .eq('id', user.id)
        .single();

      const isFreeUser = !userProfile?.app_role || userProfile.app_role === 'consumer';

      if (isFreeUser) {
        const { data: usageData } = await supabase.rpc('get_daily_concierge_usage', {
          user_uuid: user.id,
        });

        const dailyUsage = usageData || 0;
        const FREE_TIER_LIMIT = 10;

        if (dailyUsage >= FREE_TIER_LIMIT) {
          return new Response(
            JSON.stringify({
              response: `🚫 **Daily query limit reached**\n\nYou've used ${dailyUsage}/${FREE_TIER_LIMIT} free AI queries today. Upgrade to Pro for unlimited access!`,
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              sources: [],
              success: false,
              error: 'usage_limit_exceeded',
              upgradeRequired: true,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          );
        }
      }
    }

    // Build comprehensive context if tripId is provided
    let comprehensiveContext = tripContext;
    if (tripId && !tripContext) {
      try {
        // 🆕 Pass user.id to get personalized context with preferences + personal basecamp
        comprehensiveContext = await TripContextBuilder.buildContext(tripId, user?.id);
        console.log(
          '[Context] Built context with user preferences:',
          !!comprehensiveContext?.userPreferences,
        );
      } catch (error) {
        console.error('Failed to build comprehensive context:', error);
        // Continue with basic context
      }
    }

    // 🆕 FALLBACK: Use client-passed preferences if context builder didn't find any
    if (validatedData.preferences) {
      const clientPrefs = validatedData.preferences;
      const hasClientPrefs =
        clientPrefs.dietary?.length ||
        clientPrefs.vibe?.length ||
        clientPrefs.accessibility?.length ||
        clientPrefs.business?.length ||
        clientPrefs.entertainment?.length ||
        clientPrefs.budgetMin !== undefined;

      if (
        hasClientPrefs &&
        (!comprehensiveContext?.userPreferences ||
          !comprehensiveContext.userPreferences.dietary?.length)
      ) {
        console.log('[Context] Using client-passed preferences as fallback');

        // Build userPreferences from client data
        const fallbackPrefs = {
          dietary: clientPrefs.dietary || [],
          vibe: clientPrefs.vibe || [],
          accessibility: clientPrefs.accessibility || [],
          business: clientPrefs.business || [],
          entertainment: clientPrefs.entertainment || [],
          budget:
            clientPrefs.budgetMin !== undefined && clientPrefs.budgetMax !== undefined
              ? `$${clientPrefs.budgetMin}-$${clientPrefs.budgetMax}`
              : undefined,
          timePreference: clientPrefs.timePreference || 'flexible',
          travelStyle: clientPrefs.lifestyle?.join(', ') || undefined,
        };

        if (!comprehensiveContext) {
          comprehensiveContext = { userPreferences: fallbackPrefs };
        } else {
          comprehensiveContext.userPreferences = fallbackPrefs;
        }
      }
    }

    const runRAGRetrieval = shouldRunRAGRetrieval(message, tripId);

    // 🆕 HYBRID RAG RETRIEVAL: Semantic + Keyword search for relevant trip context
    let ragContext = '';
    if (runRAGRetrieval) {
      try {
        if (isDemoMode) {
          // Demo mode: Use mock embedding service
          console.log('[Demo Mode] Using mock embedding service for RAG');

          const mockResults = await getMockRAGResults(message, tripId);

          if (mockResults && mockResults.length > 0) {
            console.log(
              `[Demo Mode] Found ${mockResults.length} relevant context items via mock RAG`,
            );

            ragContext = '\n\n=== RELEVANT TRIP CONTEXT (HYBRID RAG) ===\n';
            ragContext +=
              'The following information was retrieved using semantic + keyword search:\n';

            const sourceIconMap: Record<string, string> = {
              chat: '💬',
              task: '✅',
              poll: '📊',
              payment: '💰',
              broadcast: '📢',
              calendar: '📅',
              link: '🔗',
              file: '📎',
            };

            mockResults.forEach((result: any, idx: number) => {
              const relevancePercent = (result.similarity * 100).toFixed(0);
              const sourceIcon =
                sourceIconMap[result.source_type as keyof typeof sourceIconMap] || '📄';

              ragContext += `\n[${idx + 1}] ${sourceIcon} [${result.source_type}] ${result.content_text} (${relevancePercent}% relevant)`;
            });

            ragContext +=
              '\n\nIMPORTANT: Use this retrieved context to provide accurate, specific answers. Cite sources when possible (e.g., "Based on the chat messages..." or "According to the calendar..." or "From the uploaded document...").';
          }
        } else {
          // Production mode: Use keyword-only search (embedding model not available on gateway)
          console.log('Using keyword-only search for RAG retrieval (embedding model unavailable)');

          try {
            // Keyword search via kb_chunks full-text search
            const { data: keywordResults, error: keywordError } = await supabase
              .from('kb_chunks')
              .select('id, content, doc_id, modality')
              .textSearch('content_tsv', message.split(' ').slice(0, 5).join(' & '), {
                type: 'plain',
              })
              .limit(10);

            if (!keywordError && keywordResults && keywordResults.length > 0) {
              // Get doc metadata
              const docIds = [...new Set(keywordResults.map((r: any) => r.doc_id).filter(Boolean))];
              let docMap = new Map();

              if (docIds.length > 0) {
                const { data: docs } = await supabase
                  .from('kb_documents')
                  .select('id, source, trip_id')
                  .in('id', docIds)
                  .eq('trip_id', tripId);

                docs?.forEach((d: any) => docMap.set(d.id, d));
              }

              // Filter to only chunks belonging to this trip
              const tripChunks = keywordResults.filter((r: any) => {
                const doc = docMap.get(r.doc_id);
                return doc?.trip_id === tripId;
              });

              if (tripChunks.length > 0) {
                console.log(`Found ${tripChunks.length} relevant context items via keyword search`);

                ragContext = '\n\n=== RELEVANT TRIP CONTEXT (Keyword Search) ===\n';
                ragContext += 'Retrieved using keyword matching:\n';

                tripChunks.forEach((result: any, idx: number) => {
                  const doc = docMap.get(result.doc_id);
                  const sourceType = doc?.source || result.modality || 'unknown';
                  ragContext += `\n[${idx + 1}] [${sourceType}] ${(result.content || '').substring(0, 300)}`;
                });

                ragContext +=
                  '\n\nIMPORTANT: Use this retrieved context to provide accurate answers. Cite sources when possible.';
              }
            }
          } catch (keywordErr) {
            console.error('Keyword search failed:', keywordErr);
            // Don't fail the request
          }
        }
      } catch (ragError) {
        console.error('Hybrid RAG retrieval failed, falling back to basic context:', ragError);
        // Don't fail the request if RAG fails
      }
    } else {
      console.log('[RAG] Skipping retrieval for non-trip/general query');
    }

    // Helper function to format RAG context
    function formatRAGContext(results: any[], searchType: string): string {
      let context = `\n\n=== RELEVANT TRIP CONTEXT (${searchType} Search) ===\n`;
      context += 'The following information was retrieved:\n';

      results.forEach((result: any, idx: number) => {
        const relevancePercent = (result.similarity * 100).toFixed(0);
        const sourceIconMap: Record<string, string> = {
          chat: '💬',
          task: '✅',
          poll: '📊',
          payment: '💰',
          broadcast: '📢',
          calendar: '📅',
          link: '🔗',
          file: '📄',
        };
        const sourceIcon = sourceIconMap[result.source_type as string] || '📄';

        context += `\n[${idx + 1}] ${sourceIcon} [${result.source_type}] ${result.content_text.substring(0, 300)} (${relevancePercent}% relevant)`;
      });

      context +=
        '\n\nIMPORTANT: Use this retrieved context to provide accurate answers. Cite sources when possible.';
      return context;
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
              response:
                '🔒 **AI features are disabled for this trip.**\n\nThis trip uses high privacy mode with end-to-end encryption. AI assistance is not available to protect your privacy, but you can still use all other trip features.',
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              sources: [],
              success: true,
              model: 'privacy-mode',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          );
        }
      } catch (privacyError) {
        console.log('Privacy check failed, proceeding with default behavior:', privacyError);
      }
    }

    // 🆕 SMART MODEL SELECTION: Analyze query complexity
    const contextSize = comprehensiveContext ? JSON.stringify(comprehensiveContext).length : 0;
    const complexity = analyzeQueryComplexity(message, chatHistory.length, contextSize);

    console.log(
      `[Model Selection] Complexity score: ${complexity.score.toFixed(2)}, Recommended: ${complexity.recommendedModel}`,
    );

    // Determine if chain-of-thought is needed
    const useChainOfThought = requiresChainOfThought(message, complexity);

    // Build context-aware system prompt with RAG context injected
    let baseSystemPrompt =
      buildSystemPrompt(comprehensiveContext, config.systemPrompt) + ragContext;

    // 🆕 ENHANCED PROMPTS: Add few-shot examples and chain-of-thought
    const systemPrompt = buildEnhancedSystemPrompt(
      baseSystemPrompt,
      useChainOfThought,
      true, // Always include few-shot examples
    );

    // 🆕 EXPLICIT CONTEXT WINDOW MANAGEMENT
    // Limit chat history to prevent token overflow
    const MAX_CHAT_HISTORY_MESSAGES = 10;
    const MAX_SYSTEM_PROMPT_LENGTH = 8000; // Characters, not tokens (rough estimate)
    const MAX_TOTAL_CONTEXT_LENGTH = 12000; // Characters

    // Truncate chat history if too long
    const limitedChatHistory = chatHistory.slice(-MAX_CHAT_HISTORY_MESSAGES);

    // Truncate system prompt if too long (preserve most important parts)
    let finalSystemPrompt = systemPrompt;
    if (systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
      // Keep first part (base prompt) and last part (RAG context)
      const basePromptEnd = systemPrompt.indexOf('=== TRIP CONTEXT ===');
      const ragStart = systemPrompt.indexOf('=== RELEVANT TRIP CONTEXT');

      if (basePromptEnd > 0 && ragStart > 0) {
        const basePrompt = systemPrompt.substring(0, basePromptEnd);
        const ragContext = systemPrompt.substring(ragStart);
        const middlePart = systemPrompt.substring(basePromptEnd, ragStart);

        // Truncate middle part if needed
        const availableLength = MAX_SYSTEM_PROMPT_LENGTH - basePrompt.length - ragContext.length;
        const truncatedMiddle =
          middlePart.length > availableLength
            ? '...\n[Context truncated for efficiency]\n...' +
              middlePart.substring(middlePart.length - availableLength + 50)
            : middlePart;

        finalSystemPrompt = basePrompt + truncatedMiddle + ragContext;
      } else {
        // Fallback: simple truncation
        finalSystemPrompt =
          systemPrompt.substring(0, MAX_SYSTEM_PROMPT_LENGTH) + '\n\n[Context truncated...]';
      }

      console.log(
        `[Context Management] Truncated system prompt from ${systemPrompt.length} to ${finalSystemPrompt.length} characters`,
      );
    }

    // Prepare messages for Lovable AI
    const messages: ChatMessage[] = [
      { role: 'system', content: finalSystemPrompt },
      ...limitedChatHistory,
      { role: 'user', content: message },
    ];

    // Log context size for monitoring
    const totalContextLength =
      finalSystemPrompt.length +
      limitedChatHistory.reduce((sum, msg) => sum + msg.content.length, 0) +
      message.length;

    if (totalContextLength > MAX_TOTAL_CONTEXT_LENGTH) {
      console.warn(
        `[Context Management] Total context length (${totalContextLength}) exceeds recommended limit (${MAX_TOTAL_CONTEXT_LENGTH})`,
      );
    } else {
      console.log(`[Context Management] Total context length: ${totalContextLength} characters`);
    }

    // 🆕 Smart grounding detection - only enable for location queries
    const isLocationQuery = message
      .toLowerCase()
      .match(
        /\b(where|restaurant|hotel|cafe|bar|attraction|place|location|near|around|close|best|find|suggest|recommend|visit|directions|route|food|eat|drink|stay|sushi|pizza|beach|museum|park)\b/i,
      );

    // 🆕 FIXED: Use personal basecamp as fallback for location grounding
    const tripBasecamp = comprehensiveContext?.places?.tripBasecamp;
    const personalBasecamp = comprehensiveContext?.places?.personalBasecamp;
    const locationData =
      tripBasecamp?.lat && tripBasecamp?.lng
        ? tripBasecamp
        : personalBasecamp?.lat && personalBasecamp?.lng
          ? personalBasecamp
          : null;

    const hasLocationContext = !!locationData;
    const enableGrounding = isLocationQuery && hasLocationContext;

    if (enableGrounding) {
      const basecampType = tripBasecamp?.lat ? 'trip' : 'personal';
      console.log(`[Location] Using ${basecampType} basecamp for grounding: ${locationData?.name}`);
    }

    // 🆕 SMART MODEL ROUTING: Use Pro for complex queries, Flash for simple ones
    const selectedModel =
      config.model ||
      (complexity.recommendedModel === 'pro' ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash');

    // Adjust temperature based on complexity (lower for complex = more focused)
    const temperature = config.temperature || (complexity.score > 0.5 ? 0.5 : 0.7);

    console.log(`[Model Selection] Using model: ${selectedModel}, Temperature: ${temperature}`);

    // Call Lovable AI Gateway with optional grounding
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature,
        max_tokens: config.maxTokens || 2048,
        stream: false,
        // 🆕 Enable Google Maps grounding using trip OR personal basecamp
        ...(enableGrounding &&
          locationData && {
            tools: [{ googleMaps: { enableWidget: true } }],
            toolConfig: {
              retrievalConfig: {
                latLng: {
                  latitude: locationData.lat,
                  longitude: locationData.lng,
                },
              },
            },
          }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle rate limiting
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            response:
              '⚠️ **Rate limit reached**\n\nThe AI service is temporarily unavailable due to high usage. Please try again in a moment.',
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            sources: [],
            success: false,
            error: 'rate_limit',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      }

      // Handle payment required
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            response:
              '💳 **Additional credits required**\n\nThe AI service requires additional credits. Please contact support.',
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            sources: [],
            success: false,
            error: 'payment_required',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      }

      throw new Error(
        `Lovable AI Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Lovable AI');
    }

    const aiResponse = data.choices[0].message.content;
    const usage = data.usage;

    // 🆕 Extract grounding metadata from response
    const groundingMetadata = data.choices[0]?.groundingMetadata || null;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const googleMapsWidget = groundingMetadata?.googleMapsWidgetContextToken || null;

    // Transform grounding chunks into citation-friendly format
    const citations = groundingChunks.map((chunk: any, index: number) => ({
      id: `citation_${index}`,
      title: chunk.web?.title || 'Google Maps',
      url: chunk.web?.uri || '#',
      snippet: chunk.web?.snippet || '',
      source: 'google_maps_grounding',
    }));

    // Skip database storage in demo mode
    if (!isDemoMode) {
      // Store conversation in database for context awareness
      if (comprehensiveContext?.tripMetadata?.id) {
        await storeConversation(
          supabase,
          comprehensiveContext.tripMetadata.id,
          message,
          aiResponse,
          'chat',
          {
            grounding_sources: citations.length,
            has_map_widget: !!googleMapsWidget,
          },
        );
      }

      // Track usage for analytics and rate limiting
      if (user) {
        try {
          // 🆕 Use redacted message for storage (PII protection)
          const usageData: any = {
            user_id: user.id,
            trip_id: comprehensiveContext?.tripMetadata?.id || tripId || 'unknown',
            query_text: logMessage.substring(0, 500), // Use redacted text
            response_tokens: usage?.completion_tokens || 0,
            model_used: selectedModel,
          };

          // Add new fields if columns exist (graceful degradation)
          try {
            usageData.complexity_score = complexity.score;
            usageData.used_pro_model = complexity.recommendedModel === 'pro';
          } catch (e) {
            // Columns may not exist in all environments - ignore
          }

          await supabase.from('concierge_usage').insert(usageData);
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
        model: selectedModel,
        complexity: {
          score: complexity.score,
          recommended: complexity.recommendedModel,
          factors: complexity.factors,
        },
        usedChainOfThought: useChainOfThought,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    // 🆕 Log with redacted PII
    const redactedMessage = message ? redactPII(message).redactedText : '';
    logError('LOVABLE_CONCIERGE', error, {
      tripId,
      messageLength: message?.length || 0,
      redactedMessage: redactedMessage.substring(0, 200), // Log redacted version
    });

    // Return sanitized error to client
    return new Response(
      JSON.stringify({
        error: sanitizeErrorForClient(error),
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

function buildSystemPrompt(tripContext: any, customPrompt?: string): string {
  if (customPrompt) return customPrompt;

  let basePrompt = `You are **Chravel Concierge**, a world-class AI travel expert and trip assistant. You have complete awareness of the user's current trip context AND broad expertise across all travel topics worldwide.

Current date: ${new Date().toISOString().split('T')[0]}

**SCOPE POLICY:**
- Answer ANY question the user asks. You are a versatile AI assistant with special expertise in travel and trip planning.
- When a question relates to the current trip, use trip context data to give precise, sourced answers.
- When a question is about travel but NOT about the current trip, answer freely using your general knowledge.
- For non-travel questions (sports, general knowledge, etc.), answer freely and helpfully.

**Your Communication Style:**
- Be conversational, warm, and helpful
- MINIMAL emoji usage: Use at most 1 emoji per response, and only when it genuinely adds clarity (e.g., a single section icon). Prefer clean text formatting over emojis.
- For enterprise trips, use ZERO emojis
- Keep answers clear and well-organized with bullet points
- Sound like a knowledgeable friend, not a robot
- When asking clarifying questions, always provide an answer "in the meantime" so users get immediate value

**Your Enhanced Capabilities:**
- **Payment Intelligence**: Answer "Who do I owe money to?" or "Who owes me money?" with payment methods
- **Poll Awareness**: Know poll results like "Where did everyone decide on dinner?"
- **Task Management**: Answer "What tasks am I responsible for?" or "What tasks does [Name] still need to do?"
- **Calendar Mastery**: Answer "What time is dinner?" or "What's the address for the jet ski place?"
- **Chat Intelligence**: Summarize recent messages, answer "What did I miss in the chat?"
- **Full Context**: You know everything about this specific trip - use it!
- **General Travel Knowledge**: Answer about ANY destination, airline, hotel chain, activity, or travel topic worldwide

=== RICH CONTENT FORMATTING (CRITICAL - FOLLOW EXACTLY) ===

Your responses are rendered as Markdown in the app. You MUST use rich formatting:

**Links (REQUIRED for all recommendations):**
- When recommending restaurants, hotels, attractions, or any place, ALWAYS include a clickable link.
- Format: [Place Name](https://www.google.com/maps/search/Place+Name+City+Country)
- For websites you know: [Place Name](https://actual-website-url.com)
- For places without a known website, use a Google Maps search link: [Place Name](https://www.google.com/maps/search/Place+Name+City)
- Example: Check out [Nobu Malibu](https://www.google.com/maps/search/Nobu+Malibu+CA) for world-class sushi.

**Images (USE when recommending places):**
- When recommending restaurants, hotels, beaches, or attractions, include a preview image to make the response visually rich.
- Use Google Places photos or known image URLs when available.
- Format: ![Place Name](image_url)
- If you do not have a reliable direct image URL, do NOT include a broken image. Only include images when you are confident the URL is valid.

**Structured Recommendations:**
When listing multiple places (restaurants, hotels, activities), format each as a rich entry:

**[Place Name](url)** - Brief description of what makes it special.
Rating info and price range if known.

**Lists and Formatting:**
- Use **bold** for place names, key points, and important info
- Use bullet points (- ) for organized lists
- Use numbered lists (1. 2. 3.) for ranked recommendations or steps
- Use > blockquotes for tips or important callouts
- Keep responses scannable and well-structured

**Important Guidelines:**
- Always consider the trip context and preferences provided
- Avoid recommending places they've already visited
- Factor in their budget and group size
- Be specific with recommendations (include names, locations, AND links)
- Provide actionable advice they can use immediately
- When users ask clarifying questions, give them an answer first, then ask for specifics to improve recommendations

**Location Intelligence (CRITICAL):**
- When users mention a hotel, restaurant, or landmark by name WITHOUT a full address, assume it's in the trip destination
- Example: "Click Clack Hotel" in a Medellin trip = Click Clack Hotel Medellin, Colombia
- ALWAYS use the trip destination as context for location queries
- If you don't know the exact address, use web search or make reasonable assumptions based on the destination
- NEVER ask users for neighborhood or address info if you can infer from trip context
- For "near me" or "near my hotel" queries: Use personal basecamp coordinates if available, otherwise use trip destination

**Payment Intelligence (CRITICAL):**
- When asked about payments, debts, or expenses, ALWAYS provide specific amounts and names
- Calculate who owes money to whom based on the payment data
- Include payment method preferences when suggesting how to settle
- Never just say "check the payments tab" - provide the actual payment summary

=== SOURCE OF TRUTH & PRIORITY RULES (MUST FOLLOW) ===

1) If the user explicitly overrides preferences (e.g., "ignore my budget"), honor that for THIS request only.

2) Otherwise apply saved preferences automatically to all recommendations.

3) Never invent facts. If an answer is not present in Trip Context, say what you do know and propose the fastest next step.

4) When answering questions like "what time / where / address", prioritize:
   Calendar items > Places/Basecamps > Saved Links > Chat mentions > Assumptions (clearly labeled)

=== TRIP CONTEXT COVERAGE (YOU HAVE ACCESS) ===

You can read and use the following trip data when answering:
- Chat: messages, pinned items, recent summaries
- Calendar: events, times, locations, notes
- Places: saved places, tagged categories, addresses
- Basecamps: key hubs + lodging + meeting points + coordinates/addresses
- Links: saved/pinned links with titles + notes
- Broadcasts: announcements from organizers
- Polls: questions, options, votes, final decisions
- Tasks: owners, due dates, status
- Payments: who paid/owes, split method, settlement suggestions

When the user is overwhelmed, proactively search these sections mentally before asking them to click around.

=== OUTPUT CONTRACT FOR TRIP INFO QUESTIONS ===

For "trip info" questions (time, place, who owes who, what did we decide):

1. **Start with 1-sentence direct answer**
2. **Show the supporting source**: (Calendar | Poll | Payment | Places | Chat)
3. **Give one next action if needed**

Example:
User: "What time is dinner tomorrow?"
You: "Dinner is at **7:00 PM** at [Nobu](https://www.google.com/maps/search/Nobu+Restaurant).
Source: Calendar event 'Group Dinner'
Next: I can get you directions from your hotel if you'd like!"`;

  if (tripContext) {
    basePrompt += `\n\n=== TRIP CONTEXT ===`;

    // Handle both old and new context structures
    const tripMetadata = tripContext.tripMetadata || tripContext;
    const collaborators = tripContext.collaborators || tripContext.participants;
    const messages = tripContext.messages || tripContext.chatHistory;
    const calendar = tripContext.calendar || tripContext.itinerary;
    const tasks = tripContext.tasks;
    const payments = tripContext.payments;
    const polls = tripContext.polls;
    const places = tripContext.places || { basecamp: tripContext.basecamp };

    basePrompt += `\nDestination: ${tripMetadata.destination || tripMetadata.location || 'Not specified'}`;

    if (tripMetadata.startDate && tripMetadata.endDate) {
      basePrompt += `\nTravel Dates: ${tripMetadata.startDate} to ${tripMetadata.endDate}`;
    } else if (typeof tripContext.dateRange === 'object') {
      basePrompt += `\nTravel Dates: ${tripContext.dateRange.start} to ${tripContext.dateRange.end}`;
    } else if (tripContext.dateRange) {
      basePrompt += `\nTravel Dates: ${tripContext.dateRange}`;
    }

    basePrompt += `\nParticipants: ${collaborators?.length || 0} people`;

    if (collaborators?.length) {
      basePrompt += ` (${collaborators.map((p: any) => p.name || p).join(', ')})`;
    }

    // 🆕 Handle both trip and personal basecamps
    if (places?.tripBasecamp) {
      basePrompt += `\n\n🏠 TRIP BASECAMP:`;
      basePrompt += `\nLocation: ${places.tripBasecamp.name}`;
      basePrompt += `\nAddress: ${places.tripBasecamp.address}`;
      if (places.tripBasecamp.lat && places.tripBasecamp.lng) {
        basePrompt += `\nCoordinates: ${places.tripBasecamp.lat}, ${places.tripBasecamp.lng}`;
      }
    } else if (places?.basecamp) {
      // Backward compatibility with old structure
      basePrompt += `\n\n🏠 TRIP BASECAMP:`;
      basePrompt += `\nLocation: ${places.basecamp.name}`;
      basePrompt += `\nAddress: ${places.basecamp.address}`;
      if (places.basecamp.lat && places.basecamp.lng) {
        basePrompt += `\nCoordinates: ${places.basecamp.lat}, ${places.basecamp.lng}`;
      }
    }

    // 🆕 Personal basecamp (user's accommodation)
    if (places?.personalBasecamp) {
      basePrompt += `\n\n🏨 YOUR PERSONAL BASECAMP:`;
      basePrompt += `\nLocation: ${places.personalBasecamp.name}`;
      basePrompt += `\nAddress: ${places.personalBasecamp.address}`;
      if (places.personalBasecamp.lat && places.personalBasecamp.lng) {
        basePrompt += `\nCoordinates: ${places.personalBasecamp.lat}, ${places.personalBasecamp.lng}`;
      }
      basePrompt += `\nNote: Use this for "near me" queries when trip basecamp is not set.`;
    } else if (places?.userAccommodation) {
      // Backward compatibility
      basePrompt += `\n\n🏨 YOUR ACCOMMODATION:`;
      basePrompt += `\nLabel: ${places.userAccommodation.label}`;
      basePrompt += `\nAddress: ${places.userAccommodation.address}`;
      if (places.userAccommodation.lat && places.userAccommodation.lng) {
        basePrompt += `\nCoordinates: ${places.userAccommodation.lat}, ${places.userAccommodation.lng}`;
      }
    }

    // 🆕 USER PREFERENCES FOR PERSONALIZED RECOMMENDATIONS - CRITICAL FOR AI FILTERING
    if (tripContext.userPreferences) {
      const prefs = tripContext.userPreferences;
      basePrompt += `\n\n=== 🎯 CRITICAL USER PREFERENCES (MUST APPLY TO ALL RECOMMENDATIONS) ===`;
      basePrompt += `\n⚠️ YOU MUST filter ALL suggestions based on these preferences. Do NOT ask the user to clarify - you already know their preferences!`;

      if (prefs.dietary?.length) {
        basePrompt += `\n\n🥗 DIETARY RESTRICTIONS: ${prefs.dietary.join(', ')}`;
        basePrompt += `\n   → ONLY suggest food/restaurants that meet these requirements`;
        basePrompt += `\n   → If asked for "restaurants" or "food", automatically filter to these dietary needs`;
      }
      if (prefs.vibe?.length) {
        basePrompt += `\n\n🎯 VIBE PREFERENCES: ${prefs.vibe.join(', ')}`;
        basePrompt += `\n   → Prioritize venues/activities matching these vibes`;
      }
      if (prefs.accessibility?.length) {
        basePrompt += `\n\n♿ ACCESSIBILITY REQUIREMENTS: ${prefs.accessibility.join(', ')}`;
        basePrompt += `\n   → ONLY suggest venues that are fully accessible per these needs`;
      }
      if (prefs.business?.length) {
        basePrompt += `\n\n💼 BUSINESS PREFERENCES: ${prefs.business.join(', ')}`;
      }
      if (prefs.entertainment?.length) {
        basePrompt += `\n\n🎭 ENTERTAINMENT PREFERENCES: ${prefs.entertainment.join(', ')}`;
        basePrompt += `\n   → Prioritize activities matching these interests`;
      }
      if (prefs.budget) {
        basePrompt += `\n\n💰 BUDGET RANGE: ${prefs.budget}`;
        basePrompt += `\n   → Keep recommendations within this price range`;
      }
      if (prefs.timePreference && prefs.timePreference !== 'flexible') {
        const timeDesc =
          prefs.timePreference === 'early-riser'
            ? 'Prefers morning activities (early breakfast, daytime tours)'
            : 'Prefers evening/night activities (late dinners, nightlife)';
        basePrompt += `\n\n🕐 TIME PREFERENCE: ${timeDesc}`;
      }
      if (prefs.travelStyle) {
        basePrompt += `\n\n✈️ TRAVEL STYLE: ${prefs.travelStyle}`;
      }

      basePrompt += `\n\n🚨 ENFORCEMENT RULES:`;
      basePrompt += `\n   1. NEVER recommend options that violate dietary restrictions`;
      basePrompt += `\n   2. NEVER suggest inaccessible venues when accessibility needs are specified`;
      basePrompt += `\n   3. When user asks generic questions like "good restaurants", automatically apply ALL their preferences`;
      basePrompt += `\n   4. Do NOT ask the user to repeat their preferences - you already have them!`;

      // 🆕 Preference visibility pattern
      basePrompt += `\n\n📋 PREFERENCE VISIBILITY:`;
      basePrompt += `\nWhen giving recommendations, include one short line at the START:`;
      basePrompt += `\n"Filtered for you: [Diet] | [Budget] | [Vibe] | [Accessibility]"`;
      basePrompt += `\n(Only show categories that are active - do not overdo it. If more than 3 active filters, say "Filtered by your saved Preferences:")`;
      basePrompt += `\n\nExample: "Filtered for you: Vegetarian | $50-100 | Chill vibes"`;
    }

    // 🆕 Add broadcasts section with priority icons
    const broadcasts = tripContext.broadcasts;
    if (broadcasts?.length) {
      basePrompt += `\n\n=== 📢 ORGANIZER BROADCASTS ===`;
      broadcasts.forEach((broadcast: any) => {
        const priorityIcon =
          broadcast.priority === 'urgent' ? '🚨' : broadcast.priority === 'high' ? '⚠️' : '📢';
        basePrompt += `\n${priorityIcon} [${(broadcast.priority || 'normal').toUpperCase()}] ${broadcast.message}`;
        basePrompt += `\n   (from ${broadcast.createdBy}, ${new Date(broadcast.createdAt).toLocaleDateString()})`;
      });
      basePrompt += `\nNote: Reference these announcements when relevant to user questions.`;
    }

    // Add comprehensive context sections
    if (messages?.length) {
      basePrompt += `\n\n=== RECENT MESSAGES ===`;
      const recentMessages = messages.slice(-5);
      recentMessages.forEach((msg: any) => {
        basePrompt += `\n${msg.authorName}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`;
      });
    }

    if (calendar?.length) {
      basePrompt += `\n\n=== UPCOMING EVENTS ===`;
      calendar.slice(0, 5).forEach((event: any) => {
        basePrompt += `\n- ${event.title} on ${event.startTime}`;
        if (event.location) basePrompt += ` at ${event.location}`;
      });
    }

    if (tasks?.length) {
      basePrompt += `\n\n=== ACTIVE TASKS ===`;
      const activeTasks = tasks.filter((t: any) => !t.isComplete);
      activeTasks.slice(0, 5).forEach((task: any) => {
        basePrompt += `\n- ${task.content}${task.assignee ? ` (assigned to ${task.assignee})` : ''}`;
      });
    }

    if (payments?.length) {
      basePrompt += `\n\n=== RECENT PAYMENTS ===`;
      payments.slice(0, 3).forEach((payment: any) => {
        basePrompt += `\n- ${payment.description}: $${payment.amount} (${payment.paidBy})`;
      });
    }

    if (polls?.length) {
      basePrompt += `\n\n=== ACTIVE POLLS ===`;
      polls
        .filter((p: any) => p.status === 'active')
        .forEach((poll: any) => {
          basePrompt += `\n- ${poll.question}`;
          poll.options.forEach((option: any) => {
            basePrompt += `\n  - ${option.text}: ${option.votes} votes`;
          });
        });
    }

    // Enhanced contextual information
    if (tripContext.preferences) {
      basePrompt += `\n\n=== GROUP PREFERENCES ===`;
      const prefs = tripContext.preferences;
      if (prefs.dietary?.length) basePrompt += `\nDietary: ${prefs.dietary.join(', ')}`;
      if (prefs.vibe?.length) basePrompt += `\nVibes: ${prefs.vibe.join(', ')}`;
      if (prefs.entertainment?.length)
        basePrompt += `\nEntertainment: ${prefs.entertainment.join(', ')}`;
      if (prefs.budgetMin && prefs.budgetMax) {
        basePrompt += `\nBudget Range: $${prefs.budgetMin} - $${prefs.budgetMax} per person`;
      }
    }

    if (tripContext.visitedPlaces?.length) {
      basePrompt += `\n\n=== ALREADY VISITED ===`;
      basePrompt += `\n${tripContext.visitedPlaces.join(', ')}`;
      basePrompt += `\nNote: Avoid recommending these places unless specifically asked.`;
    }

    if (tripContext.spendingPatterns) {
      basePrompt += `\n\n=== SPENDING PATTERNS ===`;
      basePrompt += `\nTotal Spent: $${tripContext.spendingPatterns.totalSpent?.toFixed(2) || '0'}`;
      basePrompt += `\nAverage per Person: $${tripContext.spendingPatterns.avgPerPerson?.toFixed(2) || '0'}`;
    }

    if (tripContext.links?.length) {
      basePrompt += `\n\n=== SHARED LINKS & IDEAS ===`;
      tripContext.links.forEach((link: any) => {
        basePrompt += `\n- ${link.title} (${link.category}, ${link.votes} votes): ${link.description}`;
      });
    }

    if (tripContext.chatHistory?.length) {
      basePrompt += `\n\n=== RECENT GROUP SENTIMENT ===`;
      const recentMessages = tripContext.chatHistory.slice(-3);
      const positiveCount = recentMessages.filter((m: any) => m.sentiment === 'positive').length;
      const mood = positiveCount >= 2 ? 'Positive' : positiveCount >= 1 ? 'Mixed' : 'Neutral';
      basePrompt += `\nGroup Mood: ${mood}`;
    }

    if (tripContext.upcomingEvents?.length) {
      basePrompt += `\n\n=== UPCOMING SCHEDULE ===`;
      tripContext.upcomingEvents.forEach((event: any) => {
        basePrompt += `\n- ${event.title} on ${event.date}`;
        if (event.time) basePrompt += ` at ${event.time}`;
        if (event.location) basePrompt += ` (${event.location})`;
        if (event.address) basePrompt += ` - Address: ${event.address}`;
      });
    }

    // 🆕 PAYMENT INTELLIGENCE
    if (tripContext.receipts?.length) {
      basePrompt += `\n\n=== 💳 PAYMENT INTELLIGENCE ===`;
      const totalSpent = tripContext.receipts.reduce(
        (sum: any, receipt: any) => sum + (receipt.amount || 0),
        0,
      );
      basePrompt += `\nTotal Trip Spending: $${totalSpent.toFixed(2)}`;

      // Show recent payments
      const recentPayments = tripContext.receipts.slice(-5);
      recentPayments.forEach((payment: any) => {
        basePrompt += `\n- ${payment.description}: $${payment.amount} (${payment.participants?.join(', ') || 'Group'})`;
      });
    }

    // 🆕 POLL AWARENESS
    if (tripContext.polls?.length) {
      basePrompt += `\n\n=== 📊 GROUP POLLS & DECISIONS ===`;
      tripContext.polls.forEach((poll: any) => {
        basePrompt += `\n**${poll.question}**`;
        if (poll.options?.length) {
          poll.options.forEach((option: any) => {
            basePrompt += `\n- ${option.text}: ${option.votes || 0} votes`;
          });
        }
        if (poll.results) {
          basePrompt += `\nWinner: ${poll.results}`;
        }
      });
    }

    // 🆕 TASK MANAGEMENT
    if (tripContext.tasks?.length) {
      basePrompt += `\n\n=== ✅ TASK STATUS ===`;
      const completedTasks = tripContext.tasks.filter((task: any) => task.status === 'completed');
      const pendingTasks = tripContext.tasks.filter((task: any) => task.status !== 'completed');

      basePrompt += `\nCompleted: ${completedTasks.length} | Pending: ${pendingTasks.length}`;

      if (pendingTasks.length > 0) {
        basePrompt += `\n**Pending Tasks:**`;
        pendingTasks.forEach((task: any) => {
          basePrompt += `\n- ${task.title} (Assigned to: ${task.assignedTo || 'Unassigned'})`;
        });
      }
    }

    // 🆕 CHAT INTELLIGENCE
    if (tripContext.chatHistory?.length) {
      basePrompt += `\n\n=== 💬 RECENT CHAT ACTIVITY ===`;
      const recentMessages = tripContext.chatHistory.slice(-10);
      basePrompt += `\nLast ${recentMessages.length} messages:`;
      recentMessages.forEach((msg: any) => {
        basePrompt += `\n- ${msg.sender}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`;
      });
    }

    // ENTERPRISE MODE DETECTION
    const isEnterpriseTrip =
      tripContext.participants?.length > 10 || tripContext.category === 'enterprise';
    if (isEnterpriseTrip) {
      basePrompt += `\n\n=== ENTERPRISE MODE ===`;
      basePrompt += `\nThis is an enterprise trip with ${tripContext.participants?.length || 0} participants.`;
      basePrompt += `\n- Use ZERO emojis for professional communication`;
      basePrompt += `\n- Focus on logistics, coordination, and efficiency`;
      basePrompt += `\n- Provide clear, actionable information for large groups`;
      basePrompt += `\n- Still include markdown links and structured formatting`;
    }
  }

  basePrompt += `\n\n**Remember:**
- Use ALL the context above to personalize your recommendations
- Be specific and actionable in your suggestions - always include links
- Consider budget, preferences, and group dynamics
- Keep emoji usage minimal (0-1 per response). Let the formatting and links speak for themselves.
- When recommending places, ALWAYS format as clickable markdown links
- Make the user feel excited about their trip through great content, not excessive emojis`;

  return basePrompt;
}

// Mock RAG retrieval for demo mode
function getMockRAGResults(query: string, tripId: string): any[] {
  const lowercaseQuery = query.toLowerCase();
  const allResults = [
    {
      content_text:
        'Sarah Chen: Super excited for this trip! Has everyone seen the weather forecast?',
      source_type: 'chat',
      similarity: 0.85,
      metadata: { author: 'Sarah Chen' },
    },
    {
      content_text: 'Payment: Dinner at Sakura Restaurant. Amount: USD 240.00',
      source_type: 'payment',
      similarity: 0.92,
      metadata: { amount: 240.0, currency: 'USD' },
    },
    {
      content_text: 'Payment: Taxi to airport. Amount: USD 65.00',
      source_type: 'payment',
      similarity: 0.88,
      metadata: { amount: 65.0, currency: 'USD' },
    },
    {
      content_text: 'Event: Welcome Dinner at The Little Nell Restaurant. Group dinner at 7 PM',
      source_type: 'calendar',
      similarity: 0.9,
      metadata: { location: 'The Little Nell Restaurant' },
    },
    {
      content_text: 'Task: Confirm dinner reservations',
      source_type: 'task',
      similarity: 0.87,
      metadata: { assignee: 'Priya Patel' },
    },
    {
      content_text:
        'Poll: Where should we have dinner tonight?. Options: Italian Restaurant, Sushi Place, Steakhouse, Thai Food',
      source_type: 'poll',
      similarity: 0.89,
      metadata: { total_votes: 8 },
    },
    {
      content_text:
        'Broadcast [logistics]: All luggage must be outside rooms by 8 AM for pickup tomorrow!',
      source_type: 'broadcast',
      similarity: 0.82,
      metadata: { priority: 'logistics' },
    },
  ];

  // Filter based on query keywords
  let filteredResults = allResults;

  if (
    lowercaseQuery.includes('payment') ||
    lowercaseQuery.includes('money') ||
    lowercaseQuery.includes('owe')
  ) {
    filteredResults = allResults.filter(
      r => r.source_type === 'payment' || r.content_text.toLowerCase().includes('payment'),
    );
  } else if (lowercaseQuery.includes('dinner') || lowercaseQuery.includes('restaurant')) {
    filteredResults = allResults.filter(
      r =>
        r.content_text.toLowerCase().includes('dinner') ||
        r.content_text.toLowerCase().includes('restaurant'),
    );
  } else if (lowercaseQuery.includes('task') || lowercaseQuery.includes('todo')) {
    filteredResults = allResults.filter(r => r.source_type === 'task');
  } else if (lowercaseQuery.includes('poll') || lowercaseQuery.includes('vote')) {
    filteredResults = allResults.filter(r => r.source_type === 'poll');
  }

  // Sort by similarity and return top results
  return filteredResults.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}

async function storeConversation(
  supabase: any,
  tripId: string,
  userMessage: string,
  aiResponse: string,
  type: string,
  metadata?: any,
) {
  try {
    // Get user_id from auth context if available
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from('ai_queries').insert({
      trip_id: tripId,
      user_id: user?.id || null,
      query_text: userMessage,
      response_text: aiResponse,
      source_count: metadata?.grounding_sources || 0,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to store conversation:', error);
  }
}
