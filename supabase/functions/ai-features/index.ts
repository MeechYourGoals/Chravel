import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AIFeaturesSchema, validateInput } from '../_shared/validation.ts';
import { sanitizeErrorForClient, logError } from '../_shared/errorHandling.ts';
import { invokeChatModel, extractTextFromChatResponse } from '../_shared/gemini.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseJsonSafely(raw: string): any {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    const block = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (block) {
      return JSON.parse(block[1]);
    }
    throw new Error('Failed to parse AI JSON response');
  }
}

serve(async req => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') || '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
    } = await supabase.auth.getUser(jwt);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Validate and sanitize input
    const requestBody = await req.json();
    const validation = validateInput(AIFeaturesSchema, requestBody);

    if (!validation.success) {
      logError('AI_FEATURES_VALIDATION', validation.error, { userId: user.id });
      return createErrorResponse(validation.error, 400);
    }

    const {
      feature,
      url,
      venue_name,
      place_id,
      address,
      content,
      template_id,
      context,
      userId,
      tripId,
    } = validation.data;

    let result;

    if (feature === 'review-analysis') {
      result = { result: await analyzeReviews(url, venue_name, address, place_id) };
    } else if (feature === 'message-template') {
      result = await generateMessageWithTemplate(template_id, context || {}, supabase);
    } else if (feature === 'priority-classify') {
      result = await classifyMessagePriority(content || '');
    } else if (feature === 'send-time-suggest') {
      result = await suggestSendTimes(content || '', context || {});
    } else {
      return new Response(JSON.stringify({ error: 'Invalid feature type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logError('AI_FEATURES', error);
    return new Response(JSON.stringify({ error: sanitizeErrorForClient(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeReviews(
  url?: string,
  venue_name?: string,
  address?: string,
  place_id?: string,
) {
  console.log('Analyzing reviews using Google Gemini for:', { url, venue_name, address, place_id });

  try {
    // Build search query based on available information
    let searchQuery = '';
    if (url) {
      searchQuery = `Analyze reviews for this URL: ${url}`;
    } else if (venue_name) {
      searchQuery = `Find and analyze reviews for "${venue_name}"`;
      if (address) {
        searchQuery += ` located at ${address}`;
      }
    }

    const message = `You are a Review Insights Assistant for Chravel, responsible for gathering, summarizing, and analyzing authentic reviews from across the web.

Your core job: ${searchQuery}

Research and synthesize real reviews for this venue across the web — focusing on Google, Yelp, Facebook, and any other reputable platforms you find.

CRITICAL: Return your analysis in this EXACT JSON format:
{
  "text": "Comprehensive analysis of all reviews found",
  "sentiment": "positive|negative|neutral|mixed",
  "score": 0.75,
  "platforms": ["Google", "Yelp", "Facebook"],
  "summary": "Brief overall summary",
  "themes": ["Service Quality", "Food Quality", "Atmosphere"],
  "pros": ["Key positive points"],
  "cons": ["Key negative points"],
  "rating": 3.8,
  "totalReviews": 150
}

Context variables:
- Venue Name: ${venue_name || 'N/A'}
- Address: ${address || 'N/A'}
- Review URL: ${url || 'N/A'}
- Place ID: ${place_id || 'N/A'}
- Query Date: ${new Date().toISOString().split('T')[0]}

Find REAL reviews and data. Never use fictional, placeholder, or default data — always provide factual, current, web-sourced information. If no reviews are found for a source, clearly indicate as much.`;

    const aiResult = await invokeChatModel({
      model: 'gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a restaurant and business review analyst. Provide detailed, accurate analysis of online reviews from multiple platforms. Always cite your sources and provide specific insights. Return responses in valid JSON format only.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.3,
      maxTokens: 2048,
      responseFormat: { type: 'json_object' },
      // Enable Google Search grounding for real-time review data
      tools: [{ googleSearch: {} }],
      timeoutMs: 30000,
    });

    const analysisPayload = extractTextFromChatResponse(aiResult.raw, aiResult.provider);
    const analysis = parseJsonSafely(analysisPayload);

    // Ensure all required fields are present
    return {
      text: analysis.text || analysis.summary || 'Analysis completed',
      sentiment: analysis.sentiment || 'neutral',
      score: analysis.score || 0.5,
      platforms: analysis.platforms || ['Google'],
      summary: analysis.summary || analysis.text?.slice(0, 200) || 'Review analysis completed',
      themes: analysis.themes || ['Service', 'Quality', 'Value'],
      pros: analysis.pros || [],
      cons: analysis.cons || [],
      rating: analysis.rating || analysis.score * 5 || 2.5,
      totalReviews: analysis.totalReviews || 0,
    };
  } catch (error) {
    console.error('Error analyzing reviews:', error);
    throw error;
  }
}

async function generateMessageWithTemplate(
  templateId: string | undefined,
  context: Record<string, any>,
  supabase: any,
) {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  // Fetch template from database
  const { data: template, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('id', templateId)
    .eq('is_active', true)
    .single();

  if (error || !template) {
    throw new Error('Template not found');
  }

  // Fill template with context
  let filledContent = template.content;

  // Replace placeholders with context values
  template.placeholders?.forEach((placeholder: string) => {
    const value = context[placeholder] || `[${placeholder}]`;
    const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
    filledContent = filledContent.replace(regex, value);
  });

  return {
    content: filledContent,
    template: template,
    filledPlaceholders: context,
  };
}

async function classifyMessagePriority(content: string) {
  try {
    const aiResult = await invokeChatModel({
      model: 'gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content:
            'Classify the priority of this message as exactly one of: urgent, reminder, or fyi. Consider urgency, time sensitivity, and importance. Respond with only the priority level and confidence score in JSON format: {"priority": "urgent|reminder|fyi", "confidence": 0.9}',
        },
        {
          role: 'user',
          content: `Message: "${content}"`,
        },
      ],
      temperature: 0.1,
      maxTokens: 50,
      responseFormat: { type: 'json_object' },
      timeoutMs: 15000,
    });

    const payload = extractTextFromChatResponse(aiResult.raw, aiResult.provider);
    const result = parseJsonSafely(payload);

    if (result.priority && ['urgent', 'reminder', 'fyi'].includes(result.priority)) {
      return { priority: result.priority, confidence: result.confidence || 0.9 };
    }
  } catch (error) {
    console.error('Gemini priority classification failed:', error);
  }

  // Fallback to keyword-based classification
  return keywordBasedPriorityClassification(content);
}

function keywordBasedPriorityClassification(content: string) {
  const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediately', 'critical'];
  const reminderKeywords = ['reminder', "don't forget", 'remember', 'deadline', 'due'];

  const lowerContent = content.toLowerCase();

  if (urgentKeywords.some(keyword => lowerContent.includes(keyword))) {
    return { priority: 'urgent', confidence: 0.7 };
  } else if (reminderKeywords.some(keyword => lowerContent.includes(keyword))) {
    return { priority: 'reminder', confidence: 0.6 };
  } else {
    return { priority: 'fyi', confidence: 0.5 };
  }
}

async function suggestSendTimes(content: string, context: Record<string, any>) {
  const now = new Date();

  // Basic time suggestions based on content analysis
  const suggestions = [];

  // Immediate for urgent content
  if (content.toLowerCase().includes('urgent') || content.toLowerCase().includes('emergency')) {
    suggestions.push({
      time: new Date(now.getTime() + 5 * 60 * 1000), // 5 minutes from now
      reason: 'Immediate send for urgent content',
    });
  }

  // 30 minutes for reminders
  suggestions.push({
    time: new Date(now.getTime() + 30 * 60 * 1000),
    reason: 'Standard reminder timing',
  });

  // 2 hours for general updates
  suggestions.push({
    time: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    reason: 'Optimal engagement time',
  });

  // Next morning for non-urgent items
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0); // 9 AM next day

  suggestions.push({
    time: tomorrow,
    reason: 'Morning visibility for better engagement',
  });

  return {
    suggestions: suggestions.map(s => ({
      time: s.time.toISOString(),
      reason: s.reason,
      confidence: 0.8,
    })),
  };
}
