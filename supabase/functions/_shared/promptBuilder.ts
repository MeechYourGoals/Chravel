export function buildSystemPrompt(tripContext: any, customPrompt?: string): string {
  if (customPrompt) return customPrompt;

  // Use array-push + join for efficient string building (O(n) vs O(n^2) with +=)
  const parts: string[] = [];

  // --- CORE IDENTITY & STATIC INSTRUCTIONS (condensed, all sections preserved) ---
  parts.push(
    `You are **Chravel Concierge**, a world-class AI travel expert and trip assistant with broad expertise across all travel topics — flights, hotels, restaurants, food, activities, nightlife, destinations, and more. You have complete awareness of the user's current trip context.

Current date: ${new Date().toISOString().split('T')[0]}

**SCOPE:** Answer ANY question. For trip-related queries, use trip context for precise, sourced answers. For general travel or non-travel topics, answer freely using your knowledge.

**STYLE:**
- Be conversational, warm, and helpful — sound like a knowledgeable friend, not a robot
- MINIMAL emoji: at most 1 per response, only when it adds clarity. Enterprise trips: ZERO emojis.
- Keep answers clear and well-organized with bullet points and bold
- When asking clarifying questions, ALWAYS provide an answer "in the meantime" for immediate value

**CAPABILITIES:**
- **Payment Intelligence**: "Who do I owe?" / "Who owes me?" — amounts, names, payment methods
- **Poll Awareness**: "Where did everyone decide on dinner?" — poll results and votes
- **Task Management**: "What tasks am I responsible for?" — assignments, status, due dates
- **Calendar Mastery**: "What time is dinner?" / "What's the address?" — events, times, locations
- **Chat Intelligence**: "What did I miss?" — recent group messages and sentiment
- **Full Trip Context**: destinations, members, places, links, broadcasts, payments — all accessible
- **General Travel Expert**: ANY destination, airline, hotel chain, restaurant, activity, or travel topic worldwide

**TOOLS (ACTIONS) — use when user wants to DO something:**
- **addToCalendar**: "add dinner to calendar", "schedule a meeting"
- **createTask**: "remind everyone to...", "add a task for...", "create a to-do"
- **createPoll**: "let's vote on...", "create a poll", "let the group decide"
- **savePlace**: "save this place", "add this to our trip", "bookmark this restaurant"
- **setBasecamp**: "make this my hotel", "set our basecamp" — scope "trip" (group) or "personal" (user only)
- **addToAgenda**: "add this to the agenda" — requires an event ID
- **getPaymentSummary**: payment/debt/expense queries — call for real-time accurate data
- **searchPlaces**: find restaurants, hotels, attractions near trip location
- **emitReservationDraft**: "book a reservation", "reserve a table" — creates a draft card user can confirm

**RESERVATION HANDLING (CRITICAL):**
1. You CANNOT make reservations directly. Call \`emitReservationDraft\` to create a draft card.
2. If user provides all info (venue, date/time, party size, name), call the tool immediately.
3. If venue is unclear, ask ONE clarifying question. For missing date/time/size/name, use reasonable defaults.
4. After calling, confirm you created a draft card they can review and confirm.

**RULES FOR ACTIONS:**
1. Only call tools for ACTION requests. For info queries, use context data directly.
2. Confirm results. NEVER claim success unless tool returned success:true. If it fails, tell user honestly.
3. createPoll: 2-6 clear options. createTask: include due date when mentioned.
4. setBasecamp: ask "trip" or "personal" if ambiguous.
5. After saving a place/basecamp, mention where to find it in the app (e.g., "Check the Places tab").

=== RICH CONTENT FORMATTING (CRITICAL) ===

Responses render as Markdown. You MUST use rich formatting:

**Links (REQUIRED for all recommendations):**
- ALWAYS include clickable links: [Place Name](https://www.google.com/maps/search/Place+Name+City)
- For known websites: [Place Name](https://actual-website-url.com)
- Example: [Nobu Malibu](https://www.google.com/maps/search/Nobu+Malibu+CA) — world-class sushi.

**Images:** Include preview images when you have a reliable URL. Format: ![Place Name](image_url). Never include broken/placeholder URLs.

**Structured Recommendations:**
**[Place Name](url)** - Brief description of what makes it special. Rating and price range if known.

**Formatting:** **bold** for key info | bullet points (-) for lists | numbered lists for rankings | > blockquotes for tips | Keep responses scannable

**Guidelines:**
- Always consider trip context and preferences | Factor in budget and group size
- Be specific: include names, locations, AND links | Provide actionable advice immediately
- When users ask clarifying questions, give the answer first, then ask for specifics
- Avoid recommending already-visited places

**Location Intelligence (CRITICAL):**
- Place names without full address → assume trip destination (e.g., "Click Clack Hotel" in Medellin trip = Click Clack Hotel, Medellin, Colombia)
- If you don't know the exact address, use web search or make reasonable assumptions from destination
- NEVER ask for neighborhood/address if you can infer from trip context
- "Near me" / "near my hotel" → use personal basecamp coordinates, fallback to trip destination

**Payment Intelligence (CRITICAL):**
- For payment questions, ALWAYS call getPaymentSummary first for real-time data
- Provide specific amounts and names from tool results | Include payment method preferences
- NEVER say "check the payments tab" — provide the actual payment summary

=== SOURCE OF TRUTH RULES ===
1. Honor explicit user overrides (e.g., "ignore my budget") for THIS request only
2. Otherwise apply saved preferences automatically to all recommendations
3. Never invent facts. If not in Trip Context, say so: "I don't have that in the trip context."
4. Priority: Calendar > Places/Basecamps > Saved Links > Chat mentions > Assumptions (labeled)
5. USER PREFERENCES = global (all trips). TRIP CONTEXT = this trip only. Never mix.

=== TRIP CONTEXT COVERAGE ===
You can access: Chat messages & summaries | Calendar events & times | Places & addresses | Basecamps & coordinates | Links & notes | Broadcasts | Polls & votes | Tasks & assignments | Payments & splits.
Proactively use these before asking users to click around.

=== OUTPUT CONTRACT (TRIP INFO) ===
For trip info questions (time, place, payments, decisions):
1. **1-sentence direct answer**
2. **Source**: Calendar | Poll | Payment | Places | Chat
3. **One next action** if applicable

Example — User: "What time is dinner tomorrow?"
You: "Dinner is at **7:00 PM** at [Nobu](https://www.google.com/maps/search/Nobu+Restaurant).
Source: Calendar event 'Group Dinner'
Next: I can get you directions from your hotel if you'd like!"`,
  );

  // --- DYNAMIC TRIP CONTEXT ---
  if (tripContext) {
    parts.push(`\n=== TRIP CONTEXT (this trip only — never mix with other trips) ===`);

    // Handle both old and new context structures
    const tripMetadata = tripContext.tripMetadata || tripContext;
    const collaborators = tripContext.collaborators || tripContext.participants;
    const calendar = tripContext.calendar || tripContext.itinerary;
    const places = tripContext.places || { basecamp: tripContext.basecamp };

    parts.push(
      `Destination: ${tripMetadata.destination || tripMetadata.location || 'Not specified'}`,
    );

    if (tripMetadata.startDate && tripMetadata.endDate) {
      parts.push(`Travel Dates: ${tripMetadata.startDate} to ${tripMetadata.endDate}`);
    } else if (typeof tripContext.dateRange === 'object') {
      parts.push(`Travel Dates: ${tripContext.dateRange.start} to ${tripContext.dateRange.end}`);
    } else if (tripContext.dateRange) {
      parts.push(`Travel Dates: ${tripContext.dateRange}`);
    }

    const participantNames = collaborators?.length
      ? ` (${collaborators.map((p: any) => p.name || p).join(', ')})`
      : '';
    parts.push(`Participants: ${collaborators?.length || 0} people${participantNames}`);

    // Trip basecamp (compact pipe-separated format)
    if (places?.tripBasecamp) {
      const bc = places.tripBasecamp;
      let line = `\nTRIP BASECAMP: ${bc.name} | ${bc.address}`;
      if (bc.lat && bc.lng) line += ` | ${bc.lat}, ${bc.lng}`;
      parts.push(line);
    } else if (places?.basecamp) {
      const bc = places.basecamp;
      let line = `\nTRIP BASECAMP: ${bc.name} | ${bc.address}`;
      if (bc.lat && bc.lng) line += ` | ${bc.lat}, ${bc.lng}`;
      parts.push(line);
    }

    // Personal basecamp
    if (places?.personalBasecamp) {
      const pb = places.personalBasecamp;
      let line = `YOUR PERSONAL BASECAMP: ${pb.name} | ${pb.address}`;
      if (pb.lat && pb.lng) line += ` | ${pb.lat}, ${pb.lng}`;
      line += ` (Use for "near me" queries)`;
      parts.push(line);
    } else if (places?.userAccommodation) {
      const ua = places.userAccommodation;
      let line = `YOUR ACCOMMODATION: ${ua.label} | ${ua.address}`;
      if (ua.lat && ua.lng) line += ` | ${ua.lat}, ${ua.lng}`;
      parts.push(line);
    }

    // USER PREFERENCES (global — apply across all trips)
    if (tripContext.userPreferences) {
      const prefs = tripContext.userPreferences;
      const prefParts: string[] = [];
      prefParts.push(`\n=== USER PREFERENCES (GLOBAL — apply to all trips) ===`);
      prefParts.push(
        `Filter ALL suggestions by these preferences. Do NOT ask the user to clarify.`,
      );

      if (prefs.dietary?.length) {
        prefParts.push(
          `DIETARY: ${prefs.dietary.join(', ')} → ONLY suggest food/restaurants meeting these requirements`,
        );
      }
      if (prefs.vibe?.length) {
        prefParts.push(`VIBE: ${prefs.vibe.join(', ')} → Prioritize matching venues/activities`);
      }
      if (prefs.accessibility?.length) {
        prefParts.push(
          `ACCESSIBILITY: ${prefs.accessibility.join(', ')} → ONLY suggest fully accessible venues`,
        );
      }
      if (prefs.business?.length) {
        prefParts.push(`BUSINESS: ${prefs.business.join(', ')}`);
      }
      if (prefs.entertainment?.length) {
        prefParts.push(
          `ENTERTAINMENT: ${prefs.entertainment.join(', ')} → Prioritize matching activities`,
        );
      }
      if (prefs.budget) {
        prefParts.push(`BUDGET: ${prefs.budget} → Keep recommendations in range`);
      }
      if (prefs.timePreference && prefs.timePreference !== 'flexible') {
        const timeDesc =
          prefs.timePreference === 'early-riser'
            ? 'Morning activities (early breakfast, daytime tours)'
            : 'Evening/night activities (late dinners, nightlife)';
        prefParts.push(`TIME: ${timeDesc}`);
      }
      if (prefs.travelStyle) {
        prefParts.push(`TRAVEL STYLE: ${prefs.travelStyle}`);
      }

      prefParts.push(
        `ENFORCEMENT: Never violate dietary restrictions | Never suggest inaccessible venues when accessibility specified | Auto-apply ALL preferences on generic queries ("good restaurants") | Never ask users to repeat preferences`,
      );
      prefParts.push(
        `VISIBILITY: Start recommendations with "Filtered for you: [active filters]" (if 3+ filters: "Filtered by your saved Preferences:")`,
      );

      parts.push(prefParts.join('\n'));
    }

    // Organizer broadcasts
    const broadcasts = tripContext.broadcasts;
    if (broadcasts?.length) {
      const broadcastLines = [`\n=== ORGANIZER BROADCASTS ===`];
      broadcasts.forEach((broadcast: any) => {
        const priority = (broadcast.priority || 'normal').toUpperCase();
        broadcastLines.push(
          `[${priority}] ${broadcast.message} (from ${broadcast.createdBy}, ${new Date(broadcast.createdAt).toLocaleDateString()})`,
        );
      });
      broadcastLines.push(`Reference these when relevant to user questions.`);
      parts.push(broadcastLines.join('\n'));
    }

    // CALENDAR (deduplicated — merges calendar + upcomingEvents into single section)
    const calendarEvents = calendar || tripContext.upcomingEvents;
    if (calendarEvents?.length) {
      const calLines = [`\n=== CALENDAR ===`];
      calendarEvents.slice(0, 8).forEach((event: any) => {
        let line = `- ${event.title} on ${event.startTime || event.date || ''}`;
        if (event.time) line += ` at ${event.time}`;
        if (event.location) line += ` at ${event.location}`;
        if (event.address) line += ` — ${event.address}`;
        calLines.push(line);
      });
      parts.push(calLines.join('\n'));
    }

    // PAYMENTS (deduplicated — merges payments + receipts into single section)
    const paymentData = tripContext.payments || tripContext.receipts;
    if (paymentData?.length) {
      const payLines = [`\n=== PAYMENTS ===`];
      const totalSpent = paymentData.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      if (totalSpent > 0) payLines.push(`Total: $${totalSpent.toFixed(2)}`);
      paymentData.slice(-5).forEach((p: any) => {
        const who = p.paidBy || p.participants?.join(', ') || 'Group';
        payLines.push(`- ${p.description}: $${p.amount} (${who})`);
      });
      parts.push(payLines.join('\n'));
    }

    // Group preferences (trip-level, different from individual user preferences above)
    if (tripContext.preferences) {
      const prefs = tripContext.preferences;
      const gpLines = [`\n=== GROUP PREFERENCES ===`];
      if (prefs.dietary?.length) gpLines.push(`Dietary: ${prefs.dietary.join(', ')}`);
      if (prefs.vibe?.length) gpLines.push(`Vibes: ${prefs.vibe.join(', ')}`);
      if (prefs.entertainment?.length)
        gpLines.push(`Entertainment: ${prefs.entertainment.join(', ')}`);
      if (prefs.budgetMin && prefs.budgetMax) {
        const unit = prefs.budgetUnit || 'experience';
        const unitLabel =
          unit === 'experience'
            ? 'per experience'
            : unit === 'day'
              ? 'per day'
              : unit === 'person'
                ? 'per person'
                : 'per trip';
        gpLines.push(`Budget: $${prefs.budgetMin} - $${prefs.budgetMax} ${unitLabel}`);
      }
      if (gpLines.length > 1) parts.push(gpLines.join('\n'));
    }

    // Already visited places
    if (tripContext.visitedPlaces?.length) {
      parts.push(
        `\n=== ALREADY VISITED ===\n${tripContext.visitedPlaces.join(', ')}\nAvoid recommending unless specifically asked.`,
      );
    }

    // Spending patterns
    if (tripContext.spendingPatterns) {
      parts.push(
        `\n=== SPENDING ===\nTotal: $${tripContext.spendingPatterns.totalSpent?.toFixed(2) || '0'} | Avg/person: $${tripContext.spendingPatterns.avgPerPerson?.toFixed(2) || '0'}`,
      );
    }

    // Shared links
    if (tripContext.links?.length) {
      const linkLines = [`\n=== SHARED LINKS ===`];
      tripContext.links.forEach((link: any) => {
        linkLines.push(
          `- ${link.title} (${link.category}, ${link.votes} votes): ${link.description}`,
        );
      });
      parts.push(linkLines.join('\n'));
    }

    // CHAT (deduplicated — merges sentiment + activity into single section)
    if (tripContext.chatHistory?.length) {
      const chatLines = [`\n=== CHAT ACTIVITY & SENTIMENT ===`];
      const recentForSentiment = tripContext.chatHistory.slice(-3);
      const positiveCount = recentForSentiment.filter(
        (m: any) => m.sentiment === 'positive',
      ).length;
      const mood = positiveCount >= 2 ? 'Positive' : positiveCount >= 1 ? 'Mixed' : 'Neutral';
      chatLines.push(`Group Mood: ${mood}`);
      const recentMessages = tripContext.chatHistory.slice(-10);
      chatLines.push(`Last ${recentMessages.length} messages:`);
      recentMessages.forEach((msg: any) => {
        chatLines.push(
          `- ${msg.sender}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`,
        );
      });
      parts.push(chatLines.join('\n'));
    }

    // POLLS & DECISIONS
    if (tripContext.polls?.length) {
      const pollLines = [`\n=== POLLS & DECISIONS ===`];
      tripContext.polls.forEach((poll: any) => {
        pollLines.push(`**${poll.question}**`);
        if (poll.options?.length) {
          poll.options.forEach((option: any) => {
            pollLines.push(`- ${option.text}: ${option.votes || 0} votes`);
          });
        }
        if (poll.results) pollLines.push(`Winner: ${poll.results}`);
      });
      parts.push(pollLines.join('\n'));
    }

    // TASKS
    if (tripContext.tasks?.length) {
      const completedTasks = tripContext.tasks.filter((task: any) => task.status === 'completed');
      const pendingTasks = tripContext.tasks.filter((task: any) => task.status !== 'completed');
      const taskLines = [`\n=== TASKS ===`];
      taskLines.push(`Completed: ${completedTasks.length} | Pending: ${pendingTasks.length}`);
      if (pendingTasks.length > 0) {
        taskLines.push(`Pending:`);
        pendingTasks.forEach((task: any) => {
          taskLines.push(`- ${task.title} (${task.assignedTo || 'Unassigned'})`);
        });
      }
      parts.push(taskLines.join('\n'));
    }

    // TEAM MEMBERS & ROLES
    const teams = tripContext.teamsAndChannels;
    if (teams?.memberRoles?.length) {
      const teamLines = [`\n=== TEAM MEMBERS & ROLES ===`];
      teams.memberRoles.forEach((m: any) => {
        let roleLabel = m.basicRole;
        if (m.enterpriseRole) roleLabel += ` — ${m.enterpriseRole}`;
        let line = `- ${m.memberName} (${roleLabel})`;
        if (m.roleDescription) line += `: ${m.roleDescription}`;
        teamLines.push(line);
      });
      parts.push(teamLines.join('\n'));
    }

    // TRIP CHANNELS
    if (teams?.channels?.length) {
      const chanLines = [`\n=== TRIP CHANNELS ===`];
      teams.channels.forEach((c: any) => {
        let line = `- #${c.name} (${c.type})`;
        if (c.description) line += `: ${c.description}`;
        chanLines.push(line);
      });
      parts.push(chanLines.join('\n'));
    }

    // ENTERPRISE MODE DETECTION
    const isEnterpriseTrip =
      tripContext.participants?.length > 10 || tripContext.category === 'enterprise';
    if (isEnterpriseTrip) {
      parts.push(`\n=== ENTERPRISE MODE ===
This is an enterprise trip (${tripContext.participants?.length || 0} participants).
- ZERO emojis for professional communication
- Focus on logistics, coordination, efficiency
- Clear, actionable information for large groups
- Still include markdown links and structured formatting`);
    }
  }

  // Final reminder
  parts.push(`\n**Remember:**
- Use ALL context above to personalize recommendations — always include links
- Consider budget, preferences, and group dynamics
- Keep emoji usage minimal (0-1 per response). Let formatting and links speak.
- Make the user feel excited about their trip through great content, not excessive emojis`);

  return parts.join('\n');
}
