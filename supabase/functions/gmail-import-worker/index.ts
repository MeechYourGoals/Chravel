import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/genai@0.0.3'; // or use the standard REST fetch
import { runtimePrompt } from './prompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tripId, accountId } = await req.json();

    if (!tripId || !accountId) {
      return new Response(JSON.stringify({ error: 'Missing tripId or accountId' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    // 1. Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // 2. Fetch the connected Gmail account for this user
    const { data: account, error: accountError } = await supabaseClient
      .from('gmail_accounts')
      .select('access_token_hash, refresh_token')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return new Response(JSON.stringify({ error: 'Gmail account not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Use access token (ideally, handle refresh token logic here if expired)
    const accessToken = account.access_token_hash;

    // 3. Search Gmail for travel related emails in the last 6 months
    const searchUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    searchUrl.searchParams.set(
      'q',
      'category:travel OR subject:(itinerary OR reservation OR ticket OR booking OR confirmation) newer_than:6m',
    );
    searchUrl.searchParams.set('maxResults', '15'); // Limit to keep execution time low for this demo

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchResponse.ok) {
      // If 401, we would normally use the refresh token to get a new access token
      throw new Error(`Gmail API error: ${await searchResponse.text()}`);
    }

    const searchData = await searchResponse.json();
    const messages = searchData.messages || [];

    if (messages.length === 0) {
      return new Response(JSON.stringify({ candidates: [], stats: { scanned: 0, parsed: 0 } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Create an import job record
    const { data: job, error: jobError } = await supabaseClient
      .from('gmail_import_jobs')
      .insert({
        user_id: user.id,
        gmail_account_id: accountId,
        trip_id: tripId,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (jobError || !job) {
      throw new Error('Failed to create import job');
    }

    const allCandidates = [];
    const stats = { scanned: messages.length, parsed: 0, errors: 0 };

    // Initialize Gemini (using the REST API for simplicity in Deno if SDK fails)
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    // 5. Process each message
    for (const msg of messages) {
      try {
        const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
        const msgResponse = await fetch(msgUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const msgData = await msgResponse.json();

        // Very basic extraction of snippet or plain text body
        const snippet = msgData.snippet || '';
        let bodyText = snippet;

        // In a full implementation, you'd decode msgData.payload.parts finding text/plain or text/html

        // Skip very short emails
        if (bodyText.length < 50) continue;

        // 6. Send to LLM
        if (geminiApiKey) {
          const aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${runtimePrompt}\n\nEmail Text:\n${bodyText}` }] }],
                generationConfig: { responseMimeType: 'application/json' },
              }),
            },
          );

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (resultText) {
              const parsedJSON = JSON.parse(resultText);

              if (parsedJSON && parsedJSON.reservations && parsedJSON.reservations.length > 0) {
                for (const res of parsedJSON.reservations) {
                  // Deduplication key
                  const dedupe_key = `${res.type}_${res.confirmation_code || ''}_${res.booking_source || ''}`;

                  // Insert into smart_import_candidates
                  const { data: candidate, error: candidateError } = await supabaseClient
                    .from('smart_import_candidates')
                    .insert({
                      job_id: job.id,
                      user_id: user.id,
                      trip_id: tripId,
                      reservation_data: res,
                      dedupe_key,
                    })
                    .select()
                    .single();

                  if (!candidateError && candidate) {
                    allCandidates.push(candidate);
                    stats.parsed++;
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error processing message ${msg.id}:`, err);
        stats.errors++;
      }
    }

    // 7. Mark job complete
    await supabaseClient
      .from('gmail_import_jobs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        stats: stats,
      })
      .eq('id', job.id);

    return new Response(JSON.stringify({ candidates: allCandidates, stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
