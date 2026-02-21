# AI Provider Verification — Why Lovable Balance Is Consumed

This doc explains how to confirm your AI Concierge uses **your Gemini key** (AIzaSyA3tg89...) and not the Lovable gateway, and what to fix if Lovable's $1 AI balance is being consumed.

## Quick Diagnostic

**1. Call the concierge health endpoint** (with your anon key or auth):

```bash
curl -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://YOUR_PROJECT.supabase.co/functions/v1/lovable-concierge
```

Or send a ping from the app (e.g. via DevTools → Network when opening a trip with AI Concierge).

**Expected when using your key:**
```json
{
  "status": "healthy",
  "geminiConfigured": true,
  "provider": "gemini"
}
```

**If Lovable is being used:**
```json
{
  "geminiConfigured": false,
  "provider": "lovable"
}
```

## Why Lovable Might Be Used Instead of Your Key

| Cause | Fix |
|-------|-----|
| **GEMINI_API_KEY not set** in Supabase Edge Function secrets | Supabase Dashboard → Project Settings → Edge Functions → Secrets → add `GEMINI_API_KEY` = your key, then redeploy |
| **AI_PROVIDER=lovable** set | Remove or set `AI_PROVIDER=gemini` in Supabase secrets |
| **daily-digest** (until fixed) | Was always using Lovable; now prefers GEMINI_API_KEY. Redeploy `daily-digest`. |
| **Other functions** (place-grounding, ai-features, receipt-parser, etc.) | Use `_shared/gemini.ts` which falls back to Lovable when Gemini fails. Set `GEMINI_ENABLE_LOVABLE_FALLBACK=false` to fail fast instead of falling back. |

## Functions That Can Hit Lovable Gateway

| Function | Uses GEMINI_API_KEY? | Lovable fallback? |
|----------|----------------------|-------------------|
| lovable-concierge | Yes (primary) | Yes, only when GEMINI_API_KEY missing or AI_PROVIDER=lovable |
| daily-digest | Yes (primary, after fix) | Yes, only when Gemini fails |
| place-grounding, ai-features, receipt-parser, etc. | Yes (via _shared/gemini.ts) | Yes, when Gemini fails (unless GEMINI_ENABLE_LOVABLE_FALLBACK=false) |
| gemini-voice-session | Yes (only) | No — no Lovable fallback |

## Disable Lovable Fallback (Fail Fast)

To avoid consuming Lovable balance when Gemini fails, set:

```
GEMINI_ENABLE_LOVABLE_FALLBACK=false
```

in Supabase Edge Function secrets. Then functions using `_shared/gemini.ts` will throw on Gemini failure instead of falling back to Lovable.

## Redeploy After Changing Secrets

```bash
supabase functions deploy lovable-concierge
supabase functions deploy daily-digest
# Deploy other functions that use _shared/gemini.ts if needed
```
