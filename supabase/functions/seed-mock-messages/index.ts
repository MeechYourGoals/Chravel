import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Pro-specific message templates by category
const PRO_TEMPLATES = {
  'sports-pro': [
    "🚌 Bus call moved to 09:00 — lobby of the Marriott",
    "Per-diems will be distributed after warm-ups",
    "Reminder: team meeting in Conference Room B at 6 PM"
  ],
  'entertainment-tour': [
    "🎵 Load-in starts at 10 AM sharp — all crew report to loading dock",
    "Sound check moved to 2:30 PM due to venue scheduling",
    "Settlement meeting with venue at 11 PM post-show"
  ],
  'corporate-retreat': [
    "📋 Updated agenda in the Files tab — review before tomorrow's session",
    "Reminder: business casual attire for the client dinner tonight",
    "Transportation to the golf course leaves at 8 AM from hotel lobby"
  ],
  'youth-sports': [
    "🏐 Practice uniforms for warm-up, game jerseys for matches",
    "Parents: pick-up location has changed to the north parking lot",
    "Medical forms need to be submitted before tomorrow's games"
  ]
};

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Clear existing Pro trip mock messages
    await supabase
      .from('mock_messages')
      .delete()
      .in('trip_type', ['sports-pro', 'entertainment-tour', 'corporate-retreat', 'youth-sports']);

    // Insert Pro trip mock messages
    const mockMessages: any[] = [];
    
    Object.entries(PRO_TEMPLATES).forEach(([tripType, messages]) => {
      messages.forEach((message, index) => {
        mockMessages.push({
          trip_type: tripType,
          sender_name: getSenderName(tripType, index),
          message_content: message,
          timestamp_offset_days: Math.floor(Math.random() * 3) + 1,
          tags: getTags(tripType)
        });
      });
    });

    const { error } = await supabase
      .from('mock_messages')
      .insert(mockMessages);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pro trip mock messages seeded successfully',
        count: mockMessages.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error seeding mock messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function getSenderName(tripType: string, index: number): string {
  const names = {
    'sports-pro': ['Coach Johnson', 'Team Manager', 'Athletic Director'],
    'entertainment-tour': ['Tour Director', 'Production Manager', 'Security Chief'],
    'corporate-retreat': ['Event Coordinator', 'Executive Assistant', 'Team Lead'],
    'youth-sports': ['Coach Sarah', 'Team Mom Lisa', 'Athletic Director']
  };
  
  return names[tripType as keyof typeof names]?.[index] || 'Team Member';
}

function getTags(tripType: string): string[] {
  const tags = {
    'sports-pro': ['logistics', 'coordination'],
    'entertainment-tour': ['production', 'logistics'],
    'corporate-retreat': ['business', 'coordination'],
    'youth-sports': ['youth', 'coordination']
  };
  
  return tags[tripType as keyof typeof tags] || ['coordination'];
}