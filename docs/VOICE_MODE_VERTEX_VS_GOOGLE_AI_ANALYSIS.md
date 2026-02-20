# Voice Mode: Vertex AI vs Google AI – Gap Analysis

> Based on: Vertex AI Live API docs, Gemini Live blog, and current codebase

---

## Executive Summary

**The codebase uses the Google AI (Gemini Developer API) path**, not Vertex AI. The articles you linked describe **Vertex AI**, which is a different product with different endpoints and authentication. This analysis clarifies the two paths and identifies what may be missing for voice to work.

---

## 1. Two Different Products

| Aspect | **Google AI (Gemini Developer API)** | **Vertex AI (Generative AI)** |
|--------|--------------------------------------|-------------------------------|
| **Docs** | ai.google.dev/gemini-api | docs.cloud.google.com/vertex-ai |
| **API Key Source** | [Google AI Studio](https://aistudio.google.com/app/apikey) | N/A – uses OAuth / Service Accounts |
| **Endpoints** | `generativelanguage.googleapis.com` | `{region}-aiplatform.googleapis.com` |
| **Auth** | API key (`?key=` or `x-goog-api-key`) | OAuth 2.0, Service Account, or ADC |
| **Live API** | Ephemeral tokens + `wss://generativelanguage.googleapis.com/ws/...` | Server-proxied WebSocket to Vertex |
| **Target** | Fast path for most developers | Enterprise controls, GCP integration |

**Current codebase:** Uses Google AI (generativelanguage.googleapis.com, API key, ephemeral tokens).

---

## 2. What the Vertex AI Articles Describe

From the blog: *"your frontend captures media and streams it to your secure backend, which then manages the persistent WebSocket connection to Gemini Live API in Vertex AI"*

- **Architecture:** Client → Your backend → Vertex AI (server-to-server)
- **Auth:** Backend uses GCP credentials (Service Account, OAuth)
- **No ephemeral tokens** in the Vertex flow – the backend holds credentials and proxies the WebSocket

---

## 3. What Our Codebase Does (Google AI Path)

```
1. Client taps mic
2. Client → gemini-voice-session (Supabase Edge Function)
3. Edge function calls: POST https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=GEMINI_API_KEY
4. Returns ephemeral token to client
5. Client opens WebSocket: wss://generativelanguage.googleapis.com/ws/...?access_token=TOKEN
6. Client streams audio directly to Gemini
```

This matches the **Google AI** client-to-server flow with ephemeral tokens.

---

## 4. Likely Causes of "Unregistered Callers"

### 4.1 API Key Source and Restrictions

- **Recommended:** Create the key in [Google AI Studio](https://aistudio.google.com/app/apikey), not only in Cloud Console.
- **Restrictions:** Key must be unrestricted **or** restricted to **"Generative Language API"**.
- **Note:** From the API key docs: *"Only API keys that have no restrictions, or are restricted to the Generative Language API are displayed"* in AI Studio.

### 4.2 Generative Language API Must Be Enabled

- In [Google Cloud Console](https://console.cloud.google.com/apis/library) → enable **"Generative Language API"** for the project that owns the key.
- If this API is not enabled, `auth_tokens` will fail.

### 4.3 Key Created in Wrong Product

- Keys created only in Cloud Console for other products (e.g. Maps, Vertex) may not work for `generativelanguage.googleapis.com`.
- Use a key created in or linked to **Google AI Studio** for the Gemini Developer API.

### 4.4 Auth Header vs Query Param

- Some Google APIs expect `x-goog-api-key` instead of `?key=` for server-side calls.
- Our code uses `?key=`. Trying the header as well can help rule out auth format issues.

---

## 5. Recommended Fixes (Stay on Google AI Path)

### Option A: Verify Key and API (No Code Change)

1. Create a key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. In Cloud Console → APIs & Services → enable **Generative Language API**.
3. Ensure the key is unrestricted or restricted only to Generative Language API.
4. Set that key as `GEMINI_API_KEY` in Supabase Edge Function secrets.
5. Redeploy: `supabase functions deploy gemini-voice-session`.

### Option B: Add `x-goog-api-key` Header (Code Change)

Some Google APIs prefer the header for server-side calls. Add it to the `auth_tokens` request:

```typescript
const tokenResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1alpha/auth_tokens`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(tokenRequestBody),
    signal: AbortSignal.timeout(15_000),
  },
);
```

(Remove `?key=` from the URL when using the header.)

### Option C: Switch to Vertex AI (Larger Change)

To follow the Vertex AI articles:

1. Use a GCP project with Vertex AI enabled.
2. Create a Service Account with Vertex AI permissions.
3. Use server-to-server: backend holds credentials and proxies the WebSocket to Vertex.
4. Change endpoints from `generativelanguage.googleapis.com` to `{region}-aiplatform.googleapis.com`.
5. Use OAuth/Service Account instead of an API key.

This is a larger migration and only needed if you specifically want Vertex AI features (e.g. enterprise controls, VPC-SC).

---

## 6. Summary

| Item | Status |
|------|--------|
| Product choice | Using Google AI (correct for API key flow) |
| Ephemeral tokens | Implemented per Google AI docs |
| WebSocket URL | Correct for Google AI |
| API key in secrets | Must be set and redeployed |
| Key source | Prefer key from Google AI Studio |
| Generative Language API | Must be enabled in project |
| Auth format | Consider adding `x-goog-api-key` header |

**Next step:** Try Option A first. Option B (`x-goog-api-key` header) has been implemented in the codebase.

---

## 7. Checklist for Operators

- [ ] Create API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) (not only Cloud Console)
- [ ] Enable **Generative Language API** in [Cloud Console → APIs & Services](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com)
- [ ] Key is unrestricted OR restricted only to "Generative Language API"
- [ ] Set `GEMINI_API_KEY` in Supabase → Project Settings → Edge Functions → Secrets
- [ ] Redeploy: `supabase functions deploy gemini-voice-session`
- [ ] Wait 2–5 minutes after key/restriction changes
