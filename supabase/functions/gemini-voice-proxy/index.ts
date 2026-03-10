/**
 * gemini-voice-proxy — WebSocket relay between browser and Vertex AI Live API.
 *
 * Architecture (from the gist / official Vertex docs):
 *   Browser → WSS to this proxy → proxy opens upstream WSS to Vertex AI
 *   Proxy handles GCP OAuth2 auth server-side (no credentials touch browser).
 *   All messages relayed bidirectionally.
 *
 * The client sends a JSON "init" message first containing { tripId, voice, ... }.
 * The proxy:
 *   1. Authenticates the user via Supabase JWT
 *   2. Builds the BidiGenerateContentSetup message with system prompt + tools
 *   3. Mints an OAuth2 access token from the GCP service account
 *   4. Opens upstream WSS to Vertex AI with Authorization: Bearer header
 *   5. Sends the setup message upstream
 *   6. Relays all subsequent messages bidirectionally
 *
 * Key patterns from the gist:
 *   - Buffer client messages during GCP auth (upstream not ready yet)
 *   - 30-second keepalive pings upstream
 *   - Safe close code filtering (1005/1006 → 1000)
 *   - SILENT scheduling on tool responses to prevent double-speech
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TripContextBuilder } from '../_shared/contextBuilder.ts';
import { buildSystemPrompt } from '../_shared/promptBuilder.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// ── Environment ──
const VERTEX_PROJECT_ID = Deno.env.get('VERTEX_PROJECT_ID');
const VERTEX_LOCATION = Deno.env.get('VERTEX_LOCATION') || 'us-central1';
const VERTEX_SERVICE_ACCOUNT_KEY = Deno.env.get('VERTEX_SERVICE_ACCOUNT_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const VERTEX_LIVE_MODEL = 'gemini-live-2.5-flash-native-audio';

// Phase A: Mode 0 — all features OFF by default for boring handshake baseline
const VOICE_TOOLS_ENABLED =
  (Deno.env.get('VOICE_TOOLS_ENABLED') || 'false').toLowerCase() === 'true';
const VOICE_AFFECTIVE_DIALOG =
  (Deno.env.get('VOICE_AFFECTIVE_DIALOG') || 'false').toLowerCase() === 'true';
const VOICE_PROACTIVE_AUDIO =
  (Deno.env.get('VOICE_PROACTIVE_AUDIO') || 'false').toLowerCase() === 'true';

const ALLOWED_VOICES = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']);
const DEFAULT_VOICE = 'Charon';

// Keepalive interval for upstream Vertex WebSocket (30s per gist recommendation)
const UPSTREAM_KEEPALIVE_MS = 30_000;

// ── Voice function declarations (same as gemini-voice-session) ──
// Using lowercase OpenAPI types per Vertex AI specification
const VOICE_FUNCTION_DECLARATIONS = [
  {
    name: 'addToCalendar',
    description: 'Add an event to the trip calendar. SILENT EXECUTION.',
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
    description: 'Create a task for the trip group. SILENT EXECUTION.',
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
    description: 'Create a poll for the group to vote on. SILENT EXECUTION.',
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
    description:
      'Search for nearby places like restaurants, hotels, or attractions. SILENT EXECUTION.',
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
    description: 'Get a summary of who owes money to whom in the trip. SILENT EXECUTION.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'getDirectionsETA',
    description:
      'Get driving directions, travel time, and distance between two locations. SILENT EXECUTION.',
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
    description: 'Get the time zone for a geographic location. SILENT EXECUTION.',
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
    description: 'Get detailed info about a specific place. SILENT EXECUTION.',
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
    description: 'Search for images on the web. SILENT EXECUTION.',
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
    description: 'Generate a map image showing a location or route. SILENT EXECUTION.',
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
    description: 'Search the web for real-time information. SILENT EXECUTION.',
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
    description:
      'Get travel times and distances from multiple origins to multiple destinations. SILENT EXECUTION.',
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
    description: 'Validate and clean up an address. SILENT EXECUTION.',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Address to validate' },
      },
      required: ['address'],
    },
  },
  {
    name: 'savePlace',
    description: 'Save a place or link to the trip Places/Explore section. SILENT EXECUTION.',
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
    description: 'Set the trip or personal basecamp accommodation. SILENT EXECUTION.',
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
    description: 'Add an item/session to an event agenda. SILENT EXECUTION.',
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
    description: 'Search flights and return Google Flights deeplinks. SILENT EXECUTION.',
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
      'Emit Smart Import preview events extracted from attached docs before calendar write. SILENT EXECUTION.',
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
    description: 'Create a reservation draft card for explicit booking intents. SILENT EXECUTION.',
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
    description: 'Update an existing trip calendar event. SILENT EXECUTION.',
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
    description: 'Delete an event from the trip calendar. SILENT EXECUTION.',
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
    description: 'Update an existing trip task. SILENT EXECUTION.',
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
    description: 'Delete a task from the trip. SILENT EXECUTION.',
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
    description: 'Search across all trip data. SILENT EXECUTION.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        types: {
          type: 'array',
          items: { type: 'string' },
          description: 'Which data types to search',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'detectCalendarConflicts',
    description: 'Check if a time slot conflicts with existing events. SILENT EXECUTION.',
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
    description: 'Send a broadcast to all trip members. SILENT EXECUTION.',
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
    description:
      'Send in-app notifications to selected users or all trip members. SILENT EXECUTION.',
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
    description: 'Get weather forecast. SILENT EXECUTION.',
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
    description: 'Convert between currencies with live rates. SILENT EXECUTION.',
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
    description: 'Browse a website to extract travel info. SILENT EXECUTION.',
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
    description: 'Research and prepare a reservation. SILENT EXECUTION.',
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
    description: 'Mark a payment split as settled. SILENT EXECUTION.',
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
    description: 'Generate a custom AI image for the trip. SILENT EXECUTION.',
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
    description: 'Set the trip header/cover image URL. SILENT EXECUTION.',
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
    description: 'Generate an in-app deep link for a specific trip entity. SILENT EXECUTION.',
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
    description: 'Explain whether an action is allowed and why. SILENT EXECUTION.',
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
    description: 'Verify created artifact existence by ID or idempotency key. SILENT EXECUTION.',
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

const VOICE_ADDENDUM = `

=== VOICE DELIVERY GUIDELINES ===
You are now speaking via bidirectional audio conversation mode.

Adapt your responses for voice:
- Keep responses under 3 sentences unless the user asks for detail
- Use natural conversational language — NO markdown, NO links, NO bullet points, NO formatting
- Say numbers as words when natural ("about twenty dollars" not "$20.00")
- Avoid lists — narrate sequentially instead
- Be warm, concise, and personable
- If you don't know something specific, say so briefly and suggest checking the app
- When executing actions (adding events, creating tasks), confirm what you did conversationally

=== TOOL CALL BEHAVIOR ===
When you call a tool, stop speaking and wait for the result. Your job after a tool call is to listen.
Do not narrate what tools you are calling. Do not say "let me check" or "searching for". Just call the tool silently and speak about the result naturally.

=== VISUAL CARDS IN CHAT ===
When you call these tools, a visual card automatically appears in the chat window
(visible when the user exits voice mode):
- searchPlaces / getPlaceDetails → photos, ratings, and a Maps link appear in chat.
- getStaticMapUrl → a map image appears in chat.
- getDirectionsETA → a directions card with a Maps link appears in chat.
- searchImages → images appear in chat.
- searchWeb → source links appear in chat.
- getDistanceMatrix → a travel time comparison appears in chat.
Never speak URLs or markdown. The chat handles the visual output automatically.

=== LANGUAGE ===
You MUST speak only in English. Every single word must be in English.
Ignore all background noise.`;

// ── OAuth2 token minting — import from shared module ──
import {
  createVertexAccessToken,
  parseServiceAccountKey,
} from '../_shared/vertexAuth.ts';

/** Filter close codes that are invalid for ws.close() */
function safeCloseCode(code: number): number {
  // 1005 (No Status Received) and 1006 (Abnormal Closure) are not valid for ws.close()
  if (code === 1005 || code === 1006) return 1000;
  return code;
}

// ── Main handler ──

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check
  if (req.method === 'GET') {
    const isConfigured = !!(VERTEX_PROJECT_ID && VERTEX_SERVICE_ACCOUNT_KEY);
    return new Response(
      JSON.stringify({
        service: 'gemini-voice-proxy',
        provider: 'vertex',
        configured: isConfigured,
        model: VERTEX_LIVE_MODEL,
        voice: DEFAULT_VOICE,
        location: VERTEX_LOCATION,
        toolsEnabled: VOICE_TOOLS_ENABLED,
        features: {
          affectiveDialog: VOICE_AFFECTIVE_DIALOG,
          proactiveAudio: VOICE_PROACTIVE_AUDIO,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  }

  // WebSocket upgrade
  const upgrade = req.headers.get('upgrade') || '';
  if (upgrade.toLowerCase() !== 'websocket') {
    return new Response(
      JSON.stringify({ error: 'This endpoint requires a WebSocket connection.' }),
      { status: 426, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { socket: clientWs, response } = Deno.upgradeWebSocket(req);

  const tag = `[voice-proxy:${crypto.randomUUID().slice(0, 8)}]`;
  let upstreamWs: WebSocket | null = null;
  let upstreamReady = false;
  const clientBuffer: string[] = []; // Buffer client messages until upstream is ready
  let keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  let initReceived = false;

  function log(event: string, data?: Record<string, unknown>) {
    console.log(`${tag} ${event}`, data ?? '');
  }

  function closeAll(code = 1000, reason = '') {
    if (keepaliveInterval) {
      clearInterval(keepaliveInterval);
      keepaliveInterval = null;
    }
    try {
      if (upstreamWs && upstreamWs.readyState <= WebSocket.OPEN) {
        upstreamWs.close(safeCloseCode(code), reason.slice(0, 123));
      }
    } catch {
      /* ignore */
    }
    try {
      if (clientWs.readyState <= WebSocket.OPEN) {
        clientWs.close(safeCloseCode(code), reason.slice(0, 123));
      }
    } catch {
      /* ignore */
    }
  }

  clientWs.onopen = () => {
    log('client_connected');
  };

  clientWs.onmessage = async (event: MessageEvent) => {
    try {
      const raw = typeof event.data === 'string' ? event.data : '';

      // First message from client is the init message with auth + config
      if (!initReceived) {
        initReceived = true;
        let initData: Record<string, unknown>;
        try {
          initData = JSON.parse(raw);
        } catch {
          clientWs.close(4400, 'Invalid init message');
          return;
        }

        log('init_received', {
          hasTripId: !!initData.tripId,
          hasAuthToken: !!initData.authToken,
          voice: initData.voice as string,
        });

        const authToken = typeof initData.authToken === 'string' ? initData.authToken : '';
        if (!authToken) {
          clientWs.send(
            JSON.stringify({ error: { code: 401, message: 'Authentication required' } }),
          );
          clientWs.close(4401, 'No auth token');
          return;
        }

        // Authenticate user
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${authToken}` } },
        });
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(authToken);
        if (authError || !user) {
          log('auth_failed', { error: authError?.message });
          clientWs.send(
            JSON.stringify({ error: { code: 401, message: 'Invalid authentication' } }),
          );
          clientWs.close(4401, 'Auth failed');
          return;
        }
        log('authenticated', { userId: user.id });

        // Validate config
        if (!VERTEX_PROJECT_ID || !VERTEX_SERVICE_ACCOUNT_KEY) {
          clientWs.send(
            JSON.stringify({ error: { code: 500, message: 'Vertex AI not configured' } }),
          );
          clientWs.close(4500, 'Not configured');
          return;
        }

        const requestedVoice = typeof initData.voice === 'string' ? initData.voice : DEFAULT_VOICE;
        const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE;
        const tripId = typeof initData.tripId === 'string' ? initData.tripId : undefined;
        const resumptionToken =
          typeof initData.resumptionToken === 'string' ? initData.resumptionToken : undefined;

        // Build system instruction
        let systemInstruction: string;
        if (tripId) {
          try {
            const contextTimeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('context_build_timeout')), 15_000),
            );
            const tripContext = await Promise.race([
              TripContextBuilder.buildContextWithCache(
                tripId,
                user.id,
                `Bearer ${authToken}`,
                true,
              ),
              contextTimeout,
            ]);
            systemInstruction = buildSystemPrompt(tripContext);
            log('context_built');
          } catch (contextError) {
            const errMsg =
              contextError instanceof Error ? contextError.message : String(contextError);
            log('context_failed', { error: errMsg });
            systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. Current date: ${new Date().toISOString().split('T')[0]}.`;
          }
        } else {
          systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. Current date: ${new Date().toISOString().split('T')[0]}.`;
        }
        systemInstruction += VOICE_ADDENDUM;

        // Mint OAuth2 token
        log('minting_token');
        const saKey = parseServiceAccountKey(VERTEX_SERVICE_ACCOUNT_KEY);
        const accessToken = await createVertexAccessToken(saKey);
        log('token_minted');

        // Build setup message
        const setupConfig: Record<string, unknown> = {
          model: `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_LIVE_MODEL}`,
          generation_config: {
            response_modalities: ['AUDIO'],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: { voice_name: voice },
              },
            },
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
          // Context window compression for long sessions (from gist)
          context_window_compression: { sliding_window: {} },
          // Session resumption — always enabled for architecture support
          session_resumption: resumptionToken ? { handle: resumptionToken } : {},
        };

        if (VOICE_TOOLS_ENABLED) {
          setupConfig.tools = [
            { function_declarations: VOICE_FUNCTION_DECLARATIONS },
            { google_search: {} },
          ];
        }

        if (VOICE_AFFECTIVE_DIALOG) {
          (setupConfig.generation_config as Record<string, unknown>).enable_affective_dialog = true;
        }
        if (VOICE_PROACTIVE_AUDIO) {
          setupConfig.proactivity = { proactive_audio: true };
        }

        const setupMessage = JSON.stringify({ setup: setupConfig });

        // Open upstream WebSocket to Vertex AI with Bearer token in header
        // Gist says: use v1beta1 for the endpoint
        const upstreamUrl = `wss://${VERTEX_LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

        log('upstream_connecting', { host: `${VERTEX_LOCATION}-aiplatform.googleapis.com` });

        // Deno's WebSocket constructor supports headers via the second arg (protocols)
        // but for Bearer auth, we need to pass it differently.
        // For Vertex AI, the access token goes as a query parameter on the upstream WS.
        // The gist says "Authorization: Bearer" header, but Deno WebSocket doesn't support
        // custom headers. Use URL param as fallback (same as SDK behavior).
        const upstreamUrlWithAuth = `${upstreamUrl}?access_token=${encodeURIComponent(accessToken)}`;
        upstreamWs = new WebSocket(upstreamUrlWithAuth);

        upstreamWs.onopen = () => {
          log('upstream_opened');
          // Send setup message as first message
          upstreamWs!.send(setupMessage);
          log('setup_sent');
          upstreamReady = true;

          // Flush any buffered client messages
          while (clientBuffer.length > 0) {
            const msg = clientBuffer.shift()!;
            upstreamWs!.send(msg);
          }

          // Start keepalive pings (30s per gist)
          keepaliveInterval = setInterval(() => {
            if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
              // Send empty realtime_input to keep connection alive
              upstreamWs.send(
                JSON.stringify({
                  realtime_input: {
                    media_chunks: [
                      {
                        mime_type: 'audio/pcm;rate=16000',
                        data: '', // Empty audio = silence keepalive
                      },
                    ],
                  },
                }),
              );
            }
          }, UPSTREAM_KEEPALIVE_MS);
        };

        upstreamWs.onmessage = (upstreamEvent: MessageEvent) => {
          // Relay upstream messages to client
          if (clientWs.readyState === WebSocket.OPEN) {
            const data = typeof upstreamEvent.data === 'string' ? upstreamEvent.data : '';
            clientWs.send(data);
          }
        };

        upstreamWs.onerror = (ev: Event) => {
          log('upstream_error', { type: (ev as ErrorEvent).message ?? 'unknown' });
        };

        upstreamWs.onclose = (ev: CloseEvent) => {
          log('upstream_closed', { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
          upstreamReady = false;
          // Relay close to client
          closeAll(safeCloseCode(ev.code), ev.reason || 'Upstream closed');
        };

        return;
      }

      // Subsequent messages: relay to upstream (or buffer if not ready)
      if (upstreamReady && upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
        upstreamWs.send(raw);
      } else {
        clientBuffer.push(raw);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Proxy error';
      log('handler_error', { error: errMsg });
      clientWs.send(JSON.stringify({ error: { code: 500, message: errMsg } }));
      closeAll(4500, errMsg);
    }
  };

  clientWs.onerror = (ev: Event) => {
    log('client_error', { type: (ev as ErrorEvent).message ?? 'unknown' });
  };

  clientWs.onclose = (ev: CloseEvent) => {
    log('client_closed', { code: ev.code, reason: ev.reason });
    closeAll(safeCloseCode(ev.code), ev.reason || 'Client closed');
  };

  return response;
});
