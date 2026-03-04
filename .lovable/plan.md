

# ElevenLabs TTS — Complete Fix Plan (All Components to 95+)

## Root Cause Confirmed

**`ELEVENLABS_API_KEY` was completely missing from the project secrets.** The edge function checked for it and returned a 500 error. This has been fixed by linking the ElevenLabs connector just now. With the paid plan, "Mark" (`1SM7GgM6IMuvQlz2BwM3`) should work.

However, there are still 5 components scoring below 95 that need fixes.

---

## Changes Required

### 1. Add `elevenlabs-tts` to `config.toml` (Score 0 → 95)
The function is missing entirely from config. Add `verify_jwt = false` since the function validates JWT manually via `supabase.auth.getUser()`.

### 2. Edge Function: Add Fallback Voice + Diagnostics (Score 75 → 95)
Update `supabase/functions/elevenlabs-tts/index.ts`:
- Add `FALLBACK_VOICE_ID` constant (Brian: `nPczCjzI2devNBz1zQrb`) — free-tier-safe
- On 402/422 from ElevenLabs, automatically retry with fallback voice before returning error
- Add `X-Voice-Fallback: true` header when fallback is used
- Add structured `console.log` at key decision points: voice ID used, ElevenLabs response status, fallback triggered, usage increment result
- Return the specific ElevenLabs error detail in the response body so the client can show actionable messages

### 3. Make Voice ID Configurable — Not Hardcoded (Score 0 → 95)
Instead of hardcoding voice IDs, create an `app_settings` table to store configurable values:
- DB migration: `app_settings` table with `key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ`
- Seed with `tts_primary_voice_id` = `1SM7GgM6IMuvQlz2BwM3` (Mark) and `tts_fallback_voice_id` = `nPczCjzI2devNBz1zQrb` (Brian)
- Edge function reads from `app_settings` on each request (with in-memory cache per invocation)
- Client hook reads from settings or falls back to the current constant
- Admin settings UI (later iteration — for now, DB-driven is sufficient)

### 4. TTSSpeakerButton: Add Error Visual (Score 90 → 95)
- When `playbackState === 'error'`, show the Volume2 icon in red/destructive color for 2 seconds, then reset to idle
- Gives user clear feedback that something went wrong

### 5. Client Hook: Surface Fallback Info + Better Error Messages (Score 85 → 95)
Update `src/hooks/useElevenLabsTTS.ts`:
- Remove hardcoded `DEFAULT_VOICE_ID`, fetch from settings or use constant as last resort
- Parse `X-Voice-Fallback` header and optionally surface a toast
- On 502 errors, parse the inner ElevenLabs error for more specific messaging (e.g., "Voice unavailable" vs generic "TTS request failed")

### 6. Health Check Hook (Score 0 → 95)
Create `src/hooks/useElevenLabsHealth.ts`:
- On first mount (once per session), send a lightweight request to the edge function with a 1-word test text
- If it fails, set a flag that components can read to show a degraded-state indicator
- Don't block UI — fire-and-forget with a sessionStorage guard to avoid repeated checks

### 7. Secrets Management (Score 40 → 95)
Already fixed — `ELEVENLABS_API_KEY` is now linked via the ElevenLabs connector. No further action needed.

### 8. Edge Function: Redeploy Required
The function must be redeployed after config.toml + code changes. This happens automatically when files are saved.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/config.toml` | Add `[functions.elevenlabs-tts]` entry |
| `supabase/functions/elevenlabs-tts/index.ts` | Fallback voice logic, diagnostics, settings lookup |
| `src/hooks/useElevenLabsTTS.ts` | Remove hardcoded voice ID, parse fallback header, better errors |
| `src/hooks/useElevenLabsHealth.ts` | Create health check hook |
| `src/features/chat/components/TTSSpeakerButton.tsx` | Error state visual |
| `src/components/AIConciergeChat.tsx` | Wire health check, pass voice config |
| DB migration | `app_settings` table with voice config rows |

---

## Expected Outcome

After implementation:
- TTS works immediately (secret is now linked, paid plan supports Mark)
- If Mark voice becomes unavailable, auto-falls back to Brian
- Voice IDs are DB-configurable without code deploys
- Health check catches API key / voice issues proactively
- Error states are visible to users with actionable messages
- Full diagnostics in edge function logs for debugging

