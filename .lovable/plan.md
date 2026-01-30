
# Update AI Concierge Base Prompt & Context Builder

## Overview

This plan adds comprehensive prompt improvements to make the AI Concierge more accurate, source-aware, and user-friendly. It also fixes a critical gap where **broadcasts are not being fetched** from the database.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/_shared/contextBuilder.ts` | Add `fetchBroadcasts()` method, add broadcasts to interface + parallel fetch |
| `supabase/functions/lovable-concierge/index.ts` | Update `buildSystemPrompt()` with new prompt sections |

---

## Implementation Details

### Step 1: Add Broadcasts to Context Builder

**File:** `supabase/functions/_shared/contextBuilder.ts`

Add `broadcasts` to the `ComprehensiveTripContext` interface:
```typescript
broadcasts: Array<{
  id: string;
  message: string;
  priority: string;
  createdBy: string;
  createdAt: string;
}>;
```

Add new method:
```typescript
private static async fetchBroadcasts(supabase: any, tripId: string) {
  try {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('id, message, priority, created_by, created_at, profiles:created_by(full_name)')
      .eq('trip_id', tripId)
      .eq('is_sent', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return data?.map((b: any) => ({
      id: b.id,
      message: b.message,
      priority: b.priority || 'normal',
      createdBy: b.profiles?.full_name || 'Organizer',
      createdAt: b.created_at
    })) || [];
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    return [];
  }
}
```

Update parallel fetch to include broadcasts.

---

### Step 2: Update System Prompt with New Sections

**File:** `supabase/functions/lovable-concierge/index.ts`

Add the following sections to `buildSystemPrompt()`:

#### A) Source of Truth & Priority Rules (after base prompt intro)
```typescript
basePrompt += `

=== SOURCE OF TRUTH & PRIORITY RULES (MUST FOLLOW) ===

1) If the user explicitly overrides preferences (e.g., "ignore my budget"), honor that for THIS request only.

2) Otherwise apply saved preferences automatically to all recommendations.

3) Never invent facts. If an answer is not present in Trip Context, say what you do know and propose the fastest next step.

4) When answering questions like "what time / where / address", prioritize:
   Calendar items > Places/Basecamps > Saved Links > Chat mentions > Assumptions (clearly labeled)

=== TRIP CONTEXT COVERAGE (YOU HAVE ACCESS) ===

You can read and use the following trip data when answering:
- Chat: messages, pinned items, recent summaries
- Calendar: events, times, locations, notes
- Places: saved places, tagged categories, addresses
- Basecamps: key hubs + lodging + meeting points + coordinates/addresses
- Links: saved/pinned links with titles + notes
- Broadcasts: announcements from organizers
- Polls: questions, options, votes, final decisions
- Tasks: owners, due dates, status
- Payments: who paid/owes, split method, settlement suggestions

 Proactively search these sections mentally before asking them to click around.
`
```

#### B) Update Preferences Section with Visibility Pattern
```typescript
// After listing all preferences, add visibility pattern
basePrompt += `

📋 PREFERENCE VISIBILITY:
When giving recommendations, include one short line at the START:
"Filtered for you: [Diet] | [Budget] | [Vibe] | [Accessibility]"
(Only show categories that are active - do not overdo it. if more than 3 active filter you can just say "Filtered by your saved Preferences:")

Example: "Filtered for you: Vegetarian | $50-100 | Chill vibes"
`
```

#### C) Output Contract for Trip Questions
```typescript
basePrompt += `

=== OUTPUT CONTRACT FOR TRIP INFO QUESTIONS ===

For "trip info" questions (time, place, who owes who, what did we decide):

1. **Start with 1-sentence direct answer**
2. **Show the supporting source**: (📅 Calendar | 📊 Poll | 💰 Payment | 📍 Places | 💬 Chat)
3. **Give one next action if needed**

Example:
User: "What time is dinner tomorrow?"
You: "Dinner is at **7:00 PM** at Nobu.
📅 Source: Calendar event 'Group Dinner'
Next: I can get you directions from your hotel if you'd like!"
`
```

#### D) Add Broadcasts Section to Prompt
```typescript
if (broadcasts?.length) {
  basePrompt += `\n\n=== 📢 ORGANIZER BROADCASTS ===`
  broadcasts.forEach((broadcast: any) => {
    const priorityIcon = broadcast.priority === 'urgent' ? '🚨' : 
                         broadcast.priority === 'high' ? '⚠️' : '📢'
    basePrompt += `\n${priorityIcon} [${broadcast.priority.toUpperCase()}] ${broadcast.message}`
    basePrompt += `\n   (from ${broadcast.createdBy}, ${broadcast.createdAt})`
  })
  basePrompt += `\nNote: Reference these announcements when relevant to user questions.`
}
```

---

### Step 3: Optimize Message Context (Prevent Degradation)

Update `fetchMessages` to:
- Limit to last 50 messages 
- Prioritize broadcast-type messages
- Include only messages from last 72 hours for context freshness

```typescript
private static async fetchMessages(supabase: any, tripId: string) {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const { data, error } = await supabase
    .from('trip_chat_messages')
    .select('id, content, author_name, created_at, message_type')
    .eq('trip_id', tripId)
    .gte('created_at', threeDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(15); // Reduced from 50

  // ... rest of implementation
}
```

---

## Summary of Changes

| Section | Current | After |
|---------|---------|-------|
| Source Priority | Not defined | Calendar > Places > Links > Chat > Assumptions |
| Broadcasts | ❌ Not fetched | ✅ Fetched & displayed with priority icons |
| Preference Visibility | Silent filtering | Shows "Filtered for you: X \| Y \| Z" |
| Output Format | Rambling answers | Direct answer + Source + Next action |
| Message Limit | 50 messages | 15 messages (last 72h) |
| Override Handling | Not supported | Explicit override honored per-request |

---

## Verification Checklist

After implementation:
- [ ] Ask "What time is dinner?" → Should get direct answer + source citation
- [ ] Ask for restaurant recommendations → Should see "Filtered for you: [preferences]"
- [ ] Ask about broadcasts → Should reference organizer announcements
- [ ] Override with "ignore my budget" → Should temporarily bypass budget filter
- [ ] Check edge function logs for broadcasts being fetched
