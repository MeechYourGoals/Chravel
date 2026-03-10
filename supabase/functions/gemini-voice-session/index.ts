import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { TripContextBuilder } from '../_shared/contextBuilder.ts';
import { buildSystemPrompt } from '../_shared/promptBuilder.ts';
import {
  createVertexAccessToken,
  parseServiceAccountKey,
  type ServiceAccountKey,
} from '../_shared/vertexAuth.ts';

// ── Vertex AI configuration (production-only provider) ──
const VERTEX_PROJECT_ID = Deno.env.get('VERTEX_PROJECT_ID');
const VERTEX_LOCATION = Deno.env.get('VERTEX_LOCATION') || 'us-central1';
const VERTEX_SERVICE_ACCOUNT_KEY = Deno.env.get('VERTEX_SERVICE_ACCOUNT_KEY');

// GA model for Vertex AI Live API — gemini-live-2.5-flash-native-audio
// The old preview model (gemini-live-2.5-flash-preview-native-audio-09-2025) is deprecated.
const VERTEX_LIVE_MODEL = 'gemini-live-2.5-flash-native-audio';

// All features ON by default — supported on GA native-audio model
const VOICE_TOOLS_ENABLED =
  (Deno.env.get('VOICE_TOOLS_ENABLED') || 'true').toLowerCase() === 'true';

// Native-audio features — supported on gemini-live-2.5-flash-native-audio
const VOICE_AFFECTIVE_DIALOG =
  (Deno.env.get('VOICE_AFFECTIVE_DIALOG') || 'true').toLowerCase() === 'true';
const VOICE_PROACTIVE_AUDIO =
  (Deno.env.get('VOICE_PROACTIVE_AUDIO') || 'true').toLowerCase() === 'true';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ALLOWED_VOICES = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']);
const DEFAULT_VOICE = 'Charon';

/**
 * Function declarations for Gemini Live tool use.
 * Uses lowercase OpenAPI-style types (object, string, number, boolean, array)
 * per Vertex AI Live API function declaration schema.
 */
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

// Auth utilities imported from ../shared/vertexAuth.ts

// ── Main handler ──

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const isVertexConfigured = !!(VERTEX_PROJECT_ID && VERTEX_SERVICE_ACCOUNT_KEY);

  // Health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        service: 'gemini-voice-session',
        provider: 'vertex',
        configured: isVertexConfigured,
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

  try {
    const requestId = crypto.randomUUID().slice(0, 8);
    const t0 = Date.now();
    const tag = `[gemini-voice-session:${requestId}]`;

    let bodyRaw: Record<string, unknown> = {};
    try {
      bodyRaw = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionAttemptId =
      typeof bodyRaw?.sessionAttemptId === 'string' ? bodyRaw.sessionAttemptId : 'unknown';
    console.log(`${tag} handler_enter`, {
      sessionAttemptId,
      provider: 'vertex',
      model: VERTEX_LIVE_MODEL,
      toolsEnabled: VOICE_TOOLS_ENABLED,
      origin: req.headers.get('origin'),
      t0,
    });

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      console.warn(`${tag} Auth failed`, { sessionAttemptId, error: authError?.message });
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`${tag} Authenticated`, {
      userId: user.id,
      sessionAttemptId,
      elapsedMs: Date.now() - t0,
    });

    const requestedVoice = typeof bodyRaw?.voice === 'string' ? bodyRaw.voice : DEFAULT_VOICE;
    const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE;
    const tripId = typeof bodyRaw?.tripId === 'string' ? bodyRaw.tripId : undefined;
    const resumptionToken =
      typeof bodyRaw?.resumptionToken === 'string' ? bodyRaw.resumptionToken : undefined;

    // Build system instruction
    let systemInstruction: string;
    if (tripId) {
      try {
        const contextTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('context_build_timeout')), 15_000),
        );
        const tripContext = await Promise.race([
          TripContextBuilder.buildContextWithCache(tripId, user.id, authHeader, true),
          contextTimeout,
        ]);
        systemInstruction = buildSystemPrompt(tripContext);
        console.log(`${tag} Context built`, { elapsedMs: Date.now() - t0 });
      } catch (contextError) {
        const errMsg = contextError instanceof Error ? contextError.message : String(contextError);
        console.warn(`${tag} Context failed: ${errMsg}. Using minimal prompt.`);
        systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. Current date: ${new Date().toISOString().split('T')[0]}.`;
      }
    } else {
      systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. Current date: ${new Date().toISOString().split('T')[0]}.`;
    }
    systemInstruction += VOICE_ADDENDUM;

    // ── VERTEX AI (production-only path) ──
    if (!VERTEX_PROJECT_ID || !VERTEX_SERVICE_ACCOUNT_KEY) {
      throw new Error(
        'Vertex AI not configured. Set VERTEX_PROJECT_ID, VERTEX_LOCATION, and VERTEX_SERVICE_ACCOUNT_KEY in Supabase Edge Function secrets.',
      );
    }

    console.log(`${tag} Creating Vertex OAuth2 token`, {
      projectId: VERTEX_PROJECT_ID,
      location: VERTEX_LOCATION,
      model: VERTEX_LIVE_MODEL,
      voice,
      elapsedMs: Date.now() - t0,
    });

    const saKey = parseServiceAccountKey(VERTEX_SERVICE_ACCOUNT_KEY);
    const tokenT0 = Date.now();
    const accessToken = await createVertexAccessToken(saKey);

    console.log(`${tag} Vertex token created`, {
      tokenMs: Date.now() - tokenT0,
      totalMs: Date.now() - t0,
    });

    // Use v1beta1 for Live API (matches proxy and gist)
    const websocketUrl = `wss://${VERTEX_LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

    // Build setup message — camelCase matching confirmed-working gist
    // Phase A: Mode 0 boring handshake — no tools, no affective, no proactive
    const setupConfig: Record<string, unknown> = {
      model: `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_LIVE_MODEL}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      realtimeInputConfig: {
        activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      contextWindowCompression: { slidingWindow: {} },
    };

    // Session resumption
    if (resumptionToken) {
      setupConfig.sessionResumption = { handle: resumptionToken };
      console.log(`${tag} Including session resumption token`);
    } else {
      setupConfig.sessionResumption = {};
    }

    // Mode 2+: tools (OFF by default in Phase A)
    if (VOICE_TOOLS_ENABLED) {
      setupConfig.tools = [{ functionDeclarations: VOICE_FUNCTION_DECLARATIONS }];
    }

    // Mode 4+: affective dialog (OFF by default in Phase A)
    if (VOICE_AFFECTIVE_DIALOG) {
      (setupConfig.generationConfig as Record<string, unknown>).enableAffectiveDialog = true;
    }
    // Mode 5+: proactive audio (OFF by default in Phase A)
    if (VOICE_PROACTIVE_AUDIO) {
      setupConfig.proactivity = { proactiveAudio: true };
    }

    const setupMessage = { setup: setupConfig };

    console.log(`${tag} Setup message built`, {
      hasTools: VOICE_TOOLS_ENABLED,
      toolCount: VOICE_TOOLS_ENABLED ? VOICE_FUNCTION_DECLARATIONS.length : 0,
      affectiveDialog: VOICE_AFFECTIVE_DIALOG,
      proactiveAudio: VOICE_PROACTIVE_AUDIO,
      totalMs: Date.now() - t0,
    });

    return new Response(
      JSON.stringify({
        accessToken,
        model: VERTEX_LIVE_MODEL,
        voice,
        provider: 'vertex',
        websocketUrl,
        setupMessage,
        toolsEnabled: VOICE_TOOLS_ENABLED,
        features: {
          affectiveDialog: VOICE_AFFECTIVE_DIALOG,
          proactiveAudio: VOICE_PROACTIVE_AUDIO,
        },
        _rid: requestId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('gemini-voice-session error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
