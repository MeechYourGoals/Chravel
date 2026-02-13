import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { invokeChatModel, extractTextFromChatResponse } from '../_shared/gemini.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const ENABLE_DEMO_CONCIERGE = Deno.env.get('ENABLE_DEMO_CONCIERGE') === 'true';
const DEMO_MAX_REQUESTS_PER_MINUTE = Number(Deno.env.get('DEMO_CONCIERGE_RPM') ?? '3');
const DEMO_MAX_REQUESTS_PER_HOUR = Number(Deno.env.get('DEMO_CONCIERGE_RPH') ?? '12');
const MAX_MESSAGE_CHARS = 1200;

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!ENABLE_DEMO_CONCIERGE) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Demo AI concierge is currently disabled.',
      }),
      {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (message === 'ping') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'healthy',
          response: 'pong',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!message) {
      return new Response(JSON.stringify({ success: false, error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (message.length > MAX_MESSAGE_CHARS) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Message too long. Max ${MAX_MESSAGE_CHARS} characters.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const clientIp = getClientIp(req);
    const rateClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const [minuteLimit, hourLimit] = await Promise.all([
      rateClient.rpc('increment_rate_limit', {
        rate_key: `demo_concierge_minute:${clientIp}`,
        max_requests: DEMO_MAX_REQUESTS_PER_MINUTE,
        window_seconds: 60,
      }),
      rateClient.rpc('increment_rate_limit', {
        rate_key: `demo_concierge_hour:${clientIp}`,
        max_requests: DEMO_MAX_REQUESTS_PER_HOUR,
        window_seconds: 3600,
      }),
    ]);

    const minuteAllowed = Boolean(minuteLimit.data?.[0]?.allowed);
    const hourAllowed = Boolean(hourLimit.data?.[0]?.allowed);
    if (!minuteAllowed || !hourAllowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded for demo AI concierge. Please try again later.',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const chatHistoryRaw = Array.isArray(body?.chatHistory) ? body.chatHistory : [];
    const chatHistory = chatHistoryRaw
      .slice(-6)
      .map(item => ({
        role:
          item?.role === 'assistant'
            ? ('assistant' as const)
            : item?.role === 'system'
              ? ('system' as const)
              : ('user' as const),
        content:
          typeof item?.content === 'string'
            ? item.content.slice(0, 500)
            : JSON.stringify(item?.content ?? '').slice(0, 500),
      }))
      .filter(item => item.content.length > 0);

    const requestedModel =
      typeof body?.config?.model === 'string' ? body.config.model.trim() : 'gemini-3-flash-preview';
    const allowedModel =
      requestedModel.includes('pro') || requestedModel.includes('thinking')
        ? 'gemini-3-flash-preview'
        : requestedModel || 'gemini-3-flash-preview';
    const temperature = clamp(body?.config?.temperature, 0, 1, 0.5);
    const maxTokens = clamp(body?.config?.maxTokens, 128, 768, 512);

    const aiResult = await invokeChatModel({
      model: allowedModel,
      messages: [
        {
          role: 'system',
          content:
            'You are Chravel Demo Concierge. Be concise, helpful, and safe. Do not claim to perform real trip mutations. If asked to create/update records, explain this is a demo and suggest how the user can do it in the full app.',
        },
        ...chatHistory,
        {
          role: 'user',
          content: message,
        },
      ],
      temperature,
      maxTokens,
      timeoutMs: 30_000,
    });

    const responseText = extractTextFromChatResponse(aiResult.raw, aiResult.provider);

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        model: aiResult.model,
        provider: aiResult.provider,
        demoMode: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[demo-concierge] request failed', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
