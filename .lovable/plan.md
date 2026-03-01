

# Persist Rich Cards in AI Concierge History

## Problem
When a user leaves the AI Concierge and returns, hotel cards, flight cards, and place cards disappear. This happens because:

- The `ai_queries` database table only stores `query_text` and `response_text` (plain text)
- Rich card data (places, flights, hotels) lives only in the in-memory Zustand store
- When history is rehydrated from the database, the card data is gone

## Solution

Add a `metadata` JSONB column to the `ai_queries` table to persist the rich card data alongside each response. On hydration, read it back and attach it to the restored messages.

## Implementation Steps

### 1. Add `metadata` column to `ai_queries` table
- Add a nullable JSONB column `metadata` to `ai_queries`
- This will store `functionCallPlaces`, `functionCallFlights`, `functionCallHotels`, and other rich data

### 2. Persist rich card data when saving to `ai_queries`
- In `AIConciergeChat.tsx`, after streaming completes (`onDone`), gather the final message's rich card fields
- Include them as a JSON object in the new `metadata` column when inserting into `ai_queries`
- Also update the voice-mode persist path to include metadata
- The edge function `ai-answer` persist path should also be updated

### 3. Update `useConciergeHistory.ts` to restore card data
- Expand the `select` query to include the new `metadata` column
- When mapping rows to `ConciergeChatMessage` entries, attach `functionCallPlaces`, `functionCallFlights`, `functionCallHotels` from the metadata back onto the assistant message
- Update the `ConciergeChatMessage` interface to include the optional rich card fields (matching the shape in `ConciergeSessionMessage`)

### 4. Update hydration in `AIConciergeChat.tsx`
- The hydration path already merges history messages into state; ensure the enriched messages (with card data) flow through correctly
- No major changes needed here since the message shape already supports these fields

## Technical Details

**Database migration (SQL):**
```sql
ALTER TABLE ai_queries ADD COLUMN metadata jsonb DEFAULT NULL;
```

**Metadata shape persisted per row:**
```json
{
  "functionCallPlaces": [...],
  "functionCallFlights": [...],
  "functionCallHotels": [...],
  "googleMapsWidget": "...",
  "conciergeActions": [...],
  "sources": [...]
}
```

**Files to modify:**
- `src/hooks/useConciergeHistory.ts` -- expand select + map metadata onto messages
- `src/components/AIConciergeChat.tsx` -- persist metadata in both text-mode and voice-mode insert paths
- `supabase/functions/ai-answer/index.ts` -- if this persist path is still used, update it too

**Risk: LOW** -- additive change only (new nullable column, backward-compatible). Existing rows without metadata will simply show text-only messages as before.

