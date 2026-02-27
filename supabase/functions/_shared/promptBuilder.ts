/**
 * Builds the system prompt for the AI concierge.
 *
 * Performance-critical: every character adds to Gemini's time-to-first-token.
 * Uses array-push-then-join (O(n) vs O(n^2) for string concatenation) and
 * only includes sections that contain actual data.
 */
export function buildSystemPrompt(tripContext: any, customPrompt?: string): string {
  if (customPrompt) return customPrompt;

  const parts: string[] = [];

  // ─── CORE IDENTITY (compressed: merged scope, style, and capabilities) ───
  parts.push(`You are **Chravel Concierge**, an expert AI travel assistant with full trip context awareness.
Current date: ${new Date().toISOString().split('T')[0]}

RULES:
- Answer any question (trip-related or general). For trip questions, cite context data. For general questions, use broad knowledge.
- Be conversational and warm. Minimal emoji (0-1 per response; zero for enterprise trips).
- Start trip-info answers with a 1-sentence direct answer, then cite the source (Calendar|Poll|Payment|Places|Chat), then suggest a next action.
- Never invent facts. If not in trip context, say so. Never guess payment amounts, dates, or names.
- Apply saved user preferences automatically. Only override when the user explicitly asks.
- Priority order: Calendar > Places/Basecamps > Links > Chat mentions > Assumptions (labeled).

FORMATTING:
- Render as Markdown: **bold** key info, bullet lists, numbered lists for rankings, > blockquotes for tips.
- ALWAYS link place names: [Place Name](https://www.google.com/maps/search/Place+Name+City)
- For known websites use the real URL. Only include images (![alt](url)) when you have a confirmed working URL.
- Assume unqualified place names are in the trip destination.
- For "near me" queries: use personal basecamp coords if available, else trip destination.

TOOLS — use when user wants to DO something:
- addToCalendar, createTask, createPoll, savePlace, setBasecamp, addToAgenda, searchPlaces, getPaymentSummary, emitReservationDraft, getDirectionsETA, getTimezone, getPlaceDetails, searchImages, getStaticMapUrl, searchWeb, getDistanceMatrix, validateAddress, searchFlights
- For reservations: call emitReservationDraft (never claim you booked directly). If venue is clear, call immediately with reasonable defaults for missing fields.
- For payments: ALWAYS call getPaymentSummary for accurate data — don't rely on pre-fetched context alone.
- Only claim success when tool returns success:true. For setBasecamp, clarify "trip" vs "personal" if ambiguous.`);

  // ─── TRIP CONTEXT (only populated sections) ─────────────────────────────
  if (tripContext) {
    parts.push(`\n=== TRIP CONTEXT ===`);

    const tripMetadata = tripContext.tripMetadata || tripContext;
    const collaborators = tripContext.collaborators || tripContext.participants;
    const calendar = tripContext.calendar || tripContext.itinerary;
    const tasks = tripContext.tasks;
    const payments = tripContext.payments;
    const polls = tripContext.polls;
    const places = tripContext.places || { basecamp: tripContext.basecamp };
    const isEnterpriseTrip =
      collaborators?.length > 10 ||
      tripContext.participants?.length > 10 ||
      tripContext.category === 'enterprise';

    // Metadata (always included)
    const dest = tripMetadata.destination || tripMetadata.location || 'Not specified';
    let metaLine = `Destination: ${dest}`;
    if (tripMetadata.startDate && tripMetadata.endDate) {
      metaLine += ` | Dates: ${tripMetadata.startDate} to ${tripMetadata.endDate}`;
    } else if (typeof tripContext.dateRange === 'object') {
      metaLine += ` | Dates: ${tripContext.dateRange.start} to ${tripContext.dateRange.end}`;
    } else if (tripContext.dateRange) {
      metaLine += ` | Dates: ${tripContext.dateRange}`;
    }
    const memberCount = collaborators?.length || 0;
    metaLine += ` | ${memberCount} participants`;
    if (collaborators?.length) {
      metaLine += `: ${collaborators.map((p: any) => p.name || p).join(', ')}`;
    }
    if (isEnterpriseTrip) {
      metaLine += ` [ENTERPRISE — zero emojis, professional tone]`;
    }
    parts.push(metaLine);

    // Basecamps (compact)
    const bc = places?.tripBasecamp || places?.basecamp;
    if (bc) {
      let bcLine = `Trip Basecamp: ${bc.name} — ${bc.address}`;
      if (bc.lat && bc.lng) bcLine += ` (${bc.lat}, ${bc.lng})`;
      parts.push(bcLine);
    }
    const pbc = places?.personalBasecamp || places?.userAccommodation;
    if (pbc) {
      const pbcName = pbc.name || pbc.label;
      let pbcLine = `Personal Basecamp: ${pbcName} — ${pbc.address}`;
      if ((pbc.lat || pbc.latitude) && (pbc.lng || pbc.longitude)) {
        pbcLine += ` (${pbc.lat || pbc.latitude}, ${pbc.lng || pbc.longitude})`;
      }
      parts.push(pbcLine);
    }

    // User preferences (compact — single block, no redundant enforcement)
    if (tripContext.userPreferences) {
      const prefs = tripContext.userPreferences;
      const prefParts: string[] = [];
      if (prefs.dietary?.length) prefParts.push(`Diet: ${prefs.dietary.join(', ')}`);
      if (prefs.vibe?.length) prefParts.push(`Vibe: ${prefs.vibe.join(', ')}`);
      if (prefs.accessibility?.length)
        prefParts.push(`Accessibility: ${prefs.accessibility.join(', ')}`);
      if (prefs.budget) prefParts.push(`Budget: ${prefs.budget}`);
      if (prefs.entertainment?.length)
        prefParts.push(`Entertainment: ${prefs.entertainment.join(', ')}`);
      if (prefs.business?.length) prefParts.push(`Business: ${prefs.business.join(', ')}`);
      if (prefs.timePreference && prefs.timePreference !== 'flexible') {
        prefParts.push(
          `Time: ${prefs.timePreference === 'early-riser' ? 'morning person' : 'night owl'}`,
        );
      }
      if (prefs.travelStyle) prefParts.push(`Style: ${prefs.travelStyle}`);

      if (prefParts.length) {
        parts.push(
          `\nUSER PREFERENCES (apply to all recommendations, never ask user to repeat):\n${prefParts.join(' | ')}`,
        );
        parts.push(`When recommending, show: "Filtered for: ${prefParts.slice(0, 3).join(' | ')}"`);
      }
    }

    // Broadcasts (only non-empty)
    const broadcasts = tripContext.broadcasts;
    if (broadcasts?.length) {
      const bcLines = broadcasts.map((b: any) => {
        const icon = b.priority === 'urgent' ? '!!' : b.priority === 'high' ? '!' : '-';
        return `${icon} ${b.message} (${b.createdBy}, ${new Date(b.createdAt).toLocaleDateString()})`;
      });
      parts.push(`\nBROADCASTS:\n${bcLines.join('\n')}`);
    }

    // Calendar — deduplicated: use calendar OR upcomingEvents, not both
    const calendarItems = calendar?.length ? calendar : tripContext.upcomingEvents;
    if (calendarItems?.length) {
      const eventLines = calendarItems.slice(0, 8).map((e: any) => {
        const time = e.startTime || e.date || '';
        let line = `- ${e.title} on ${time}`;
        if (e.time) line += ` at ${e.time}`;
        if (e.location) line += ` @ ${e.location}`;
        if (e.address) line += ` (${e.address})`;
        return line;
      });
      parts.push(`\nCALENDAR:\n${eventLines.join('\n')}`);
    }

    // Payments — deduplicated: use payments OR receipts, not both
    const paymentItems = payments?.length ? payments : tripContext.receipts;
    if (paymentItems?.length) {
      const payLines = paymentItems.slice(0, 5).map((p: any) => {
        const payer = p.paidBy || p.participants?.join(', ') || 'Group';
        return `- ${p.description}: $${p.amount} (${payer})`;
      });
      if (tripContext.spendingPatterns?.totalSpent) {
        payLines.unshift(
          `Total: $${tripContext.spendingPatterns.totalSpent.toFixed(2)} | Avg/person: $${tripContext.spendingPatterns.avgPerPerson?.toFixed(2) || '0'}`,
        );
      }
      parts.push(`\nPAYMENTS:\n${payLines.join('\n')}`);
    }

    // Group preferences (legacy field — only if userPreferences wasn't set)
    if (!tripContext.userPreferences && tripContext.preferences) {
      const gp = tripContext.preferences;
      const gpParts: string[] = [];
      if (gp.dietary?.length) gpParts.push(`Diet: ${gp.dietary.join(', ')}`);
      if (gp.vibe?.length) gpParts.push(`Vibe: ${gp.vibe.join(', ')}`);
      if (gp.entertainment?.length) gpParts.push(`Entertainment: ${gp.entertainment.join(', ')}`);
      if (gp.budgetMin && gp.budgetMax) {
        const unit =
          gp.budgetUnit === 'day'
            ? '/day'
            : gp.budgetUnit === 'person'
              ? '/person'
              : gp.budgetUnit === 'trip'
                ? '/trip'
                : '/exp';
        gpParts.push(`Budget: $${gp.budgetMin}-$${gp.budgetMax}${unit}`);
      }
      if (gpParts.length) parts.push(`\nGROUP PREFS: ${gpParts.join(' | ')}`);
    }

    // Polls
    if (polls?.length) {
      const pollLines = polls.map((p: any) => {
        let line = `- "${p.question}"`;
        if (p.options?.length) {
          const opts = p.options.map((o: any) => `${o.text}(${o.votes || 0})`).join(', ');
          line += ` → ${opts}`;
        }
        if (p.results) line += ` Winner: ${p.results}`;
        return line;
      });
      parts.push(`\nPOLLS:\n${pollLines.join('\n')}`);
    }

    // Tasks
    if (tasks?.length) {
      const pending = tasks.filter((t: any) => !t.isComplete && t.status !== 'completed');
      const done = tasks.filter((t: any) => t.isComplete || t.status === 'completed');
      const taskLines = [`Done: ${done.length} | Pending: ${pending.length}`];
      pending.forEach((t: any) => {
        const assignee = t.assignee || t.assignedTo || 'Unassigned';
        taskLines.push(
          `- ${t.content || t.title} → ${assignee}${t.dueDate ? ` (due ${t.dueDate})` : ''}`,
        );
      });
      parts.push(`\nTASKS:\n${taskLines.join('\n')}`);
    }

    // Chat — deduplicated: single section with messages, skip separate sentiment
    const chatMessages = tripContext.messages || tripContext.chatHistory;
    if (chatMessages?.length) {
      const recent = chatMessages.slice(-10);
      const chatLines = recent.map((m: any) => {
        const author = m.authorName || m.sender || 'Unknown';
        const text = (m.content || '').substring(0, 80);
        return `- ${author}: ${text}${m.content?.length > 80 ? '…' : ''}`;
      });
      parts.push(`\nRECENT CHAT (${recent.length} msgs):\n${chatLines.join('\n')}`);
    }

    // Team roles & channels
    const teams = tripContext.teamsAndChannels;
    if (teams?.memberRoles?.length) {
      const roleLines = teams.memberRoles.map((m: any) => {
        let label = m.basicRole;
        if (m.enterpriseRole) label += `/${m.enterpriseRole}`;
        return `- ${m.memberName} (${label})`;
      });
      parts.push(`\nROLES:\n${roleLines.join('\n')}`);
    }
    if (teams?.channels?.length) {
      const chLines = teams.channels.map(
        (c: any) => `- #${c.name} (${c.type})${c.description ? ': ' + c.description : ''}`,
      );
      parts.push(`\nCHANNELS:\n${chLines.join('\n')}`);
    }

    // Visited places
    if (tripContext.visitedPlaces?.length) {
      parts.push(`\nALREADY VISITED: ${tripContext.visitedPlaces.join(', ')}`);
    }

    // Shared links
    if (tripContext.links?.length) {
      const linkLines = tripContext.links
        .slice(0, 8)
        .map((l: any) => `- ${l.title} (${l.category}): ${l.description || l.url}`);
      parts.push(`\nSHARED LINKS:\n${linkLines.join('\n')}`);
    }
  }

  return parts.join('\n');
}
