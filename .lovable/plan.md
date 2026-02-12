

# Fix AI Concierge: Voice Pipeline, Speed, and Accuracy

## Root Causes Found (from edge function logs + code)

| # | Issue | Evidence |
|---|-------|----------|
| 1 | Voice has a **separate, broken AI pipeline** -- calls `lovable-concierge` with NO tripId, NO context, NO chat history | `useWebSpeechVoice.ts` line 98-103 sends only `{ message, analysisType }` while the text path sends full context |
| 2 | Speech **cuts off mid-sentence** | `recognition.continuous = false` (line 188) stops after the first pause |
| 3 | **Embedding model invalid** -- every request tries `google/text-embedding-004` which is rejected, adding wasted latency | Edge function log: `"invalid model: google/text-embedding-004, allowed models: [...]"` |
| 4 | **No current date in system prompt** -- model defaults to 2024 training data | System prompt at line 741 never mentions the year |
| 5 | **DB foreign key errors** on `trip_files`, `trip_links`, `trip_tasks`, `trip_payment_messages` | Edge function logs show PGRST200 errors for each |

## Fix Strategy

### Fix 1: Unify voice and text into ONE pipeline (the big fix)

Instead of having the voice hook call the AI directly, make voice recognition purely an **input method** -- it transcribes speech, puts it in the text input, and triggers the same `handleSendMessage` that already works for typed messages.

This eliminates the separate voice AI pipeline entirely. Both voice and text get identical context, retries, speed, and error handling.

**`src/hooks/useWebSpeechVoice.ts`:**
- Remove `processWithConcierge` function entirely (lines 89-159)
- Remove the supabase import
- Change `onresult`: when final transcript is received, call `onUserMessage(text)` and set state to `idle` (not `thinking`)
- The hook becomes purely STT -- ~80 lines instead of 288
- Keep TTS as an optional feature triggered externally if needed

**`src/components/AIConciergeChat.tsx`:**
- Change `handleVoiceUserMessage` to set the input message AND call handleSendMessage, routing voice text through the exact same pipeline as typed text
- Remove the `assistantTranscript` streaming bubble (voice responses will appear as normal chat messages)
- Remove the separate `handleVoiceAssistantMessage` callback

### Fix 2: Stop speech from cutting off mid-sentence

**`src/hooks/useWebSpeechVoice.ts`:**
- Set `recognition.continuous = true` so it keeps listening across pauses
- Add a 2-second silence debounce: after the last `onresult` fires, wait 2 seconds before finalizing and sending
- User can also tap the mic button again to manually stop and send

### Fix 3: Fix the invalid embedding model (speed fix)

**`supabase/functions/lovable-concierge/index.ts` line 318:**
- Change `google/text-embedding-004` to `google/gemini-2.5-flash-lite` or skip the embedding call entirely
- Since the gateway doesn't support embedding models, disable RAG embedding for now and rely on the keyword search fallback
- This eliminates a failed HTTP call on every single request

### Fix 4: Add current date to system prompt (accuracy fix)

**`supabase/functions/lovable-concierge/index.ts` line 741:**
- Add `Current date: ${new Date().toISOString().split('T')[0]}` to the system prompt
- This tells the model it's 2026, so it won't reference 2024 events

**`supabase/functions/gemini-chat/index.ts`:**
- Same fix to the base prompt in `buildSystemPrompt`

### Fix 5: Guard against DB foreign key errors in context builder

**`supabase/functions/_shared/contextBuilder.ts`:**
- Wrap each context query (payments, files, links, tasks) in individual try/catch blocks
- Remove the `.select('*, uploaded_by(*)')` foreign key joins that don't exist -- use simple `.select('*')` instead
- This eliminates 4 failed DB queries per request

## Technical Changes Summary

| File | Change |
|------|--------|
| `src/hooks/useWebSpeechVoice.ts` | Remove AI call, make it pure STT with 2s silence debounce, continuous mode |
| `src/components/AIConciergeChat.tsx` | Route voice transcripts through `handleSendMessage`, remove assistant transcript bubble |
| `supabase/functions/lovable-concierge/index.ts` | Skip failed embedding call, add current date to prompt |
| `supabase/functions/gemini-chat/index.ts` | Add current date to prompt |
| `supabase/functions/_shared/contextBuilder.ts` | Fix broken foreign key joins, add per-query try/catch |

## Expected Outcome

- Voice and text give identical speed and quality (same pipeline)
- No more cut-off sentences (continuous mode + 2s debounce)
- Faster responses (eliminated failed embedding call + failed DB queries)
- Correct dates in answers (model knows it's 2026)
- No more "Processing" hang (voice no longer has its own AI call that can timeout separately)

