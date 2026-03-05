# Voice Provider Migration Note (ElevenLabs → Google Cloud TTS)

## Status
ElevenLabs is no longer the upstream provider for `supabase/functions/elevenlabs-tts`.
The edge function now proxies to **Google Cloud Text-to-Speech** while preserving the same client endpoint and auth/rate-limit behavior.

## What changed
- Secret source changed from `ELEVENLABS_API_KEY` to `GOOGLE_CLOUD_TTS_API_KEY`.
- Upstream endpoint changed to Google Cloud `text:synthesize`.
- Primary/fallback voices now default to:
  - primary: `en-US-Neural2-J`
  - fallback: `en-US-Wavenet-D`
- Existing `tts_primary_voice_id` / `tts_fallback_voice_id` app settings are still used, but legacy non-Google IDs automatically fall back to the default Google voice.

## Verification checklist (copy/paste)

```bash
# 1) Ensure runtime project alignment
rg -n "FALLBACK_PROJECT_ID|VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY" src/integrations/supabase/client.ts

# 2) Confirm secret is present in the exact runtime project
supabase secrets list --project-ref <project-ref> | rg GOOGLE_CLOUD_TTS_API_KEY

# 3) Set/rotate key and redeploy function
supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="<your-key>" --project-ref <project-ref>
supabase functions deploy elevenlabs-tts --project-ref <project-ref>

# 4) Invoke function and confirm audio response
curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/elevenlabs-tts" \
  -H "Authorization: Bearer <user-jwt>" \
  -H "apikey: <anon-key>" \
  -H "Content-Type: application/json" \
  --data '{"speech_text":"test","output_format":"mp3_22050_32"}'
```

## Rollback path
If needed, revert the edge function commit and restore `ELEVENLABS_API_KEY`, then redeploy `elevenlabs-tts`.
