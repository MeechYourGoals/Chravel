# AI Concierge Timeout & Voice Root Cause Analysis

## 1. Request Timeout — Root Cause

### Flow
1. **Client** sends request → `invokeConciergeStream` (fetch to lovable-concierge)
2. **Client timeout**: 60s (was 45s) — if no chunks arrive, abort and show "Request timed out"
3. **Backend** lovable-concierge:
   - **Pre-flight** (parallel): membership, usage plan, TripContextBuilder, RAG, privacy
   - **TripContextBuilder** — heaviest (~2–5s): multiple Supabase queries
   - **RAG** — keyword search on kb_chunks (trip-scoped)
   - **Gemini streaming** — 50s server timeout, 40s follow-up

### Root Causes
1. **Context building latency** — TripContextBuilder.buildContext is the heaviest (~2–5s)
2. **RAG retrieval** — runs for trip-scoped/artifact queries; adds 1–3s
3. **Real-time queries** — e.g. "Becky Robinson's tour dates" — needed `tour`/`upcoming` in isRealtimeQuery to enable Google Search grounding for faster, accurate answers
4. **Google Search grounding** — when enabled, adds latency but improves accuracy for real-time data
5. **Client timeout** — 45s was too aggressive for complex queries; increased to 60s

### Fixes Applied
- **Client**: Increased `FAST_RESPONSE_TIMEOUT_MS` from 45s to 60s
- **Backend**: Added `tour`, `upcoming`, `tour dates` to `isRealtimeQuery` regex so artist/event queries get Google Search grounding
- **Model**: Already using `gemini-3-flash-preview` (fast path)

### Recommendations for Further Optimization
- Consider "fast path" for simple queries: skip full context when query is clearly general (e.g. web search only)
- Add server-side streaming of a "thinking" placeholder before first chunk
- Monitor TripContextBuilder latency; consider caching or lazy-loading non-critical context

---

## 2. Microphone Spinning Circle — Root Cause

### Flow
1. User clicks mic → `toggleVoice` → `geminiStartSession` (if Gemini Live) or `toggleWebSpeechVoice` (Web Speech fallback)
2. **Gemini Live path**:
   - `setState('connecting')` — spinner shown
   - Call `gemini-voice-session` edge function
   - Open WebSocket to Gemini; wait for `setupComplete`
   - If 403: voice not enabled for account (free tier)
3. **Web Speech path**:
   - `setState('connecting')`
   - `getUserMedia({ audio: true })` — waits for user to allow mic
   - `recognition.start()` → `onstart` → `setState('listening')`

### Root Causes
1. **gemini-voice-session hang** — No timeout; if edge function is slow or fails silently, client waits forever
2. **403 not handled** — Free users get "Voice concierge is not enabled for this account"; error handling was generic
3. **WebSocket setupComplete never arrives** — Ephemeral token flow can stall if Gemini API is slow; no timeout
4. **getUserMedia hang** — If user never responds to permission prompt, stays in "connecting"

### Fixes Applied
- **useGeminiLive**: 15s timeout on `gemini-voice-session` invocation
- **useGeminiLive**: 15s timeout for WebSocket `setupComplete`; abort and show error if not received
- **useGeminiLive**: Improved 403 handling — show "Voice requires a Pro subscription. Upgrade to use voice."
- **useWebSpeechVoice**: 15s timeout on `getUserMedia` — show "Microphone permission timed out" if user never responds

---

## 3. AI Avatar — Change to Bluish-Green Gradient

- **Before**: `from-blue-500 to-purple-500`
- **After**: `from-blue-500 to-emerald-500` (matches Chravel header branding)

---

## 4. Chat Window Height

- Added `min-h-[280px]` to chat messages container so multiple messages are visible without excessive scrolling

---

## Regression Risk: LOW
## Rollback Strategy: Revert commits; timeout constants and regex can be reverted independently.
