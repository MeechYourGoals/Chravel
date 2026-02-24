

# Fix: Concierge Search, History, and Mobile Dictation

## Issues Identified

### Issue 1: Calendar events not appearing in search
**Root cause**: The `searchCalendarEvents` function in `universalSearchService.ts` searches `title` and `location` columns but NOT the `description` column. The event "Flight leaves at 1130pm" has "Flight" in both `title` and `description`, so it should be found by title alone. However, the search also needs `description` coverage for cases where the keyword only appears in the description. Additionally, the `event_category` field (e.g. "Flight") is not searched, which would improve category-based results.

**Verification needed**: The calendar search SQL itself looks correct for the "flight" keyword. The issue may also be RLS-related -- will add console logging to confirm whether data returns or errors silently.

### Issue 2: Concierge conversation history never loads
**Root cause (confirmed)**: The RPC function `get_concierge_trip_history` does not exist in the database. The `useConciergeHistory` hook calls this non-existent function, which silently fails and returns empty arrays. This means:
- Chat history is never hydrated from the server on page load
- Clicking "Concierge Conversation" search results tries to scroll to a message that doesn't exist
- Users see an empty Concierge tab every time they return to it

**Fix**: Replace the broken RPC call with a direct query to the `ai_queries` table (which DOES contain the data -- confirmed 87+ rows for the test trip).

### Issue 3: Mobile dictation says "Listening" but produces no transcription
**Root cause**: The Web Speech API on mobile browsers (especially iOS Safari) has known issues:
1. On iOS PWA (standalone mode), `SpeechRecognition` may not be available at all
2. On mobile Safari, the `onresult` event may not fire if the recognition stops too quickly
3. The current implementation waits 2 seconds of silence to finalize, but on mobile the `onend` event may fire before any `onresult` events arrive
4. The `continuous = !isIOS` logic sets `continuous = false` on iOS, which means recognition stops after the first pause -- but the auto-restart in `onend` should handle this

**Most likely mobile failure**: The `SpeechRecognition` API fires `onend` without ever firing `onresult` on mobile. The auto-restart logic kicks in but no transcript accumulates. The user sees "Listening" indefinitely because `activeRef` stays true.

---

## Fix Plan

### A) Fix Concierge History (Critical -- Issue 2)

**File: `src/hooks/useConciergeHistory.ts`**

Replace the broken `supabase.rpc('get_concierge_trip_history')` call with a direct query to `ai_queries` table:

```typescript
const { data: rows, error: queryError } = await supabase
  .from('ai_queries')
  .select('id, query_text, response_text, created_at')
  .eq('trip_id', tripId)
  .eq('user_id', user.id)
  .order('created_at', { ascending: true })
  .limit(p_limit * 2); // Each row has both user + assistant
```

Then map each row into two messages (user query + assistant response), producing the same `ConciergeChatMessage[]` shape the caller expects. This avoids needing a DB migration to create the missing RPC function.

**Also increase limit from 10 to 50** (currently `p_limit: 10` means only 5 conversation pairs are loaded -- too few for scroll-to-message from search).

### B) Enhance Calendar Search (Issue 1)

**File: `src/services/universalSearchService.ts`**

In `searchCalendarEvents`, add `description` and `event_category` to the search filter:

```typescript
// Before:
.or(`title.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%`)

// After:
.or(`title.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,event_category.ilike.%${safeQuery}%`)
```

Also update the snippet to include `event_category` when available:
```typescript
snippet: `${event.event_category ? event.event_category + ' - ' : ''}${event.location || 'No location'} - ${new Date(event.start_time).toLocaleString()}`
```

### C) Fix Mobile Dictation (Issue 3)

**File: `src/hooks/useWebSpeechVoice.ts`**

Three targeted fixes:

1. **Add a "no results" timeout**: If `onresult` never fires within 5 seconds of starting, show a toast suggesting the user try again or check mic permissions. This prevents the perpetual "Listening..." state on mobile.

2. **Improve the iOS restart logic**: When `onend` fires with no accumulated transcript after multiple restarts, break out and show an error rather than silently restarting forever.

3. **Add `audiostart`/`soundstart` event handlers**: These events fire when the browser detects audio/sound from the mic. If `audiostart` never fires within 3 seconds, it means the mic isn't actually capturing -- show a diagnostic message.

```typescript
// In createRecognition():
recognition.onaudiostart = () => {
  if (noAudioTimerRef.current) {
    clearTimeout(noAudioTimerRef.current);
    noAudioTimerRef.current = null;
  }
};
```

And in `startVoice`:
```typescript
// Start a "no audio detected" timer
noAudioTimerRef.current = setTimeout(() => {
  if (activeRef.current && !accumulatedTranscriptRef.current) {
    setErrorMessage('No audio detected. Please check microphone permissions.');
    cleanup();
    setVoiceState('error');
  }
}, 5000);
```

---

## Files Changed

| File | Change | Priority |
|------|--------|----------|
| `src/hooks/useConciergeHistory.ts` | Replace broken RPC with direct `ai_queries` table query; increase limit to 50 | Critical |
| `src/services/universalSearchService.ts` | Add `description` and `event_category` to calendar event search filter | High |
| `src/hooks/useWebSpeechVoice.ts` | Add no-audio timeout, improve restart exhaustion handling | High |

## What is NOT changed
- `AIConciergeChat.tsx` -- no changes needed (history hydration logic and search navigation already work correctly once data is available)
- `ConciergeSearchModal.tsx` -- no changes needed (UI is correct)
- `VoiceButton.tsx` -- no changes needed
- Edge functions -- no changes needed
- Database schema -- no migrations needed

## Regression Checklist
- Concierge tab loads with previous conversation history visible
- Searching "flight" returns the calendar event
- Clicking a Concierge search result scrolls to the message in chat
- Dictation works on desktop Chrome
- Dictation on mobile shows error after 5s if no audio detected (instead of perpetual "Listening")
- Map cards, grounding sources, and tool results still render
- No console errors

