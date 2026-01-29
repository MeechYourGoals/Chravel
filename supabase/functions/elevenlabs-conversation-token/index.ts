import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')
const ELEVENLABS_AGENT_ID = Deno.env.get('ELEVENLABS_AGENT_ID')

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate secrets are configured
    if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
      console.error('[ElevenLabs Token] Missing configuration:', {
        hasApiKey: !!ELEVENLABS_API_KEY,
        hasAgentId: !!ELEVENLABS_AGENT_ID
      })
      return new Response(
        JSON.stringify({ 
          error: 'ElevenLabs not configured',
          details: 'Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID secrets'
        }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('[ElevenLabs Token] Requesting conversation token for agent:', ELEVENLABS_AGENT_ID)

    // Request conversation token from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        headers: { 
          'xi-api-key': ELEVENLABS_API_KEY 
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[ElevenLabs Token] API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get conversation token',
          status: response.status,
          details: errorText
        }), 
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json()
    
    if (!data.token) {
      console.error('[ElevenLabs Token] No token in response:', data)
      return new Response(
        JSON.stringify({ error: 'No token received from ElevenLabs' }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('[ElevenLabs Token] Token generated successfully')

    return new Response(
      JSON.stringify({ token: data.token }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[ElevenLabs Token] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
