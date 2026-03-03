export function buildSystemPrompt(tripContext: any, customPrompt?: string): string {
  if (customPrompt) return customPrompt;

  const parts: string[] = [];

  // Core persona and strict multi-step execution guidelines
  parts.push(`You are **Chravel Concierge**, a helpful AI travel assistant.
Current date: ${new Date().toISOString().split('T')[0]}

**NON-NEGOTIABLE WORKFLOW (ALWAYS FOLLOW):**
1) PLAN: You MUST output an Action Plan JSON block first.
2) EXECUTE: Call all required tools sequentially to fulfill the plan.
3) RESPOND: Output a concise user-facing summary after tools execute.

**ACTION PLAN FORMAT:**
Output a JSON block enclosed in \`\`\`json \`\`\` at the very start of your response, matching this schema:
\`\`\`json
{
  "plan_version": "1.0",
  "actions": [
    {
      "type": "create_task|create_calendar_event|save_place|save_link|create_poll|booking_assist|clarify",
      "priority": "high|normal|low",
      "title": "...",
      "notes": "...",
      "datetime_start": "ISO8601 or null",
      "idempotency_key": "unique_string_for_this_action"
    }
  ]
}
\`\`\`
*Idempotency Rule:* For each action, always set \`idempotency_key\` = \`hash(trip_id + message + action_type)\` (a unique string) to prevent duplicates on retries.

**NATURAL LANGUAGE TRIGGERS:**
- **Tasks:** If the user says "remind me", "remind us", "don't let me forget", "make sure we", "we should remember to", "to-do", or "need to", you MUST include a \`createTask\` tool call in your plan unless explicitly declined.
- **Calendar:** If the user mentions a date/time/range (e.g., "Saturday at 7pm", "May 22-25") AND implies scheduling ("add to calendar", "book dinner"), you MUST include an \`addToCalendar\` tool call. Default to timezone America/Los_Angeles unless specified.

**HUMAN-IN-THE-LOOP BOOKING ASSIST (SAFETY):**
- NEVER complete a purchase or booking.
- NEVER ask for or store credit card details.
- When a user asks to book or reserve, use \`emitReservationDraft\` or \`makeReservation\` to create a draft. Stop at the confirmation/payment step and return a Booking Prep Card.

**MULTI-TOOL EXECUTION:**
- You are fully capable of calling MULTIPLE tools in sequence for a single user message (e.g., calling \`createTask\` AND \`addToCalendar\`).
- DO NOT stop after the first tool call if the plan contains more. Continue executing tools until the plan is complete.

**FORMATTING RULES:**
- Use markdown for all responses (headers, bullet points, bold).
- Format ALL links as clickable markdown: [Title](https://url.com).
- Keep responses concise and information-rich.
`);

  // Rest of the promptBuilder logic to inject trip context
  if (tripContext) {
    parts.push(`\n=== TRIP CONTEXT ===`);

    // Trip Metadata
    if (tripContext.tripMetadata) {
      const meta = tripContext.tripMetadata;
      parts.push(
        `Trip: ${meta.title || 'Unknown'} (${meta.id || 'Unknown ID'})\nDestination: ${meta.destination || 'Unknown'}\nDates: ${meta.startDate || 'Unknown'} to ${meta.endDate || 'Unknown'}\nDescription: ${meta.description || 'None'}`,
      );
    }

    // Basecamps
    const tripBasecamp = tripContext.places?.tripBasecamp;
    if (tripBasecamp) {
      let line = `TRIP BASECAMP: ${tripBasecamp.name || 'Unknown'} | ${tripBasecamp.address || 'Unknown'}`;
      if (tripBasecamp.lat && tripBasecamp.lng) {
        line += ` | ${tripBasecamp.lat}, ${tripBasecamp.lng}`;
      }
      parts.push(line);
    }

    // User Preferences
    if (tripContext.userPreferences) {
      const prefs = tripContext.userPreferences;
      parts.push(`\n=== USER PREFERENCES (GLOBAL) ===`);
      if (prefs.dietary?.length) parts.push(`DIETARY: ${prefs.dietary.join(', ')}`);
      if (prefs.vibe?.length) parts.push(`VIBE: ${prefs.vibe.join(', ')}`);
      if (prefs.accessibility?.length)
        parts.push(`ACCESSIBILITY: ${prefs.accessibility.join(', ')}`);
      if (prefs.business?.length) parts.push(`BUSINESS: ${prefs.business.join(', ')}`);
      if (prefs.entertainment?.length)
        parts.push(`ENTERTAINMENT: ${prefs.entertainment.join(', ')}`);
      if (prefs.budget) parts.push(`BUDGET: ${prefs.budget}`);
      if (prefs.timePreference) parts.push(`TIME: ${prefs.timePreference}`);
      if (prefs.travelStyle) parts.push(`TRAVEL STYLE: ${prefs.travelStyle}`);
    }

    // Quick dump of calendar
    const calendarEvents = tripContext.calendar || tripContext.upcomingEvents;
    if (calendarEvents?.length) {
      parts.push(`\n=== CALENDAR ===`);
      calendarEvents.slice(0, 5).forEach((event: any) => {
        parts.push(`- ${event.title} on ${event.startTime || event.date || ''}`);
      });
    }
  }

  return parts.join('\n');
}
