
# Fix: AI Concierge Error + Build Error (Root Cause Analysis)

## Two Separate Issues Found

### Issue 1: Build Error (Blocking Deployment)
**Error:** `src/hooks/useAuth.tsx(933,17): error TS2769: No overload matches this call. Argument of type '"private_profiles"' is not assignable to parameter of type '"campaigns_public" | "profiles_public"'.`

**Root Cause:** The code at line 933 calls `supabase.from('private_profiles')` but this table does not exist in the database. The auto-generated Supabase types only allow table names that actually exist. The database has `profiles` and `profiles_public` (a view) -- no `private_profiles` table.

**Fix:** Remove the `private_profiles` upsert block (lines 930-944) in `useAuth.tsx`. The phone field should be saved to the `profiles` table directly (or skipped if the column doesn't exist there either). This also means removing the comment on line 174 and the phone-splitting logic around lines 904-906 that separates phone into a non-existent table.

### Issue 2: AI Concierge "Sorry, I encountered an error" (The Real Problem)

**Root Cause (from edge function logs):**
```
Gemini streaming API Error: 400 - Tool use with function calling is unsupported by the model.
```

The model `gemini-3-flash-preview` does NOT support combining `functionDeclarations` (addToCalendar, createTask, etc.) with `googleSearch` in the same `tools` array. The code at line 1074-1076 sends both:
```typescript
const geminiTools = tripRelated
  ? [{ functionDeclarations }, { googleSearch: {} }]
  : [{ googleSearch: {} }];
```

This causes a 400 error from Gemini. The 400 is NOT caught by the 403-specific fallback logic (line 1244), so instead of falling back to the Lovable gateway, it hits the generic error handler which sends "Streaming response failed" to the client.

**Why the Lovable gateway fallback doesn't trigger:**
- The fallback only triggers on `gemini403` errors (line 1244)
- A 400 error goes to the generic catch block (line 1253) which just sends an error SSE event
- There is NO fallback to the Lovable gateway for non-403 errors during streaming

**Fix (3 changes in `lovable-concierge/index.ts`):**

1. **Separate function calling from Google Search** -- For `gemini-3-flash-preview`, only send one tool type at a time. Use Google Search for general/real-time queries, and function declarations for trip-action queries, but not both simultaneously:
   ```typescript
   const geminiTools: any[] = [];
   if (tripRelated) {
     geminiTools.push({ functionDeclarations });
   }
   // Only add googleSearch when NOT using function declarations
   // (gemini-3-flash-preview doesn't support both simultaneously)
   if (!tripRelated) {
     geminiTools.push({ googleSearch: {} });
   }
   ```

2. **Add Lovable gateway fallback for ALL streaming errors (not just 403)** -- In the catch block at line 1241, attempt the Lovable gateway fallback for any error, not just 403:
   ```typescript
   } catch (streamError: any) {
     console.error('[Gemini/Stream] Streaming failed:', streamError);
     // Try Lovable gateway fallback for ANY Gemini streaming error
     const reason = streamError?.gemini403
       ? 'Gemini 403 (unregistered callers)'
       : `Gemini streaming error: ${streamError?.message || 'unknown'}`;
     const fallbackResp = await runRuntimeLovableFallback(reason);
     if (fallbackResp) {
       // Can't return a new Response from inside ReadableStream start(),
       // so stream the fallback response text as SSE
       const fallbackData = await fallbackResp.json();
       if (fallbackData?.response) {
         controller.enqueue(sseEvent({ type: 'chunk', text: fallbackData.response }));
         controller.enqueue(sseEvent({ type: 'metadata', model: 'lovable-gateway-fallback' }));
       }
       controller.enqueue(sseEvent({ type: 'done' }));
     } else {
       controller.enqueue(sseEvent({
         type: 'error',
         message: 'AI service temporarily unavailable. Please try again.',
       }));
       controller.enqueue(sseEvent({ type: 'done' }));
     }
   }
   ```

3. **Also fix the non-streaming path** -- The non-streaming Gemini call at line 1493-1510 has the same `geminiRequestBody` with both tool types. Add a similar try/catch with Lovable gateway fallback there too.

### Summary of Files to Change

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Remove `private_profiles` references (lines 904, 930-944, 963-964). Save phone to `profiles` table or skip. |
| `supabase/functions/lovable-concierge/index.ts` | (1) Don't combine `functionDeclarations` + `googleSearch` in tools array. (2) Add Lovable gateway fallback for all streaming errors, not just 403. |

### Why This Will Fix It

- The build error is fixed by removing references to a non-existent table
- The AI Concierge will work because either: (a) Gemini succeeds with separated tools, or (b) if Gemini fails for any reason, the Lovable gateway catches it and still returns a response
- The user will never see "Sorry, I encountered an error" again -- worst case they get a Lovable-gateway-powered response
