/**
 * @deprecated This function is deprecated and proxies to gemini-chat for backwards compatibility.
 * Use 'gemini-chat' or 'lovable-concierge' directly for new implementations.
 * All OpenAI dependencies have been removed in favor of Google Gemini.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>
}

interface OpenAIRequest {
  message: string
  tripContext?: any
  chatHistory?: ChatMessage[]
  config?: {
    model?: string
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
  }
  imageBase64?: string
  analysisType?: 'chat' | 'sentiment' | 'review' | 'audio' | 'image'
}

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.warn('⚠️ DEPRECATED: openai-chat function called. Use gemini-chat or lovable-concierge instead.')
    
    const { 
      message, 
      tripContext, 
      chatHistory = [], 
      config = {}, 
      imageBase64,
      analysisType = 'chat'
    }: OpenAIRequest = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Proxy to gemini-chat function
    const response = await supabase.functions.invoke('gemini-chat', {
      body: {
        message,
        tripContext,
        chatHistory,
        config,
        imageBase64,
        analysisType
      }
    })

    if (response.error) {
      throw new Error(`Gemini chat error: ${response.error.message}`)
    }

    return new Response(
      JSON.stringify(response.data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('OpenAI chat proxy error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error), success: false }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

// All helper functions removed - this is now a proxy to gemini-chat