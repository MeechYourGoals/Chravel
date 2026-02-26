import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

interface GeminiChatRequest {
  message: string;
  tripContext?: any;
  chatHistory?: ChatMessage[];
  config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
  imageBase64?: string;
  analysisType?: 'chat' | 'sentiment' | 'review' | 'audio' | 'image';
}

serve(async req => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required', success: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const {
      message,
      tripContext,
      chatHistory = [],
      config = {},
      imageBase64,
      analysisType = 'chat',
    }: GeminiChatRequest = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Check privacy settings if trip context is provided
    if (tripContext?.id) {
      try {
        const { data: privacyConfig, error: privacyError } = await supabase
          .from('trip_privacy_configs')
          .select('*')
          .eq('trip_id', tripContext.id)
          .maybeSingle();

        if (privacyError) {
          console.error('Privacy check failed (DB error):', privacyError);
          // Fail closed: if we can't check privacy, deny access
          throw new Error('Access denied: Unable to verify trip privacy settings.');
        }

        // AI can run in high privacy mode. Only block when explicitly disabled.
        if (privacyConfig?.ai_access_enabled === false) {
          return new Response(
            JSON.stringify({
              response:
                '🔒 **AI Concierge is disabled for this trip.**\n\nA trip organizer turned off AI access in privacy settings. You can still use all other trip features.',
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              sentimentScore: 0,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          );
        }
      } catch (privacyError) {
        console.error('Privacy check failed:', privacyError);
        // Re-throw known access denied errors, otherwise wrap unknown errors
        if (privacyError instanceof Error && privacyError.message.includes('Access denied')) {
          throw privacyError;
        }
        throw new Error('Access denied: Unable to verify trip privacy settings.');
      }
    }

    // Route requests to the primary Gemini concierge function.
    const conciergeResponse = await supabase.functions.invoke('lovable-concierge', {
      headers: {
        Authorization: authHeader,
      },
      body: {
        message,
        tripContext,
        chatHistory,
        config,
        imageBase64,
        analysisType,
      },
    });

    if (conciergeResponse.error) {
      throw new Error(`Concierge API Error: ${conciergeResponse.error.message}`);
    }

    const aiResponse = conciergeResponse.data.response;
    const usage = conciergeResponse.data.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    // Store conversation in database for context awareness
    if (tripContext?.id) {
      await storeConversation(supabase, tripContext.id, message, aiResponse, analysisType);
    }

    // Add sentiment analysis for chat messages
    let sentimentScore = null;
    if (analysisType === 'chat' || analysisType === 'sentiment') {
      sentimentScore = await analyzeSentiment(message, aiResponse);
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        usage,
        sentimentScore,
        success: true,
        model: 'gemini-3-flash-preview',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Concierge chat error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});

function buildSystemPrompt(tripContext: any, analysisType: string, customPrompt?: string): string {
  if (customPrompt) return customPrompt;

  let basePrompt = `Current date: ${new Date().toISOString().split('T')[0]}\n\nYou are Chravel Concierge, a versatile AI assistant with special expertise in travel and trip planning. Answer any question the user asks. Use trip context when relevant, but answer all topics freely and helpfully.`;

  if (tripContext) {
    basePrompt += `\n\nTrip Context:
- Destination: ${tripContext.location || 'Not specified'}
- Dates: ${tripContext.dateRange || 'TBD'}
- Participants: ${tripContext.participants?.length || 0} people
- Budget: Not specified`;

    if (tripContext.accommodation) {
      basePrompt += `\n- Accommodation: ${tripContext.accommodation}`;
    }
  }

  switch (analysisType) {
    case 'sentiment':
      basePrompt +=
        '\n\nAnalyze the sentiment of messages and provide insights into group mood and engagement.';
      break;
    case 'review':
      basePrompt +=
        '\n\nAnalyze reviews and provide comprehensive summaries with sentiment analysis and key insights.';
      break;
    case 'audio':
      basePrompt +=
        '\n\nCreate engaging audio summaries that highlight key information and insights.';
      break;
    case 'image':
      basePrompt +=
        '\n\nAnalyze images in the context of travel planning and provide relevant insights and recommendations.';
      break;
    default:
      basePrompt +=
        '\n\nProvide helpful, specific recommendations and assistance with trip planning. Be conversational and focus on practical advice.';
  }

  return basePrompt;
}

async function storeConversation(
  supabase: any,
  tripId: string,
  userMessage: string,
  aiResponse: string,
  type: string,
) {
  try {
    await supabase.from('ai_conversations').insert({
      trip_id: tripId,
      user_message: userMessage,
      ai_response: aiResponse,
      conversation_type: type,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to store conversation:', error);
  }
}

async function analyzeSentiment(userMessage: string, aiResponse: string): Promise<number> {
  // Simple sentiment analysis - can be enhanced with more sophisticated methods
  const positiveWords = [
    'great',
    'awesome',
    'love',
    'excellent',
    'amazing',
    'wonderful',
    'fantastic',
    'good',
    'happy',
    'excited',
  ];
  const negativeWords = [
    'bad',
    'terrible',
    'hate',
    'awful',
    'horrible',
    'disappointing',
    'frustrated',
    'angry',
    'sad',
    'worried',
  ];

  const text = userMessage.toLowerCase();
  const positiveCount = positiveWords.filter(word => text.includes(word)).length;
  const negativeCount = negativeWords.filter(word => text.includes(word)).length;

  // Return score between -1 (negative) and 1 (positive)
  const totalWords = positiveCount + negativeCount;
  if (totalWords === 0) return 0;

  return (positiveCount - negativeCount) / totalWords;
}
