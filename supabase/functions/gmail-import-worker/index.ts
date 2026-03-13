import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { runtimePrompt } from './prompt.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Return a JSON error response with consistent structure */
function configErrorResponse(message: string): Response {
  console.error(`[gmail-import-worker] ${message}`);
  return new Response(JSON.stringify({ error: message }), {
    status: 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Refresh an expired Google access token using the stored refresh_token */
async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: string | null }> {
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
  // Subtract 60s buffer so we refresh before actual expiry
  const expiresAt = data.expires_in
    ? new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString()
    : null;
  return { accessToken: data.access_token, expiresAt };
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
    // Fallback: if no trip dates, search last 3 months
    queryParts.push('newer_than:3m');
  }

  // Widened travel-related content filter: more domains + more subject keywords
  queryParts.push(
    '(' +
      'subject:(itinerary OR reservation OR booking OR confirmation OR ticket OR "e-ticket" OR "check-in" OR "boarding pass" OR "order confirmation" OR "your trip" OR receipt) ' +
      'OR from:(' +
      // OTAs
      'booking.com OR expedia.com OR hotels.com OR priceline.com OR kayak.com OR ' +
      'tripadvisor.com OR travelocity.com OR orbitz.com OR ' +
      // Airlines
      'delta.com OR united.com OR aa.com OR southwest.com OR jetblue.com OR ' +
      'frontier.com OR spirit.com OR allegiant.com OR ' +
      // Hotels
      'airbnb.com OR vrbo.com OR marriott.com OR hilton.com OR hyatt.com OR ihg.com OR wyndham.com OR ' +
      // Car rentals
      'hertz.com OR avis.com OR enterprise.com OR budget.com OR alamo.com OR nationalcar.com OR turo.com OR zipcar.com OR ' +
      // Events & tickets
      'ticketmaster.com OR stubhub.com OR seatgeek.com OR axs.com OR gametime.com OR eventbrite.com OR ' +
      // Dining
      'opentable.com OR resy.com OR yelp.com OR ' +
      // Rail & bus
      'amtrak.com OR eurostar.com OR trainline.com OR flixbus.com OR ' +
      // Rideshare
      'lyft.com OR uber.com' +
      ') ' +
      'OR label:travel)',
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

interface MessageResult {
  candidates: Record<string, unknown>[];
  parsed: number;
  skipped: number;
  errors: number;
}

/** Process a single Gmail message: fetch body, call LLM, insert candidates */
async function processMessage(
  msg: { id: string },
  accessToken: string,
  tripContextStr: string,
  tripId: string,
  jobId: string,
  userId: string,
  supabaseClient: any,
  geminiApiKey: string,
): Promise<MessageResult> {
  const result: MessageResult = { candidates: [], parsed: 0, skipped: 0, errors: 0 };

  try {
    const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
    const msgResponse = await fetch(msgUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!msgResponse.ok) {
      result.errors++;
      await logMessage(supabaseClient, jobId, msg.id, 'error', `HTTP ${msgResponse.status}`);
      return result;
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
      result.skipped++;
      await logMessage(supabaseClient, jobId, msg.id, 'skipped', 'Email too short');
      return result;
    }

    // Truncate very long emails to stay within LLM context limits
    const truncatedContent =
      emailContent.length > 16000
        ? emailContent.substring(0, 16000) + '\n[...truncated]'
        : emailContent;

    // Send to LLM with trip context
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
      result.errors++;
      await logMessage(
        supabaseClient,
        jobId,
        msg.id,
        'error',
        `AI API error: ${aiResponse.status}`,
      );
      return result;
    }

    const aiData = await aiResponse.json();
    const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      result.skipped++;
      await logMessage(supabaseClient, jobId, msg.id, 'skipped', 'No AI output');
      return result;
    }

    let parsedJSON: Record<string, unknown>;
    try {
      parsedJSON = JSON.parse(resultText);
    } catch {
      result.errors++;
      await logMessage(supabaseClient, jobId, msg.id, 'error', 'Failed to parse AI JSON');
      return result;
    }

    const reservations = parsedJSON.reservations as Array<Record<string, unknown>> | undefined;
    const relevanceScore = (parsedJSON.trip_relevance_score as number) ?? 0;
    const relevanceReason = (parsedJSON.trip_relevance_reason as string) ?? '';

    if (!reservations || reservations.length === 0) {
      result.skipped++;
      await logMessage(supabaseClient, jobId, msg.id, 'skipped', 'No reservations found');
      return result;
    }

    for (const res of reservations) {
      // Hardened dedupe key: includes a date component to prevent key collapse
      // when confirmation_code and booking_source are both absent
      const dateSignal = (
        (res.departure_time_local as string) ||
        (res.check_in_local as string) ||
        (res.reservation_time_local as string) ||
        (res.start_time_local as string) ||
        (res.pickup_time_local as string) ||
        ''
      ).substring(0, 10);

      const dedupe_key = [
        res.type as string,
        (res.confirmation_code as string) ||
          (res.flight_number as string) ||
          (res.train_number as string) ||
          '',
        (res.booking_source as string) ||
          (res.airline_code as string) ||
          (res.operator_name as string) ||
          (res.ticket_provider as string) ||
          '',
        dateSignal,
      ].join('_');

      // Check for existing duplicates
      const { data: existing } = await supabaseClient
        .from('smart_import_candidates')
        .select('id')
        .eq('trip_id', tripId)
        .eq('dedupe_key', dedupe_key)
        .limit(1);

      if (existing && existing.length > 0) {
        result.skipped++;
        continue;
      }

      // All items go to review (pending). Relevance score helps user prioritize.
      const { data: candidate, error: candidateError } = await supabaseClient
        .from('smart_import_candidates')
        .insert({
          job_id: jobId,
          user_id: userId,
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
        result.candidates.push(candidate);
        result.parsed++;
      }
    }

    const logKey = reservations.map(r => `${r.type}_${r.confirmation_code || ''}`).join(',');
    await logMessage(supabaseClient, jobId, msg.id, 'parsed', logKey);
  } catch (err) {
    console.error(`Error processing message ${msg.id}:`, err);
    result.errors++;
    await logMessage(
      supabaseClient,
      jobId,
      msg.id,
      'error',
      err instanceof Error ? err.message : 'Unknown error',
    );
  }

  return result;
}

const BATCH_SIZE = 5;
const MAX_MESSAGES = 100;

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Fail fast: check required config before doing any work
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return configErrorResponse(
        'Google OAuth secrets (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured. Set them in Supabase Edge Function secrets.',
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return configErrorResponse(
        'GEMINI_API_KEY is not configured. Gmail import requires Gemini API for email parsing. Set it in Supabase Edge Function secrets.',
      );
    }

    const { tripId, accountId } = await req.json();

    if (!tripId || !accountId) {
      return new Response(JSON.stringify({ error: 'Missing tripId or accountId' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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

    // 2. Fetch the connected Gmail account — use service role to read token columns
    const { data: account, error: accountError } = await adminClient
      .from('gmail_accounts')
      .select('access_token, refresh_token, token_expires_at')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return new Response(JSON.stringify({ error: 'Gmail account not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // 3. Get a valid access token — skip live test if token_expires_at confirms it's still valid
    let accessToken = account.access_token;
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const tokenKnownValid = tokenExpiry !== null && tokenExpiry > new Date();

    if (!tokenKnownValid) {
      const testResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (testResponse.status === 401) {
        if (!account.refresh_token) {
          return new Response(
            JSON.stringify({
              error:
                'Gmail token expired and no refresh token available. Please reconnect your Gmail account in Settings.',
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const { accessToken: newToken, expiresAt } = await refreshAccessToken(
          account.refresh_token,
        );
        accessToken = newToken;

        await adminClient
          .from('gmail_accounts')
          .update({
            access_token: newToken,
            ...(expiresAt && { token_expires_at: expiresAt }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId);
      }
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

    // 5. Search Gmail — fetch up to 2 pages (max 50 + 50 = 100 messages)
    const gmailQuery = buildTripScopedGmailQuery(tripContext);
    const allMessages: { id: string }[] = [];

    const fetchPage = async (pageToken?: string) => {
      const searchUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      searchUrl.searchParams.set('q', gmailQuery);
      searchUrl.searchParams.set('maxResults', '50');
      if (pageToken) searchUrl.searchParams.set('pageToken', pageToken);

      const searchResponse = await fetch(searchUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        throw new Error(`Gmail API search error: ${errorText}`);
      }

      return searchResponse.json();
    };

    const firstPage = await fetchPage();
    allMessages.push(...(firstPage.messages || []));

    // Fetch second page if available and we haven't hit the cap
    if (firstPage.nextPageToken && allMessages.length < MAX_MESSAGES) {
      try {
        const secondPage = await fetchPage(firstPage.nextPageToken);
        allMessages.push(...(secondPage.messages || []));
      } catch (pageErr) {
        console.warn('[gmail-import-worker] Second page fetch failed (continuing):', pageErr);
      }
    }

    const messages = allMessages.slice(0, MAX_MESSAGES);

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
    const tripContextStr = buildTripContextForPrompt(tripContext);

    // 7. Process messages in parallel batches of BATCH_SIZE
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(msg =>
          processMessage(
            msg,
            accessToken,
            tripContextStr,
            tripId,
            job.id,
            user.id,
            supabaseClient,
            geminiApiKey,
          ),
        ),
      );

      for (const batchResult of batchResults) {
        if (batchResult.status === 'fulfilled') {
          allCandidates.push(...batchResult.value.candidates);
          stats.parsed += batchResult.value.parsed;
          stats.skipped += batchResult.value.skipped;
          stats.errors += batchResult.value.errors;
        } else {
          stats.errors++;
        }
      }
    }

    // 8. Mark job complete
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
