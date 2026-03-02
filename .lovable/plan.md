

# Vertex AI Migration for Gemini Live Voice + Voice Config Updates

## What Changes and Why

The current implementation uses Google AI Studio (API key + ephemeral tokens + `generativelanguage.googleapis.com`). This is a prototype-tier path that doesn't scale and uses a preview model name (`gemini-2.5-flash-native-audio-preview-12-2025`). The migration switches to Vertex AI's GA model (`gemini-live-2.5-flash-native-audio`) with OAuth authentication, enterprise SLAs, proactive audio, affective dialog, and grounding support.

## Architecture Change

```text
BEFORE (AI Studio):
  Client -> Edge Function (creates ephemeral token via API key)
  Client -> generativelanguage.googleapis.com (WebSocket with ephemeral token)

AFTER (Vertex AI):
  Client -> Edge Function (creates OAuth access token from Service Account)
  Client -> {region}-aiplatform.googleapis.com (WebSocket with OAuth token)
```

The client-side WebSocket handling stays the same -- only the URL and token source change. The edge function becomes a token-minting service using Vertex AI service account credentials instead of an API key.

## Secrets You Need to Add

You will need to add **3 new secrets** in Supabase Dashboard (Project Settings -> Edge Functions -> Secrets):

| Secret Name | What It Is | Where to Get It |
|---|---|---|
| `VERTEX_PROJECT_ID` | Your Google Cloud project ID (e.g., `my-project-123456`) | Google Cloud Console -> Dashboard -> Project ID |
| `VERTEX_LOCATION` | Region for Live API (e.g., `us-central1`) | Pick from: us-central1, us-east1, us-east4, us-east5, us-south1, us-west1, us-west4, europe-west1, europe-west4 |
| `VERTEX_SERVICE_ACCOUNT_KEY` | Base64-encoded JSON key file for a GCP service account with `roles/aiplatform.user` | See step-by-step below |

Your existing `GEMINI_API_KEY` stays -- it's still used by text concierge (`gemini-3.1-pro-preview`) via AI Studio for non-voice features.

## Step-by-Step: What You Do After I Implement

1. **Create a GCP Service Account** (in Google Cloud Console):
   - Go to IAM & Admin -> Service Accounts
   - Click "Create Service Account"
   - Name: `chravel-voice-sa`
   - Grant role: `Vertex AI User` (`roles/aiplatform.user`)
   - Click "Done"

2. **Create a JSON Key** for that service account:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" -> "Create new key" -> JSON
   - A `.json` file downloads -- this is your service account key

3. **Base64-encode the key** (in your browser console or terminal):
   ```
   # Mac/Linux terminal:
   base64 -i path/to/downloaded-key.json | tr -d '\n'
   
   # Or in browser console:
   # Open the JSON file, copy contents, then:
   btoa(JSON.stringify(YOUR_KEY_JSON))
   ```

4. **Add secrets in Supabase**:
   - Go to https://supabase.com/dashboard/project/jmjiyekmxwsxkfnqwyaa/settings/functions
   - Add `VERTEX_PROJECT_ID` = your GCP project ID
   - Add `VERTEX_LOCATION` = `us-central1` (recommended for lowest latency)
   - Add `VERTEX_SERVICE_ACCOUNT_KEY` = the base64 string from step 3

5. **Enable Vertex AI API** in your GCP project:
   - Go to APIs & Services -> Enable APIs
   - Search for "Vertex AI API" and enable it

6. **Enable billing** on the GCP project (required for Vertex AI)

## What I Implement (Code Changes)

### 1. Edge Function: `supabase/functions/gemini-voice-session/index.ts`

Major rewrite of token creation:
- Remove AI Studio ephemeral token flow (`auth_tokens` endpoint)
- Add Vertex AI OAuth2 token minting from service account credentials
- Change model to `gemini-live-2.5-flash-native-audio` (GA, no preview suffix)
- Change default voice from `Puck` to `Charon`
- Change WebSocket URL to `wss://{VERTEX_LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`
- Enable proactive audio in config
- Enable affective dialog in config
- Enable Google Search grounding (Vertex supports combining tools + grounding, unlike AI Studio)
- Add `realtimeInputConfig` with speech sensitivity tuning (start: LOW, end: HIGH -- matching your screenshot)
- The setup message (model config, system instruction, tools) is now sent by the client as the first WebSocket message (`BidiGenerateContentSetup`) rather than baked into the token

### 2. Client: `src/hooks/useGeminiLive.ts`

- Update the fallback WebSocket URL to use the Vertex endpoint returned by the edge function
- Send `BidiGenerateContentSetup` as first message after WS opens (Vertex requires this; AI Studio baked it into the token)
- The setup message includes: model, system instruction, tools, speech config, proactive audio, affective dialog, grounding

### 3. Config: `supabase/config.toml`

- Already has `verify_jwt = false` for gemini-voice-session (no change needed)

### 4. Voice Feature Flags: No changes needed

- `VOICE_LIVE_ENABLED` defaults to `true`
- `VOICE_USE_WEBSOCKET_ONLY` defaults to `true`

## Voice Configuration Changes

| Setting | Before | After |
|---|---|---|
| Voice | Puck | **Charon** |
| Model | `gemini-2.5-flash-native-audio-preview-12-2025` | `gemini-live-2.5-flash-native-audio` |
| Proactive Audio | Off | **On** |
| Affective Dialog | Off | **On** |
| Grounding (Google Search) | Off (broken on AI Studio) | **On** (works on Vertex) |
| Start of Speech Sensitivity | Default | **Low** |
| End of Speech Sensitivity | Default | **High** |
| Auth | AI Studio API Key + ephemeral token | **Vertex OAuth2 access token** |
| Endpoint | `generativelanguage.googleapis.com` | `{region}-aiplatform.googleapis.com` |

## What Stays the Same

- Text concierge continues using `gemini-3.1-pro-preview` via AI Studio (`GEMINI_API_KEY`)
- Smart import, calendar import, web scraping continue via AI Studio
- All of Claude Code's RC1/RC4 fixes (drain callbacks, deferred transitions, barge-in) are preserved
- Full-screen immersive overlay UI stays as-is
- Circuit breaker, audio contract, transport sanity layer all stay
- `GEMINI_API_KEY` secret stays for non-voice features

## Verification Checklist

1. Add the 3 secrets (VERTEX_PROJECT_ID, VERTEX_LOCATION, VERTEX_SERVICE_ACCOUNT_KEY)
2. Edge function auto-deploys with the code changes
3. Health check (GET) returns `provider: 'vertex'`, `model: 'gemini-live-2.5-flash-native-audio'`, `configured: true`
4. Open AI Concierge, tap Live
5. Console: `[VOICE:G0] invoke_done` shows `hasData: true`
6. Console: `[VOICE:G2] ws_setup_complete` within 10s
7. Speak and hear Charon voice respond
8. Proactive audio: model stays silent when you talk to someone else nearby
9. Text concierge still works normally (uses GEMINI_API_KEY, unaffected)

## Risk: MEDIUM-HIGH

This is a transport/auth layer migration. The WebSocket protocol messages are the same between AI Studio and Vertex (both use `BidiGenerateContent`). The main risk is in the OAuth token minting -- if the service account key is malformed or permissions are wrong, the function will return a clear error.

## Rollback

If Vertex fails: change `VOICE_PROVIDER` env var back to `ai_studio` in the edge function (I'll add this toggle). The old AI Studio code path is preserved as a fallback.

