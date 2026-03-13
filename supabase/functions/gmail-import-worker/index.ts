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

interface EmailAttachment {
  mimeType: string;
  data: string; // Base64 encoded
}

/** Decode the text body and extract small attachments from a Gmail message payload */
function extractEmailContent(payload: Record<string, unknown>): {
  bodyText: string;
  attachments: EmailAttachment[];
  attachmentRefs: { attachmentId: string, mimeType: string, filename: string }[];
} {
  const result = { bodyText: '', attachments: [] as EmailAttachment[], attachmentRefs: [] as any[] };

  // Direct body (non-multipart)
  const body = payload.body as Record<string, unknown> | undefined;
  if (body && typeof body.data === 'string' && body.data.length > 0) {
    result.bodyText = decodeBase64Url(body.data);
    return result;
  }

  // Multipart — recurse into parts, prefer text/plain, fall back to text/html
  const parts = payload.parts as Array<Record<string, unknown>> | undefined;
  if (!parts || parts.length === 0) return result;

  let plainText = '';
  let htmlText = '';

  for (const part of parts) {
    const mimeType = part.mimeType as string;
    const partBody = part.body as Record<string, unknown> | undefined;
    const filename = part.filename as string | undefined;

    // Handle text parts
    if (mimeType === 'text/plain' && partBody && typeof partBody.data === 'string') {
      plainText += decodeBase64Url(partBody.data);
    } else if (mimeType === 'text/html' && partBody && typeof partBody.data === 'string') {
      htmlText += decodeBase64Url(partBody.data);
    } else if (mimeType?.startsWith('multipart/') && part.parts) {
      // Nested multipart (e.g., multipart/alternative inside multipart/mixed)
      const nested = extractEmailContent(part);
      if (nested.bodyText) plainText += nested.bodyText;
      result.attachments.push(...nested.attachments);
      result.attachmentRefs.push(...nested.attachmentRefs);
    } else if (filename && partBody && typeof partBody.attachmentId === 'string') {
      // It's a true attachment needing a secondary fetch
      if (mimeType === 'application/pdf' || mimeType.includes('calendar')) {
        result.attachmentRefs.push({
           attachmentId: partBody.attachmentId,
           mimeType: mimeType === 'application/pdf' ? 'application/pdf' : 'text/calendar',
           filename: filename
        });
      }
    } else if (filename && partBody && typeof partBody.data === 'string') {
       // Inline attachment data (base64url)
       if (mimeType === 'application/pdf' || mimeType.includes('calendar')) {
        result.attachments.push({
           mimeType: mimeType === 'application/pdf' ? 'application/pdf' : 'text/calendar',
           data: partBody.data,
        });
      }
    }
  }

  if (plainText) {
    result.bodyText = plainText;
  } else if (htmlText) {
    // Strip HTML tags as a fallback — the LLM can handle messy text
    result.bodyText = htmlText
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return result;
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

  // Date window: expand by 30 days before and 14 days after trip dates for pre-trip confirmations
  if (trip.startDate) {
    const before = new Date(trip.startDate);
    before.setDate(before.getDate() - 30); // Expanded buffer for early bookings
    const afterDate = trip.endDate ? new Date(trip.endDate) : new Date(trip.startDate);
    afterDate.setDate(afterDate.getDate() + 14);

    const formatGmailDate = (d: Date) =>
      `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

    queryParts.push(`after:${formatGmailDate(before)}`);
    queryParts.push(`before:${formatGmailDate(afterDate)}`);
  } else {
    // Fallback: if no trip dates, search last 6 months
    queryParts.push('newer_than:6m');
  }

  // Broad semantic keyword search, removing rigid domain constraints
  queryParts.push(
    '(subject:(reservation OR itinerary OR confirmation OR booking OR ticket OR e-ticket OR "check-in" OR "boarding pass" OR receipt OR trip) OR label:travel OR "booking reference" OR "confirmation number" OR "reservation number")',
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
      .select('access_token, refresh_token')
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
    let accessToken = account.access_token;

    const testResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (testResponse.status === 401 && account.refresh_token) {
      accessToken = await refreshAccessToken(account.refresh_token);

      // Persist the refreshed token
      await adminClient
        .from('gmail_accounts')
        .update({ access_token: accessToken, updated_at: new Date().toISOString() })
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

    // 5. Search Gmail with trip-scoped query (Paginated to limit)
    const gmailQuery = buildTripScopedGmailQuery(tripContext);
    let messages: any[] = [];
    let nextPageToken: string | undefined = undefined;
    let pageCount = 0;
    const MAX_PAGES = 1; // Kept at 1 page (up to 100 messages) to prevent Edge Function timeout

    do {
      const searchUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      searchUrl.searchParams.set('q', gmailQuery);
      searchUrl.searchParams.set('maxResults', '100'); // Maximize single page recall
      if (nextPageToken) {
        searchUrl.searchParams.set('pageToken', nextPageToken);
      }

      const searchResponse = await fetch(searchUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!searchResponse.ok) {
        if (searchResponse.status === 401) {
             return errorResponse('Gmail token expired. Please reconnect your account.', 401, 'Token expired during pagination');
        }
        const errorText = await searchResponse.text();
        throw new Error(`Gmail API search error: ${errorText}`);
      }

      const searchData = await searchResponse.json();
      if (searchData.messages) {
        messages = messages.concat(searchData.messages);
      }
      nextPageToken = searchData.nextPageToken;
      pageCount++;
    } while (nextPageToken && pageCount < MAX_PAGES);

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

    // Concurrency helper function
    async function processMessage(msg: any) {
        try {
          let msgData: any = null;
          let retryCount = 0;
          const MAX_RETRIES = 2;

          while (retryCount <= MAX_RETRIES) {
              const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
              const msgResponse = await fetch(msgUrl, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });

              if (!msgResponse.ok) {
                if (msgResponse.status === 429 && retryCount < MAX_RETRIES) {
                    // Rate limit, backoff and retry
                    await new Promise(res => setTimeout(res, 1000 * (retryCount + 1)));
                    retryCount++;
                    continue;
                }
                throw new Error(`HTTP ${msgResponse.status}`);
              }
              msgData = await msgResponse.json();
              break;
          }

          if (!msgData) {
              stats.errors++;
              await logMessage(supabaseClient, job.id, msg.id, 'error', 'Failed to fetch after retries');
              return;
          }

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

          // Decode full email body and extract attachments (not just snippet)
          const contentData = extractEmailContent(msgData.payload || {});
          const bodyText = contentData.bodyText;
          const snippet = msgData.snippet || '';
          const emailContent = bodyText.length > snippet.length ? bodyText : snippet;

          // Fetch up to 2 attachment references if they exist
          for (const ref of contentData.attachmentRefs.slice(0, 2)) {
              try {
                 const attUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/attachments/${ref.attachmentId}`;
                 const attRes = await fetch(attUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
                 if (attRes.ok) {
                     const attData = await attRes.json();
                     if (attData.data) {
                         contentData.attachments.push({
                             mimeType: ref.mimeType,
                             data: attData.data // base64url encoded
                         });
                     }
                 }
              } catch (err) {
                 console.warn(`Failed to fetch attachment ${ref.attachmentId} for message ${msg.id}`, err);
              }
          }

          const hasAttachments = contentData.attachments.length > 0;

          // Skip very short emails that are unlikely to contain reservation data, unless there's an attachment
          if (emailContent.length < 50 && !hasAttachments) {
            stats.skipped++;
            await logMessage(supabaseClient, job.id, msg.id, 'skipped', 'Email too short and no inline attachments');
            return;
          }

          // Truncate very long emails to stay within LLM context limits
          const truncatedContent =
            emailContent.length > 12000
              ? emailContent.substring(0, 12000) + '\n[...truncated]'
              : emailContent;

          // Check if any attachments are plain text/calendar format
          // Gemini does not support text/calendar as inlineData
          // so we decode it and append to the body
          let calendarText = '';
          contentData.attachments.forEach(att => {
              if (att.mimeType.includes('calendar')) {
                  calendarText += `\n\n--- CALENDAR ATTACHMENT ---\n${decodeBase64Url(att.data)}`;
              }
          });

          // 8. Send to LLM with trip context (geminiApiKey validated at function start)
          const fullPrompt = `${runtimePrompt}\n\n--- ACTIVE TRIP CONTEXT ---\n${tripContextStr}\n--- END TRIP CONTEXT ---\n\nEmail Subject: ${subject}\nEmail From: ${from}\n\nEmail Body:\n${truncatedContent}${calendarText}`;

          const parts: any[] = [{ text: fullPrompt }];

          // Add valid attachments as inlineData so Gemini can parse PDFs
          contentData.attachments.forEach(att => {
              if (att.mimeType === 'application/pdf') {
                 parts.push({
                     inlineData: {
                         mimeType: att.mimeType,
                         data: att.data
                     }
                 });
              }
          });

          const aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts }],
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
            return;
          }

          const aiData = await aiResponse.json();
          const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!resultText) {
            stats.skipped++;
            await logMessage(supabaseClient, job.id, msg.id, 'skipped', 'No AI output');
            return;
          }

          let parsedJSON: Record<string, unknown>;
          try {
            parsedJSON = JSON.parse(resultText);
          } catch {
            stats.errors++;
            await logMessage(supabaseClient, job.id, msg.id, 'error', 'Failed to parse AI JSON');
            return;
          }

          const reservations = parsedJSON.reservations as Array<Record<string, unknown>> | undefined;
          const relevanceScore = (parsedJSON.trip_relevance_score as number) ?? 0;
          const relevanceReason = (parsedJSON.trip_relevance_reason as string) ?? '';

          if (!reservations || reservations.length === 0) {
            stats.skipped++;
            await logMessage(supabaseClient, job.id, msg.id, 'skipped', 'No reservations found');
            return;
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

    // 7. Process messages concurrently in batches to avoid Edge Function timeout (150s limit)
    const CONCURRENCY_LIMIT = 5; // Process 5 messages at a time safely
    for (let i = 0; i < messages.length; i += CONCURRENCY_LIMIT) {
       const batch = messages.slice(i, i + CONCURRENCY_LIMIT);
       await Promise.all(batch.map(msg => processMessage(msg)));
    }

    // 9. Mark job complete and update account last_synced_at
    const nowIso = new Date().toISOString();
    await supabaseClient
      .from('gmail_import_jobs')
      .update({
        status: 'completed',
        finished_at: nowIso,
        stats: stats,
      })
      .eq('id', job.id);

    // Update last_synced_at using service role to bypass RLS limitations
    await adminClient
      .from('gmail_accounts')
      .update({ last_synced_at: nowIso })
      .eq('id', accountId);

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
