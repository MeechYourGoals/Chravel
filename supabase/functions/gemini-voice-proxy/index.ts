import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { TripContextBuilder } from '../_shared/contextBuilder.ts';
import { buildSystemPrompt } from '../_shared/promptBuilder.ts';
import { createVertexAccessToken, parseServiceAccountKey } from '../_shared/vertexAuth.ts';

/**
 * gemini-voice-proxy — WebSocket proxy between client and Vertex AI Live API.
 *
 * Architecture:
 *   Browser WebSocket → this function (proxy) → Vertex AI WebSocket
 *
 * The proxy owns the upstream Vertex connection and the OAuth2 token.
 * The client never sees the access token or talks directly to Google.
 *
 * Message relay is pass-through: the proxy does not parse or transform
 * message payloads. It only inspects top-level keys for logging and to
 * detect setupComplete / close events.
 */

// ── Vertex AI configuration ──
const VERTEX_PROJECT_ID = Deno.env.get('VERTEX_PROJECT_ID');
const VERTEX_LOCATION = Deno.env.get('VERTEX_LOCATION') || 'us-central1';
const VERTEX_SERVICE_ACCOUNT_KEY = Deno.env.get('VERTEX_SERVICE_ACCOUNT_KEY');
const VERTEX_LIVE_MODEL = 'gemini-live-2.5-flash-native-audio';

// Feature flags — default OFF for Phase A baseline, enable incrementally
const VOICE_TOOLS_ENABLED =
  (Deno.env.get('VOICE_TOOLS_ENABLED') || 'false').toLowerCase() === 'true';
const VOICE_AFFECTIVE_DIALOG =
  (Deno.env.get('VOICE_AFFECTIVE_DIALOG') || 'false').toLowerCase() === 'true';
const VOICE_PROACTIVE_AUDIO =
  (Deno.env.get('VOICE_PROACTIVE_AUDIO') || 'false').toLowerCase() === 'true';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ALLOWED_VOICES = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']);
const DEFAULT_VOICE = 'Charon';

// Upstream keepalive interval (server-to-Vertex)
const UPSTREAM_KEEPALIVE_MS = 15_000;

// ── Voice function declarations (Phase C — only included when VOICE_TOOLS_ENABLED) ──
// Imported inline to keep this file self-contained for Deno edge function bundling.
// These are identical to the declarations in gemini-voice-session/index.ts.
const VOICE_FUNCTION_DECLARATIONS = [
  {
    name: 'addToCalendar',
    description: 'Add an event to the trip calendar',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        datetime: { type: 'string', description: 'ISO 8601 datetime string' },
        location: { type: 'string', description: 'Event location (optional)' },
        notes: { type: 'string', description: 'Event notes (optional)' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['title', 'datetime', 'idempotency_key'],
    },
  },
  {
    name: 'createTask',
    description: 'Create a task for the trip group',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title/description' },
        notes: { type: 'string', description: 'Additional task notes (optional)' },
        assignee: { type: 'string', description: 'Assignee user ID (optional)' },
        dueDate: { type: 'string', description: 'Due date in ISO format (optional)' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['title', 'idempotency_key'],
    },
  },
  {
    name: 'createPoll',
    description: 'Create a poll for the group to vote on',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Poll question' },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Poll options (2-6 choices)',
        },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['question', 'options', 'idempotency_key'],
    },
  },
  {
    name: 'searchPlaces',
    description: 'Search for nearby places like restaurants, hotels, or attractions',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (e.g. "Italian restaurant")' },
        nearLat: { type: 'number', description: 'Latitude to search near (optional)' },
        nearLng: { type: 'number', description: 'Longitude to search near (optional)' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getPaymentSummary',
    description: 'Get a summary of who owes money to whom in the trip',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'getDirectionsETA',
    description: 'Get driving directions, travel time, and distance between two locations.',
    parameters: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Starting address or place name' },
        destination: { type: 'string', description: 'Destination address or place name' },
        departureTime: { type: 'string', description: 'Optional ISO 8601 departure time' },
      },
      required: ['origin', 'destination'],
    },
  },
  {
    name: 'getTimezone',
    description: 'Get the time zone for a geographic location.',
    parameters: {
      type: 'object',
      properties: {
        lat: { type: 'number', description: 'Latitude' },
        lng: { type: 'number', description: 'Longitude' },
      },
      required: ['lat', 'lng'],
    },
  },
  {
    name: 'getPlaceDetails',
    description: 'Get detailed info about a specific place.',
    parameters: {
      type: 'object',
      properties: {
        placeId: { type: 'string', description: 'Google Places ID' },
      },
      required: ['placeId'],
    },
  },
  {
    name: 'searchImages',
    description: 'Search for images on the web.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Image search query' },
        count: { type: 'number', description: 'Number of images (max 10, default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getStaticMapUrl',
    description: 'Generate a map image showing a location or route.',
    parameters: {
      type: 'object',
      properties: {
        center: { type: 'string', description: 'Address or "lat,lng"' },
        zoom: { type: 'number', description: 'Zoom level 1-20 (default 13)' },
        markers: { type: 'array', items: { type: 'string' }, description: 'Marker locations' },
      },
      required: ['center'],
    },
  },
  {
    name: 'searchWeb',
    description: 'Search the web for real-time information.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        count: { type: 'number', description: 'Number of results (max 10, default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getDistanceMatrix',
    description: 'Get travel times and distances from multiple origins to multiple destinations.',
    parameters: {
      type: 'object',
      properties: {
        origins: { type: 'array', items: { type: 'string' }, description: 'Starting addresses' },
        destinations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Destination addresses',
        },
        mode: { type: 'string', description: 'Travel mode: driving, walking, bicycling, transit' },
      },
      required: ['origins', 'destinations'],
    },
  },
  {
    name: 'validateAddress',
    description: 'Validate and clean up an address.',
    parameters: {
      type: 'object',
      properties: { address: { type: 'string', description: 'Address to validate' } },
      required: ['address'],
    },
  },
  {
    name: 'savePlace',
    description: 'Save a place or link to the trip Places/Explore section.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the place or link' },
        url: { type: 'string', description: 'URL for the place/link (optional)' },
        description: { type: 'string', description: 'Short reason to save (optional)' },
        category: {
          type: 'string',
          description: 'attraction, accommodation, activity, appetite, or other',
        },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['name', 'idempotency_key'],
    },
  },
  {
    name: 'setBasecamp',
    description: 'Set the trip or personal basecamp accommodation.',
    parameters: {
      type: 'object',
      properties: {
        scope: { type: 'string', description: 'trip or personal' },
        name: { type: 'string', description: 'Hotel/accommodation name' },
        address: { type: 'string', description: 'Address (optional)' },
        lat: { type: 'number', description: 'Latitude (optional)' },
        lng: { type: 'number', description: 'Longitude (optional)' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['scope', 'name'],
    },
  },
  {
    name: 'addToAgenda',
    description: 'Add an item/session to an event agenda.',
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Parent event ID' },
        title: { type: 'string', description: 'Agenda item title' },
        description: { type: 'string', description: 'Agenda notes (optional)' },
        sessionDate: { type: 'string', description: 'Session date (YYYY-MM-DD)' },
        startTime: { type: 'string', description: 'Start time (HH:MM)' },
        endTime: { type: 'string', description: 'End time (HH:MM)' },
        location: { type: 'string', description: 'Room/location (optional)' },
        speakers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Speaker or performer names',
        },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['eventId', 'title'],
    },
  },
  {
    name: 'searchFlights',
    description: 'Search flights and return Google Flights deeplinks.',
    parameters: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Origin airport code/city' },
        destination: { type: 'string', description: 'Destination airport code/city' },
        departureDate: { type: 'string', description: 'Departure date YYYY-MM-DD' },
        returnDate: { type: 'string', description: 'Optional return date YYYY-MM-DD' },
        passengers: { type: 'number', description: 'Passenger count (optional)' },
      },
      required: ['origin', 'destination', 'departureDate'],
    },
  },
  {
    name: 'emitSmartImportPreview',
    description:
      'Emit Smart Import preview events extracted from attached docs before calendar write.',
    parameters: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of extracted event objects',
        },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['events'],
    },
  },
  {
    name: 'emitReservationDraft',
    description: 'Create a reservation draft card for explicit booking intents.',
    parameters: {
      type: 'object',
      properties: {
        placeQuery: { type: 'string', description: 'Venue or restaurant name' },
        startTimeISO: { type: 'string', description: 'Requested reservation datetime ISO' },
        partySize: { type: 'number', description: 'Party size (optional)' },
        reservationName: { type: 'string', description: 'Reservation name (optional)' },
        notes: { type: 'string', description: 'Reservation notes (optional)' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['placeQuery'],
    },
  },
  {
    name: 'updateCalendarEvent',
    description: 'Update an existing trip calendar event.',
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'ID of the event to update' },
        title: { type: 'string', description: 'New event title' },
        datetime: { type: 'string', description: 'New start time in ISO 8601' },
        endDatetime: { type: 'string', description: 'New end time in ISO 8601' },
        location: { type: 'string', description: 'New location' },
        notes: { type: 'string', description: 'New description' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'deleteCalendarEvent',
    description: 'Delete an event from the trip calendar.',
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'ID of the event to delete' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'updateTask',
    description: 'Update an existing trip task.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID of the task' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'Updated description/notes' },
        dueDate: { type: 'string', description: 'New due date' },
        completed: { type: 'boolean', description: 'Set true to mark complete' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'deleteTask',
    description: 'Delete a task from the trip.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID of the task' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'searchTripData',
    description: 'Search across all trip data.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        types: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Which data types to search: calendar, task, poll, link, payment. Defaults to all.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'detectCalendarConflicts',
    description: 'Check if a time slot conflicts with existing events.',
    parameters: {
      type: 'object',
      properties: {
        datetime: { type: 'string', description: 'Proposed time in ISO 8601' },
        endDatetime: { type: 'string', description: 'Proposed end time' },
      },
      required: ['datetime'],
    },
  },
  {
    name: 'createBroadcast',
    description: 'Send a broadcast to all trip members.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Broadcast message' },
        priority: { type: 'string', description: '"normal" or "urgent"' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'createNotification',
    description: 'Send in-app notifications to selected users or all trip members.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Notification title' },
        message: { type: 'string', description: 'Notification body' },
        targetUserIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional user IDs; omit for all members',
        },
        type: { type: 'string', description: 'Notification type (optional)' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['title', 'message'],
    },
  },
  {
    name: 'getWeatherForecast',
    description: 'Get weather forecast.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City or location' },
        date: { type: 'string', description: 'Date for forecast' },
      },
      required: ['location'],
    },
  },
  {
    name: 'convertCurrency',
    description: 'Convert between currencies with live rates.',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount to convert' },
        from: { type: 'string', description: 'Source currency code' },
        to: { type: 'string', description: 'Target currency code' },
      },
      required: ['amount', 'from', 'to'],
    },
  },
  {
    name: 'browseWebsite',
    description: 'Browse a website to extract travel info.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Full URL' },
        instruction: { type: 'string', description: 'What to look for' },
      },
      required: ['url'],
    },
  },
  {
    name: 'makeReservation',
    description: 'Research and prepare a reservation.',
    parameters: {
      type: 'object',
      properties: {
        venue: { type: 'string', description: 'Venue name' },
        datetime: { type: 'string', description: 'Desired date/time' },
        partySize: { type: 'number', description: 'Number of guests' },
        name: { type: 'string', description: 'Name for the reservation' },
        phone: { type: 'string', description: 'Contact phone number' },
        specialRequests: { type: 'string', description: 'Special requests' },
        bookingUrl: { type: 'string', description: 'Direct booking URL if known' },
      },
      required: ['venue'],
    },
  },
  {
    name: 'settleExpense',
    description: 'Mark a payment split as settled.',
    parameters: {
      type: 'object',
      properties: {
        splitId: { type: 'string', description: 'ID of the payment split' },
        amount: { type: 'number', description: 'Amount settled (for partial settlements)' },
        method: { type: 'string', description: 'Payment method used' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['splitId'],
    },
  },
  {
    name: 'generateTripImage',
    description: 'Generate a custom AI image for the trip.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Image description' },
        style: {
          type: 'string',
          description: 'Style: photo, illustration, watercolor, minimal, vibrant',
        },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'setTripHeaderImage',
    description: 'Set the trip header/cover image URL.',
    parameters: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'Image URL to set as trip header' },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate creation',
        },
      },
      required: ['imageUrl'],
    },
  },
  {
    name: 'getDeepLink',
    description: 'Generate an in-app deep link for a specific trip entity.',
    parameters: {
      type: 'object',
      properties: {
        entityType: { type: 'string', description: 'event, task, poll, link, payment, broadcast' },
        entityId: { type: 'string', description: 'Entity ID' },
      },
      required: ['entityType', 'entityId'],
    },
  },
  {
    name: 'explainPermission',
    description: 'Explain whether an action is allowed and why.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Action name to evaluate' },
      },
      required: ['action'],
    },
  },
  {
    name: 'verify_artifact',
    description: 'Verify created artifact existence by ID or idempotency key.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'task, event, place, link, poll' },
        id: { type: 'string', description: 'Artifact ID (optional)' },
        idempotency_key: { type: 'string', description: 'Idempotency key (optional)' },
      },
      required: ['type'],
    },
  },
];

/** Voice-specific addendum appended to the full system prompt */
const VOICE_ADDENDUM = `

=== VOICE DELIVERY GUIDELINES ===
You are now speaking via full-screen immersive bidirectional audio conversation mode.
Take over the user's entire screen during this active conversation to optimize audio
input and output handling. Display conversation text in real-time as the user speaks
and you respond, maintaining visual context of the exchange.

Adapt your responses for voice:
- Keep responses under 3 sentences unless the user asks for detail
- Use natural conversational language — NO markdown, NO links, NO bullet points, NO formatting
- Say numbers as words when natural ("about twenty dollars" not "0.00")
- Avoid lists — narrate sequentially instead
- Be warm, concise, and personable
- If you don't know something specific, say so briefly and suggest checking the app
- When executing actions (adding events, creating tasks), confirm what you did conversationally

=== VISUAL CARDS IN CHAT ===
When you call these tools, a visual card automatically appears in the chat window
(visible when the user exits voice mode):
- searchPlaces / getPlaceDetails → photos, ratings, and a Maps link appear in chat.
- getStaticMapUrl → a map image appears in chat.
- getDirectionsETA → a directions card with a Maps link appears in chat.
- searchImages → images appear in chat.
- searchWeb → source links appear in chat.
- getDistanceMatrix → a travel time comparison appears in chat.
- validateAddress → no visual card; just confirm the address verbally.
Never speak URLs or markdown. The chat handles the visual output automatically.`;

// ── Main handler ──

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check (non-WebSocket GET)
  const upgradeHeader = req.headers.get('upgrade') || '';
  if (req.method === 'GET' && upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response(
      JSON.stringify({
        service: 'gemini-voice-proxy',
        architecture: 'server-side-proxy',
        configured: !!(VERTEX_PROJECT_ID && VERTEX_SERVICE_ACCOUNT_KEY),
        model: VERTEX_LIVE_MODEL,
        location: VERTEX_LOCATION,
        toolsEnabled: VOICE_TOOLS_ENABLED,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  }

  // ── WebSocket upgrade ──
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const tripId = url.searchParams.get('tripId') || undefined;
  const requestedVoice = url.searchParams.get('voice') || DEFAULT_VOICE;
  const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE;
  const resumptionToken = url.searchParams.get('resumptionToken') || undefined;

  const sessionId = crypto.randomUUID().slice(0, 8);
  const tag = `[voice-proxy:${sessionId}]`;
  const t0 = Date.now();

  console.log(`${tag} client_connecting`, { tripId, voice, hasToken: !!token });

  // ── Auth: validate Supabase JWT ──
  if (!token) {
    console.warn(`${tag} auth_missing`);
    return new Response(JSON.stringify({ error: 'Authentication required (token param)' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.warn(`${tag} auth_failed`, { error: authError?.message });
    return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`${tag} auth_verified`, { userId: user.id, elapsedMs: Date.now() - t0 });

  // ── Validate Vertex config ──
  if (!VERTEX_PROJECT_ID || !VERTEX_SERVICE_ACCOUNT_KEY) {
    console.error(`${tag} vertex_not_configured`);
    return new Response(JSON.stringify({ error: 'Vertex AI not configured on server' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Upgrade client connection to WebSocket ──
  // deno-lint-ignore no-explicit-any
  const { socket: clientWs, response } = (Deno as any).upgradeWebSocket(req);

  // ── Proxy state ──
  let upstreamWs: WebSocket | null = null;
  let upstreamReady = false;
  const clientBuffer: string[] = []; // Buffer client messages until upstream is ready
  const MAX_BUFFER_SIZE = 500; // Prevent unbounded memory growth
  let keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  let setupTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  function closeAll(reason: string): void {
    if (closed) return;
    closed = true;
    console.log(`${tag} closing_all`, { reason, elapsedMs: Date.now() - t0 });

    if (setupTimeoutId) {
      clearTimeout(setupTimeoutId);
      setupTimeoutId = null;
    }
    if (keepaliveInterval) {
      clearInterval(keepaliveInterval);
      keepaliveInterval = null;
    }

    try {
      if (upstreamWs && upstreamWs.readyState <= WebSocket.OPEN) {
        upstreamWs.close(1000, reason);
      }
    } catch {
      /* ignore */
    }

    try {
      if (clientWs.readyState <= WebSocket.OPEN) {
        clientWs.close(1000, reason);
      }
    } catch {
      /* ignore */
    }
  }

  // ── Client WebSocket handlers ──
  clientWs.onopen = async () => {
    console.log(`${tag} client_connected`, { elapsedMs: Date.now() - t0 });

    try {
      // 1. Build system prompt
      let systemInstruction: string;
      if (tripId) {
        try {
          const contextTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('context_build_timeout')), 15_000),
          );
          const tripContext = await Promise.race([
            TripContextBuilder.buildContextWithCache(tripId, user.id, `Bearer ${token}`, true),
            contextTimeout,
          ]);
          systemInstruction = buildSystemPrompt(tripContext);
          console.log(`${tag} context_built`, { elapsedMs: Date.now() - t0 });
        } catch (contextError) {
          const errMsg =
            contextError instanceof Error ? contextError.message : String(contextError);
          console.warn(`${tag} context_failed: ${errMsg}. Using minimal prompt.`);
          systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. Current date: ${new Date().toISOString().split('T')[0]}.`;
        }
      } else {
        systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. Current date: ${new Date().toISOString().split('T')[0]}.`;
      }
      systemInstruction += VOICE_ADDENDUM;

      // 2. Mint OAuth2 token (stays server-side — never sent to client)
      console.log(`${tag} minting_token`, { elapsedMs: Date.now() - t0 });
      const saKey = parseServiceAccountKey(VERTEX_SERVICE_ACCOUNT_KEY!);
      const accessToken = await createVertexAccessToken(saKey);
      console.log(`${tag} token_minted`, { elapsedMs: Date.now() - t0 });

      // 3. Build setup message
      const setupConfig: Record<string, unknown> = {
        model: `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_LIVE_MODEL}`,
        generation_config: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: voice,
              },
            },
          },
          ...(VOICE_AFFECTIVE_DIALOG ? { enable_affective_dialog: true } : {}),
        },
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        realtime_input_config: {
          automatic_activity_detection: {
            disabled: false,
            start_of_speech_sensitivity: 'START_OF_SPEECH_SENSITIVITY_LOW',
            end_of_speech_sensitivity: 'END_OF_SPEECH_SENSITIVITY_HIGH',
          },
        },
        input_audio_transcription: {},
        output_audio_transcription: {},
      };

      // Phase C: Include tools when enabled
      if (VOICE_TOOLS_ENABLED) {
        setupConfig.tools = [
          { function_declarations: VOICE_FUNCTION_DECLARATIONS },
          { google_search: {} },
        ];
      }

      // Session resumption
      if (resumptionToken) {
        setupConfig.session_resumption = { handle: resumptionToken };
        console.log(`${tag} including_resumption_token`);
      }

      // Phase D: Proactive audio
      if (VOICE_PROACTIVE_AUDIO) {
        setupConfig.proactivity = { proactive_audio: true };
      }

      const setupMessage = JSON.stringify({ setup: setupConfig });

      // 4. Open upstream WebSocket to Vertex AI
      const upstreamUrl = `wss://${VERTEX_LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1.LlmBidiService/BidiGenerateContent?access_token=${encodeURIComponent(accessToken)}`;

      console.log(`${tag} upstream_connecting`, {
        location: VERTEX_LOCATION,
        model: VERTEX_LIVE_MODEL,
        toolsEnabled: VOICE_TOOLS_ENABLED,
        elapsedMs: Date.now() - t0,
      });

      upstreamWs = new WebSocket(upstreamUrl);

      // Server-side setup timeout — if Vertex doesn't respond within 30s,
      // close everything. Client has its own 12s timeout but this prevents
      // the proxy from hanging indefinitely if the client disappears.
      setupTimeoutId = setTimeout(() => {
        if (!upstreamReady) {
          console.warn(`${tag} server_setup_timeout`, { elapsedMs: Date.now() - t0 });
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                error: { code: 504, message: 'Upstream setup timed out' },
              }),
            );
          }
          closeAll('server_setup_timeout');
        }
      }, 30_000);

      let upstreamMessageCount = 0;

      upstreamWs.onopen = () => {
        console.log(`${tag} upstream_connected`, { elapsedMs: Date.now() - t0 });

        // Send setup as first message
        upstreamWs!.send(setupMessage);
        console.log(`${tag} setup_sent`, {
          hasTools: VOICE_TOOLS_ENABLED,
          toolCount: VOICE_TOOLS_ENABLED ? VOICE_FUNCTION_DECLARATIONS.length : 0,
          elapsedMs: Date.now() - t0,
        });

        // Start upstream keepalive
        keepaliveInterval = setInterval(() => {
          if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
            // Send a minimal realtime input to keep connection alive
            upstreamWs.send(
              JSON.stringify({
                realtimeInput: {
                  mediaChunks: [
                    {
                      mimeType: 'audio/pcm;rate=16000',
                      data: '', // Empty audio = silence keepalive
                    },
                  ],
                },
              }),
            );
          } else if (keepaliveInterval) {
            clearInterval(keepaliveInterval);
            keepaliveInterval = null;
          }
        }, UPSTREAM_KEEPALIVE_MS);
      };

      upstreamWs.onmessage = (event: MessageEvent) => {
        upstreamMessageCount += 1;

        // Log first 5 messages for diagnostics
        if (upstreamMessageCount <= 5) {
          try {
            const data = JSON.parse(event.data as string);
            const keys = Object.keys(data);
            const hasSetupComplete =
              keys.includes('setupComplete') || keys.includes('setup_complete');
            console.log(`${tag} upstream_message_${upstreamMessageCount}`, {
              keys,
              hasSetupComplete,
              hasError: !!data.error,
              elapsedMs: Date.now() - t0,
            });

            if (hasSetupComplete) {
              console.log(`${tag} setup_complete_received`, { elapsedMs: Date.now() - t0 });
              upstreamReady = true;

              // Clear server-side setup timeout
              if (setupTimeoutId) {
                clearTimeout(setupTimeoutId);
                setupTimeoutId = null;
              }

              // Flush buffered client messages
              if (clientBuffer.length > 0) {
                console.log(`${tag} flushing_buffer`, { count: clientBuffer.length });
                for (const msg of clientBuffer) {
                  if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
                    upstreamWs.send(msg);
                  }
                }
                clientBuffer.length = 0;
              }
            }
          } catch {
            // Non-JSON message — still relay it
          }
        }

        // Log significant events beyond the first 5 messages (goAway, errors, resumption)
        if (upstreamMessageCount > 5) {
          try {
            const data = JSON.parse(event.data as string);
            if (data.error) {
              console.warn(`${tag} upstream_error_frame`, {
                code: data.error?.code,
                message: data.error?.message,
                elapsedMs: Date.now() - t0,
              });
            }
            const goAway = data.goAway || data.go_away;
            if (goAway) {
              console.warn(`${tag} upstream_go_away`, {
                timeLeft: goAway.timeLeft || goAway.time_left,
                hasResumptionToken: !!(
                  goAway.sessionResumptionToken || goAway.session_resumption_token
                ),
                elapsedMs: Date.now() - t0,
              });
            }
            const resumption = data.sessionResumptionUpdate || data.session_resumption_update;
            if (resumption) {
              console.log(`${tag} upstream_resumption_update`, {
                hasNewHandle: !!(resumption.newHandle || resumption.new_handle),
                elapsedMs: Date.now() - t0,
              });
            }
          } catch {
            // Non-JSON — ignore for logging purposes
          }
        }

        // Relay upstream → client (pass-through)
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(event.data);
        }
      };

      upstreamWs.onerror = (ev: Event) => {
        const errorMsg = (ev as ErrorEvent).message ?? 'unknown';
        console.error(`${tag} upstream_error`, { error: errorMsg, elapsedMs: Date.now() - t0 });
        // Send error to client
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(
            JSON.stringify({
              error: { code: 502, message: `Upstream connection error: ${errorMsg}` },
            }),
          );
        }
      };

      upstreamWs.onclose = (event: CloseEvent) => {
        console.log(`${tag} upstream_close`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          elapsedMs: Date.now() - t0,
        });
        // Close client with same code (map to safe range)
        const safeCode = event.code >= 1000 && event.code <= 4999 ? event.code : 1011;
        closeAll(`upstream_closed:${event.code}`);
        // Try to send close to client with the upstream code
        try {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(safeCode, event.reason || 'Upstream closed');
          }
        } catch {
          /* ignore */
        }
      };
    } catch (initError) {
      const errMsg = initError instanceof Error ? initError.message : String(initError);
      console.error(`${tag} init_failed`, { error: errMsg, elapsedMs: Date.now() - t0 });
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            error: { code: 500, message: errMsg },
          }),
        );
        clientWs.close(1011, 'Initialization failed');
      }
    }
  };

  clientWs.onmessage = (event: MessageEvent) => {
    const data = event.data as string;

    // If upstream not ready yet, buffer the message
    if (!upstreamReady || !upstreamWs || upstreamWs.readyState !== WebSocket.OPEN) {
      if (clientBuffer.length >= MAX_BUFFER_SIZE) {
        console.warn(`${tag} buffer_overflow`, { size: clientBuffer.length });
        closeAll('buffer_overflow');
        return;
      }
      clientBuffer.push(data);
      return;
    }

    // Relay client → upstream (pass-through)
    upstreamWs.send(data);
  };

  clientWs.onerror = (ev: Event) => {
    const errorMsg = (ev as ErrorEvent).message ?? 'unknown';
    console.error(`${tag} client_error`, { error: errorMsg, elapsedMs: Date.now() - t0 });
  };

  clientWs.onclose = (event: CloseEvent) => {
    console.log(`${tag} client_close`, {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      elapsedMs: Date.now() - t0,
    });
    closeAll(`client_closed:${event.code}`);
  };

  return response;
});
