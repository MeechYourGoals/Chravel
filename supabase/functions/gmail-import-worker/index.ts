import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { runtimePrompt } from './prompt.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Refresh an expired Google access token using the stored refresh_token */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/** Decode base64url-encoded string (Gmail uses URL-safe base64 without padding) */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  try {
    return atob(padded);
  } catch {
    return '';
  }
}

/** Decode the text body from a Gmail message payload (handles multipart, base64url) */
function extractEmailBody(payload: Record<string, unknown>): string {
  // Direct body (non-multipart)
  const body = payload.body as Record<string, unknown> | undefined;
  if (body && typeof body.data === 'string' && body.data.length > 0) {
    return decodeBase64Url(body.data);
  }

  // Multipart — recurse into parts, prefer text/plain, fall back to text/html
  const parts = payload.parts as Array<Record<string, unknown>> | undefined;
  if (!parts || parts.length === 0) return '';

  let plainText = '';
  let htmlText = '';

  for (const part of parts) {
    const mimeType = part.mimeType as string;
    const partBody = part.body as Record<string, unknown> | undefined;

    if (mimeType === 'text/plain' && partBody && typeof partBody.data === 'string') {
      plainText += decodeBase64Url(partBody.data);
    } else if (mimeType === 'text/html' && partBody && typeof partBody.data === 'string') {
      htmlText += decodeBase64Url(partBody.data);
    } else if (mimeType?.startsWith('multipart/') && part.parts) {
      // Nested multipart (e.g., multipart/alternative inside multipart/mixed)
      const nested = extractEmailBody(part);
      if (nested) plainText += nested;
    }
  }

  if (plainText) return plainText;

  // Strip HTML tags as a fallback — the LLM can handle messy text
  if (htmlText) {
    return htmlText
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return '';
}

interface TripContext {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  destination: string | null;
  basecampName: string | null;
  basecampAddress: string | null;
}

/** Build a Gmail search query scoped to the active trip context */
function buildTripScopedGmailQuery(trip: TripContext): string {
  const queryParts: string[] = [];

  // Date window: expand by 14 days before and 7 days after trip dates for pre-trip confirmations
  if (trip.startDate) {
    const before = new Date(trip.startDate);
    before.setDate(before.getDate() - 14);
    const afterDate = trip.endDate ? new Date(trip.endDate) : new Date(trip.startDate);
    afterDate.setDate(afterDate.getDate() + 7);

    const formatGmailDate = (d: Date) =>
      `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

    queryParts.push(`after:${formatGmailDate(before)}`);
    queryParts.push(`before:${formatGmailDate(afterDate)}`);
  } else {
    // Fallback: if no trip dates, search last 3 months (narrower than original 6m)
    queryParts.push('newer_than:3m');
  }

  // Travel-related content filter
  queryParts.push(
    '(subject:(itinerary OR reservation OR booking OR confirmation OR ticket OR e-ticket OR "check-in" OR "boarding pass") OR from:(booking.com OR airbnb.com OR hotels.com OR expedia.com OR united.com OR delta.com OR aa.com OR southwest.com OR jetblue.com OR kayak.com OR tripadvisor.com OR vrbo.com OR ticketmaster.com OR eventbrite.com OR stubhub.com OR lyft.com OR uber.com OR amtrak.com OR hertz.com OR avis.com OR enterprise.com OR marriott.com OR hilton.com OR hyatt.com OR ihg.com) OR label:travel)',
  );

  return queryParts.join(' ');
}

/** Build a human-readable trip context string for the LLM */
function buildTripContextForPrompt(trip: TripContext): string {
  const lines: string[] = [];
  lines.push(`Trip Name: ${trip.name}`);
  if (trip.startDate) lines.push(`Trip Start Date: ${trip.startDate}`);
  if (trip.endDate) lines.push(`Trip End Date: ${trip.endDate}`);
  if (trip.destination) lines.push(`Trip Destination: ${trip.destination}`);
  if (trip.basecampName) lines.push(`Trip Basecamp/Hotel: ${trip.basecampName}`);
  if (trip.basecampAddress) lines.push(`Trip Basecamp Address: ${trip.basecampAddress}`);
  return lines.join('\n');
}

/** Log a message processing outcome */
async function logMessage(
  client: any,
  jobId: string,
  messageId: string,
  outcome: 'parsed' | 'skipped' | 'error',
  detail: string,
) {
  try {
    await client.from('gmail_import_message_logs').insert({
      job_id: jobId,
      message_id: messageId,
      outcome,
      dedupe_key: outcome === 'parsed' ? detail : undefined,
      error_message: outcome !== 'parsed' ? detail : undefined,
    });
  } catch (e) {
    console.warn('Failed to log message outcome:', e);
  }
}

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

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

    // 2. Fetch the connected Gmail account
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

    // 3. Get a valid access token (refresh if needed)
    let accessToken = account.access_token_hash;

    const testResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (testResponse.status === 401 && account.refresh_token) {
      accessToken = await refreshAccessToken(account.refresh_token);

      // Persist the refreshed token
      await adminClient
        .from('gmail_accounts')
        .update({ access_token_hash: accessToken, updated_at: new Date().toISOString() })
        .eq('id', accountId);
    } else if (testResponse.status === 401) {
      return new Response(
        JSON.stringify({
          error:
            'Gmail token expired and no refresh token available. Please reconnect your Gmail account in Settings.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Fetch trip context for scoped queries
    const { data: trip, error: tripError } = await supabaseClient
      .from('trips')
      .select('id, name, start_date, end_date, destination, basecamp_name, basecamp_address')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return new Response(JSON.stringify({ error: 'Trip not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tripContext: TripContext = {
      id: trip.id,
      name: trip.name,
      startDate: trip.start_date,
      endDate: trip.end_date,
      destination: trip.destination,
      basecampName: trip.basecamp_name,
      basecampAddress: trip.basecamp_address,
    };

    // 5. Search Gmail with trip-scoped query
    const gmailQuery = buildTripScopedGmailQuery(tripContext);
    const searchUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    searchUrl.searchParams.set('q', gmailQuery);
    searchUrl.searchParams.set('maxResults', '30');

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Gmail API search error: ${errorText}`);
    }

    const searchData = await searchResponse.json();
    const messages = searchData.messages || [];

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ candidates: [], stats: { scanned: 0, parsed: 0, skipped: 0, errors: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 6. Create an import job record
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

    const allCandidates: Record<string, unknown>[] = [];
    const stats = { scanned: messages.length, parsed: 0, skipped: 0, errors: 0 };
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const tripContextStr = buildTripContextForPrompt(tripContext);

    // 7. Process each message
    for (const msg of messages) {
      try {
        const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
        const msgResponse = await fetch(msgUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!msgResponse.ok) {
          stats.errors++;
          await logMessage(supabaseClient, job.id, msg.id, 'error', `HTTP ${msgResponse.status}`);
          continue;
        }

        const msgData = await msgResponse.json();

        // Extract subject and sender from headers
        const headers = msgData.payload?.headers || [];
        const subjectHeader = headers.find(
          (h: Record<string, string>) => h.name?.toLowerCase() === 'subject',
        );
        const subject = subjectHeader?.value || '';
        const fromHeader = headers.find(
          (h: Record<string, string>) => h.name?.toLowerCase() === 'from',
        );
        const from = fromHeader?.value || '';

        // Decode full email body (not just snippet)
        const bodyText = extractEmailBody(msgData.payload || {});
        const snippet = msgData.snippet || '';
        const emailContent = bodyText.length > snippet.length ? bodyText : snippet;

        // Skip very short emails that are unlikely to contain reservation data
        if (emailContent.length < 50) {
          stats.skipped++;
          await logMessage(supabaseClient, job.id, msg.id, 'skipped', 'Email too short');
          continue;
        }

        // Truncate very long emails to stay within LLM context limits
        const truncatedContent =
          emailContent.length > 12000
            ? emailContent.substring(0, 12000) + '\n[...truncated]'
            : emailContent;

        // 8. Send to LLM with trip context
        if (geminiApiKey) {
          const fullPrompt = `${runtimePrompt}\n\n--- ACTIVE TRIP CONTEXT ---\n${tripContextStr}\n--- END TRIP CONTEXT ---\n\nEmail Subject: ${subject}\nEmail From: ${from}\n\nEmail Body:\n${truncatedContent}`;

          const aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: { responseMimeType: 'application/json' },
              }),
            },
          );

          if (!aiResponse.ok) {
            stats.errors++;
            await logMessage(
              supabaseClient,
              job.id,
              msg.id,
              'error',
              `AI API error: ${aiResponse.status}`,
            );
            continue;
          }

          const aiData = await aiResponse.json();
          const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!resultText) {
            stats.skipped++;
            await logMessage(supabaseClient, job.id, msg.id, 'skipped', 'No AI output');
            continue;
          }

          let parsedJSON: Record<string, unknown>;
          try {
            parsedJSON = JSON.parse(resultText);
          } catch {
            stats.errors++;
            await logMessage(supabaseClient, job.id, msg.id, 'error', 'Failed to parse AI JSON');
            continue;
          }

          const reservations = parsedJSON.reservations as
            | Array<Record<string, unknown>>
            | undefined;
          const relevanceScore = (parsedJSON.trip_relevance_score as number) ?? 0;
          const relevanceReason = (parsedJSON.trip_relevance_reason as string) ?? '';

          if (!reservations || reservations.length === 0) {
            stats.skipped++;
            await logMessage(supabaseClient, job.id, msg.id, 'skipped', 'No reservations found');
            continue;
          }

          for (const res of reservations) {
            const dedupe_key = `${res.type}_${res.confirmation_code || ''}_${res.booking_source || ''}`;

            // Check for existing duplicates
            const { data: existing } = await supabaseClient
              .from('smart_import_candidates')
              .select('id')
              .eq('trip_id', tripId)
              .eq('dedupe_key', dedupe_key)
              .limit(1);

            if (existing && existing.length > 0) {
              stats.skipped++;
              continue;
            }

            // All items go to review (pending). Relevance score helps user prioritize.
            const { data: candidate, error: candidateError } = await supabaseClient
              .from('smart_import_candidates')
              .insert({
                job_id: job.id,
                user_id: user.id,
                trip_id: tripId,
                reservation_data: {
                  ...res,
                  _relevance_score: relevanceScore,
                  _relevance_reason: relevanceReason,
                  _gmail_message_id: msg.id,
                  _email_subject: subject,
                },
                status: 'pending',
                dedupe_key,
              })
              .select()
              .single();

            if (!candidateError && candidate) {
              allCandidates.push(candidate);
              stats.parsed++;
            }
          }

          const logKey = reservations.map(r => `${r.type}_${r.confirmation_code || ''}`).join(',');
          await logMessage(supabaseClient, job.id, msg.id, 'parsed', logKey);
        } else {
          stats.errors++;
          await logMessage(supabaseClient, job.id, msg.id, 'error', 'No GEMINI_API_KEY configured');
        }
      } catch (err) {
        console.error(`Error processing message ${msg.id}:`, err);
        stats.errors++;
        await logMessage(
          supabaseClient,
          job.id,
          msg.id,
          'error',
          err instanceof Error ? err.message : 'Unknown error',
        );
      }
    }

    // 9. Mark job complete
    await supabaseClient
      .from('gmail_import_jobs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        stats: stats,
      })
      .eq('id', job.id);

    // Sort candidates by relevance score (highest first)
    allCandidates.sort((a, b) => {
      const dataA = a.reservation_data as Record<string, unknown> | undefined;
      const dataB = b.reservation_data as Record<string, unknown> | undefined;
      const scoreA = (dataA?._relevance_score as number) ?? 0;
      const scoreB = (dataB?._relevance_score as number) ?? 0;
      return scoreB - scoreA;
    });

    return new Response(JSON.stringify({ candidates: allCandidates, stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
