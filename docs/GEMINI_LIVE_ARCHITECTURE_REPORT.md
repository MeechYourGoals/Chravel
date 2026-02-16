# Gemini Live Architecture Report

> **Date:** 2026-02-16  
> **Purpose:** Clarify how Gemini is used vs Lovable, and why GEMINI_API_KEY may not be read

---

## 1. Current Architecture (What Actually Runs)

### Text AI Concierge (typing messages)

```
AIConciergeChat → conciergeGateway.invokeConciergeStream()
                → POST /functions/v1/lovable-concierge  (stream: true)
```

**Client never calls `gemini-chat`.** The `gemini-chat` edge function exists but is a **proxy** that internally calls `lovable-concierge`. So the flow is:

- **Client** → `lovable-concierge` (directly)
- **gemini-chat** → (unused by main Concierge tab; proxies to lovable-concierge when invoked)

### Voice AI Concierge (microphone)

```
useGeminiLive.startSession()
  → POST /functions/v1/gemini-voice-session  { tripId, voice }
  → Returns ephemeral token
  → Client opens WebSocket to Gemini Live API directly (wss://generativelanguage.googleapis.com/ws/...)
```

**Voice uses Gemini Live directly.** The client connects to Google's Gemini WebSocket after getting a short-lived token from `gemini-voice-session`.

---

## 2. Does lovable-concierge Use Gemini Directly?

**Yes, when GEMINI_API_KEY is set.**

| Condition | Provider used |
|-----------|---------------|
| `GEMINI_API_KEY` set, `AI_PROVIDER` ≠ `lovable` | **Gemini API directly** (streaming + non-streaming) |
| `GEMINI_API_KEY` missing | **Lovable gateway** (fallback) |
| `AI_PROVIDER=lovable` | **Lovable gateway** (forced) |

Relevant code in `lovable-concierge/index.ts`:

```ts
const useStreaming = requestedStream && GEMINI_API_KEY && !FORCE_LOVABLE_PROVIDER;
// ...
if (FORCE_LOVABLE_PROVIDER || !GEMINI_API_KEY) {
  // Uses Lovable gateway
} else {
  // Uses Gemini API directly: generativelanguage.googleapis.com/v1beta/models/...
}
```

So the **function name** is misleading: `lovable-concierge` can use Gemini directly.

---

## 3. Why GEMINI_API_KEY Might Not Be Read

### Supabase Edge Functions use project secrets, not `.env`

Supabase Edge Functions do **not** read `.env` files. They use:

1. **Supabase-provided vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auto-injected)
2. **Secrets:** Set in Supabase Dashboard or via CLI

### How to set GEMINI_API_KEY

**Option A – Supabase Dashboard**

1. Supabase Dashboard → Project Settings → Edge Functions
2. Secrets (or Environment Variables)
3. Add `GEMINI_API_KEY` = `your-google-ai-studio-api-key`
4. Save

**Option B – Supabase CLI**

```bash
supabase secrets set GEMINI_API_KEY=your_key_here
```

**Important:** After adding or changing secrets, redeploy the functions:

```bash
supabase functions deploy gemini-voice-session
supabase functions deploy lovable-concierge
```

### Common issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Secret not set in Supabase | `GEMINI_API_KEY not configured` | Add secret in Dashboard or via CLI |
| Secret only in local `.env` | Same | Supabase ignores `.env`; use Dashboard/CLI |
| Wrong secret name | Same | Use exactly `GEMINI_API_KEY` |
| No redeploy after adding secret | Same | Redeploy after `supabase secrets set` |
| Per-function secret (older setups) | Same | Supabase uses project-level secrets; all functions share them |

---

## 4. Functions That Need GEMINI_API_KEY

| Function | Uses GEMINI_API_KEY | Fallback |
|----------|---------------------|----------|
| `gemini-voice-session` | Yes (required) | None – throws if missing |
| `lovable-concierge` | Yes (preferred) | LOVABLE_API_KEY |
| `gemini-chat` | No (proxies to lovable-concierge) | N/A |
| `_shared/gemini.ts` | Yes | LOVABLE_API_KEY if `GEMINI_ENABLE_LOVABLE_FALLBACK=true` |

---

## 5. Gemini Live Flow (Voice)

```
1. User clicks microphone
2. Client: supabase.functions.invoke('gemini-voice-session', { body: { tripId, voice } })
3. gemini-voice-session:
   - Checks GEMINI_API_KEY (throws if missing)
   - Builds trip context + system prompt
   - Calls https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=GEMINI_API_KEY
   - Returns ephemeral token to client
4. Client: Opens WebSocket to wss://generativelanguage.googleapis.com/ws/...?access_token=...
5. Client: Sends audio directly to Gemini Live API
6. Gemini: Streams audio + text back
```

---

## 6. Recommended Next Steps

1. **Verify secret:** Supabase Dashboard → Project Settings → Edge Functions → Secrets → confirm `GEMINI_API_KEY`
2. **Redeploy:** `supabase functions deploy gemini-voice-session lovable-concierge`
3. **Test:** Call `GET https://<project>.supabase.co/functions/v1/gemini-voice-session` with header `Authorization: Bearer <anon_key>` — returns `{ configured: true }` if key is set
4. **Optional:** Add `AI_PROVIDER=gemini` (or leave unset) to force Gemini over Lovable

---

## 7. Summary

- **Text:** Uses `lovable-concierge` → Gemini directly when `GEMINI_API_KEY` is set.
- **Voice:** Uses `gemini-voice-session` → Gemini Live API directly; requires `GEMINI_API_KEY`.
- **gemini-chat:** Proxy that only calls `lovable-concierge`; not used by the main Concierge tab.
- **GEMINI_API_KEY:** Must be set in Supabase project secrets (Dashboard or CLI), not in `.env`.
