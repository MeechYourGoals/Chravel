import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { runtimePrompt } from './prompt.ts';
import { decryptToken, encryptToken } from '../_shared/gmailTokenCrypto.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const GMAIL_TOKEN_ENCRYPTION_KEY = Deno.env.get('GMAIL_TOKEN_ENCRYPTION_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TripContext {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  destination: string | null;
  basecampName: string | null;
  basecampAddress: string | null;
}

interface CandidateReservation {
  type: string;
  confirmation_code?: string | null;
  booking_source?: string | null;
  [key: string]: unknown;
}

type ParsedResult = {
  reservations: CandidateReservation[];
  guessed_trip_name: string | null;
  guessed_primary_city: string | null;
  trip_relevance_score: number;
  trip_relevance_reason: string;
  is_cancellation: boolean;
  is_modification: boolean;
};

function configErrorResponse(message: string): Response {
  console.error(`[gmail-import-worker] ${message}`);
  return new Response(JSON.stringify({ error: message }), {
    status: 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= retries) {
    try {
      const response = await fetch(url, init);
      if (response.status === 429 || response.status >= 500) {
        if (attempt === retries) return response;
        await new Promise(resolve => setTimeout(resolve, 400 * Math.pow(2, attempt)));
        attempt++;
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown fetch error');
      if (attempt === retries) break;
      await new Promise(resolve => setTimeout(resolve, 400 * Math.pow(2, attempt)));
      attempt++;
    }
  }

  throw lastError ?? new Error('Fetch failed after retries');
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number | null }> {
  const response = await fetchWithRetry(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    },
    2,
  );

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${await response.text()}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : null,
  };
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  try {
    return atob(padded);
  } catch {
    return '';
  }
}

function extractEmailBody(payload: Record<string, unknown>): string {
  const body = payload.body as Record<string, unknown> | undefined;
  if (body && typeof body.data === 'string' && body.data.length > 0) {
    return decodeBase64Url(body.data);
  }

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
      const nested = extractEmailBody(part);
      if (nested) plainText += nested;
    }
  }

  if (plainText) return plainText;

  return htmlText
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAttachmentHints(payload: Record<string, unknown>): string[] {
  const hints: string[] = [];
  const stack: Array<Record<string, unknown>> = [payload];

  while (stack.length > 0) {
    const part = stack.pop();
    if (!part) break;
    const filename = part.filename as string | undefined;
    const mimeType = part.mimeType as string | undefined;

    if (filename && filename.length > 0) {
      hints.push(`${filename}${mimeType ? ` (${mimeType})` : ''}`);
    }

    const children = part.parts as Array<Record<string, unknown>> | undefined;
    if (children && children.length > 0) {
      stack.push(...children);
    }
  }

  return hints.slice(0, 10);
}

function buildDateFilter(trip: TripContext): string {
  if (!trip.startDate) return 'newer_than:4m';

  const before = new Date(trip.startDate);
  before.setDate(before.getDate() - 21);
  const afterDate = trip.endDate ? new Date(trip.endDate) : new Date(trip.startDate);
  afterDate.setDate(afterDate.getDate() + 14);

  const format = (d: Date) =>
    `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

  return `after:${format(before)} before:${format(afterDate)}`;
}

function buildTripScopedGmailQueries(trip: TripContext): string[] {
  const dateFilter = buildDateFilter(trip);
  const destinationTokens = [trip.destination, trip.basecampName, trip.basecampAddress]
    .filter(Boolean)
    .flatMap(token => `${token}`.split(/\s+/))
    .filter(token => token.length >= 4)
    .slice(0, 8)
    .join(' OR ');

  const lexical =
    '(subject:(itinerary OR reservation OR booking OR confirmation OR ticket OR e-ticket OR "check-in" OR "boarding" OR "train" OR "ferry" OR "restaurant" OR "openTable" OR "resy" OR "charter confirmation" OR "flight manifest" OR "passenger manifest" OR "tail number" OR "departure briefing" OR "group charter") OR "record locator" OR "confirmation number" OR "trip is booked")';

  const vendor =
    '(from:(booking.com OR expedia.com OR hotels.com OR priceline.com OR kayak.com OR tripadvisor.com OR travelocity.com OR orbitz.com OR airbnb.com OR vrbo.com OR marriott.com OR hilton.com OR hyatt.com OR ihg.com OR wyndham.com OR fourseasons.com OR ritzcarlton.com OR accor.com OR united.com OR delta.com OR aa.com OR southwest.com OR jetblue.com OR alaskaair.com OR frontier.com OR spirit.com OR allegiant.com OR lufthansa.com OR ba.com OR airfrance.com OR emirates.com OR qatarairways.com OR singaporeair.com OR klm.com OR turkish.com OR iberia.com OR netjets.com OR wheelsup.com OR flexjet.com OR planesense.com OR airshare.com OR sentientjet.com OR vistajet.com OR xo.com OR flyexclusive.com OR jsx.com OR blade.com OR signatureaviation.com OR jetaviation.com OR atlanticaviation.com OR hipcamp.com OR tentrr.com OR koa.com OR outdoorsy.com OR rvshare.com OR sonder.com OR blueground.com OR vacasa.com OR hostelworld.com OR selina.com OR ticketmaster.com OR axs.com OR seatgeek.com OR stubhub.com OR gametime.co OR eventbrite.com OR opentable.com OR resy.com OR tockhq.com OR yelp.com OR tock.com OR amtrak.com OR eurostar.com OR flixbus.com OR trainline.com OR renfe.com OR trenitalia.com OR hertz.com OR avis.com OR enterprise.com OR budget.com OR alamo.com OR nationalcar.com OR turo.com OR uber.com OR lyft.com))';

  const queries = [
    `${dateFilter} ${lexical}`,
    `${dateFilter} ${vendor}`,
    `${dateFilter} label:travel`,
  ];

  if (destinationTokens.length > 0) {
    queries.push(`${dateFilter} (${destinationTokens}) (${lexical})`);
  }

  return queries;
}

function buildTripContextForPrompt(trip: TripContext): string {
  const lines: string[] = [`Trip Name: ${trip.name}`];
  if (trip.startDate) lines.push(`Trip Start Date: ${trip.startDate}`);
  if (trip.endDate) lines.push(`Trip End Date: ${trip.endDate}`);
  if (trip.destination) lines.push(`Trip Destination: ${trip.destination}`);
  if (trip.basecampName) lines.push(`Trip Basecamp/Hotel: ${trip.basecampName}`);
  if (trip.basecampAddress) lines.push(`Trip Basecamp Address: ${trip.basecampAddress}`);
  return lines.join('\n');
}

function normalizeReservationType(rawType: unknown): string {
  const value =
    typeof rawType === 'string' ? rawType.trim().toLowerCase() : 'generic_itinerary_item';
  const aliases: Record<string, string> = {
    hotel: 'lodging',
    accommodation: 'lodging',
    vacation_rental: 'lodging',
    car_rental: 'ground_transport',
    train: 'rail_bus_ferry',
    bus: 'rail_bus_ferry',
    ferry: 'rail_bus_ferry',
    sports_ticket: 'sports_ticket',
    conference_registration: 'conference_registration',
    restaurant: 'restaurant_reservation',
    dining_reservation: 'restaurant_reservation',
    rail_ticket: 'rail_bus_ferry',
    itinerary: 'generic_itinerary_item',
  };

  return aliases[value] ||
    [
      'flight',
      'lodging',
      'ground_transport',
      'event_ticket',
      'sports_ticket',
      'restaurant_reservation',
      'rail_bus_ferry',
      'conference_registration',
      'generic_itinerary_item',
    ].includes(value)
    ? value
    : 'generic_itinerary_item';
}

function clampScore(input: unknown): number {
  const num = typeof input === 'number' ? input : Number(input);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function normalizeParsedResult(raw: unknown): ParsedResult {
  const fallback: ParsedResult = {
    reservations: [],
    guessed_trip_name: null,
    guessed_primary_city: null,
    trip_relevance_score: 0,
    trip_relevance_reason: 'Unparseable AI output',
    is_cancellation: false,
    is_modification: false,
  };

  if (!raw || typeof raw !== 'object') return fallback;
  const record = raw as Record<string, unknown>;
  const reservationsRaw = Array.isArray(record.reservations) ? record.reservations : [];

  const reservations = reservationsRaw
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const base = item as Record<string, unknown>;
      return {
        ...base,
        type: normalizeReservationType(base.type),
      } as CandidateReservation;
    });

  return {
    reservations,
    guessed_trip_name:
      typeof record.guessed_trip_name === 'string' ? record.guessed_trip_name : null,
    guessed_primary_city:
      typeof record.guessed_primary_city === 'string' ? record.guessed_primary_city : null,
    trip_relevance_score: clampScore(record.trip_relevance_score),
    trip_relevance_reason:
      typeof record.trip_relevance_reason === 'string'
        ? record.trip_relevance_reason
        : 'No relevance reason provided',
    is_cancellation: record.is_cancellation === true,
    is_modification: record.is_modification === true,
  };
}

async function logMessage(
  client: any, // intentional: bypass deep Supabase generic inference
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

async function collectMessageIds(accessToken: string, trip: TripContext): Promise<string[]> {
  const ids = new Set<string>();
  const queries = buildTripScopedGmailQueries(trip);

  for (const query of queries) {
    let nextPageToken: string | null = null;
    let pages = 0;

    while (pages < 3 && ids.size < 120) {
      const searchUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('maxResults', '40');
      if (nextPageToken) searchUrl.searchParams.set('pageToken', nextPageToken);

      const searchResponse = await fetchWithRetry(searchUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!searchResponse.ok) {
        throw new Error(
          `Gmail API search error (${searchResponse.status}): ${await searchResponse.text()}`,
        );
      }

      const searchData = await searchResponse.json();
      for (const message of searchData.messages || []) {
        if (typeof message?.id === 'string') ids.add(message.id);
      }

      nextPageToken = searchData.nextPageToken || null;
      pages++;
      if (!nextPageToken) break;
    }
  }

  return Array.from(ids);
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let jobId: string | null = null;

  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return configErrorResponse('Google OAuth secrets are not configured.');
    }

    if (!GMAIL_TOKEN_ENCRYPTION_KEY) {
      return configErrorResponse('GMAIL_TOKEN_ENCRYPTION_KEY is not configured.');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return configErrorResponse('GEMINI_API_KEY is not configured.');
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

    const { data: account, error: accountError } = await adminClient
      .from('gmail_accounts')
      .select('email, access_token, refresh_token, token_expires_at')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return new Response(JSON.stringify({ error: 'Gmail account not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    let accessToken = await decryptToken(account.access_token, GMAIL_TOKEN_ENCRYPTION_KEY);
    const refreshToken = await decryptToken(account.refresh_token, GMAIL_TOKEN_ENCRYPTION_KEY);

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No Gmail access token available. Reconnect Gmail.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const testResponse = await fetchWithRetry(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (testResponse.status === 401 && refreshToken) {
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;

      await adminClient
        .from('gmail_accounts')
        .update({
          access_token: await encryptToken(accessToken, GMAIL_TOKEN_ENCRYPTION_KEY),
          token_expires_at: refreshed.expiresIn
            ? new Date(Date.now() + (refreshed.expiresIn - 60) * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      await adminClient.from('gmail_token_audit_logs').insert({
        user_id: user.id,
        gmail_account_email: account.email,
        action: 'access_token_refresh',
      });
    } else if (testResponse.status === 401) {
      return new Response(
        JSON.stringify({
          error:
            'Gmail token expired and no refresh token available. Please reconnect your Gmail account in Settings.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

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

    const messageIds = await collectMessageIds(accessToken, tripContext);

    if (messageIds.length === 0) {
      return new Response(
        JSON.stringify({ candidates: [], stats: { scanned: 0, parsed: 0, skipped: 0, errors: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: job, error: jobError } = await supabaseClient
      .from('gmail_import_jobs')
      .insert({
        user_id: user.id,
        gmail_account_id: accountId,
        trip_id: tripId,
        status: 'running',
        started_at: new Date().toISOString(),
        stats: {
          retrieval_message_ids: messageIds.length,
          retrieval_queries: buildTripScopedGmailQueries(tripContext),
        },
      })
      .select('id')
      .single();

    if (jobError || !job) throw new Error('Failed to create import job');
    jobId = job.id;

    const allCandidates: Record<string, unknown>[] = [];
    const stats = { scanned: messageIds.length, parsed: 0, skipped: 0, errors: 0 };
    const tripContextStr = buildTripContextForPrompt(tripContext);

    for (const messageId of messageIds.slice(0, 120)) {
      try {
        const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;
        const msgResponse = await fetchWithRetry(msgUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!msgResponse.ok) {
          stats.errors++;
          await logMessage(
            supabaseClient,
            job.id,
            messageId,
            'error',
            `HTTP ${msgResponse.status}`,
          );
          continue;
        }

        const msgData = await msgResponse.json();

        const headers = msgData.payload?.headers || [];
        const subject =
          headers.find((h: Record<string, string>) => h.name?.toLowerCase() === 'subject')?.value ||
          '';
        const from =
          headers.find((h: Record<string, string>) => h.name?.toLowerCase() === 'from')?.value ||
          '';

        // Extract email sent date for trip relevance scoring
        const dateHeaderValue = headers.find(
          (h: Record<string, string>) => h.name?.toLowerCase() === 'date',
        )?.value;
        let emailDate: string | null = null;
        if (dateHeaderValue) {
          try {
            const parsedDate = new Date(dateHeaderValue);
            if (!isNaN(parsedDate.getTime())) {
              emailDate = parsedDate.toISOString().substring(0, 10);
            }
          } catch {
            // Unparseable date header — leave null
          }
        }

        const bodyText = extractEmailBody(msgData.payload || {});
        const snippet = msgData.snippet || '';
        const attachmentHints = extractAttachmentHints(msgData.payload || {});

        const emailContent = bodyText.length > snippet.length ? bodyText : snippet;
        if (emailContent.length < 35 && attachmentHints.length === 0) {
          stats.skipped++;
          await logMessage(supabaseClient, job.id, messageId, 'skipped', 'Email too short');
          continue;
        }

        const truncatedContent =
          emailContent.length > 15000
            ? `${emailContent.substring(0, 15000)}\n[...truncated]`
            : emailContent;

        const emailDateLine = emailDate ? `Email Sent Date: ${emailDate}\n` : '';
        const fullPrompt = `${runtimePrompt}\n\n--- ACTIVE TRIP CONTEXT ---\n${tripContextStr}\n--- END TRIP CONTEXT ---\n\nEmail Subject: ${subject}\nEmail From: ${from}\n${emailDateLine}Attachment Hints: ${attachmentHints.join(', ') || 'none'}\n\nEmail Body:\n${truncatedContent}`;

        const geminiTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini request timed out after 25s')), 25000),
        );

        const aiResponse = await Promise.race([
          fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: { responseMimeType: 'application/json' },
              }),
            },
            2,
          ),
          geminiTimeout,
        ]);

        if (!aiResponse.ok) {
          stats.errors++;
          await logMessage(
            supabaseClient,
            job.id,
            messageId,
            'error',
            `AI API error: ${aiResponse.status}`,
          );
          continue;
        }

        const aiData = await aiResponse.json();
        const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) {
          stats.skipped++;
          await logMessage(supabaseClient, job.id, messageId, 'skipped', 'No AI output');
          continue;
        }

        let parsedRaw: unknown;
        try {
          parsedRaw = JSON.parse(resultText);
        } catch {
          stats.errors++;
          await logMessage(supabaseClient, job.id, messageId, 'error', 'Failed to parse AI JSON');
          continue;
        }

        const parsed = normalizeParsedResult(parsedRaw);
        if (parsed.reservations.length === 0) {
          stats.skipped++;
          await logMessage(supabaseClient, job.id, messageId, 'skipped', 'No reservations found');
          continue;
        }

        for (const res of parsed.reservations) {
          // Hardened dedupe key: includes date component to prevent key collapse
          // when confirmation_code and booking_source are both absent
          const dateSignal = (
            (res.departure_time_local as string | undefined) ||
            (res.check_in_local as string | undefined) ||
            (res.reservation_time_local as string | undefined) ||
            (res.start_time_local as string | undefined) ||
            (res.pickup_time_local as string | undefined) ||
            ''
          ).substring(0, 10);

          const dedupeKey = [
            res.type,
            (res.confirmation_code as string | undefined) ||
              (res.flight_number as string | undefined) ||
              (res.train_number as string | undefined) ||
              '',
            (res.booking_source as string | undefined) ||
              (res.airline_code as string | undefined) ||
              (res.ticket_provider as string | undefined) ||
              '',
            dateSignal,
          ].join('_');

          const { data: existing } = await supabaseClient
            .from('smart_import_candidates')
            .select('id')
            .eq('trip_id', tripId)
            .eq('dedupe_key', dedupeKey)
            .limit(1);

          if (existing && existing.length > 0) {
            stats.skipped++;
            continue;
          }

          const { data: candidate, error: candidateError } = await supabaseClient
            .from('smart_import_candidates')
            .insert({
              job_id: job.id,
              user_id: user.id,
              trip_id: tripId,
              reservation_data: {
                ...res,
                _relevance_score: parsed.trip_relevance_score,
                _relevance_reason: parsed.trip_relevance_reason,
                _gmail_message_id: messageId,
                _email_subject: subject,
                is_cancellation: parsed.is_cancellation,
                is_modification: parsed.is_modification,
              },
              status: 'pending',
              dedupe_key: dedupeKey,
            })
            .select()
            .single();

          if (!candidateError && candidate) {
            allCandidates.push(candidate);
            stats.parsed++;
          }
        }

        await logMessage(
          supabaseClient,
          job.id,
          messageId,
          'parsed',
          parsed.reservations.map(r => `${r.type}`).join(','),
        );
      } catch (err) {
        stats.errors++;
        await logMessage(
          supabaseClient,
          job.id,
          messageId,
          'error',
          err instanceof Error ? err.message : 'Unknown error',
        );
      }
    }

    await supabaseClient
      .from('gmail_import_jobs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        stats,
      })
      .eq('id', job.id);

    // Update last_synced_at on the gmail account — visible in Settings
    await adminClient
      .from('gmail_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', accountId);

    allCandidates.sort((a, b) => {
      const scoreA =
        ((a.reservation_data as Record<string, unknown> | undefined)?._relevance_score as number) ??
        0;
      const scoreB =
        ((b.reservation_data as Record<string, unknown> | undefined)?._relevance_score as number) ??
        0;
      return scoreB - scoreA;
    });

    return new Response(JSON.stringify({ candidates: allCandidates, stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    if (jobId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: req.headers.get('Authorization')! } },
        });

        await supabaseClient
          .from('gmail_import_jobs')
          .update({
            status: 'failed',
            finished_at: new Date().toISOString(),
            stats: {
              error: error instanceof Error ? error.message : 'Internal server error',
            },
          })
          .eq('id', jobId);
      } catch {
        // ignore follow-up errors
      }
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[gmail-import-worker] Unexpected error:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
