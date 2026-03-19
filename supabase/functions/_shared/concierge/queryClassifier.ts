/**
 * Query Classifier for AI Concierge
 *
 * Classifies incoming user queries into one of 18 query classes that determine:
 * - Which tools to load (via toolRegistry)
 * - Which context slices to fetch (via contextBuilder)
 * - Which prompt layers to assemble (via promptAssembler)
 *
 * Conservative fallback: ambiguous trip-related queries default to 'trip_summary'
 * (all tools + all context) to avoid false negatives.
 */

export type QueryClass =
  | 'general_knowledge'
  | 'weather_time'
  | 'restaurant_recommendation'
  | 'calendar_action'
  | 'task_action'
  | 'payment_query'
  | 'trip_search'
  | 'place_navigation'
  | 'booking_reservation'
  | 'broadcast_notification'
  | 'trip_summary'
  | 'poll_action'
  | 'media_search'
  | 'flight_search'
  | 'trip_image'
  | 'smart_import'
  | 'basecamp_action'
  | 'agenda_action';

// ── Regex patterns (moved from lovable-concierge/index.ts) ──────────────────

export const TRIP_SCOPED_QUERY_PATTERN =
  /\b(trip|itinerary|schedule|calendar|event|dinner|lunch|breakfast|reservation|basecamp|hotel|flight|task|todo|payment|owe|expense|poll|vote|chat|message|broadcast|address|meeting|check[- ]?in|check[- ]?out|plan|agenda|logistics|team|member|members|channel|channels|role|roles|who's on|who is on|group|organizer|admin)\b/i;

export const ARTIFACT_QUERY_PATTERN =
  /\b(upload|uploaded|document|documents|doc|docs|pdf|file|files|attachment|attachments|link|links|receipt|receipts|invoice|invoices|image|images|photo|photos|media|transcript|note|notes|summary|summarize|summarise)\b/i;

export const CLEARLY_GENERAL_QUERY_PATTERN =
  /\b(nba|nfl|mlb|nhl|mls|nascar|premier league|la liga|serie a|bundesliga|ligue 1|champions league|fifa|super bowl|world cup|oscars|grammys|emmys|golden globes|box office|stock market|s&p|nasdaq|dow jones|bitcoin|ethereum|crypto price|exchange rate|leetcode|algorithm interview|capital of|define |what is photosynthesis|solve for x|who invented|when was .+ born|history of|population of|how to cook|recipe for|calories in|translate)\b/i;

// ── Per-class patterns (most specific first) ─────────────────────────────────

const SMART_IMPORT_PATTERN = /\b(import|save|add)\b.*\b(to calendar|to trip|this|these)\b/i;

const CALENDAR_ACTION_PATTERN =
  /\b(add to calendar|schedule|move the event|change .+ to \d|delete event|cancel the meeting|reschedule|update the event|remove .+ from calendar|create event|add event)\b/i;

const TASK_ACTION_PATTERN =
  /\b(create task|remind me|remind us|to-?do|mark as done|delete task|assign|make sure we|don't let me forget|we should remember|need to remember)\b/i;

const PAYMENT_QUERY_PATTERN =
  /\b(who owes|split|settle|payment summary|how much do I owe|expense|pay back|paid|venmo|zelle|money)\b/i;

const POLL_ACTION_PATTERN = /\b(create poll|vote on|start a vote|make a poll|group vote|survey)\b/i;

const BROADCAST_NOTIFICATION_PATTERN =
  /\b(announce|broadcast|notify everyone|send notification|let everyone know|send .+ to (the |all )?group|message everyone)\b/i;

const FLIGHT_SEARCH_PATTERN =
  /\b(flight|flights from|fly to|airline|airport)\b|[A-Z]{3}\s*(to|→|->)\s*[A-Z]{3}/i;

const BOOKING_RESERVATION_PATTERN =
  /\b(book|reserve|reservation|make a booking|get a table|book a table|reserve a spot)\b/i;

const RESTAURANT_RECOMMENDATION_PATTERN =
  /\b(restaurant|where to eat|best food|dinner spot|lunch spot|breakfast spot|brunch|food near|eat near|cuisine|sushi|pizza|tacos|ramen|bar near|cafe near|coffee shop)\b/i;

const PLACE_NAVIGATION_PATTERN =
  /\b(directions|how far|how long to get|distance|navigate|route|drive to|walk to|transit to|take me to|get there|eta|travel time)\b/i;

const BASECAMP_ACTION_PATTERN =
  /\b(set basecamp|our hotel is|staying at|set accommodation|make this .+ hotel|this is where .+ staying|set .+ basecamp|change .+ hotel)\b/i;

const AGENDA_ACTION_PATTERN =
  /\b(add to agenda|agenda item|session schedule|add session|schedule a session|put .+ on .+ agenda)\b/i;

const TRIP_IMAGE_PATTERN =
  /\b(generate image|create cover|trip header|banner|cover photo|trip image|generate .+ photo|create .+ image|make .+ banner)\b/i;

const MEDIA_SEARCH_PATTERN =
  /\b(show me pictures|photos of|images of|show me images|show me photos|find pictures|find photos)\b/i;

const WEATHER_TIME_PATTERN =
  /\b(weather|forecast|temperature|timezone|what time is it in|will it rain|should I pack|pack a jacket|how hot|how cold|degrees|humidity|sunrise|sunset)\b/i;

const TRIP_SEARCH_PATTERN =
  /\b(find|search|where is the|look up|find anything about|search for)\b/i;

const TRIP_SUMMARY_PATTERN =
  /\b(summarize trip|what's the plan|overview|tell me about our trip|trip summary|what do we have planned|what are we doing|trip overview)\b/i;

// Trip-ownership phrasing — implies trip context is needed
const TRIP_OWNERSHIP_PATTERN = /\b(our|my|we're|who's going|who is going|our trip|my trip)\b/i;

/**
 * Classify a user query into one of 18 query classes.
 *
 * Classification priority (most specific → most general):
 * 1. Attachments with import intent → smart_import
 * 2. Specific action patterns (calendar, task, payment, poll, broadcast, etc.)
 * 3. Domain-specific patterns (flight, booking, restaurant, navigation, etc.)
 * 4. Clearly general knowledge → general_knowledge
 * 5. Trip-scoped or ownership patterns → trip_summary (conservative fallback)
 * 6. Ambiguous → general_knowledge
 */
export function classifyQuery(message: string, hasAttachments: boolean): QueryClass {
  const q = message.trim();
  if (q.length < 4) return 'trip_summary'; // Very short: default to full context

  const normalized = q.toLowerCase();

  // 1. Attachments with import/save intent
  if (hasAttachments && SMART_IMPORT_PATTERN.test(normalized)) {
    return 'smart_import';
  }

  // 2. Specific action patterns (highest priority — user wants to DO something)
  if (CALENDAR_ACTION_PATTERN.test(normalized)) return 'calendar_action';
  if (TASK_ACTION_PATTERN.test(normalized)) return 'task_action';
  if (PAYMENT_QUERY_PATTERN.test(normalized)) return 'payment_query';
  if (POLL_ACTION_PATTERN.test(normalized)) return 'poll_action';
  if (BROADCAST_NOTIFICATION_PATTERN.test(normalized)) return 'broadcast_notification';
  if (BASECAMP_ACTION_PATTERN.test(normalized)) return 'basecamp_action';
  if (AGENDA_ACTION_PATTERN.test(normalized)) return 'agenda_action';
  if (TRIP_IMAGE_PATTERN.test(normalized)) return 'trip_image';

  // 3. Domain-specific patterns
  if (BOOKING_RESERVATION_PATTERN.test(normalized)) return 'booking_reservation';
  if (FLIGHT_SEARCH_PATTERN.test(q)) return 'flight_search'; // Use original case for airport codes
  if (PLACE_NAVIGATION_PATTERN.test(normalized)) return 'place_navigation';
  if (MEDIA_SEARCH_PATTERN.test(normalized)) return 'media_search';
  if (TRIP_SUMMARY_PATTERN.test(normalized)) return 'trip_summary';

  // Restaurant recommendation — check AFTER booking to avoid "book a restaurant" being classified here
  if (RESTAURANT_RECOMMENDATION_PATTERN.test(normalized)) return 'restaurant_recommendation';

  // 4. Clearly general knowledge (sports, crypto, trivia, etc.) → skip all trip context
  if (CLEARLY_GENERAL_QUERY_PATTERN.test(normalized)) return 'general_knowledge';

  // 5. Weather/time — can be trip-related or general, but needs minimal context
  if (WEATHER_TIME_PATTERN.test(normalized)) return 'weather_time';

  // 6. Trip search — generic "find X" with trip-scoped terms
  if (TRIP_SEARCH_PATTERN.test(normalized) && TRIP_SCOPED_QUERY_PATTERN.test(normalized)) {
    return 'trip_search';
  }

  // 7. Trip-scoped or artifact terms → conservative fallback to full context
  if (TRIP_SCOPED_QUERY_PATTERN.test(normalized)) return 'trip_summary';
  if (ARTIFACT_QUERY_PATTERN.test(normalized)) return 'trip_summary';
  if (TRIP_OWNERSHIP_PATTERN.test(normalized)) return 'trip_summary';

  // 8. General web-only patterns without trip terms → general knowledge
  const generalWebPattern =
    /\b(tour dates|upcoming concert|festival|score|scores|news|stock|price)\b/i;
  if (generalWebPattern.test(normalized)) return 'general_knowledge';

  // 9. Default: ambiguous queries → general_knowledge (lean and fast)
  return 'general_knowledge';
}

/**
 * Returns true if the query class requires trip context.
 * Only 'general_knowledge' skips trip context entirely.
 */
export function isTripRelatedClass(qc: QueryClass): boolean {
  return qc !== 'general_knowledge';
}
