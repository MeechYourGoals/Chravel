

# Fix TTS: Remove ElevenLabs, Consolidate to Google Cloud TTS

## Root Cause Analysis

The error in your screenshot — **"API keys are not supported by this API. Expected OAuth2 access token"** — comes from the `elevenlabs-tts` edge function, which is the one your client actually calls. Here is the exact failure chain:

```text
AIConciergeChat.tsx
  └─ useElevenLabsTTS hook
       └─ fetches: /functions/v1/elevenlabs-tts     ← THIS is what runs
            └─ elevenlabs-tts/index.ts line 84-86:
                 URL = 'texttospeech.googleapis.com/v1/text:synthesize?key=...'
                                                                       ^^^
                 Google Cloud TTS rejects API key in query param → 401
```

Meanwhile, the `concierge-tts` function you built (which uses the correct `x-goog-api-key` header) is **never called by any client code** — it's orphaned. Two duplicate TTS edge functions exist; the wrong one is wired up.

**Additional issue**: The `app_settings` table still stores ElevenLabs voice IDs (`1SM7GgM6IMuvQlz2BwM3`, `nPczCjzI2devNBz1zQrb`) which get sent to Google Cloud TTS and fail (they're not valid Google voice names). The `toGoogleVoiceName()` fallback catches these, but it's tech debt.

**Charon note**: Charon is a **Gemini Live native-audio voice** for bidirectional streaming — it's not available via Cloud TTS. Cloud TTS uses voices like `en-US-Neural2-J`. The Gemini Live voice path (`useGeminiLive` / `gemini-voice-session`) already uses Charon correctly. For the read-aloud speaker button, we'll use a high-quality Cloud TTS Neural2 voice.

## Plan

### 1. Delete `elevenlabs-tts` edge function (the broken one)
- Delete `supabase/functions/elevenlabs-tts/index.ts`
- Remove `[functions.elevenlabs-tts]` from `supabase/config.toml`

### 2. Rename client hook: `useElevenLabsTTS` → `useConciergeReadAloud`
- Create `src/hooks/useConciergeReadAloud.ts` — same logic as `useElevenLabsTTS.ts` but:
  - Points to `/functions/v1/concierge-tts` instead of `/functions/v1/elevenlabs-tts`
  - Default voice = `en-US-Neural2-J` (hardcoded, no DB lookup for legacy ElevenLabs IDs)
  - Export type `TTSPlaybackState` from this file
- Delete `src/hooks/useElevenLabsTTS.ts`

### 3. Delete `useElevenLabsHealth` hook
- Delete `src/hooks/useElevenLabsHealth.ts` — it hits the now-deleted `elevenlabs-tts` endpoint

### 4. Update consumers (3 files)
| File | Change |
|------|--------|
| `src/components/AIConciergeChat.tsx` | Import from `useConciergeReadAloud` instead of `useElevenLabsTTS` |
| `src/features/chat/components/TTSSpeakerButton.tsx` | Import `TTSPlaybackState` from `useConciergeReadAloud` |
| `src/features/chat/components/ChatMessages.tsx` | Import `TTSPlaybackState` from `useConciergeReadAloud` |

### 5. Clean up comments in `buildSpeechText.ts`
- Replace "ElevenLabs TTS" references in comments with "Google Cloud TTS"

### 6. Delete test files
- Delete `src/hooks/__tests__/useElevenLabsTTS.test.ts`
- Delete `src/hooks/__tests__/useElevenLabsTTS.network.test.ts`

### 7. Update `app_settings` (DB migration)
- Update `tts_primary_voice_id` value from `1SM7GgM6IMuvQlz2BwM3` → `en-US-Neural2-J`
- Update `tts_fallback_voice_id` value from `nPczCjzI2devNBz1zQrb` → `en-US-Wavenet-D`
- Update descriptions to reference Google Cloud TTS

### 8. Prerequisite: Enable Cloud TTS API in GCP Console
Even with the `x-goog-api-key` header fix, the API key must have the **Cloud Text-to-Speech API** enabled in the Google Cloud Console. You need to:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)
2. Select the project that owns `GOOGLE_CLOUD_TTS_API_KEY`
3. Enable the **Cloud Text-to-Speech API**
4. Ensure the API key has no restrictions blocking `texttospeech.googleapis.com`

Without this step, even the corrected `concierge-tts` function will fail with the same 401.

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/elevenlabs-tts/index.ts` | Delete |
| `supabase/config.toml` | Remove elevenlabs-tts entry |
| `src/hooks/useElevenLabsTTS.ts` | Delete |
| `src/hooks/useElevenLabsHealth.ts` | Delete |
| `src/hooks/__tests__/useElevenLabsTTS.test.ts` | Delete |
| `src/hooks/__tests__/useElevenLabsTTS.network.test.ts` | Delete |
| `src/hooks/useConciergeReadAloud.ts` | Create (replaces useElevenLabsTTS, points to concierge-tts) |
| `src/components/AIConciergeChat.tsx` | Update import |
| `src/features/chat/components/TTSSpeakerButton.tsx` | Update import |
| `src/features/chat/components/ChatMessages.tsx` | Update import |
| `src/lib/buildSpeechText.ts` | Update comments |
| `app_settings` rows | Update voice IDs to Google Cloud TTS names |

