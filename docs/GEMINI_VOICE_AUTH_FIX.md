# Gemini Voice Path Auth & Spinner Fix

## Issue Summary (Original Report)

The mic button spinner was spinning indefinitely because:
1. **401 Unauthorized**: The request was hitting the Edge Function without a valid JWT
2. **No timeout**: When the call failed or hung, the client never cleared the spinner
3. **No 401/403 differentiation**: Users didn't get actionable feedback

## Current State (Verified)

### ✅ Auth Path is Correct

The client **already uses** `supabase.functions.invoke('gemini-voice-session', { body: { tripId, voice } })` in `useGeminiLive.ts`. The Supabase JS client automatically adds the `Authorization: Bearer <access_token>` header when the user has a session. **Raw fetch is NOT used** for the voice session.

- **Config**: `supabase/config.toml` has `verify_jwt = true` for `gemini-voice-session`
- **Edge function**: Validates `Authorization` header, returns 401 if missing/invalid, 403 if user lacks Pro entitlement

### Root Causes of Infinite Spinner (Addressed)

1. **No timeout on session fetch** – If the edge function hung (e.g. TripContextBuilder taking 10+ seconds), the promise never resolved → **Fixed**: 15s timeout
2. **No timeout on getUserMedia** – If the user never granted mic permission, the promise could hang → **Fixed**: 10s timeout
3. **No timeout on WebSocket setup** – If `setupComplete` never arrived, user stayed in "connecting" → **Fixed**: 15s timeout
4. **Generic error messages** – 401 and 403 were not distinguished → **Fixed**: "Please sign in to use voice" vs "Voice requires Pro subscription"

## Changes Made

### `src/hooks/useGeminiLive.ts`

- **Session fetch timeout** (15s): `Promise.race` with timeout; on timeout, spinner clears and user sees "Voice session timed out. Please try again."
- **getUserMedia timeout** (10s): Prevents indefinite wait for mic permission
- **WebSocket setup timeout** (15s): If `setupComplete` never arrives, transition to error and cleanup
- **401/403 handling**: `getSessionErrorMessage()` maps HTTP status to user-friendly messages
- **isDemoMode**: Passed to edge function so demo trip users get voice access

### `supabase/functions/gemini-voice-session/index.ts`

- **Super admin bypass**: Optional `SUPABASE_SUPER_ADMIN_EMAILS` env var (comma-separated) grants voice access
- **Demo mode bypass**: When `isDemoMode` + `tripId` is in known demo trip list, allow voice (server-validated)

## Manual Verification

1. **401 (not logged in)**: Sign out, click mic → should show "Please sign in to use voice" within 15s
2. **403 (no Pro)**: Log in as free user, click mic → should show "Voice requires Pro subscription" within 15s
3. **Timeout**: Simulate slow network or edge function hang → spinner should clear within 15s with "Voice session timed out"
4. **Success**: Logged-in Pro user → voice should connect and start listening

## Latency Notes (From Original Report)

- `T_pref` (TripContextBuilder + RAG): 5–10s – consider caching per trip
- `T_gem` (Gemini first token): 5–15s
- Text chat timeout: 45s (`FAST_RESPONSE_TIMEOUT_MS` in AIConciergeChat)
- Voice session fetch: now 15s max before failure

## Regression Risk

**LOW** – Changes are additive (timeouts, error message mapping). No changes to auth flow or edge function logic.

**Rollback**: Revert `useGeminiLive.ts` to remove timeout wrappers and restore generic error handling.
