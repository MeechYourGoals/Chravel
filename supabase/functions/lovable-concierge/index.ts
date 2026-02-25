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
import { normalizeGeminiModel } from '../_shared/gemini.ts';
import { executeFunctionCall } from '../_shared/functionExecutor.ts';
import { buildSystemPrompt } from '../_shared/promptBuilder.ts';
import { incrementConciergeTripUsage } from '../_shared/conciergeUsage.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY'); // kept as fallback
const FORCE_LOVABLE_PROVIDER = (Deno.env.get('AI_PROVIDER') || '').toLowerCase() === 'lovable';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// In-memory cache for get_concierge_trip_history RPC results.
// Keyed by `${tripId}:${userId}`, 30 s TTL (matches TripContextBuilder cache).
// Prevents a repeated DB round-trip for every message in a rapid back-to-back conversation.
// This cache lives in the edge-function process and is never shared across users.
interface HistoryCacheEntry {
  data: ChatMessage[];
  expiresAt: number;
}
const historyCache = new Map<string, HistoryCacheEntry>();
const HISTORY_CACHE_TTL_MS = 30_000;

// 🆕 RATE LIMITING & CACHING (In-Memory)
// Protects against rapid-fire abuse on the same function instance
const requestCounts = new Map<string, { count: number; windowStart: number }>();
const responseCache = new Map<string, { response: any; timestamp: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per instance
const CACHE_TTL_MS = 60_000; // 1 minute cache for identical queries

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LovableConciergeRequest {
  message: string;
  tripContext?: any;
  tripId?: string;
  attachments?: Array<{
    mimeType: string;
    data: string;
    name?: string;
  }>;
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
  attachments: z
    .array(
      z.object({
        mimeType: z.string().min(3).max(120),
        data: z.string().min(1).max(6_000_000),
        name: z.string().max(255).optional(),
      }),
    )
    .max(4, 'Maximum 4 attachments')
    .optional(),
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
      budgetUnit: z.enum(['experience', 'day', 'person', 'trip']).optional(),
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
  stream: z.boolean().optional(),
  config: z
    .object({
      model: z.string().max(100).optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(8192).optional(),
      systemPrompt: z.string().max(2000, 'System prompt too long').optional(),
    })
    .optional(),
});

const TRIP_SCOPED_QUERY_PATTERN =
  /\b(trip|itinerary|schedule|calendar|event|dinner|lunch|breakfast|reservation|basecamp|hotel|flight|task|todo|payment|owe|expense|poll|vote|chat|message|broadcast|address|meeting|check[- ]?in|check[- ]?out|plan|agenda|logistics|team|member|members|channel|channels|role|roles|who's on|who is on|group|organizer|admin)\b/i;

const ARTIFACT_QUERY_PATTERN =
  /\b(upload|uploaded|document|documents|doc|docs|pdf|file|files|attachment|attachments|link|links|receipt|receipts|invoice|invoices|image|images|photo|photos|media|transcript|note|notes|summary|summarize|summarise)\b/i;

// Expand with common sports, entertainment, and general knowledge terms to skip
// context-building for obvious non-trip queries, speeding up response time.
const CLEARLY_GENERAL_QUERY_PATTERN =
  /\b(nba|nfl|mlb|nhl|mls|nascar|premier league|la liga|serie a|bundesliga|ligue 1|champions league|fifa|super bowl|world cup|oscars|grammys|emmys|golden globes|box office|stock market|s&p|nasdaq|dow jones|bitcoin|ethereum|crypto price|exchange rate|leetcode|algorithm interview|capital of|define |what is photosynthesis|solve for x|who invented|when was .+ born|history of|population of|how to cook|recipe for|calories in|translate)\b/i;

function shouldRunRAGRetrieval(query: string, tripId: string): boolean {
  if (!tripId || tripId === 'unknown') return false;

  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 6) return false;

  // Always retrieve for trip-scoped and uploaded-content prompts.
  if (TRIP_SCOPED_QUERY_PATTERN.test(normalizedQuery)) return true;
  if (ARTIFACT_QUERY_PATTERN.test(normalizedQuery)) return true;

  // Only skip retrieval when query is clearly unrelated to trip context.
  if (CLEARLY_GENERAL_QUERY_PATTERN.test(normalizedQuery)) return false;

  // Default to retrieval to avoid missing relevant kb_chunks context.
  return true;
}

/**
 * Returns true if the query is about trip-specific data (calendar, chat, tasks,
 * polls, payments, preferences). When false, we skip heavy context building
 * and RAG for faster answers via direct Gemini + Google Search.
 */
function isTripRelatedQuery(query: string): boolean {
  const q = query.trim();
  if (q.length < 4) return true; // short queries: default to full context

  const normalized = q.toLowerCase();

  // Explicit trip-scoped or artifact terms → need full context
  if (TRIP_SCOPED_QUERY_PATTERN.test(normalized)) return true;
  if (ARTIFACT_QUERY_PATTERN.test(normalized)) return true;

  // Trip-ownership phrasing
  if (/\b(our|my|we're|who's going|who is going|our trip|my trip)\b/i.test(normalized)) {
    return true;
  }

  // Clearly general (sports, crypto, etc.) → skip context
  if (CLEARLY_GENERAL_QUERY_PATTERN.test(normalized)) return false;

  // General web-only patterns (tour dates, weather, news) with no trip terms
  const generalWebPattern =
    /\b(weather|forecast|tour dates|upcoming|concert|festival|score|scores|news|stock|price|restaurant near|hotel in)\b/i;
  if (generalWebPattern.test(normalized) && !TRIP_SCOPED_QUERY_PATTERN.test(normalized)) {
    return false;
  }

  // Ambiguous: default to full context for accuracy
  return true;
}

type UsagePlan = 'free' | 'explorer' | 'frequent_chraveler';

interface UsagePlanResolution {
  usagePlan: UsagePlan;
  tripQueryLimit: number | null;
}

const EXPLORER_PRODUCT_IDS = new Set(['prod_Tc0SWNhLkoCDIi', 'prod_Tx0AZIWAubAWD3']);

const getQueryLimitForUsagePlan = (plan: UsagePlan): number | null => {
  if (plan === 'free') return 5;
  if (plan === 'explorer') return 10;
  return null;
};

const mapRawPlanToUsagePlan = (plan: string | null | undefined): UsagePlan => {
  if (!plan || plan === 'free' || plan === 'consumer') return 'free';
  if (plan === 'explorer' || plan === 'plus') return 'explorer';
  return 'frequent_chraveler';
};

const isActiveEntitlementStatus = (status: string | null | undefined): boolean =>
  status === 'active' || status === 'trialing';

const hasActiveEntitlementPeriod = (periodEnd: string | null | undefined): boolean => {
  if (!periodEnd) return true;
  const parsed = Date.parse(periodEnd);
  if (Number.isNaN(parsed)) return true;
  return parsed > Date.now();
};

const buildTripLimitReachedResponse = (
  corsHeaders: Record<string, string>,
  usagePlan: UsagePlan,
): Response => {
  const limitMessage =
    usagePlan === 'free'
      ? "You've used all 5 Concierge queries for this trip."
      : "You've used all 10 Concierge queries for this trip.";
  return new Response(
    JSON.stringify({
      response: `🚫 **Trip query limit reached**\n\n${limitMessage}`,
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
};

const buildUsageVerificationUnavailableResponse = (corsHeaders: Record<string, string>): Response =>
  new Response(
    JSON.stringify({
      response:
        "⚠️ **Unable to verify query allowance**\n\nWe couldn't verify your Concierge usage right now. Please try again in a moment.",
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      sources: [],
      success: false,
      error: 'usage_verification_unavailable',
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  );

async function resolveUsagePlanForUser(
  supabase: any,
  userId: string,
): Promise<UsagePlanResolution> {
  const defaultResolution: UsagePlanResolution = {
    usagePlan: 'free',
    tripQueryLimit: 5,
  };

  const { data: entitlementData, error: entitlementError } = await supabase
    .from('user_entitlements')
    .select('plan, status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (entitlementError) {
    console.error('[Usage] Failed to read user_entitlements:', entitlementError);
  }

  if (
    entitlementData &&
    isActiveEntitlementStatus(entitlementData.status) &&
    hasActiveEntitlementPeriod(entitlementData.current_period_end)
  ) {
    const usagePlan = mapRawPlanToUsagePlan(entitlementData.plan);
    return {
      usagePlan,
      tripQueryLimit: getQueryLimitForUsagePlan(usagePlan),
    };
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('app_role, subscription_status, subscription_product_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('[Usage] Failed to read profiles fallback fields:', profileError);
    return defaultResolution;
  }

  if (profileData && isActiveEntitlementStatus(profileData.subscription_status)) {
    const productId = String(profileData.subscription_product_id || '');
    if (productId && EXPLORER_PRODUCT_IDS.has(productId)) {
      return { usagePlan: 'explorer', tripQueryLimit: 10 };
    }
    if (productId) {
      return { usagePlan: 'frequent_chraveler', tripQueryLimit: null };
    }
  }

  const fallbackPlan = mapRawPlanToUsagePlan(profileData?.app_role);
  return {
    usagePlan: fallbackPlan,
    tripQueryLimit: getQueryLimitForUsagePlan(fallbackPlan),
  };
}

// ========== SSE STREAMING HELPERS ==========

/** Encode a single SSE event into bytes. */
function sseEvent(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

/** Accumulated state while reading a Gemini SSE stream. */
interface GeminiStreamState {
  fullText: string;
  groundingMetadata: any;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  functionCallParts: any[];
}

/**
 * Read a Gemini `streamGenerateContent?alt=sse` response body and forward
 * text chunks to the client SSE controller. Function-call parts are collected
 * (not forwarded) so the caller can execute them and optionally start a
 * follow-up stream.
 */
async function readGeminiSSEStream(
  body: ReadableStream<Uint8Array>,
  controller: ReadableStreamDefaultController,
  accumulateUsage: boolean,
  prior: GeminiStreamState,
): Promise<GeminiStreamState> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6);
      if (!jsonStr.trim()) continue;

      let chunk: any;
      try {
        chunk = JSON.parse(jsonStr);
      } catch {
        buffer = lines.slice(i).join('\n');
        break;
      }

      const candidate = chunk.candidates?.[0];
      if (!candidate) continue;

      for (const part of candidate.content?.parts || []) {
        if (part.functionCall) {
          prior.functionCallParts.push(part);
        } else if (typeof part.text === 'string') {
          prior.fullText += part.text;
          controller.enqueue(sseEvent({ type: 'chunk', text: part.text }));
        }
      }

      if (candidate.groundingMetadata) {
        prior.groundingMetadata = candidate.groundingMetadata;
      }

      if (chunk.usageMetadata) {
        const u = chunk.usageMetadata;
        if (accumulateUsage) {
          prior.usage.prompt_tokens += u.promptTokenCount || 0;
          prior.usage.completion_tokens += u.candidatesTokenCount || 0;
          prior.usage.total_tokens += u.totalTokenCount || 0;
        } else {
          prior.usage = {
            prompt_tokens: u.promptTokenCount || 0,
            completion_tokens: u.candidatesTokenCount || 0,
            total_tokens: u.totalTokenCount || 0,
          };
        }
      }
    }
  }

  return prior;
}

/**
 * Stream a Gemini response as SSE chunks to the client.
 *
 * When the model returns function-call parts, this function executes them,
 * makes a second streaming call with the results, and continues streaming.
 */
async function streamGeminiToSSE(
  controller: ReadableStreamDefaultController,
  geminiRequestBody: any,
  geminiContents: any[],
  systemInstruction: string,
  selectedModel: string,
  temperature: number,
  maxTokens: number,
  supabase: any,
  tripId: string,
  userId: string | undefined,
  locationData: any,
): Promise<{
  fullText: string;
  groundingMetadata: any;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  functionCalls: string[];
}> {
  const geminiStreamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

  const response = await fetch(geminiStreamEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiRequestBody),
    signal: AbortSignal.timeout(50_000),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errMsg = errorData.error?.message || JSON.stringify(errorData);
    // If Gemini returns 403 (unregistered callers / API key restrictions),
    // signal the caller to fall back to the Lovable gateway instead of crashing.
    if (response.status === 403) {
      throw Object.assign(new Error(`Gemini 403: ${errMsg}`), { gemini403: true });
    }
    throw new Error(`Gemini streaming API Error: ${response.status} - ${errMsg}`);
  }

  const state: GeminiStreamState = {
    fullText: '',
    groundingMetadata: null,
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    functionCallParts: [],
  };

  await readGeminiSSEStream(response.body!, controller, false, state);

  const executedFunctions: string[] = [];

  // Handle function calls collected during the stream
  if (state.functionCallParts.length > 0) {
    const functionCallResults: any[] = [];

    // Parallelize independent function calls (e.g. multiple getPlaceDetails)
    const callTasks = state.functionCallParts.map(async part => {
      const fc = part.functionCall;
      let parsedArgs: Record<string, unknown> = {};
      if (typeof fc.args === 'string') {
        try {
          parsedArgs = JSON.parse(fc.args || '{}');
        } catch {
          /* skip */
        }
      } else if (fc.args && typeof fc.args === 'object') {
        parsedArgs = fc.args as Record<string, unknown>;
      }

      console.log(`[Stream/FunctionCall] Executing: ${fc.name}`, parsedArgs);
      executedFunctions.push(fc.name);

      let result: any;
      try {
        result = await executeFunctionCall(
          supabase,
          fc.name,
          parsedArgs,
          tripId,
          userId,
          locationData,
        );
      } catch (fcError) {
        console.error(`[Stream/FunctionCall] Error executing ${fc.name}:`, fcError);
        result = {
          error: `Failed to execute ${fc.name}: ${fcError instanceof Error ? fcError.message : String(fcError)}`,
        };
      }

      return { name: fc.name, response: result };
    });

    const results = await Promise.all(callTasks);
    for (const r of results) {
      functionCallResults.push(r);
      controller.enqueue(sseEvent({ type: 'function_call', name: r.name, result: r.response }));
    }

    // Follow-up streaming call with function results
    const followUpSafetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ];
    const followUpBody = {
      contents: [
        ...geminiContents,
        { role: 'model', parts: state.functionCallParts },
        {
          role: 'user',
          parts: functionCallResults.map(r => ({
            functionResponse: { name: r.name, response: r.response },
          })),
        },
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature, maxOutputTokens: maxTokens },
      safetySettings: followUpSafetySettings,
    };

    const followUpResponse = await fetch(geminiStreamEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(followUpBody),
      signal: AbortSignal.timeout(40_000),
    });

    if (followUpResponse.ok) {
      // Reset functionCallParts so the second stream doesn't re-collect
      state.functionCallParts = [];
      await readGeminiSSEStream(followUpResponse.body!, controller, true, state);
    } else {
      const fallback = '\n\nAction completed. Check your trip tabs for the update.';
      controller.enqueue(sseEvent({ type: 'chunk', text: fallback }));
      state.fullText += fallback;
    }
  }

  return {
    fullText: state.fullText,
    groundingMetadata: state.groundingMetadata,
    usage: state.usage,
    functionCalls: executedFunctions,
  };
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
  let tripQueryLimit: number | null = null;
  let usagePlan: 'free' | 'explorer' | 'frequent_chraveler' = 'free';

  try {
    // Early health check path - responds immediately without AI processing
    if (req.method === 'GET') {
      return createSecureResponse({
        status: 'healthy',
        service: 'lovable-concierge',
        timestamp: new Date().toISOString(),
        message: 'AI Concierge service is online',
        geminiConfigured: !!GEMINI_API_KEY,
        provider: GEMINI_API_KEY && !FORCE_LOVABLE_PROVIDER ? 'gemini' : 'lovable',
      });
    }

    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error('No AI API key configured (GEMINI_API_KEY or LOVABLE_API_KEY)');
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
    // 🆕 PII SANITIZATION: Redact immediately, use redacted text for everything
    const piiRedaction = redactPII(validatedData.message, {
      redactEmails: true,
      redactPhones: true,
      redactCreditCards: true,
      redactSSN: true,
      redactIPs: true,
    });
    message = piiRedaction.redactedText; // Use redacted message for processing
    tripId = validatedData.tripId || 'unknown';

    // Reject invalid trip IDs early — prevents wrong-trip data access
    const isValidTripId = (id: string) =>
      id === 'unknown' ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      /^[a-zA-Z0-9_-]{1,20}$/.test(id); // Allow demo IDs like "1"
    if (tripId !== 'unknown' && !isValidTripId(tripId)) {
      logError('LOVABLE_CONCIERGE_INVALID_TRIP_ID', new Error('Invalid trip ID format'), {
        tripId,
      });
      return createErrorResponse('Invalid trip ID', 400);
    }
    const {
      tripContext,
      attachments = [],
      chatHistory = [],
      config = {},
      isDemoMode: requestedDemoMode = false,
      stream: requestedStream = false,
    } = validatedData;

    // 🆕 SAFETY: Content filtering
    const profanityCheck = filterProfanity(message);
    if (!profanityCheck.isClean) {
      console.warn('[Safety] Profanity detected in query:', profanityCheck.violations);
    }

    const logMessage = message; // Already redacted

    if (piiRedaction.redactions.length > 0) {
      console.log(
        '[Safety] PII redacted from query:',
        piiRedaction.redactions.map(r => r.type),
      );
    }

    // 🆕 CACHING CHECK (Short-term deduplication)
    // Only cache read-only queries (no attachments, no function calls implied by context)
    const cacheKey = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${tripId}:${message}:${JSON.stringify(config)}`),
    ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

    const cachedEntry = responseCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      console.log('[Cache] Serving cached response');
      return new Response(JSON.stringify(cachedEntry.response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      ...(authHeader
        ? {
            global: {
              headers: {
                Authorization: authHeader,
              },
            },
          }
        : {}),
    });

    // Demo traffic must use dedicated demo-concierge endpoint.
    if (requestedDemoMode) {
      console.warn('[Security] Ignoring client-provided demo mode on authenticated concierge path');
    }

    const serverDemoMode = false;
    let user = null;
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

    // 🆕 IN-MEMORY RATE LIMITING (Burst Protection)
    const now = Date.now();
    const userRateLimit = requestCounts.get(user.id) || { count: 0, windowStart: now };
    if (now - userRateLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
      userRateLimit.count = 1;
      userRateLimit.windowStart = now;
    } else {
      userRateLimit.count++;
    }
    requestCounts.set(user.id, userRateLimit);

    if (userRateLimit.count > MAX_REQUESTS_PER_WINDOW) {
      console.warn(`[RateLimit] User ${user.id} exceeded in-memory burst limit`);
      return new Response(
        JSON.stringify({
          error: 'Too many requests. Please slow down.',
          success: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 },
      );
    }

    // 🆕 DB-BASED CIRCUIT BREAKER (Sustained Abuse Protection)
    // Check total requests across all instances in the last minute
    if (!serverDemoMode) {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { count: recentRequestCount, error: countError } = await supabase
        .from('concierge_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('created_at', oneMinuteAgo);

      if (!countError && (recentRequestCount || 0) > 20) {
        console.warn(`[RateLimit] User ${user.id} exceeded DB-based circuit breaker (sustained load)`);
        return new Response(
          JSON.stringify({
            error: 'High traffic detected. Please try again in a minute.',
            success: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 },
        );
      }
    }

    // --- PARALLELIZED PRE-FLIGHT CHECKS ---
    // Membership, usage plan, context building, RAG retrieval, and privacy
    // were previously sequential (~3-5 s total). Running them concurrently
    // collapses that to the duration of the single slowest query.
    const hasTripId = tripId && tripId !== 'unknown';
    const tripRelated = isTripRelatedQuery(message);
    const runRAGRetrieval = tripRelated && shouldRunRAGRetrieval(message, tripId);

    if (!tripRelated) {
      console.log('[Context] General web query detected — skipping trip context for speed');
    }

    // Resolve usage plan first so we can gate preferences in buildContext.
    // Plan resolution is fast (~20-50 ms) and keeps all subsequent fetches clean.
    const planResolution = await (!serverDemoMode && user
      ? resolveUsagePlanForUser(supabase, user.id)
      : Promise.resolve({ usagePlan: 'free' as const, tripQueryLimit: 5 }));
    const isPaidUser = planResolution.usagePlan !== 'free';

    // Fire remaining independent queries at once
    const [membershipResult, contextResult, ragResult, privacyResult, persistedHistory] =
      await Promise.all([
        // 1. Trip membership check
        hasTripId && !serverDemoMode && user
          ? supabase
              .from('trip_members')
              .select('user_id')
              .eq('trip_id', tripId)
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: { user_id: 'skip' }, error: null }),

        // 2. Trip context building (heaviest — ~100-300 ms). Skip for general web queries.
        // Uses 30s cache for rapid successive messages. Pass client preferences to skip DB fetch.
        hasTripId && !tripContext && tripRelated
          ? TripContextBuilder.buildContextWithCache(
              tripId,
              user?.id,
              authHeader,
              isPaidUser,
              validatedData.preferences,
            ).catch(error => {
              console.error('Failed to build comprehensive context:', error);
              return null;
            })
          : Promise.resolve(tripContext || null),

        // 4. RAG keyword retrieval (skip for general web queries)
        // Skip entirely when trip has no kb content — saves DB round-trip
        runRAGRetrieval
          ? (async () => {
              try {
                const { data: hasKbDocs, error: kbCheckError } = await supabase
                  .from('kb_documents')
                  .select('id')
                  .eq('trip_id', tripId)
                  .limit(1)
                  .maybeSingle();

                if (kbCheckError || !hasKbDocs) {
                  return '';
                }

                console.log('Using keyword-only search for RAG retrieval');
                const { data: keywordResults, error: keywordError } = await supabase
                  .from('kb_chunks')
                  .select('id, content, doc_id, modality')
                  .textSearch('content_tsv', message.split(' ').slice(0, 5).join(' & '), {
                    type: 'plain',
                  })
                  .limit(10);

                if (keywordError || !keywordResults?.length) return '';

                const docIds = [
                  ...new Set(keywordResults.map((r: any) => r.doc_id).filter(Boolean)),
                ];
                const docMap = new Map();

                if (docIds.length > 0) {
                  const { data: docs } = await supabase
                    .from('kb_documents')
                    .select('id, source, trip_id')
                    .in('id', docIds)
                    .eq('trip_id', tripId);
                  docs?.forEach((d: any) => docMap.set(d.id, d));
                }

                const tripChunks = keywordResults.filter((r: any) => {
                  const doc = docMap.get(r.doc_id);
                  return doc?.trip_id === tripId;
                });

                if (!tripChunks.length) return '';

                console.log(`Found ${tripChunks.length} relevant context items via keyword search`);
                let ctx = '\n\n=== RELEVANT TRIP CONTEXT (Keyword Search) ===\n';
                ctx += 'Retrieved using keyword matching:\n';
                tripChunks.forEach((result: any, idx: number) => {
                  const doc = docMap.get(result.doc_id);
                  const sourceType = doc?.source || result.modality || 'unknown';
                  ctx += `\n[${idx + 1}] [${sourceType}] ${(result.content || '').substring(0, 300)}`;
                });
                ctx +=
                  '\n\nIMPORTANT: Use this retrieved context to provide accurate answers. Cite sources when possible.';
                return ctx;
              } catch (ragError) {
                console.error('RAG retrieval failed:', ragError);
                return '';
              }
            })()
          : Promise.resolve(''),

        // 5. Privacy config check
        hasTripId && !serverDemoMode
          ? Promise.resolve(
              supabase
                .from('trip_privacy_configs')
                .select('ai_access_enabled')
                .eq('trip_id', tripId)
                .maybeSingle(),
            ).catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),

        // 6. Persisted concierge history from ai_queries.
        // Only fetch when we have a real trip and an authenticated user.
        // On any failure, treat as empty array — history is non-critical context.
        // 6. Persisted concierge history (30 s in-process cache to avoid DB hit on every message)
        hasTripId && !serverDemoMode && user
          ? (async (): Promise<ChatMessage[]> => {
              const cacheKey = `${tripId}:${user.id}`;
              const cached = historyCache.get(cacheKey);
              if (cached && cached.expiresAt > Date.now()) {
                return cached.data;
              }
              try {
                const { data, error: rpcError } = (await supabase.rpc(
                  'get_concierge_trip_history',
                  { p_trip_id: tripId, p_limit: 10 },
                )) as {
                  data: Array<{ role: string; content: string; created_at: string }> | null;
                  error: unknown;
                };
                if (rpcError || !data) return [];
                const messages = data.filter(
                  m => m.role === 'user' || m.role === 'assistant',
                ) as ChatMessage[];
                historyCache.set(cacheKey, {
                  data: messages,
                  expiresAt: Date.now() + HISTORY_CACHE_TTL_MS,
                });
                return messages;
              } catch {
                return [];
              }
            })()
          : Promise.resolve([] as ChatMessage[]),
      ]);

    // --- EVALUATE PARALLEL RESULTS ---

    // Membership gate
    if (!serverDemoMode && user && hasTripId) {
      if (membershipResult.error || !membershipResult.data) {
        return createErrorResponse('Forbidden - you must be a member of this trip', 403);
      }
    }

    // Privacy gate
    if ((privacyResult as any)?.data?.ai_access_enabled === false) {
      return new Response(
        JSON.stringify({
          response:
            '🔒 **AI Concierge is disabled for this trip.**\n\nA trip organizer turned off AI access in privacy settings. You can still use all other trip features.',
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

    // Usage limits
    usagePlan = planResolution.usagePlan;
    tripQueryLimit = planResolution.tripQueryLimit;

    if (!serverDemoMode && user && tripQueryLimit !== null && hasTripId) {
      const { data: tripUsageData, error: tripUsageError } = await supabase.rpc(
        'get_concierge_trip_usage',
        { p_trip_id: tripId },
      );

      if (tripUsageError) {
        console.error('[Usage] Failed to fetch trip concierge usage:', tripUsageError);
        return buildUsageVerificationUnavailableResponse(corsHeaders);
      }

      const usedCount = Number(tripUsageData ?? 0);
      if (usedCount >= tripQueryLimit) {
        return buildTripLimitReachedResponse(corsHeaders, usagePlan);
      }
    }

    // Assemble context
    let comprehensiveContext = contextResult || tripContext;
    if (comprehensiveContext) {
      console.log(
        '[Context] Built context with user preferences:',
        !!comprehensiveContext?.userPreferences,
      );
    }

    // Client-passed preferences fallback
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

        const fallbackPrefs = {
          dietary: clientPrefs.dietary || [],
          vibe: clientPrefs.vibe || [],
          accessibility: clientPrefs.accessibility || [],
          business: clientPrefs.business || [],
          entertainment: clientPrefs.entertainment || [],
          budget:
            clientPrefs.budgetMin !== undefined && clientPrefs.budgetMax !== undefined
              ? `$${clientPrefs.budgetMin}-$${clientPrefs.budgetMax} ${clientPrefs.budgetUnit === 'day' ? 'per day' : clientPrefs.budgetUnit === 'person' ? 'per person' : clientPrefs.budgetUnit === 'trip' ? 'per trip' : 'per experience'}`
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

    const ragContext = ragResult || '';

    // --- MERGE CHAT HISTORY ---
    // Priority: client-provided chatHistory (in-memory session) takes precedence over
    // persisted history. If the client sends messages, it already has the freshest state.
    // Persisted history is the fallback when the user arrives in a new session.
    const mergedChatHistory: ChatMessage[] =
      chatHistory.length > 0 ? chatHistory : (persistedHistory ?? []);

    if (mergedChatHistory.length > 0) {
      console.log(
        `[Context] Chat history source: ${chatHistory.length > 0 ? 'client' : 'persisted'} (${mergedChatHistory.length} messages)`,
      );
    }

    // 🆕 SMART MODEL SELECTION: Analyze query complexity
    const contextSize = comprehensiveContext ? JSON.stringify(comprehensiveContext).length : 0;
    const complexity = analyzeQueryComplexity(message, mergedChatHistory.length, contextSize);

    console.log(
      `[Model Selection] Complexity score: ${complexity.score.toFixed(2)}, Recommended: ${complexity.recommendedModel}`,
    );

    // Determine if chain-of-thought is needed
    const useChainOfThought = requiresChainOfThought(message, complexity);

    // Detect image/visual intent — user wants to see pictures (Gemini-like inline image experience)
    const IMAGE_INTENT_PATTERN =
      /\b(picture|pictures|photo|photos|image|images|show me (what|pictures?|photos?)|what does .+ look like|how does .+ look|visual of|see (pictures?|photos?|images?))\b/i;
    const hasImageIntent = IMAGE_INTENT_PATTERN.test(message);

    const imageIntentAddendum = hasImageIntent
      ? `

**IMPORTANT — User wants visual content:** Include 2-4 inline markdown images in your response.
- Format each image as: ![Brief description](https://direct-image-url.com/image.jpg)
- Use high-quality image URLs from your web search (Wikipedia, official sites, tourism boards, etc.)
- Place images in a grid-like layout with brief captions or source attribution
- Example: ![Hollywood Bowl aerial view](https://example.com/image.jpg) *Source: example.com*
- Do NOT use placeholder or broken URLs — only include real, working image URLs from search results.`
      : '';

    // Build context-aware system prompt. For general web queries, use a lean prompt for speed
    // but still include full formatting instructions so responses are rich and link-heavy.
    let baseSystemPrompt: string;
    if (!tripRelated || !comprehensiveContext) {
      baseSystemPrompt = `You are **Chravel Concierge**, a helpful AI travel and general assistant.
Current date: ${new Date().toISOString().split('T')[0]}

Answer the user's question accurately. Use web search for real-time info (weather, scores, events, tour dates, news, etc.).

**Formatting rules (always follow):**
- Use markdown for all responses — headers, bullet points, bold, italics as appropriate
- Format ALL links as clickable markdown: [Title](https://url.com)
- For places, restaurants, events or attractions always include a link: [Place Name](https://www.google.com/maps/search/Place+Name)
- Use **bold** for key names, dates, and important facts
- Use bullet points (-) for lists; numbered lists for ranked items or steps
- Keep responses concise but information-rich — quality over quantity
- When citing sources from web search, reference them naturally in-text as hyperlinks${imageIntentAddendum}`;
    } else {
      baseSystemPrompt =
        buildSystemPrompt(comprehensiveContext, config.systemPrompt) +
        ragContext +
        imageIntentAddendum;
    }

    // 🆕 ENHANCED PROMPTS: Add few-shot examples and chain-of-thought (skip for general web queries)
    const systemPrompt =
      tripRelated && comprehensiveContext
        ? buildEnhancedSystemPrompt(baseSystemPrompt, useChainOfThought, true)
        : baseSystemPrompt;

    // 🆕 EXPLICIT CONTEXT WINDOW MANAGEMENT
    // Limit chat history to prevent token overflow
    const MAX_CHAT_HISTORY_MESSAGES = 10;
    const MAX_SYSTEM_PROMPT_LENGTH = 8000; // Characters, not tokens (rough estimate)
    const MAX_TOTAL_CONTEXT_LENGTH = 12000; // Characters
    const MAX_HISTORY_MSG_LENGTH = 2500; // Per-message char cap before trimming
    const MAX_HISTORY_TOTAL_LENGTH = 8000; // Total char budget for history

    // Step 1: Per-message truncation — prevents a single long response from blowing context.
    const perMessageTruncated = mergedChatHistory.map(msg => {
      if (msg.content.length <= MAX_HISTORY_MSG_LENGTH) return msg;
      console.log('[Context Management] Truncating long history message');
      return {
        ...msg,
        content: msg.content.substring(0, MAX_HISTORY_MSG_LENGTH) + '\n...[truncated for context]',
      };
    });

    // Step 2: Total budget enforcement — drop oldest messages until total chars fit.
    // Most recent messages are most relevant; trim from the front.
    let historyForSlicing = perMessageTruncated;
    let totalHistoryLength = historyForSlicing.reduce((sum, m) => sum + m.content.length, 0);
    while (historyForSlicing.length > 0 && totalHistoryLength > MAX_HISTORY_TOTAL_LENGTH) {
      const removed = historyForSlicing.shift();
      totalHistoryLength -= removed?.content.length ?? 0;
      console.log('[Context Management] Dropped oldest history message to fit budget');
    }

    // Step 3: Recency limit — keep at most MAX_CHAT_HISTORY_MESSAGES.
    const limitedChatHistory = historyForSlicing.slice(-MAX_CHAT_HISTORY_MESSAGES);

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

    // Prepare messages
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

    // Smart grounding detection - location queries
    const isLocationQuery = message
      .toLowerCase()
      .match(
        /\b(where|restaurant|hotel|cafe|bar|attraction|place|location|near|around|close|best|find|suggest|recommend|visit|directions|route|food|eat|drink|stay|sushi|pizza|beach|museum|park)\b/i,
      );

    const tripBasecamp = comprehensiveContext?.places?.tripBasecamp;
    const personalBasecamp = comprehensiveContext?.places?.personalBasecamp;
    const locationData =
      tripBasecamp?.lat && tripBasecamp?.lng
        ? tripBasecamp
        : personalBasecamp?.lat && personalBasecamp?.lng
          ? personalBasecamp
          : null;

    const hasLocationContext = !!locationData;
    const enableLocationGrounding = isLocationQuery && hasLocationContext;

    if (enableLocationGrounding) {
      const basecampType = tripBasecamp?.lat ? 'trip' : 'personal';
      console.log(`[Location] Using ${basecampType} basecamp for grounding: ${locationData?.name}`);
    }

    // Model routing
    const selectedModel = normalizeGeminiModel(config.model, complexity.recommendedModel);

    const temperature = config.temperature || (complexity.score > 0.5 ? 0.5 : 0.7);

    console.log(`[Model Selection] Using model: ${selectedModel}, Temperature: ${temperature}`);

    // ========== GEMINI FUNCTION CALLING DECLARATIONS ==========
    const functionDeclarations = [
      {
        name: 'addToCalendar',
        description: 'Add an event to the trip calendar/itinerary',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Event title' },
            datetime: { type: 'string', description: 'ISO 8601 datetime string' },
            location: { type: 'string', description: 'Event location or address' },
            notes: { type: 'string', description: 'Additional notes or description' },
          },
          required: ['title', 'datetime'],
        },
      },
      {
        name: 'createTask',
        description: 'Create a new task for the trip group',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Task description' },
            assignee: { type: 'string', description: 'Name of the person to assign the task to' },
            dueDate: { type: 'string', description: 'Due date in ISO 8601 format' },
          },
          required: ['content'],
        },
      },
      {
        name: 'createPoll',
        description: 'Create a poll for the group to vote on',
        parameters: {
          type: 'object',
          properties: {
            question: { type: 'string', description: 'The poll question' },
            options: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of poll options (2-6 options)',
            },
          },
          required: ['question', 'options'],
        },
      },
      {
        name: 'getPaymentSummary',
        description: 'Get a summary of who owes what in the trip',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'searchPlaces',
        description:
          'Search for places like restaurants, hotels, attractions near a location. Returns placeId for follow-up details.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (e.g. "sushi restaurant")' },
            nearLat: { type: 'number', description: 'Latitude to search near' },
            nearLng: { type: 'number', description: 'Longitude to search near' },
          },
          required: ['query'],
        },
      },
      {
        name: 'getDirectionsETA',
        description:
          'Get driving directions, ETA, and distance between two locations. Use for "how long to get there" or "directions from X to Y" questions.',
        parameters: {
          type: 'object',
          properties: {
            origin: { type: 'string', description: 'Starting address or place name' },
            destination: { type: 'string', description: 'Destination address or place name' },
            departureTime: {
              type: 'string',
              description: 'Optional ISO 8601 departure time for traffic-aware ETA',
            },
          },
          required: ['origin', 'destination'],
        },
      },
      {
        name: 'getTimezone',
        description:
          'Get the time zone for a geographic location. Use when user asks about time zones or to normalize itinerary times.',
        parameters: {
          type: 'object',
          properties: {
            lat: { type: 'number', description: 'Latitude of the location' },
            lng: { type: 'number', description: 'Longitude of the location' },
          },
          required: ['lat', 'lng'],
        },
      },
      {
        name: 'getPlaceDetails',
        description:
          'Get detailed info about a specific place: hours, phone, website, photos, editorial summary. Use after searchPlaces to show more details, or when user asks "tell me more about [place]" or "show me photos of [venue]".',
        parameters: {
          type: 'object',
          properties: {
            placeId: {
              type: 'string',
              description: 'Google Places ID (from searchPlaces results)',
            },
          },
          required: ['placeId'],
        },
      },
      {
        name: 'searchImages',
        description:
          'Search for images on the web. Use when user asks to "show me pictures/photos of [something]" that is NOT a specific place/venue. For venue photos, use getPlaceDetails instead.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Image search query' },
            count: {
              type: 'number',
              description: 'Number of images to return (max 10, default 5)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'getStaticMapUrl',
        description:
          'Generate a map image showing a location or route. Use when the user wants to see a map or after providing directions. Embed the returned imageUrl with Markdown: ![Map](imageUrl).',
        parameters: {
          type: 'object',
          properties: {
            center: {
              type: 'string',
              description: 'Address or "lat,lng" to center the map on',
            },
            zoom: {
              type: 'number',
              description: 'Zoom level 1-20 (default 13; use 12 for city-level, 15 for walking)',
            },
            markers: {
              type: 'array',
              items: { type: 'string' },
              description: 'Marker locations as addresses or "lat,lng" strings',
            },
          },
          required: ['center'],
        },
      },
      {
        name: 'searchWeb',
        description:
          'Search the web for real-time information: current business hours, prices, reviews, upcoming events, or live data unavailable in trip context. Include sources in your response.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            count: { type: 'number', description: 'Number of results (max 10, default 5)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'getDistanceMatrix',
        description:
          'Get travel times and distances from multiple origins to multiple destinations. Use for "how long from hotel to each restaurant?" or comparing route options.',
        parameters: {
          type: 'object',
          properties: {
            origins: {
              type: 'array',
              items: { type: 'string' },
              description: 'Starting addresses or place names',
            },
            destinations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Destination addresses or place names',
            },
            mode: {
              type: 'string',
              description: 'Travel mode: driving (default), walking, bicycling, or transit',
            },
          },
          required: ['origins', 'destinations'],
        },
      },
      {
        name: 'validateAddress',
        description:
          'Validate and clean up an address, and get its exact coordinates. Use when a user mentions an address and you want to confirm it is correct and get lat/lng for map operations.',
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Address to validate and geocode' },
          },
          required: ['address'],
        },
      },
    ];

    // ========== BUILD GEMINI TOOLS ==========
    // Google Search is enabled for ALL queries — Gemini decides when to use it.
    // This mirrors the voice session setup which always includes both tools.
    // Trip-related queries additionally get function declarations for trip actions
    // (addToCalendar, createTask, createPoll, searchPlaces, getPaymentSummary).
    // gemini-3-flash-preview does NOT support combining functionDeclarations
    // with googleSearch in the same tools array (400: "Tool use with function
    // calling is unsupported by the model"). Use one or the other.
    const geminiTools: any[] = [];
    if (tripRelated) {
      geminiTools.push({ functionDeclarations });
    } else {
      geminiTools.push({ googleSearch: {} });
    }

    console.log(
      '[Grounding]',
      tripRelated
        ? 'Function declarations enabled for trip actions'
        : 'Google Search enabled for general web query',
    );

    // ========== CALL GEMINI API DIRECTLY ==========
    // Convert OpenAI-format messages to Gemini format
    const systemInstruction = finalSystemPrompt;
    const geminiContents: Array<{ role: 'user' | 'model'; parts: any[] }> = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    if (attachments.length > 0 && geminiContents.length > 0) {
      const attachmentParts = attachments.map(att => ({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data,
        },
      }));

      const lastContent = geminiContents[geminiContents.length - 1];
      if (lastContent.role === 'user') {
        lastContent.parts.push(...attachmentParts);
      } else {
        geminiContents.push({
          role: 'user',
          parts: attachmentParts,
        });
      }
    }

    const GEMINI_SAFETY_SETTINGS = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ];

    const geminiRequestBody: any = {
      contents: geminiContents,
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        temperature,
        maxOutputTokens: config.maxTokens || 4096,
      },
      safetySettings: GEMINI_SAFETY_SETTINGS,
      tools: geminiTools,
    };

    // ========== STREAMING PATH (SSE) ==========
    // When stream=true and Gemini is the provider, use streamGenerateContent
    // and return Server-Sent Events instead of a single JSON blob.
    const useStreaming = requestedStream && GEMINI_API_KEY && !FORCE_LOVABLE_PROVIDER;

    if (useStreaming) {
      console.log(`[Gemini] Streaming response via ${selectedModel}`);

      const streamBody = new ReadableStream({
        async start(controller) {
          try {
            const {
              fullText,
              groundingMetadata,
              usage: streamUsage,
              functionCalls: streamFnCalls,
            } = await streamGeminiToSSE(
              controller,
              geminiRequestBody,
              geminiContents,
              systemInstruction,
              selectedModel,
              temperature,
              config.maxTokens || 4096,
              supabase,
              tripId,
              user?.id,
              locationData,
            );

            // Extract grounding citations
            const groundingChunks = groundingMetadata?.groundingChunks || [];
            const googleMapsWidget = groundingMetadata?.searchEntryPoint?.renderedContent || null;

            const citations = groundingChunks.map((chunk: any, index: number) => ({
              id: `citation_${index}`,
              title: chunk.web?.title || 'Source',
              url: chunk.web?.uri || '#',
              snippet: chunk.web?.snippet || '',
              source: groundingMetadata?.searchEntryPoint
                ? 'google_search_grounding'
                : 'google_maps_grounding',
            }));

            // Send final metadata event
            controller.enqueue(
              sseEvent({
                type: 'metadata',
                usage: streamUsage,
                sources: citations,
                googleMapsWidget,
                model: selectedModel,
                complexity: {
                  score: complexity.score,
                  recommended: complexity.recommendedModel,
                  factors: complexity.factors,
                },
                usedChainOfThought: useChainOfThought,
                functionCalls: streamFnCalls.length > 0 ? streamFnCalls : undefined,
              }),
            );

            // Send done event
            controller.enqueue(sseEvent({ type: 'done' }));

            // Post-stream side effects (usage tracking, storage)
            const resolvedTripId = comprehensiveContext?.tripMetadata?.id || tripId || 'unknown';

            if (
              !serverDemoMode &&
              user &&
              tripQueryLimit !== null &&
              resolvedTripId !== 'unknown'
            ) {
              const incrementResult = await incrementConciergeTripUsage(
                supabase,
                resolvedTripId,
                tripQueryLimit,
              );
              if (incrementResult.status === 'verification_unavailable') {
                console.error(
                  '[Usage/Stream] Failed to increment trip usage:',
                  incrementResult.error,
                );
              }
            }

            if (!serverDemoMode && resolvedTripId !== 'unknown') {
              await storeConversation(
                supabase,
                resolvedTripId,
                message,
                fullText,
                'chat',
                {
                  grounding_sources: citations.length,
                  has_map_widget: !!googleMapsWidget,
                  function_calls: streamFnCalls,
                  streamed: true,
                },
                user?.id,
              );
            }

            if (!serverDemoMode && user) {
              try {
                await supabase.from('concierge_usage').insert({
                  user_id: user.id,
                  trip_id: resolvedTripId,
                  query_text: logMessage.substring(0, 500),
                  response_tokens: streamUsage.completion_tokens,
                  model_used: selectedModel,
                  complexity_score: complexity.score,
                  used_pro_model: complexity.recommendedModel === 'pro',
                });
              } catch (usageError) {
                console.error('Failed to track usage:', usageError);
              }
            }
          } catch (streamError: any) {
            console.error('[Gemini/Stream] Streaming failed:', streamError);
            // Try Lovable gateway fallback for ANY Gemini streaming error
            // (not just 403). This ensures users always get a response.
            const reason = streamError?.gemini403
              ? 'Gemini 403 (unregistered callers)'
              : `Gemini streaming error: ${streamError?.message || 'unknown'}`;
            console.warn(`[Gemini/Stream] Attempting Lovable gateway fallback: ${reason}`);
            try {
              if (LOVABLE_API_KEY) {
                const fallbackResp = await fetch(
                  'https://ai.gateway.lovable.dev/v1/chat/completions',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${LOVABLE_API_KEY}`,
                    },
                    body: JSON.stringify({
                      model: `google/${selectedModel}`,
                      messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
                      temperature,
                      max_tokens: config.maxTokens || 2048,
                    }),
                    signal: AbortSignal.timeout(45_000),
                  },
                );
                if (fallbackResp.ok) {
                  const fallbackData = await fallbackResp.json();
                  const fallbackText = fallbackData?.choices?.[0]?.message?.content;
                  if (fallbackText) {
                    controller.enqueue(sseEvent({ type: 'chunk', text: fallbackText }));
                    controller.enqueue(
                      sseEvent({ type: 'metadata', model: 'lovable-gateway-fallback' }),
                    );
                    controller.enqueue(sseEvent({ type: 'done' }));
                  } else {
                    throw new Error('No content in fallback response');
                  }
                } else {
                  throw new Error(`Lovable gateway returned ${fallbackResp.status}`);
                }
              } else {
                throw new Error('No LOVABLE_API_KEY for fallback');
              }
            } catch (fallbackErr) {
              console.error('[Gemini/Stream] Lovable fallback also failed:', fallbackErr);
              controller.enqueue(
                sseEvent({
                  type: 'error',
                  message: 'AI service temporarily unavailable. Please try again.',
                }),
              );
              controller.enqueue(sseEvent({ type: 'done' }));
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(streamBody, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        status: 200,
      });
    }

    // ========== LOVABLE GATEWAY PROVIDER (unified for initial + runtime fallback) ==========
    const invokeLovableGateway = async (
      modelLabel: string,
      reason?: string,
    ): Promise<Response | null> => {
      if (!LOVABLE_API_KEY) return null;

      const lovableTools = functionDeclarations.map(declaration => ({
        type: 'function',
        function: declaration,
      }));

      const lovableMessages: Array<Record<string, unknown>> = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Append attachments to last user message
      if (attachments.length > 0) {
        const attachmentParts = attachments.map(att => ({
          type: 'image_url' as const,
          image_url: { url: `data:${att.mimeType};base64,${att.data}` },
        }));

        const lastUserIdx = lovableMessages.findLastIndex(m => m.role === 'user');
        if (lastUserIdx >= 0) {
          const existing = lovableMessages[lastUserIdx].content;
          const existingParts =
            typeof existing === 'string'
              ? [{ type: 'text' as const, text: existing }]
              : Array.isArray(existing)
                ? existing
                : [];
          lovableMessages[lastUserIdx] = {
            ...lovableMessages[lastUserIdx],
            content: [...existingParts, ...attachmentParts],
          };
        } else {
          lovableMessages.push({ role: 'user', content: attachmentParts });
        }
      }

      const callLovable = (msgs: Array<Record<string, unknown>>) =>
        fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: `google/${selectedModel}`,
            messages: msgs,
            temperature,
            max_tokens: config.maxTokens || 2048,
            tools: lovableTools,
            tool_choice: 'auto',
          }),
          signal: AbortSignal.timeout(45_000),
        });

      const response = await callLovable(lovableMessages);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `Lovable ${modelLabel} error: ${response.status} - ${errText || 'Unknown gateway error'}`,
        );
      }

      let data = await response.json();
      let lovableUsage = data?.usage || {};
      let lovableMessage = data?.choices?.[0]?.message || null;
      const executedFunctions: string[] = [];

      // Handle tool calls
      const toolCalls = Array.isArray(lovableMessage?.tool_calls) ? lovableMessage.tool_calls : [];
      if (toolCalls.length > 0) {
        const toolResultMessages: Array<{ role: 'tool'; tool_call_id: string; content: string }> =
          [];

        for (const toolCall of toolCalls) {
          const functionName = String(toolCall?.function?.name || '');
          if (!functionName) continue;

          // Parse tool arguments
          let parsedArgs: Record<string, unknown> = {};
          const rawArgs = toolCall?.function?.arguments;
          if (typeof rawArgs === 'string') {
            try {
              parsedArgs = JSON.parse(rawArgs || '{}');
            } catch (_) {
              /* skip */
            }
          } else if (rawArgs && typeof rawArgs === 'object') {
            parsedArgs = rawArgs as Record<string, unknown>;
          }

          executedFunctions.push(functionName);

          let functionResult: any;
          try {
            functionResult = await executeFunctionCall(
              supabase,
              functionName,
              parsedArgs,
              tripId,
              user?.id,
              locationData,
            );
          } catch (toolError) {
            console.error(`[LovableTool] Error executing ${functionName}:`, toolError);
            functionResult = {
              error: `Failed to execute ${functionName}: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
            };
          }

          toolResultMessages.push({
            role: 'tool',
            tool_call_id: String(toolCall?.id || functionName),
            content: JSON.stringify(functionResult),
          });
        }

        // Follow-up call with tool results
        const followUpResponse = await callLovable([
          ...lovableMessages,
          { role: 'assistant', content: lovableMessage?.content || '', tool_calls: toolCalls },
          ...toolResultMessages,
        ]);
        if (!followUpResponse.ok) {
          const errText = await followUpResponse.text();
          throw new Error(
            `Lovable ${modelLabel} follow-up error: ${followUpResponse.status} - ${errText || 'Unknown'}`,
          );
        }
        data = await followUpResponse.json();
        lovableUsage = data?.usage || lovableUsage;
        lovableMessage = data?.choices?.[0]?.message || lovableMessage;
      }

      // Extract response text
      const rawContent = lovableMessage?.content;
      const responseText =
        typeof rawContent === 'string'
          ? rawContent
          : Array.isArray(rawContent)
            ? rawContent
                .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
                .join('')
            : 'Sorry, I could not generate a response right now.';

      // Increment usage
      if (!serverDemoMode && user && tripQueryLimit !== null && tripId !== 'unknown') {
        const incrementUsageResult = await incrementConciergeTripUsage(
          supabase,
          tripId,
          tripQueryLimit,
        );
        if (incrementUsageResult.status === 'verification_unavailable') {
          console.error(
            '[Usage] Failed to increment trip concierge usage:',
            incrementUsageResult.error,
          );
          return buildUsageVerificationUnavailableResponse(corsHeaders);
        }
        if (incrementUsageResult.status === 'limit_reached') {
          return buildTripLimitReachedResponse(corsHeaders, usagePlan);
        }
      }

      return new Response(
        JSON.stringify({
          response: responseText,
          usage: {
            prompt_tokens: lovableUsage.prompt_tokens || 0,
            completion_tokens: lovableUsage.completion_tokens || 0,
            total_tokens: lovableUsage.total_tokens || 0,
          },
          sources: [],
          googleMapsWidget: null,
          success: true,
          model: modelLabel,
          ...(reason ? { fallbackReason: reason } : {}),
          functionCalls: executedFunctions.length > 0 ? executedFunctions : undefined,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    };

    // Runtime fallback wrapper (returns null instead of throwing)
    const runRuntimeLovableFallback = async (reason: string): Promise<Response | null> => {
      try {
        return await invokeLovableGateway('lovable-gateway-runtime-fallback', reason);
      } catch (fallbackError) {
        console.error('[AI] Lovable runtime fallback failed:', fallbackError);
        return null;
      }
    };

    if (FORCE_LOVABLE_PROVIDER || !GEMINI_API_KEY) {
      if (!LOVABLE_API_KEY) {
        throw new Error('No AI provider key configured');
      }
      console.warn(
        FORCE_LOVABLE_PROVIDER
          ? '[AI] AI_PROVIDER=lovable; routing concierge through Lovable gateway'
          : '[AI] GEMINI_API_KEY missing; falling back to Lovable gateway',
      );

      const lovableResponse = await invokeLovableGateway('lovable-gateway-fallback');
      if (lovableResponse) return lovableResponse;
      throw new Error('Lovable gateway returned no response');
    }

    try {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;

      console.log(`[Gemini] Calling ${selectedModel} directly`);

      const response = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiRequestBody),
        signal: AbortSignal.timeout(40_000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Gemini API Error: ${response.status} - ${errorData.error?.message || JSON.stringify(errorData)}`,
        );
      }

      const data = await response.json();

      // ========== HANDLE FUNCTION CALLS ==========
      let aiResponse = '';
      let groundingMetadata = null;
      let functionCallResults: any[] = [];

      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new Error('No response candidate from Gemini');
      }

      // Check if Gemini wants to call functions
      const parts = candidate.content?.parts || [];
      const functionCallParts = parts.filter((p: any) => p.functionCall);
      const textParts = parts.filter((p: any) => p.text);

      if (functionCallParts.length > 0) {
        // Execute each function call
        for (const part of functionCallParts) {
          const fc = part.functionCall;
          let parsedArgs: Record<string, unknown> = {};
          if (typeof fc.args === 'string') {
            try {
              parsedArgs = JSON.parse(fc.args || '{}');
            } catch (argError) {
              console.warn(`[FunctionCall] Failed to parse args for ${fc.name}:`, argError);
            }
          } else if (fc.args && typeof fc.args === 'object') {
            parsedArgs = fc.args as Record<string, unknown>;
          }

          console.log(`[FunctionCall] Executing: ${fc.name}`, parsedArgs);

          let result: any;
          try {
            result = await executeFunctionCall(
              supabase,
              fc.name,
              parsedArgs,
              tripId,
              user?.id,
              locationData,
            );
          } catch (fcError) {
            console.error(`[FunctionCall] Error executing ${fc.name}:`, fcError);
            result = {
              error: `Failed to execute ${fc.name}: ${fcError instanceof Error ? fcError.message : String(fcError)}`,
            };
          }

          functionCallResults.push({
            name: fc.name,
            response: result,
          });
        }

        // Send function results back to Gemini for natural language response
        const followUpContents = [
          ...geminiContents,
          { role: 'model', parts: functionCallParts },
          {
            role: 'user',
            parts: functionCallResults.map(r => ({
              functionResponse: {
                name: r.name,
                response: r.response,
              },
            })),
          },
        ];

        const followUpResponse = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: followUpContents,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { temperature, maxOutputTokens: config.maxTokens || 2048 },
          }),
          signal: AbortSignal.timeout(40_000),
        });

        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json();
          const followUpCandidate = followUpData.candidates?.[0];
          aiResponse =
            followUpCandidate?.content?.parts
              ?.filter((p: any) => p.text)
              .map((p: any) => p.text)
              .join('') || 'Action completed successfully.';
          groundingMetadata = followUpCandidate?.groundingMetadata || null;
        } else {
          aiResponse =
            'I completed the action, but had trouble generating a summary. Check your trip tabs for the update.';
        }
      } else {
        // No function calls - just text response
        aiResponse =
          textParts.map((p: any) => p.text).join('') || 'Sorry, I could not generate a response.';
        groundingMetadata = candidate.groundingMetadata || null;
      }

      // Extract usage from Gemini response
      const usageMetadata = data.usageMetadata || {};
      const usage = {
        prompt_tokens: usageMetadata.promptTokenCount || 0,
        completion_tokens: usageMetadata.candidatesTokenCount || 0,
        total_tokens: usageMetadata.totalTokenCount || 0,
      };

      // Extract grounding citations
      const groundingChunks = groundingMetadata?.groundingChunks || [];
      const googleMapsWidget = groundingMetadata?.searchEntryPoint?.renderedContent || null;

      const citations = groundingChunks.map((chunk: any, index: number) => ({
        id: `citation_${index}`,
        title: chunk.web?.title || 'Source',
        url: chunk.web?.uri || '#',
        snippet: chunk.web?.snippet || '',
        source: groundingMetadata?.searchEntryPoint
          ? 'google_search_grounding'
          : 'google_maps_grounding',
      }));

      const resolvedTripId = comprehensiveContext?.tripMetadata?.id || tripId || 'unknown';

      if (!serverDemoMode && user && tripQueryLimit !== null && resolvedTripId !== 'unknown') {
        const incrementUsageResult = await incrementConciergeTripUsage(
          supabase,
          resolvedTripId,
          tripQueryLimit,
        );
        if (incrementUsageResult.status === 'verification_unavailable') {
          console.error(
            '[Usage] Failed to increment trip concierge usage:',
            incrementUsageResult.error,
          );
          return buildUsageVerificationUnavailableResponse(corsHeaders);
        }
        if (incrementUsageResult.status === 'limit_reached') {
          return buildTripLimitReachedResponse(corsHeaders, usagePlan);
        }
      }

      // Skip database storage in demo mode
      if (!serverDemoMode) {
        if (resolvedTripId !== 'unknown') {
          await storeConversation(
            supabase,
            resolvedTripId,
            message,
            aiResponse,
            'chat',
            {
              grounding_sources: citations.length,
              has_map_widget: !!googleMapsWidget,
              function_calls: functionCallResults.map(r => r.name),
            },
            user?.id,
          );
        }

        if (user) {
          try {
            const usageData: any = {
              user_id: user.id,
              trip_id: resolvedTripId,
              query_text: logMessage.substring(0, 500),
              response_tokens: usage.completion_tokens,
              model_used: selectedModel,
            };

            try {
              usageData.complexity_score = complexity.score;
              usageData.used_pro_model = complexity.recommendedModel === 'pro';
            } catch (e) {
              // Columns may not exist
            }

            await supabase.from('concierge_usage').insert(usageData);
          } catch (usageError) {
            console.error('Failed to track usage:', usageError);
          }
        }
      }

      const responsePayload = {
        response: aiResponse,
        usage,
        sources: citations,
        googleMapsWidget,
        success: true,
        model: selectedModel,
        complexity: {
          score: complexity.score,
          recommended: complexity.recommendedModel,
          factors: complexity.factors,
        },
        usedChainOfThought: useChainOfThought,
        functionCalls:
          functionCallResults.length > 0 ? functionCallResults.map(r => r.name) : undefined,
      };

      // 🆕 UPDATE CACHE
      if (!functionCallResults.length) {
        responseCache.set(cacheKey, { response: responsePayload, timestamp: Date.now() });
      }

      return new Response(JSON.stringify(responsePayload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (geminiError) {
      console.error(
        '[Gemini] Direct concierge call failed, attempting Lovable runtime fallback:',
        geminiError,
      );

      const fallbackResponse = await runRuntimeLovableFallback('gemini_runtime_error');
      if (fallbackResponse) {
        return fallbackResponse;
      }

      const messageText = geminiError instanceof Error ? geminiError.message : String(geminiError);
      if (messageText.includes('429')) {
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

      throw geminiError;
    }
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

async function storeConversation(
  supabase: any,
  tripId: string,
  userMessage: string,
  aiResponse: string,
  type: string,
  metadata?: any,
  userId?: string | null,
) {
  try {
    await supabase.from('ai_queries').insert({
      trip_id: tripId,
      user_id: userId || null,
      query_text: userMessage,
      response_text: aiResponse,
      source_count: metadata?.grounding_sources || 0,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to store conversation:', error);
  }
}
