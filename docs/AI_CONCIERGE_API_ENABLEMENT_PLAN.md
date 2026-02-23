# AI Concierge — API Enablement & Wiring Plan

> **Purpose:** Map your enabled Google Cloud APIs to the Chravel AI Concierge, clarify which keys go where, and provide a step-by-step plan to get voice, multimodal, and maps/places working.

---

## 1. Critical Distinction: Two Different Key Systems

| Key | Where Set | Used By | Source |
|-----|-----------|---------|--------|
| **GEMINI_API_KEY** | Supabase Edge Function secrets | `lovable-concierge`, `gemini-voice-session`, `place-grounding`, `_shared/gemini.ts` | **Google AI Studio** (aistudio.google.com) — preferred |
| **GOOGLE_MAPS_API_KEY** | Supabase Edge Function secrets | `google-maps-proxy`, `venue-enricher`, `functionExecutor` (searchPlaces, getDirectionsETA, getTimezone, etc.) | GCP Console (same project) |
| **VITE_GOOGLE_MAPS_API_KEY** | Frontend `.env` / Vercel | Maps JS, Places Autocomplete, map rendering | GCP Console (same project) |

**Why voice/concierge may not connect:** The `GEMINI_API_KEY` must work with `generativelanguage.googleapis.com`. Keys created only in Cloud Console for Maps/Vertex may not work. **Use a key from [Google AI Studio](https://aistudio.google.com/app/apikey)** and ensure **Generative Language API** is enabled for that key's project.

---

## 2. APIs You Have Enabled vs. What the Concierge Uses

### ✅ Already Used by Concierge (Must Be Enabled)

| API | Used For | Key / Config |
|-----|----------|--------------|
| **Generative Language API** | Text concierge, voice (Gemini Live), place grounding, image understanding | `GEMINI_API_KEY` (Supabase secrets) |
| **Places API (New)** | `searchPlaces` tool — find restaurants, hotels, etc. | `GOOGLE_MAPS_API_KEY` (Supabase secrets) |
| **Routes API** | `getDirectionsETA` tool — drive time, distance | `GOOGLE_MAPS_API_KEY` |
| **Maps Embed API** | Map widgets in chat responses | `VITE_GOOGLE_MAPS_API_KEY` (frontend) |
| **Geocoding API** | Address ↔ coordinates (timezone, location bias) | `GOOGLE_MAPS_API_KEY` |

### ✅ Useful for Concierge (Optional / Future)

| API | Potential Use | Status |
|-----|---------------|--------|
| **Cloud Translation API** | Multi-language concierge responses | Not wired — future i18n |
| **Cloud Vision API** | Receipt OCR (`process-receipt-ocr`) | `GOOGLE_VISION_API_KEY` — separate from concierge |
| **Custom Search API** | Web search fallback | Used via `googleSearch` tool in Gemini — no separate key |
| **Maps Grounding Lite API** | Enhanced place grounding | May be used by Gemini `googleMaps` tool — check model support |
| **Directions API** | Legacy directions | Replaced by Routes API in `functionExecutor` |
| **Distance Matrix API** | Multi-stop routing | Not currently wired |

### ❌ Not Used by Concierge

| API | Why |
|-----|-----|
| **Cloud Speech-to-Text API** | Gemini Live does **native audio** — no separate STT |
| **Gemini for Google Cloud API** | Vertex AI product — we use **Google AI** (`generativelanguage`) |
| **Gemini Cloud Assist API** | Different product — not in our stack |
| **Dialogflow API** | Not used — we use Gemini directly |
| **Maps 3D SDK, Navigation SDK** | Client-side map features — separate from concierge |

---

## 3. Required APIs for Full-Featured Concierge

### Minimum (Voice + Text + Multimodal)

1. **Generative Language API** — Core Gemini (text, voice, images)
2. **GEMINI_API_KEY** from Google AI Studio, set in Supabase secrets

### Full-Featured (Maps, Places, Directions)

3. **Places API (New)** — `searchPlaces` tool
4. **Routes API** — `getDirectionsETA` tool
5. **Geocoding API** — Timezone, location context
6. **GOOGLE_MAPS_API_KEY** in Supabase secrets (server-side)
7. **VITE_GOOGLE_MAPS_API_KEY** in frontend (Maps JS, Places Autocomplete)

---

## 4. Step-by-Step Enablement Plan

### Phase 1: Fix Voice & Text Concierge Connection

1. **Get a Gemini API key from Google AI Studio**
   - Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   - Create or copy an API key
   - Ensure it has **no restrictions** or is restricted only to **Generative Language API**

2. **Enable Generative Language API** (if not already)
   - [Cloud Console → APIs & Services → Library](https://console.cloud.google.com/apis/library)
   - Search "Generative Language API" → Enable
   - Your AI Studio key is tied to a GCP project — enable the API in that project

3. **Set GEMINI_API_KEY in Supabase**
   ```bash
   supabase secrets set GEMINI_API_KEY=your_ai_studio_key_here
   ```

4. **Redeploy Edge Functions**
   ```bash
   supabase functions deploy gemini-voice-session
   supabase functions deploy lovable-concierge
   ```

5. **Verify**
   - `GET https://<project>.supabase.co/functions/v1/gemini-voice-session` (no auth) → `{ configured: true }`
   - Tap mic in Concierge → should transition from "Connecting..." to "Listening"

### Phase 2: Enable Maps & Places for Concierge Tools

1. **Create or use a Google Cloud API key** (GCP Console → Credentials)
   - Same project as your Maps/Places APIs
   - Enable: **Places API (New)**, **Routes API**, **Geocoding API**
   - Restrict key to these APIs if desired (or use unrestricted for dev)

2. **Set GOOGLE_MAPS_API_KEY in Supabase**
   ```bash
   supabase secrets set GOOGLE_MAPS_API_KEY=your_gcp_maps_key_here
   ```

3. **Redeploy functions that use it**
   ```bash
   supabase functions deploy lovable-concierge
   supabase functions deploy google-maps-proxy
   supabase functions deploy venue-enricher
   ```

4. **Verify**
   - Ask Concierge: "Find Italian restaurants near me" → should use `searchPlaces`
   - Ask: "How long to drive from LAX to downtown LA?" → should use `getDirectionsETA`

### Phase 3: Frontend Maps (Places Tab, Map Widgets)

1. **Set VITE_GOOGLE_MAPS_API_KEY** in Vercel / `.env`
   - Same key as above or a separate key with Maps JavaScript API, Places API, Geocoding API

2. **Enable** (you likely have these):
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Maps Embed API (for embedded map widgets)

---

## 5. Key Restrictions to Avoid

| Restriction | Problem |
|-------------|---------|
| **HTTP referrer** | Blocks server-side calls from Supabase Edge Functions |
| **IP address** | Supabase Edge Functions use dynamic IPs — avoid IP restriction |
| **API restrictions** | Ensure **Generative Language API** for GEMINI key; **Places API**, **Routes API**, **Geocoding API** for Maps key |

**Recommended for GEMINI_API_KEY:** Unrestricted, or restrict to "Generative Language API" only.

---

## 6. Quick Checklist

- [ ] GEMINI_API_KEY from Google AI Studio (not just Cloud Console)
- [ ] Generative Language API enabled for that key's project
- [ ] GEMINI_API_KEY set in Supabase secrets
- [ ] gemini-voice-session + lovable-concierge redeployed
- [ ] GOOGLE_MAPS_API_KEY set in Supabase (for searchPlaces, directions)
- [ ] Places API (New), Routes API, Geocoding API enabled
- [ ] VITE_GOOGLE_MAPS_API_KEY set for frontend Maps/Places

---

## 7. Summary: What "Enabling APIs" Actually Does

Enabling APIs in Cloud Console **allows** your API keys to call those services. It does **not**:

- Automatically wire the concierge to use them (code already does for Places, Routes, etc.)
- Fix a wrong or missing `GEMINI_API_KEY` (voice will still fail)
- Replace the need for keys in Supabase secrets vs. frontend env

The concierge **already knows how** to use searchPlaces, getDirectionsETA, addToCalendar, etc. — it needs the **correct keys in the correct places** and the **right APIs enabled** for those keys.
