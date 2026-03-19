/**
 * Tool Registry — Single source of truth for all concierge tool declarations.
 *
 * Both the text concierge (lovable-concierge) and voice concierge
 * (gemini-voice-session) derive their tool lists from this registry,
 * eliminating drift between the two paths.
 *
 * Tools are conditionally loaded per query class to reduce token overhead.
 *
 * SAFETY NOTES:
 * - Tool parameter schemas are identical to the existing inline declarations
 *   in lovable-concierge/index.ts (lines 1303-2047) and voiceToolDeclarations.ts.
 *   No schema changes — this is a pure extraction/consolidation.
 * - QUERY_CLASS_TOOLS only controls which tools are AVAILABLE to the LLM for a
 *   given query class. All actual authorization happens in toolRouter.ts and
 *   functionExecutor.ts (unchanged). This is a token optimization, not a
 *   security boundary.
 * - Voice and text paths share the same tool declarations, just with different
 *   description verbosity. No auth or schema divergence.
 * - The 'trip_summary' class includes ALL tools as a conservative fallback.
 */

import type { QueryClass } from './queryClassifier.ts';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

// ── All 38 Tool Declarations (text-path, richest descriptions) ───────────────

export const ALL_TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: 'addToCalendar',
    description: 'Add an event to the trip calendar/itinerary',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        title: { type: 'string', description: 'Event title' },
        datetime: { type: 'string', description: 'ISO 8601 datetime string' },
        location: { type: 'string', description: 'Event location or address' },
        notes: { type: 'string', description: 'Additional notes or description' },
      },
      required: ['title', 'datetime', 'idempotency_key'],
    },
  },
  {
    name: 'createTask',
    description: 'Create a new task for the trip group',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: {
          type: 'string',
          description: 'Unique string to prevent duplicate tool execution',
        },
        title: { type: 'string', description: 'Task title/description' },
        notes: { type: 'string', description: 'Additional notes or details for the task' },
        assignee: { type: 'string', description: 'Name of the person to assign the task to' },
        dueDate: { type: 'string', description: 'Due date in ISO 8601 format' },
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
        question: { type: 'string', description: 'The poll question' },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of poll options (2-6 options)',
        },
        idempotency_key: {
          type: 'string',
          description: 'Unique string to prevent duplicate tool execution',
        },
      },
      required: ['question', 'options', 'idempotency_key'],
    },
  },
  {
    name: 'getPaymentSummary',
    description: 'Get a summary of who owes what in the trip',
    parameters: {
      type: 'object',
      properties: { idempotency_key: { type: 'string' } },
    },
  },
  {
    name: 'searchPlaces',
    description:
      'Search for places like restaurants, hotels, attractions near a location. Returns placeId for follow-up details.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        query: { type: 'string', description: 'Search query (e.g. "sushi restaurant")' },
        nearLat: { type: 'number', description: 'Latitude to search near' },
        nearLng: { type: 'number', description: 'Longitude to search near' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getDirectionsETA',
    description:
      'Get driving directions, ETA, and distance between two locations. Use for "how long to get there" or "directions from X to Y" questions.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        origin: { type: 'string', description: 'Starting address or place name' },
        destination: { type: 'string', description: 'Destination address or place name' },
        departureTime: {
          type: 'string',
          description: 'Optional ISO 8601 departure time for traffic-aware ETA',
        },
      },
      required: ['origin', 'destination'],
    },
  },
  {
    name: 'getTimezone',
    description:
      'Get the time zone for a geographic location. Use when user asks about time zones or to normalize itinerary times.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        lat: { type: 'number', description: 'Latitude of the location' },
        lng: { type: 'number', description: 'Longitude of the location' },
      },
      required: ['lat', 'lng'],
    },
  },
  {
    name: 'getPlaceDetails',
    description:
      'Get detailed info about a specific place: hours, phone, website, photos, editorial summary. Use after searchPlaces to show more details, or when user asks "tell me more about [place]" or "show me photos of [venue]".',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        placeId: {
          type: 'string',
          description: 'Google Places ID (from searchPlaces results)',
        },
      },
      required: ['placeId'],
    },
  },
  {
    name: 'searchImages',
    description:
      'Search for images on the web. Use when user asks to "show me pictures/photos of [something]" that is NOT a specific place/venue. For venue photos, use getPlaceDetails instead.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        query: { type: 'string', description: 'Image search query' },
        count: {
          type: 'number',
          description: 'Number of images to return (max 10, default 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getStaticMapUrl',
    description:
      'Generate a map image showing a location or route. Use when the user wants to see a map or after providing directions. Embed the returned imageUrl with Markdown: ![Map](imageUrl).',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        center: {
          type: 'string',
          description: 'Address or "lat,lng" to center the map on',
        },
        zoom: {
          type: 'number',
          description: 'Zoom level 1-20 (default 13; use 12 for city-level, 15 for walking)',
        },
        markers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Marker locations as addresses or "lat,lng" strings',
        },
      },
      required: ['center'],
    },
  },
  {
    name: 'searchWeb',
    description:
      'Search the web for real-time information: current business hours, prices, reviews, upcoming events, or live data unavailable in trip context. Include sources in your response.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        query: { type: 'string', description: 'Search query' },
        count: { type: 'number', description: 'Number of results (max 10, default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getDistanceMatrix',
    description:
      'Get travel times and distances from multiple origins to multiple destinations. Use for "how long from hotel to each restaurant?" or comparing route options.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        origins: {
          type: 'array',
          items: { type: 'string' },
          description: 'Starting addresses or place names',
        },
        destinations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Destination addresses or place names',
        },
        mode: {
          type: 'string',
          description: 'Travel mode: driving (default), walking, bicycling, or transit',
        },
      },
      required: ['origins', 'destinations'],
    },
  },
  {
    name: 'validateAddress',
    description:
      'Validate and clean up an address, and get its exact coordinates. Use when a user mentions an address and you want to confirm it is correct and get lat/lng for map operations.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        address: { type: 'string', description: 'Address to validate and geocode' },
      },
      required: ['address'],
    },
  },
  {
    name: 'savePlace',
    description:
      'Save a place, link, or recommendation to the trip Explore/Places section. Use when user says "save this place", "add this to our trip", "bookmark this restaurant", or when recommending a great option the user wants to keep. For "save this flight" requests, set url to the flight deeplink and category to "activity".',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the place or link' },
        url: {
          type: 'string',
          description: 'URL for the place (website, Google Maps link, etc.)',
        },
        description: {
          type: 'string',
          description: 'Brief description of why this place is recommended',
        },
        category: {
          type: 'string',
          description:
            'Category: attraction, accommodation, activity, appetite (food/drink), or other',
        },
        idempotency_key: {
          type: 'string',
          description: 'Unique string to prevent duplicate tool execution',
        },
      },
      required: ['name', 'idempotency_key'],
    },
  },
  {
    name: 'setBasecamp',
    description:
      'Set the trip basecamp (group hotel/accommodation) or personal basecamp (user\'s own accommodation). Use when user says "make this my hotel", "set our basecamp to...", "this is where I\'m staying", or "make this the trip basecamp".',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        scope: {
          type: 'string',
          description:
            '"trip" for group basecamp (shared accommodation) or "personal" for user\'s own accommodation',
        },
        name: { type: 'string', description: 'Name of the hotel/accommodation' },
        address: { type: 'string', description: 'Full address of the accommodation' },
        lat: { type: 'number', description: 'Latitude coordinate' },
        lng: { type: 'number', description: 'Longitude coordinate' },
      },
      required: ['scope', 'name'],
    },
  },
  {
    name: 'addToAgenda',
    description:
      'Add a session or item to an event agenda. Use when user says "add this to the agenda", "schedule a session", or "put this on the event schedule". Requires an eventId (the parent event).',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        eventId: {
          type: 'string',
          description: 'ID of the parent event to add the agenda item to',
        },
        title: { type: 'string', description: 'Title of the agenda session' },
        description: { type: 'string', description: 'Session description or notes' },
        sessionDate: { type: 'string', description: 'Date of the session (YYYY-MM-DD)' },
        startTime: { type: 'string', description: 'Start time (HH:MM)' },
        endTime: { type: 'string', description: 'End time (HH:MM)' },
        location: { type: 'string', description: 'Room, venue, or location within the event' },
        speakers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Speaker or performer names',
        },
      },
      required: ['eventId', 'title'],
    },
  },
  {
    name: 'searchFlights',
    description:
      'Search for flights and get a deeplink to Google Flights. Use when user asks for flight options, prices, or availability.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        origin: { type: 'string', description: 'Origin airport code (e.g. SFO) or city name' },
        destination: {
          type: 'string',
          description: 'Destination airport code (e.g. LHR) or city name',
        },
        departureDate: { type: 'string', description: 'Departure date (YYYY-MM-DD)' },
        returnDate: { type: 'string', description: 'Return date (YYYY-MM-DD), optional' },
        passengers: { type: 'number', description: 'Number of passengers (default 1)' },
      },
      required: ['origin', 'destination', 'departureDate'],
    },
  },
  {
    name: 'emitSmartImportPreview',
    description:
      'Extract calendar events from attached images/screenshots/PDFs (hotel reservations, boarding passes, flight confirmations, itineraries) and show a preview card for the user to confirm before adding to calendar. Call this when user attaches a travel document and says "add to calendar", "import this", "save this to the trip", or similar. YOU must analyze the attached image and extract the event details yourself, then pass them as the events array.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              idempotency_key: { type: 'string' },
              title: {
                type: 'string',
                description:
                  'Event title (e.g. "Flight AA1234 LAX→JFK", "Hilton Garden Inn Check-in")',
              },
              datetime: {
                type: 'string',
                description: 'Start date/time in ISO 8601 format',
              },
              endDatetime: {
                type: 'string',
                description: 'End date/time in ISO 8601 (checkout date, arrival time, etc.)',
              },
              location: {
                type: 'string',
                description: 'Location name or address',
              },
              category: {
                type: 'string',
                description:
                  'Event category: dining, lodging, activity, transportation, entertainment, or other',
              },
              notes: {
                type: 'string',
                description:
                  'Confirmation number, booking reference, seat number, or other details',
              },
            },
            required: ['title', 'datetime', 'idempotency_key'],
          },
          description:
            'Array of calendar events extracted from the attached document. Extract ALL events visible.',
        },
      },
      required: ['events'],
    },
  },
  {
    name: 'emitReservationDraft',
    description:
      'Create a reservation draft card for the user to confirm. Use ONLY when the user explicitly asks to book/reserve/make a reservation at a restaurant, venue, or experience. Do NOT auto-book. The draft will be shown as a card the user can confirm. Internally searches for the place and enriches with phone, website, and address.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        placeQuery: {
          type: 'string',
          description: 'Name of the restaurant or venue to reserve (e.g. "Bestia Los Angeles")',
        },
        startTimeISO: {
          type: 'string',
          description:
            'Requested reservation date/time in ISO 8601 format (e.g. "2026-03-07T19:00:00-08:00")',
        },
        partySize: { type: 'number', description: 'Number of guests (default 2)' },
        reservationName: {
          type: 'string',
          description: 'Name the reservation should be under',
        },
        notes: {
          type: 'string',
          description: 'Special requests or notes (e.g. "outdoor seating", "birthday dinner")',
        },
      },
      required: ['placeQuery'],
    },
  },
  {
    name: 'updateCalendarEvent',
    description:
      'Update an existing trip calendar event. Use when user says "change dinner to 8pm", "move the meeting to Friday", "update the location of [event]". Requires the eventId from trip context or a previous search.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        eventId: {
          type: 'string',
          description: 'ID of the event to update (from trip context)',
        },
        title: { type: 'string', description: 'New event title' },
        datetime: { type: 'string', description: 'New start date/time in ISO 8601' },
        endDatetime: { type: 'string', description: 'New end date/time in ISO 8601' },
        location: { type: 'string', description: 'New location or address' },
        notes: { type: 'string', description: 'New description or notes' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'deleteCalendarEvent',
    description:
      'Delete an event from the trip calendar. Use when user says "remove dinner from calendar", "cancel the meeting", "delete that event". Requires the eventId.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        eventId: {
          type: 'string',
          description: 'ID of the event to delete (from trip context)',
        },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'updateTask',
    description:
      'Update an existing trip task. Use for "mark task as done", "change the due date", "rename the task". Requires taskId.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        taskId: { type: 'string', description: 'ID of the task to update (from trip context)' },
        title: { type: 'string', description: 'New task title' },
        description: { type: 'string', description: 'Updated description/notes' },
        dueDate: { type: 'string', description: 'New due date in ISO 8601' },
        completed: { type: 'boolean', description: 'Set to true to mark task as complete' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'deleteTask',
    description:
      'Delete a task from the trip. Use when user says "remove that task", "delete the packing task". Requires taskId.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        taskId: { type: 'string', description: 'ID of the task to delete (from trip context)' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'searchTripData',
    description:
      'Search across all trip data — calendar events, tasks, polls, places/links, and payments. Use for "find anything about dinner", "search for museum", or when the user wants to find something in the trip but you don\'t know which section it\'s in.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
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
    name: 'searchTripArtifacts',
    description:
      'Search uploaded trip artifacts — screenshots, PDFs, images, documents, receipts, tickets, itineraries, and other files. Use when user asks "find the boarding pass", "show me the hotel confirmation", "where is the PDF with the schedule?", "find the receipt", or any question about uploaded files and documents.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        query: {
          type: 'string',
          description: 'Semantic search query describing what artifact to find',
        },
        artifact_types: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Filter by artifact type: flight, hotel, restaurant_reservation, event_ticket, itinerary, schedule, place_recommendation, payment_proof, roster, credential, generic_document, generic_image',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'detectCalendarConflicts',
    description:
      'Check if a proposed time slot conflicts with existing calendar events. Use before adding an event when the time might overlap, or when user asks "am I free at 7pm?" or "do we have anything at that time?".',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        datetime: { type: 'string', description: 'Proposed start time in ISO 8601' },
        endDatetime: {
          type: 'string',
          description: 'Proposed end time in ISO 8601 (defaults to +1 hour)',
        },
      },
      required: ['datetime'],
    },
  },
  {
    name: 'createBroadcast',
    description:
      'Send a broadcast announcement to all trip members. Use when user says "announce to the group", "broadcast that...", "send everyone a message about...", "let everyone know". For urgent announcements, set priority to "urgent".',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        message: { type: 'string', description: 'The broadcast message to send' },
        priority: {
          type: 'string',
          description: '"normal" (default) or "urgent" for time-sensitive announcements',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'createNotification',
    description:
      'Send an in-app notification to specific trip members or all members. Use for reminders, alerts, or targeted messages.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        title: { type: 'string', description: 'Notification title (short)' },
        message: { type: 'string', description: 'Notification body message' },
        targetUserIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific user IDs to notify. If omitted, notifies all trip members.',
        },
        type: { type: 'string', description: 'Notification type (default: concierge)' },
      },
      required: ['title', 'message'],
    },
  },
  {
    name: 'getWeatherForecast',
    description:
      'Get weather forecast for a location. Use when user asks "what\'s the weather like?", "will it rain?", "should I pack a jacket?", "temperature in [city]".',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        location: { type: 'string', description: 'City or location name' },
        date: {
          type: 'string',
          description: 'Date for forecast (e.g. "tomorrow", "March 15")',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'convertCurrency',
    description:
      'Convert between currencies with live exchange rates. Use for "how much is 100 USD in EUR?", "convert to local currency", or when discussing costs in international trips.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        amount: { type: 'number', description: 'Amount to convert' },
        from: { type: 'string', description: 'Source currency code (e.g. USD, EUR, GBP)' },
        to: { type: 'string', description: 'Target currency code (e.g. JPY, MXN, COP)' },
      },
      required: ['amount', 'from', 'to'],
    },
  },
  {
    name: 'generateTripImage',
    description:
      'Generate a custom AI image based on the trip context. Use when user says "create a trip image", "generate a cover photo", "make a header image for the trip", "design a trip banner". Creates a beautiful travel-themed image that can be set as the trip header.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        prompt: {
          type: 'string',
          description:
            'Description of the desired image (e.g. "sunset over Santorini with blue domes", "vibrant street market in Bangkok")',
        },
        style: {
          type: 'string',
          description:
            'Image style: photo (realistic), illustration, watercolor, minimal, or vibrant. Default: photo',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'setTripHeaderImage',
    description:
      'Set a generated or uploaded image as the trip header/cover photo. Use after generateTripImage or when user provides an image URL to use as the trip banner.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        imageUrl: { type: 'string', description: 'URL of the image to set as trip header' },
      },
      required: ['imageUrl'],
    },
  },
  {
    name: 'browseWebsite',
    description:
      "Browse a website and extract travel-relevant information. Use when the user shares a URL and wants you to analyze it, or when you need to check a restaurant's menu, hours, availability, or booking options. Acts as a travel agent reading the page.",
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        url: {
          type: 'string',
          description: 'Full URL to browse (must be a public HTTPS URL)',
        },
        instruction: {
          type: 'string',
          description:
            'What to look for on the page (e.g. "find the reservation link", "extract the menu and prices", "check availability for Saturday")',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'makeReservation',
    description:
      'Act as a travel agent to research and prepare a reservation. Searches for the venue, browses their website for booking info, finds reservation links (OpenTable, Resy, etc.), and adds to calendar. More thorough than emitReservationDraft — use when user wants you to actually find how to book.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        venue: { type: 'string', description: 'Name of the restaurant, hotel, or venue' },
        datetime: { type: 'string', description: 'Desired date/time in ISO 8601' },
        partySize: { type: 'number', description: 'Number of guests (default 2)' },
        name: { type: 'string', description: 'Name for the reservation' },
        phone: { type: 'string', description: 'Contact phone number' },
        specialRequests: {
          type: 'string',
          description: 'Special requests (allergies, seating preference, etc.)',
        },
        bookingUrl: { type: 'string', description: 'Direct booking URL if known' },
      },
      required: ['venue'],
    },
  },
  {
    name: 'settleExpense',
    description:
      'Mark a payment split as settled/paid. Use when user says "I paid John back", "mark that expense as settled", "settle the dinner split".',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        splitId: { type: 'string', description: 'ID of the payment split to settle' },
        amount: { type: 'number', description: 'Amount settled (for partial settlements)' },
        method: {
          type: 'string',
          description: 'Payment method used (Venmo, Zelle, cash, etc.)',
        },
      },
      required: ['splitId'],
    },
  },
  {
    name: 'getDeepLink',
    description:
      'Generate a deep link to a specific trip item (event, task, poll, link, payment). Use when sharing a specific item or directing user to it in the app.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        entityType: {
          type: 'string',
          description: 'Type of item: event, task, poll, link, payment, or broadcast',
        },
        entityId: { type: 'string', description: 'ID of the specific item' },
      },
      required: ['entityType', 'entityId'],
    },
  },
  {
    name: 'explainPermission',
    description:
      'Explain why an action was or would be blocked. Use when user asks "why can\'t I...?", "who can edit this?", or after a permission error.',
    parameters: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string' },
        action: {
          type: 'string',
          description:
            'The action to check permissions for (e.g. addToCalendar, setBasecamp, setTripHeaderImage)',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'verify_artifact',
    description:
      'Verify that a previously-created artifact exists in the database using its ID or idempotency_key.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'task, event, place, link, poll' },
        id: { type: 'string', description: 'The returned ID of the artifact if known' },
        idempotency_key: {
          type: 'string',
          description: 'The idempotency key used when creating the artifact',
        },
      },
      required: ['type'],
    },
  },
];

// ── Universal tools (always included regardless of query class) ──────────────

const UNIVERSAL_TOOL_NAMES = new Set(['verify_artifact', 'explainPermission', 'convertCurrency']);

// ── Query Class → Tool Name Mapping ──────────────────────────────────────────
// NOTE: This mapping only controls which tools the LLM sees in its prompt.
// All actual authorization/permission checks happen in toolRouter.ts and
// functionExecutor.ts (unchanged by this refactor).

const QUERY_CLASS_TOOLS: Record<QueryClass, string[] | 'all'> = {
  general_knowledge: [],
  weather_time: ['searchWeb', 'getWeatherForecast'],
  restaurant_recommendation: [
    'searchPlaces',
    'getPlaceDetails',
    'savePlace',
    'emitReservationDraft',
    'searchWeb',
    'getStaticMapUrl',
  ],
  calendar_action: [
    'addToCalendar',
    'updateCalendarEvent',
    'deleteCalendarEvent',
    'detectCalendarConflicts',
  ],
  task_action: ['createTask', 'updateTask', 'deleteTask'],
  payment_query: ['getPaymentSummary', 'settleExpense'],
  trip_search: ['searchTripData', 'searchTripArtifacts', 'getDeepLink'],
  place_navigation: [
    'getDirectionsETA',
    'getDistanceMatrix',
    'getStaticMapUrl',
    'getTimezone',
    'validateAddress',
  ],
  booking_reservation: [
    'emitReservationDraft',
    'makeReservation',
    'searchPlaces',
    'getPlaceDetails',
    'browseWebsite',
    'addToCalendar',
  ],
  broadcast_notification: ['createBroadcast', 'createNotification'],
  trip_summary: 'all',
  poll_action: ['createPoll'],
  media_search: ['searchImages', 'searchWeb'],
  flight_search: ['searchFlights', 'savePlace', 'searchWeb'],
  trip_image: ['generateTripImage', 'setTripHeaderImage'],
  smart_import: ['emitSmartImportPreview', 'addToCalendar', 'setBasecamp'],
  basecamp_action: ['setBasecamp', 'searchPlaces', 'getPlaceDetails', 'validateAddress'],
  agenda_action: ['addToAgenda', 'addToCalendar'],
};

/**
 * Get the tool declarations for a specific query class.
 * Returns only the tools relevant to the class + universal tools.
 * For 'trip_summary', returns all tools (conservative fallback).
 */
export function getToolsForQueryClass(queryClass: QueryClass): ToolDeclaration[] {
  const mapping = QUERY_CLASS_TOOLS[queryClass];

  // 'all' means return everything (trip_summary or any future catch-all)
  if (mapping === 'all') {
    return ALL_TOOL_DECLARATIONS;
  }

  // No tools for this class (e.g., general_knowledge uses googleSearch only)
  if (mapping.length === 0) {
    // Still include universal tools for safety
    return ALL_TOOL_DECLARATIONS.filter(t => UNIVERSAL_TOOL_NAMES.has(t.name));
  }

  // Build the set of needed tool names (class-specific + universal)
  const neededNames = new Set([...mapping, ...UNIVERSAL_TOOL_NAMES]);
  return ALL_TOOL_DECLARATIONS.filter(t => neededNames.has(t.name));
}

// ── Voice Tool Declarations ──────────────────────────────────────────────────

/**
 * Voice-friendly tool declarations with shorter descriptions.
 * Both text and voice paths have all 38 tools; voice just uses briefer descriptions.
 */
const VOICE_DESCRIPTION_OVERRIDES: Record<string, string> = {
  addToCalendar: 'Add an event to the trip calendar',
  createTask: 'Create a task for the trip group',
  createPoll: 'Create a poll for the group to vote on',
  getPaymentSummary: 'Get a summary of who owes money to whom in the trip',
  searchPlaces: 'Search for nearby places like restaurants, hotels, or attractions',
  getDirectionsETA: 'Get driving directions, travel time, and distance between two locations.',
  getTimezone: 'Get the time zone for a geographic location.',
  getPlaceDetails: 'Get detailed info about a specific place.',
  searchImages: 'Search for images on the web.',
  getStaticMapUrl: 'Generate a map image showing a location or route.',
  searchWeb: 'Search the web for real-time information.',
  getDistanceMatrix:
    'Get travel times and distances from multiple origins to multiple destinations.',
  validateAddress: 'Validate and clean up an address.',
  savePlace: 'Save a place or link to the trip Places/Explore section.',
  setBasecamp: 'Set the trip or personal basecamp accommodation.',
  addToAgenda: 'Add an item/session to an event agenda.',
  searchFlights: 'Search flights and return Google Flights deeplinks.',
  emitSmartImportPreview:
    'Emit Smart Import preview events extracted from attached docs before calendar write.',
  emitReservationDraft: 'Create a reservation draft card for explicit booking intents.',
  updateCalendarEvent: 'Update an existing trip calendar event.',
  deleteCalendarEvent: 'Delete an event from the trip calendar.',
  updateTask: 'Update an existing trip task.',
  deleteTask: 'Delete a task from the trip.',
  searchTripData: 'Search across all trip data.',
  searchTripArtifacts:
    'Search uploaded trip documents, screenshots, PDFs, receipts, and tickets. SILENT EXECUTION.',
  detectCalendarConflicts: 'Check if a time slot conflicts with existing events.',
  createBroadcast: 'Send a broadcast to all trip members.',
  createNotification: 'Send in-app notifications to selected users or all trip members.',
  getWeatherForecast: 'Get weather forecast.',
  convertCurrency: 'Convert between currencies with live rates.',
  generateTripImage: 'Generate a custom AI image for the trip.',
  setTripHeaderImage: 'Set the trip header/cover image URL.',
  browseWebsite: 'Browse a website to extract travel info.',
  makeReservation: 'Research and prepare a reservation.',
  settleExpense: 'Mark a payment split as settled.',
  getDeepLink: 'Generate an in-app deep link for a specific trip entity.',
  explainPermission: 'Explain whether an action is allowed and why.',
  verify_artifact: 'Verify created artifact existence by ID or idempotency key.',
};

/**
 * Get all tool declarations with voice-friendly (shorter) descriptions.
 * Used by gemini-voice-session via voiceToolDeclarations.ts.
 */
export function getToolsForVoice(): ToolDeclaration[] {
  return ALL_TOOL_DECLARATIONS.map(tool => {
    const voiceDesc = VOICE_DESCRIPTION_OVERRIDES[tool.name];
    if (voiceDesc) {
      return { ...tool, description: voiceDesc };
    }
    return tool;
  });
}
