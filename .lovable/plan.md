

# Fix concierge-tts: Switch from API Key to OAuth2 Service Account Auth

## Root Cause (Confirmed)

The edge function logs are definitive:

```
"API keys are not supported by this API. Expected OAuth2 access token"
```

**Google Cloud Text-to-Speech v1 does NOT support API keys** — not via query param, not via `x-goog-api-key` header. It requires OAuth2 Bearer tokens. No amount of API key configuration will fix this.

## Solution

The `VERTEX_SERVICE_ACCOUNT_KEY` secret is already configured and working (used by `gemini-voice-session` for Gemini Live). We reuse the same OAuth2 JWT-to-access-token flow in `concierge-tts`.

## Changes

### 1. `supabase/functions/concierge-tts/index.ts`

Replace the API key auth with OAuth2 service account auth:

- Remove `GOOGLE_CLOUD_TTS_API_KEY` usage entirely
- Add `VERTEX_SERVICE_ACCOUNT_KEY` reading + parsing (same pattern as `gemini-voice-session`)
- Add `base64UrlEncode()`, `createAccessToken()`, `parseServiceAccountKey()` functions (copied from `gemini-voice-session`)
- Mint an OAuth2 access token and use `Authorization: Bearer <token>` header instead of `x-goog-api-key`
- The TTS endpoint stays `https://texttospeech.googleapis.com/v1/text:synthesize` (this is correct, it just needs OAuth2)

### 2. Deploy the updated function

After code change, deploy `concierge-tts` to Supabase.

## No other files change

The client hook (`useConciergeReadAloud`) and all consumer components are already correctly wired from the previous migration. This is purely a backend auth fix.

## Files

| File | Action |
|------|--------|
| `supabase/functions/concierge-tts/index.ts` | Replace API key auth with OAuth2 service account |

