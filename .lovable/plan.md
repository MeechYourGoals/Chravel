# Demo Realism Enhancer — Implementation Plan

## Current State

The `seed-carlton-universe` edge function seeds 30 trips with ~200 messages, events, tasks, polls, payments, links, and AI queries — all authored by a single user (`Carlton Gold`, `DEMO_USER_ID`). This creates a "one person talking into the void" effect.

## What Changes

We upgrade the existing `seed-carlton-universe` edge function to add three layers of realism. No frontend code changes — this is purely a data seeding upgrade.

### Database: No schema changes needed

- `profiles` has no FK to `auth.users` — we can insert mock user profiles directly
- `trip_members` has no FK to `auth.users` — we can add mock members freely
- `trip_chat_messages` uses `user_id` (nullable) + `author_name` — supports multi-author messages
- `ai_queries` has a `metadata` JSONB column — supports rich card data
- `broadcasts` table exists with `created_by`, `message`, `priority`, `trip_id`
- `system_event_type` column exists on `trip_chat_messages` — supports system messages

### Edge Function Changes (single file: `supabase/functions/seed-carlton-universe/index.ts`)

The function grows from ~1870 lines. Here's what gets added/modified:

#### 1. Mock User Profiles (new constant + new Phase 2.5)

Define 10 mock users with deterministic UUIDs, display names, and avatar URLs (using `ui-avatars.com` API for consistent, non-placeholder avatars based on initials — no Unsplash dependency).

```
Alexandra Countley, Jordan James, Tara Crajen, Dev Patel, Sam Nepoli,
Maya Less, Leo Bicaprio, Sophie Chamal, Jalen Silver, Ava Duvet
```

Insert into `profiles` table during cleanup/seed. Each gets a deterministic UUID like `demo-mock-alex-kim-xxxx`.

#### 2. Trip Members (new Phase 4.5)

For each trip, add 3-4 mock users as `trip_members` with role `member`. Different subset per trip for variety.

#### 3. Multiplayer Chat Conversion (modify Phase 5)

Replace the current single-author message generation. Each trip's `getChatMessages()` return type gains a `sender` field (index into mock users array, or `null` for Carlton). Messages get distributed:

- Carlton Gold: ~40%
- Mock users: ~60% (distributed across 3-4 participants)

Add conversational realism:

- Short replies ("nice", "booked", "100%")
- Emoji reactions in `payload` JSONB (`{ reactions: { "🔥": ["user-id-1"], "👍": ["user-id-2"] } }`)
- Trip callbacks ("this reminds me of Tokyo")
- Inside jokes and casual banter
- Quick chat bursts (multiple short messages in sequence)

#### 4. System Activity Messages (new in Phase 5)

Insert system messages with `message_type: 'system'` and `system_event_type` values like:

- `poll_created`, `task_created`, `task_completed`
- `member_joined`, `trip_base_camp_updated`
- `photos_uploaded`, `calendar_item_added`

These get interleaved chronologically between chat messages.

#### 5. Broadcast Messages (new Phase 5.5)

Insert into `broadcasts` table for ~30% of trips. Examples:

- "📣 Meet in the hotel lobby at 7pm"
- "📣 Soundcheck moved to 4pm"
- "📣 Lobby call is 3:30pm. Wheels up 4:00pm."

#### 6. AI Concierge Rich Cards (modify Phase 11)

Upgrade `getAiQueries()` for the 10 highlight trips. The `metadata` JSONB gains a `rich_cards` array with structured card data:

```json
{
  "model": "gemini-2.0-flash",
  "rich_cards": [
    {
      "type": "restaurant",
      "title": "La Paloma Ibiza",
      "rating": 4.7,
      "cuisine": "Mediterranean",
      "price_range": "$$$$",
      "maps_url": "https://maps.google.com/..."
    }
  ],
  "context_sources": ["chat", "calendar", "places"]
}
```

Card types: `restaurant`, `hotel`, `flight`, `reservation`, `task_creation`, `poll_creation`, `place`.

#### 7. Post-AI Chat Reactions (in highlight trips)

After AI query responses, seed follow-up chat messages from mock users reacting to the AI output:

- "that second one looks incredible"
- "add it to places"
- "this saved me 20 tabs"

#### 8. Investor Highlight Moments (10 specific trips)

The 10 highlight moments from the prompt are implemented by enriching specific trip data:


| #   | Trip                        | Moment                                         |
| --- | --------------------------- | ---------------------------------------------- |
| 1   | Tokyo Street Food Crawl     | AI builds a night plan with 3 restaurant cards |
| 2   | Ibiza Birthday Weekend      | AI creates decision flow → poll + tasks        |
| 3   | Amalfi Coast Escape         | Reservation card moment                        |
| 4   | Toronto Food & Music        | "Add to calendar" moment                       |
| 5   | Dave Chappelle Chicago      | Pro logistics → tasks + broadcast              |
| 6   | NBA Summer League Media     | Flight card moment                             |
| 7   | Global DJ Tour Berlin       | Chaos containment → thread summary             |
| 8   | Miami F1 Grand Prix (event) | VIP weekend curation                           |
| 9   | Cannes Film Festival        | Context-aware recommendation → poll            |
| 10  | Super Bowl 2027             | Group coordination masterclass                 |


### Cleanup Phase Update

The cleanup phase already deletes all data for the trip IDs. We add:

- Delete mock user profiles (by deterministic UUIDs)
- Delete broadcasts for these trip IDs

### Target Metrics After Seeding


| Metric            | Current | Target                          |
| ----------------- | ------- | ------------------------------- |
| Messages          | ~200    | 1500+                           |
| Unique senders    | 1       | 5-6 per trip                    |
| System messages   | 0       | 120+                            |
| Broadcasts        | 0       | 10+                             |
| AI queries        | ~60     | 60 (same count, richer content) |
| Rich cards in AI  | 0       | 60+                             |
| Message reactions | 0       | 100+                            |


### Risk Assessment

- **Risk**: LOW — Edge function only, no frontend changes, no schema changes
- **Rollback**: Re-deploy the previous version of the edge function and re-run it
- The function uses `SUPABASE_SERVICE_ROLE_KEY` so RLS is bypassed for seeding
- Mock user UUIDs are deterministic, so re-runs are idempotent (cleanup phase deletes them first)

### Files Changed

- `supabase/functions/seed-carlton-universe/index.ts` — All changes in this single file (~3000 lines after expansion)