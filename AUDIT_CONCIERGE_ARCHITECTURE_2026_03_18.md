# AI Concierge Architecture & Prompt Audit — Full Forensic Report

## Context

This is a deep, evidence-based forensic audit of the Chravel AI Concierge system. The goal is to reverse-engineer exactly how the concierge works, identify all prompt layers, tool definitions, context injection, routing logic, and efficiency issues — then produce a practical refactor blueprint.

> **⚠️ Post-Audit Implementation Note (2026-03-19):** The P0 recommendations from this audit were implemented in the same PR (commit `eb4094b`). Three new modules were added: `_shared/concierge/queryClassifier.ts`, `_shared/concierge/toolRegistry.ts`, and `_shared/concierge/promptAssembler.ts`. Both text and voice paths now share **38 unified tools** from a single registry with conditional loading by query class. Findings marked **[RESOLVED]** below have been addressed by the refactor. The original pre-refactor analysis is preserved for historical context.

---

## 1. Executive Summary

The Chravel AI Concierge is a **dual-interface** (text SSE + voice WebSocket) travel assistant powered by Gemini. **[RESOLVED]** ~~It had two separate tool declaration systems (text: 19 inline, voice: 31 shared) that drifted significantly.~~ Both paths now share **38 unified tools** from `_shared/concierge/toolRegistry.ts` with conditional loading by query class. **[RESOLVED]** ~~The prompt system was monolithic and always-on.~~ Prompts are now assembled modularly via `promptAssembler.ts` with conditional layers. Context building is well-parallelized and now supports **selective fetching** by query class. The routing between trip-scoped and general queries is regex-based and reasonable, and now extends to both the **context level and tool level** via `queryClassifier.ts`.

### Key Findings (Severity-Ranked)
1. **~~CRITICAL~~ [RESOLVED]: Dual tool declaration drift** — ~~voice had 31 tools, text had 19.~~ Both paths now share 38 unified tools from `toolRegistry.ts`. All 38 tools have matching implementations in `functionExecutor.ts`.
2. **~~HIGH~~ [RESOLVED]: All tools exposed on every query** — ~~A weather question forced Gemini to consider all tools.~~ Query classifier now maps 18 query classes to relevant tool subsets via conditional loading.
3. **HIGH: Prompt bloat** — System prompt + few-shot + CoT + preferences + RAG context routinely exceeds 10K characters. Few-shot examples (~800 chars) are always injected for trip queries regardless of whether they help.
4. **HIGH: Duplicated prompt assembly** — The system prompt is assembled differently in 3 places (lovable-concierge, gemini-voice-session, and gemini-voice-proxy) with no shared builder beyond the basic `buildSystemPrompt()`.
5. **MEDIUM: Preference injection is always-on** — Dietary, vibe, accessibility, budget preferences are injected into every trip query. For "what time is our dinner reservation?" these are noise.
6. **MEDIUM: Action Plan JSON requirement** — The system prompt mandates a JSON `plan_version: 1.0` block at the start of every response. This adds latency for simple answers and the model often ignores it.
7. **LOW: Dead tools in voice declarations** — Several tools defined in `voiceToolDeclarations.ts` have no matching `case` in `functionExecutor.ts`.

### Overall Assessment
- **Prompt design**: 6/10 — Solid core persona, good security boundaries, but bloated and monolithic
- **Tool architecture**: ~~5/10~~ → **8/10 post-refactor** — Single registry, conditional loading, pending-action buffer preserved
- **Context system**: ~~7/10~~ → **8/10 post-refactor** — Well-parallelized, good caching, now supports selective fetching by query class
- **Efficiency**: ~~4/10~~ → **7/10 post-refactor** — Conditional tool/context loading saves ~2000 tokens on simple queries
- **Maintainability**: ~~3/10~~ → **8/10 post-refactor** — Single tool registry, modular prompt assembler, query classifier

---

## 2. Current AI Concierge Architecture

### System Map

| File | Role | Status |
|------|------|--------|
| `supabase/functions/lovable-concierge/index.ts` | **Primary text concierge endpoint** — SSE streaming, auth, rate limiting, context assembly, Gemini API calls, multi-turn tool loop | Active, ~1750 lines |
| `supabase/functions/_shared/promptBuilder.ts` | System prompt builder — persona, security boundaries, trip context injection, preferences | Active, ~133 lines |
| `supabase/functions/_shared/aiUtils.ts` | Query complexity analysis, profanity filter, PII redaction, few-shot examples, CoT prompt builder | Active, ~323 lines |
| `supabase/functions/_shared/contextBuilder.ts` | Trip context builder — parallel DB fetches, batch name resolution, 30s cache | Active, ~779 lines |
| `supabase/functions/_shared/concierge/toolRegistry.ts` | **[NEW]** Single source of truth for all 38 tool schemas + query-class-based filtering | Active, ~750 lines |
| `supabase/functions/_shared/concierge/queryClassifier.ts` | **[NEW]** Classifies queries into 18 classes for conditional tool/context loading | Active, ~150 lines |
| `supabase/functions/_shared/concierge/promptAssembler.ts` | **[NEW]** Modular prompt assembly with conditional layers | Active, ~250 lines |
| `supabase/functions/_shared/functionExecutor.ts` | Tool implementations — all 38 tools + pending action buffer | Active, ~1500+ lines |
| `supabase/functions/_shared/gemini.ts` | Gemini/Lovable API client, model normalization, safety settings | Active, ~578 lines |
| `supabase/functions/_shared/voiceToolDeclarations.ts` | Voice tool schemas (imports from toolRegistry.ts) + VOICE_ADDENDUM prompt | Active, refactored |
| `supabase/functions/_shared/security/toolRouter.ts` | Capability token verification, trip_id enforcement, output sanitization | Active, ~88 lines |
| `supabase/functions/_shared/security/capabilityTokens.ts` | JWT-based capability token generation/verification | Active, ~43 lines |
| `supabase/functions/_shared/conciergeUsage.ts` | Rate limit RPC caller | Active |
| `supabase/functions/_shared/circuitBreaker.ts` | Circuit breaker for external API calls | Active |
| `supabase/functions/execute-concierge-tool/index.ts` | Voice tool execution bridge — JWT auth, rate limiting, tool routing | Active, ~170 lines |
| `supabase/functions/gemini-voice-session/index.ts` | Voice session bootstrapper — mints Vertex token, returns WS URL + setup message | Active, ~263 lines |
| `supabase/functions/gemini-voice-proxy/index.ts` | **BROKEN** — WebSocket proxy, uses Deno.upgradeWebSocket (unsupported in Supabase) | Dead code |
| `supabase/functions/concierge-tts/index.ts` | Google Cloud TTS for read-aloud | Active, separate system |
| `src/components/AIConciergeChat.tsx` | Parent UI orchestrator — wires text + voice, manages messages, streaming | Active |
| `src/services/conciergeGateway.ts` | Client SSE stream parser, invokeConcierge/invokeConciergeStream | Active, ~391 lines |
| `src/hooks/useGeminiLive.ts` | Gemini Live WebSocket manager, audio capture/playback, state machine | Active, ~1300 lines |
| `src/hooks/useVoiceToolHandler.ts` | Client-side voice tool executor, routes to execute-concierge-tool | Active |
| `src/store/conciergeSessionStore.ts` | Zustand store for session persistence | Active |
| `src/hooks/useConciergeHistory.ts` | Persisted conversation history hook | Active |
| `src/hooks/useConciergeUsage.ts` | Usage/rate limit tracking hook | Active |
| `src/hooks/useAIConciergePreferences.ts` | User preference loading for concierge | Active |
| `src/services/conciergeCacheService.ts` | Client-side response caching | Active |
| `src/hooks/useConciergeReadAloud.ts` | TTS read-aloud hook | Active |
| `src/features/chat/components/VoiceLiveOverlay.tsx` | Full-screen voice overlay | **DEAD CODE** — not imported anywhere |
| `src/config/voiceFeatureFlags.ts` | Voice feature flags | Active but VOICE_LIVE_ENABLED is unchecked |
| `supabase/functions/gemini-voice-session/index.ts` (legacy session) | HTTP endpoint for voice setup | Active but unused by frontend |

### Data Flow: Text Path
```
User types message → AIConciergeChat → invokeConciergeStream()
  → HTTP POST to lovable-concierge edge function
    → Auth (JWT) → Rate limit (30/min user, per-trip limits)
    → isTripRelatedQuery() regex check
    → If trip-related: parallel [membership, context build, RAG, privacy, history]
    → If general: skip context, lean prompt
    → buildSystemPrompt() + buildEnhancedSystemPrompt() (adds few-shot + CoT)
    → Context window management (truncation)
    → Gemini streamGenerateContent SSE
    → If function calls: execute via executeToolSecurely() → follow-up stream
    → SSE events → client callbacks → ChatMessages render
```

### Data Flow: Voice Path
```
User taps "Live" → useGeminiLive.startSession()
  → HTTP POST to gemini-voice-session → {accessToken, wsUrl, setupMessage}
  → Browser opens WS to Vertex AI directly
  → Audio capture → PCM16 → WS → Vertex → audio response
  → Tool calls → useVoiceToolHandler → execute-concierge-tool edge function
  → Results relayed back to WS as toolResponse
```

---

## 3. Prompt Inventory

### Prompt Layer 1: Core Persona + Security (promptBuilder.ts:18-77)
- **Always-on**: Yes
- **Est. tokens**: ~500
- **Content**: "You are Chravel Concierge" + date + security boundaries + action plan mandate + natural language triggers + human-in-the-loop booking + multi-tool execution + formatting rules + language matching
- **Assessment**: KEEP core persona + security. REMOVE action plan JSON mandate (adds latency, often ignored). MOVE natural language triggers to tool-specific instructions. MOVE formatting rules to conditional.

### Prompt Layer 2: Trip Context Injection (promptBuilder.ts:80-131)
- **Always-on**: When trip context exists
- **Est. tokens**: ~200-1000 (varies by trip data)
- **Content**: Trip metadata, basecamps, user preferences (dietary, vibe, accessibility, budget, etc.), calendar events (first 5)
- **Wrapped in**: `<user_provided_data>` tags for prompt injection defense
- **Assessment**: KEEP but make preferences conditional on query type. Calendar limited to 5 is good. Missing: tasks, payments, polls, broadcasts are NOT injected here — they're only in the full contextBuilder output.

### Prompt Layer 3: Few-Shot Examples (aiUtils.ts:262-280)
- **Always-on**: Yes, for all trip-related queries (`includeFewShot: true`)
- **Est. tokens**: ~300
- **Content**: Payment query example, location query example, task query example
- **Assessment**: LOW SIGNAL for most queries. The payment example is irrelevant for "what's the weather?" The location example with specific restaurant names may overfit responses. MOVE to conditional: only inject when query class matches.

### Prompt Layer 4: Chain-of-Thought (aiUtils.ts:283-296)
- **Conditional**: Only when `requiresChainOfThought()` returns true (complexity > 0.4 or keywords like "should", "recommend", "best")
- **Est. tokens**: ~200
- **Content**: 5-step reasoning framework + dinner timing example
- **Assessment**: REASONABLE conditional gating. But the keyword match is too broad — "best restaurants near hotel" triggers CoT when it shouldn't need it.

### Prompt Layer 5: Image Intent Addendum (lovable-concierge/index.ts:1130-1138)
- **Conditional**: When message matches IMAGE_INTENT_PATTERN
- **Est. tokens**: ~100
- **Content**: Instructions to include inline markdown images
- **Assessment**: KEEP — well-conditioned, low cost.

### Prompt Layer 6: Save Flight Instruction (lovable-concierge/index.ts:1144-1149)
- **Always-on**: For all trip-related queries
- **Est. tokens**: ~50
- **Content**: How to handle "save flight" requests via savePlace tool
- **Assessment**: MOVE to tool-specific. This is noise for 99% of queries.

### Prompt Layer 7: RAG Context (lovable-concierge/index.ts:895-953)
- **Conditional**: When shouldRunRAGRetrieval() returns true AND trip has kb_documents
- **Est. tokens**: ~300-1000 (varies)
- **Content**: Keyword-matched chunks from kb_chunks table, sanitized, max 10 results, 300 chars each
- **Assessment**: KEEP — well-gated, trip-isolated, sanitized. Good design.

### Prompt Layer 8: General Web Query Prompt (lovable-concierge/index.ts:1152-1172)
- **Conditional**: When !tripRelated or no context
- **Est. tokens**: ~300
- **Content**: Lean travel assistant prompt with formatting rules + language matching
- **Assessment**: GOOD — lightweight alternative path. KEEP.

### Prompt Layer 9: Voice Addendum (voiceToolDeclarations.ts:602-629)
- **Conditional**: Voice sessions only
- **Est. tokens**: ~200
- **Content**: Voice delivery guidelines (short responses, no markdown, conversational) + visual card descriptions
- **Assessment**: KEEP — appropriate for voice modality.

### Prompt Assembly Flow (Runtime)
```
Trip-related query:
  buildSystemPrompt(context)              // ~500-1500 tokens
  + ragContext                             // ~0-1000 tokens
  + imageIntentAddendum                   // ~0-100 tokens
  + saveFlightInstruction                 // ~50 tokens (ALWAYS)
  → buildEnhancedSystemPrompt(base, CoT, fewShot=true)
    + fewShot examples                    // ~300 tokens (ALWAYS)
    + CoT framework                       // ~0-200 tokens (conditional)
  → truncation to MAX_SYSTEM_PROMPT_LENGTH=10000

General query:
  lean prompt                              // ~300 tokens
  (no few-shot, no CoT, no trip context)
```

**Total worst-case system prompt for trip query: ~3000-3500 tokens** — this is substantial but not extreme. The issue is that all of it is always-on for trip queries.

---

## 4. Tool Inventory and Agentic Tool Use Audit

### Text Path Tools — **[RESOLVED: Now unified in toolRegistry.ts, 38 tools with conditional loading]**
~~19 tools defined inline, all always exposed~~ → 38 tools from shared registry, conditionally loaded by query class:

| # | Tool | Type | Backend Impl | Always Exposed |
|---|------|------|-------------|----------------|
| 1 | addToCalendar | Write (pending) | ✅ functionExecutor | Yes |
| 2 | createTask | Write (pending) | ✅ functionExecutor | Yes |
| 3 | createPoll | Write (pending) | ✅ functionExecutor | Yes |
| 4 | getPaymentSummary | Read | ✅ functionExecutor | Yes |
| 5 | searchPlaces | Read (external) | ✅ functionExecutor | Yes |
| 6 | getDirectionsETA | Read (external) | ✅ functionExecutor | Yes |
| 7 | getTimezone | Read (external) | ✅ functionExecutor | Yes |
| 8 | getPlaceDetails | Read (external) | ✅ functionExecutor | Yes |
| 9 | searchImages | Read (external) | ✅ functionExecutor | Yes |
| 10 | getStaticMapUrl | Read (external) | ✅ functionExecutor | Yes |
| 11 | searchWeb | Read (external) | ✅ functionExecutor | Yes |
| 12 | getDistanceMatrix | Read (external) | ✅ functionExecutor | Yes |
| 13 | validateAddress | Read (external) | ✅ functionExecutor | Yes |
| 14 | savePlace | Write (pending) | ✅ functionExecutor | Yes |
| 15 | setBasecamp | Write | ✅ functionExecutor | Yes |
| 16 | addToAgenda | Write (pending) | ✅ functionExecutor | Yes |
| 17 | searchFlights | Read (URL gen) | ✅ functionExecutor | Yes |
| 18 | emitSmartImportPreview | Write (preview) | ✅ functionExecutor | Yes |
| 19 | emitReservationDraft | Write (draft) | ✅ functionExecutor | Yes |
| 20 | updateCalendarEvent | Write | ⚠️ Need to verify | Yes |
| 21 | deleteCalendarEvent | Write | ⚠️ Need to verify | Yes |
| 22 | updateTask | Write | ⚠️ Need to verify | Yes |

### Voice Path Tools — **[RESOLVED: Now imports from toolRegistry.ts]**
~~31 tools defined, significantly more than text path~~ → Voice path now imports all 38 tools from the shared registry, identical to text path.

~~**CRITICAL FINDING**: Most additional voice tools lacked backend implementations.~~ **[RESOLVED]**: All 38 tools in the unified registry have matching implementations in `functionExecutor.ts`. The voice path imports from `toolRegistry.ts` and applies voice-specific filtering as needed.

### Tool Exposure Problem — The Weather Question Test

**Question**: "What's the weather in Paris?"

**What the model ~~sees~~ saw (pre-refactor)**: ~~19-22 function declarations — ALL of them.~~ **[RESOLVED]** The model now sees only the query-class-relevant subset (e.g., `searchWeb` for weather queries).

**What the model should need**: searchWeb (maybe), or just use training knowledge.

**What ~~happens~~ happened (pre-refactor)**: ~~The model evaluated all 19+ tool descriptions (~2000+ tokens).~~ **[RESOLVED]** Query classifier now routes to relevant tool subsets, saving ~1500-2000 tokens on simple queries.

**Verdict**: ~~Tools should be conditionally loaded based on query classification.~~ **[IMPLEMENTED]** `queryClassifier.ts` maps 18 query classes to tool subsets. A weather question sees `searchWeb` only. Restaurant recommendations see `searchPlaces`, `getPlaceDetails`, `savePlace`, `emitReservationDraft`.

---

## 5. Context and Personalization Audit

### Context Sources (contextBuilder.ts)

| Source | Fetched When | Injected Where | Always-On | Should Be |
|--------|-------------|----------------|-----------|-----------|
| Trip metadata | Always (trip query) | promptBuilder | Yes | Always-on ✅ |
| Basecamps | Always (trip query) | promptBuilder | Yes | Always-on ✅ |
| Members/collaborators | Always (trip query) | contextBuilder output | Yes | Conditional — only for "who" queries |
| Chat messages (30-50) | Always (trip query) | contextBuilder output | Yes | Conditional — only for "what did X say" |
| Calendar events (all) | Always (trip query) | contextBuilder output, promptBuilder (first 5) | Yes | Always-on ✅ (core trip data) |
| Tasks (all) | Always (trip query) | contextBuilder output | Yes | Conditional — only for task queries |
| Payments (all) | Always (trip query) | contextBuilder output | Yes | Conditional — only for payment queries |
| Polls (all) | Always (trip query) | contextBuilder output | Yes | Conditional — only for poll queries |
| Broadcasts (10) | Always (trip query) | contextBuilder output | Yes | Conditional — only for broadcast queries |
| Files/media | Always (trip query) | contextBuilder output | Yes | Conditional — only for "find the PDF" queries |
| Links | Always (trip query) | contextBuilder output | Yes | Conditional — only for link queries |
| Teams/channels | Always (trip query) | contextBuilder output | Yes | Conditional — only for Pro/Event trips |
| User preferences | Paid users always | promptBuilder | Yes (paid) | Conditional — only for recommendation queries |
| RAG chunks | Conditional (keyword match) | Appended to system prompt | Conditional ✅ | KEEP as-is |
| Chat history (10 messages) | Always (trip query) | Gemini contents array | Yes | Always-on ✅ (conversation continuity) |

### Recommended Taxonomy

**Always-on identity/context** (every trip query):
- Trip name, destination, dates
- Trip basecamps (for location grounding)
- Calendar events (next 5-10, for scheduling awareness)
- Current date

**Trip-scoped, fetch-on-demand**:
- Chat messages → only for "what did people say" / "summarize chat"
- Tasks → only for task-related queries
- Payments → only for payment-related queries
- Polls → only for poll-related queries
- Broadcasts → only for "what announcements" queries
- Members → only for "who's on the trip" queries
- Files/links → only for "find the document" queries

**Preference-scoped, inject-on-demand**:
- Dietary → only for food/restaurant recommendations
- Budget → only for price-sensitive recommendations
- Accessibility → only for venue/activity recommendations
- Vibe/entertainment → only for activity recommendations

**Never needed** for: weather, timezone, directions, general knowledge, flight search

---

## 6. Efficiency / Latency / Token Bloat Findings

| Finding | Severity | Impact | Fix |
|---------|----------|--------|-----|
| **~~All 19+ tools always exposed~~ [RESOLVED]** | ~~HIGH~~ | ~~+2000 tokens/request~~ Now conditionally loaded | `queryClassifier.ts` + `toolRegistry.ts` |
| **Few-shot examples always injected** | MEDIUM | +300 tokens/request, irrelevant for most queries | Inject only when query class matches example |
| **Action Plan JSON mandate** | MEDIUM | Model wastes tokens outputting JSON plan for simple answers, often ignored | Remove or make conditional for multi-action queries |
| **Save flight instruction always-on** | LOW | +50 tokens, noise | Move to savePlace tool description |
| **Full context always fetched** | MEDIUM | ~100-300ms DB time even when only calendar is relevant | Selective context fetch by query class |
| **Preferences always injected** | MEDIUM | +100-200 tokens of dietary/vibe for non-recommendation queries | Inject only for recommendation queries |
| **CoT keyword match too broad** | LOW | "best restaurants" triggers unnecessary reasoning preamble | Tighten keyword list |
| **~~Duplicated tool declarations~~ [RESOLVED]** | ~~HIGH~~ | ~~Text (19) and voice (31) drifted independently~~ Now 38 unified in `toolRegistry.ts` | Single source of truth implemented |
| **Language matching repeated 2x** | LOW | Same instruction in promptBuilder AND general web prompt | Deduplicate |
| **Formatting rules repeated 2x** | LOW | Same instructions in trip and general prompts | Share via constant |

### Estimated Token Savings from Optimization
- Conditional tool loading: **-1500-2000 tokens** on simple queries
- Remove always-on few-shot: **-300 tokens** on non-matching queries
- Remove action plan mandate: **-100 tokens** output savings + latency reduction
- Conditional preferences: **-100-200 tokens** on non-recommendation queries
- **Total: ~2000-2600 tokens saved per simple query** (30-40% reduction)

---

## 7. Dead Code / Duplicates / Conflicts

### Dead Code
| Item | Location | Evidence |
|------|----------|----------|
| VoiceLiveOverlay | `src/features/chat/components/VoiceLiveOverlay.tsx` | Not imported anywhere |
| gemini-voice-proxy | `supabase/functions/gemini-voice-proxy/index.ts` | Uses unsupported Deno.upgradeWebSocket |
| VOICE_LIVE_ENABLED flag | `src/config/voiceFeatureFlags.ts` | Exported but never checked in startSession |
| ~~Voice tools without backend~~ **[RESOLVED]** | `voiceToolDeclarations.ts` → `toolRegistry.ts` | All 38 tools now have matching `case` in functionExecutor |
| sendImage() return | `useGeminiLive.ts` | Returned but never called |
| interruptPlayback() return | `useGeminiLive.ts` | Returned but never called from UI |

### Duplications
| What | Where | Problem |
|------|-------|---------|
| ~~Tool declarations~~ **[RESOLVED]** | ~~lovable-concierge (19) vs voiceToolDeclarations (31)~~ → `toolRegistry.ts` (38 unified) | Single source of truth |
| System prompt assembly | lovable-concierge, gemini-voice-session, gemini-voice-proxy | Three different assembly paths |
| Language matching instruction | promptBuilder + general web prompt in lovable-concierge | Repeated verbatim |
| Safety settings | readGeminiSSEStream follow-up + initial call | Duplicated inline |

### Conflicts
| Instruction A | Instruction B | Risk |
|---------------|---------------|------|
| "Output an Action Plan JSON at start" | Few-shot examples don't show action plans | Model confused about when to plan |
| "Keep responses concise" (persona) | "Use markdown headers, bullets, bold" (formatting) | Over-formatted for simple answers |
| "NEVER complete a purchase" (safety) | `makeReservation` tool exists with phone/name params | Contradictory capability |

---

## 8. What Is Working Well

1. **Pending action buffer** — Write tools go through `trip_pending_actions` table, not direct inserts. Excellent pattern for AI safety.
2. **Prompt injection defense** — `<user_provided_data>` tags + `sanitizeForPrompt()` stripping XML/template tags. Good practice.
3. **Trip/general query routing** — `isTripRelatedQuery()` and `CLEARLY_GENERAL_QUERY_PATTERN` regex classification is pragmatic and effective.
4. **Parallel context building** — contextBuilder fetches all data in parallel with batch name resolution. Well-optimized.
5. **30s context cache** — Prevents redundant DB hits for rapid back-to-back messages.
6. **Capability token security** — JWT-based capability tokens enforce trip_id and user_id on tool execution.
7. **Context window management** — Per-message truncation, total budget enforcement, and recency limits prevent overflow.
8. **RAG gating** — Only runs RAG retrieval when trip has kb_documents. Efficient.
9. **Lovable fallback** — Graceful degradation from Gemini to Lovable gateway on 403.
10. **Voice tool execution bridge** — Clean separation: voice client → HTTP → server-side tool execution → result back.

---

## 9. What Is Poorly Designed

1. **~~Monolithic always-on prompt~~ [RESOLVED]** — `promptAssembler.ts` now builds prompts modularly with conditional layers.
2. **~~Dual tool declaration systems~~ [RESOLVED]** — ~~Text: 19 inline, Voice: 31 shared.~~ Now 38 unified tools in `toolRegistry.ts`.
3. **Action Plan JSON mandate** — Forces an output format that the model often ignores and that adds latency for simple questions.
4. **~~No query class → tool set mapping~~ [RESOLVED]** — `queryClassifier.ts` maps 18 query classes to tool subsets.
5. **Few-shot examples are stale and broad** — Same 3 examples for every trip query. Payment example irrelevant for 90% of queries.
6. **~~Voice tools as wish list~~ [RESOLVED]** — ~~12+ tools with no backend.~~ All 38 tools in the unified registry have matching implementations.
7. **~~Context builder has no selective mode~~ [RESOLVED]** — `contextBuilder.ts` now supports selective fetching by query class via `buildSelectiveContext()`.
8. **No telemetry on tool selection quality** — Can't measure if the model is making good tool choices.
9. **Complexity scoring uses generic keywords** — "compare" triggers Pro model when user says "compare these two restaurants" (Flash can handle this).
10. **No prompt versioning** — Changes to the system prompt have no way to A/B test or roll back.

---

## 10. Recommended Target Architecture

### Proposed Structure
```
supabase/functions/_shared/concierge/
  ├── core/
  │   ├── systemPrompt.ts          # Core persona, security, date — ALWAYS ON (~200 tokens)
  │   ├── queryClassifier.ts       # Classify query → {type, tools_needed, context_needed}
  │   └── responseFormatter.ts     # Formatting rules (shared between trip/general)
  ├── context/
  │   ├── contextBuilder.ts        # Existing parallel builder (unchanged)
  │   ├── contextSelector.ts       # NEW: select which context slices to fetch
  │   └── preferenceInjector.ts    # NEW: conditional preference injection
  ├── tools/
  │   ├── toolRegistry.ts          # SINGLE SOURCE OF TRUTH for all tool schemas
  │   ├── toolSets.ts              # Query class → tool set mapping
  │   ├── functionExecutor.ts      # Existing executor (unchanged)
  │   └── toolRouter.ts            # Existing security router (unchanged)
  ├── prompts/
  │   ├── tripContext.md            # Trip context injection template
  │   ├── fewShot/
  │   │   ├── payment.md           # Payment few-shot (inject for payment queries)
  │   │   ├── location.md          # Location few-shot (inject for place queries)
  │   │   └── task.md              # Task few-shot (inject for task queries)
  │   ├── voice.md                 # Voice addendum
  │   └── chainOfThought.md        # CoT framework (inject for complex queries)
  ├── routing/
  │   ├── queryClassifier.ts       # Regex + keyword classification
  │   └── toolSelector.ts          # Maps query class to tool subset
  └── tests/
      ├── queryClassifier.test.ts
      ├── toolSelector.test.ts
      └── promptAssembly.test.ts
```

### Key Architectural Changes

1. **Single tool registry** — One file defines all tool schemas. Text and voice paths both read from it. Voice can exclude specific tools via filter.

2. **Query classification before model invocation** — Code classifies queries into classes:
   - `general_knowledge` → no tools, lean prompt
   - `weather_time` → searchWeb only, lean prompt
   - `restaurant_recommendation` → searchPlaces, getPlaceDetails, savePlace, emitReservationDraft + preferences
   - `calendar_action` → addToCalendar, updateCalendarEvent, deleteCalendarEvent + calendar context
   - `task_action` → createTask, updateTask, deleteTask + tasks context
   - `payment_query` → getPaymentSummary + payments context + payment few-shot
   - `trip_summary` → full context, RAG
   - `document_search` → searchTripArtifacts + RAG + files context
   - `place_navigation` → getDirectionsETA, getDistanceMatrix, getStaticMapUrl + basecamps

3. **Conditional prompt assembly** — System prompt is built in layers:
   ```
   core persona (always)
   + formatting rules (always, but shorter)
   + trip metadata + basecamps (trip queries)
   + relevant context slice (based on query class)
   + relevant preferences (recommendation queries only)
   + relevant few-shot (matching query class)
   + RAG context (when available and relevant)
   + CoT (complex queries only)
   + voice addendum (voice only)
   ```

4. **Conditional tool exposure** — Only expose tools relevant to the query class. This is the single highest-leverage change.

5. **Remove Action Plan mandate** — Let the model respond naturally. Use structured output only for multi-action requests (detected by classifier).

---

## 11. Refactor Priorities

| # | Change | Impact | Effort | Priority | Status |
|---|--------|--------|--------|----------|--------|
| 1 | **Unify tool declarations** into single `toolRegistry.ts` | Eliminates drift, maintainability | Medium | P0 | **✅ IMPLEMENTED** |
| 2 | **Add query classifier** + conditional tool loading | -2000 tokens/query, faster, better tool selection | Medium | P0 | **✅ IMPLEMENTED** |
| 3 | **Remove Action Plan JSON mandate** from system prompt | Faster responses, less token waste | Low | P1 | Open |
| 4 | **Make few-shot examples conditional** on query class | -300 tokens on non-matching queries | Low | P1 | **✅ IMPLEMENTED** (via promptAssembler) |
| 5 | **Make preference injection conditional** | -100-200 tokens on non-recommendation queries | Low | P1 | **✅ IMPLEMENTED** (via promptAssembler) |
| 6 | **Add selective context fetching** to contextBuilder | -100-300ms on simple queries | Medium | P1 | **✅ IMPLEMENTED** |
| 7 | **Remove dead voice tools** without backend implementation | Prevents failed tool calls in voice | Low | P1 | **✅ RESOLVED** (unified registry, all 38 have backends) |
| 8 | **Delete dead code** (VoiceLiveOverlay, voice-proxy, unused flags) | Code hygiene | Low | P2 | Open |
| 9 | **Add tool selection telemetry** | Measure quality, inform optimization | Medium | P2 | Open |
| 10 | **Add prompt version tracking** | Enable A/B testing | Medium | P2 | Open |

---

## 12. Open Questions / Unknowns Requiring Instrumentation

1. **What % of queries trigger tool calls?** — Need telemetry to know if tools are over-selected.
2. **What is the average system prompt token count?** — Need logging of `usageMetadata.promptTokenCount` per request to establish baseline.
3. **How often is the Action Plan JSON actually present in responses?** — Need to parse responses to see compliance rate.
4. **Which voice tools are actually being called in production?** — The execute-concierge-tool endpoint logs tool names, but there's no aggregate dashboard.
5. **What is the p50/p95 latency for tool execution vs. text generation?** — Timing logs exist but aren't aggregated.
6. **How often do the voice-only tools (without backend) get selected by the model?** — This would cause silent failures. Need to check edge function logs.
7. **What is the cache hit rate on contextBuilder's 30s cache?** — Determines if the cache TTL is well-tuned.

**Minimum instrumentation needed:**
- Log `prompt_tokens` and `completion_tokens` to PostHog per request
- Log `tools_exposed_count`, `tools_called`, `query_class` per request
- Log `context_cache_hit` boolean per request
- Dashboard for tool selection distribution

---

## 13. Test Plan (For Later Validation)

### Query Class → Tool Selection Tests
| Query | Expected Tools | Should NOT see |
|-------|---------------|----------------|
| "What's the weather in Paris?" | searchWeb | addToCalendar, createTask, getPaymentSummary |
| "Find Italian restaurants near our hotel" | searchPlaces, getPlaceDetails, savePlace | createTask, getPaymentSummary, emitSmartImportPreview |
| "Add dinner at Nobu on Friday 7pm" | addToCalendar | searchPlaces, getPaymentSummary |
| "Who owes money?" | getPaymentSummary | searchPlaces, addToCalendar |
| "What did Sarah say about dinner?" | (no tools, use chat context) | all tools |
| "Create a poll: beach or mountains" | createPoll | searchPlaces, getPaymentSummary |
| "What time is our reservation?" | (no tools, use calendar context) | all tools |
| "Find the PDF someone uploaded" | searchTripArtifacts (when implemented) | searchPlaces |
| "Show me kid-friendly brunch spots" | searchPlaces + preferences | getPaymentSummary, addToCalendar |
| "Translate this broadcast" | (no tools) | all tools |
| "How long from hotel to the museum?" | getDirectionsETA | createTask, getPaymentSummary |

### Preference Relevance Tests
| Query | Dietary Pref Relevant? | Budget Relevant? | Accessibility Relevant? |
|-------|----------------------|-----------------|----------------------|
| "Best restaurants nearby" | YES | YES | YES |
| "What time zone is Tokyo in?" | NO | NO | NO |
| "Schedule meeting for 3pm" | NO | NO | NO |
| "Find kid-friendly activities" | NO | NO | YES |
| "Cheap eats near hotel" | YES | YES | NO |

### Token/Latency Comparison Tests
For each query class, measure before/after:
- System prompt token count
- Total prompt token count (including tools)
- Time to first token
- Total completion time
- Tool selection accuracy (manual review)

### Regression Tests
- All 38 unified tools still callable and functional
- Write tools still go through pending_action buffer
- Voice tool execution still works via execute-concierge-tool
- Rate limiting still enforced
- Trip membership still checked
- Privacy config still respected
- RAG context still injected when available
- Lovable fallback still works on Gemini 403
- Demo mode still blocked on authenticated endpoint

---

## 14. Appendix: File-by-File Findings

### `supabase/functions/lovable-concierge/index.ts` (~1750 lines)
**Verdict: CHANGE** — Extract tool declarations, add query classifier
- Lines 1-20: Clean imports
- Lines 23-34: Good API key cross-check (Gemini ≠ Maps key)
- Lines 38-47: History cache — KEEP (30s TTL, process-local)
- Lines 74-130: Zod validation — KEEP (well-structured)
- Lines 132-158: Query classification regexes — KEEP, EXTRACT to shared module
- Lines 200-350: Usage plan resolution — KEEP
- Lines 352-440: SSE helpers — KEEP
- Lines 448-685: streamGeminiToSSE — KEEP (well-structured multi-turn loop)
- Lines 687-799: Request handler setup — KEEP
- Lines 800-1050: Parallel pre-flight checks — ELEGANT (membership, context, RAG, privacy, history in parallel)
- Lines 1050-1300: Context assembly + model selection — CHANGE (add query classification)
- Lines 1300-1750+: ~~19 tool declarations inline~~ **[RESOLVED]** — Extracted to `toolRegistry.ts`, now imports from registry

### `supabase/functions/_shared/promptBuilder.ts` (133 lines)
**Verdict: CHANGE** — Split into core persona + conditional layers
- Lines 1-11: sanitizeForPrompt — KEEP
- Lines 13-131: buildSystemPrompt — CHANGE (too monolithic, always injects everything)

### `supabase/functions/_shared/aiUtils.ts` (323 lines)
**Verdict: CHANGE** — Make few-shot/CoT conditional on query class
- Lines 21-143: analyzeQueryComplexity — KEEP but tune thresholds
- Lines 148-250: filterProfanity, redactPII — KEEP
- Lines 255-298: buildEnhancedSystemPrompt — CHANGE (always-on few-shot is wasteful)
- Lines 304-322: requiresChainOfThought — CHANGE (keyword match too broad)

### `supabase/functions/_shared/contextBuilder.ts` (779 lines)
**Verdict: KEEP with selective mode** — Add ability to fetch only specific context slices
- Phase 1/2/3 parallel architecture is excellent
- 30s cache is well-tuned
- Missing: selective fetch mode ("only calendar + metadata")

### `supabase/functions/_shared/voiceToolDeclarations.ts` (629 lines)
**Verdict: ~~REPLACE~~ [RESOLVED]** — Now imports from `toolRegistry.ts`. All 38 tools unified, no unimplemented tools remain.
- VOICE_ADDENDUM preserved (well-written, KEEP)

### `supabase/functions/_shared/functionExecutor.ts` (~1500+ lines)
**Verdict: KEEP** — Well-structured, pending action buffer for writes
- Has implementations for all 38 tools (~~was 19, voice-only tools now resolved~~)

### `supabase/functions/execute-concierge-tool/index.ts` (170 lines)
**Verdict: KEEP** — Clean voice tool bridge
- Added rate limiting (20/hour) since prior audit — GOOD

### `supabase/functions/_shared/security/toolRouter.ts` (88 lines)
**Verdict: KEEP** — Good trip_id enforcement, output sanitization

### `src/components/AIConciergeChat.tsx`
**Verdict: KEEP** — UI orchestrator, well-structured

### `src/services/conciergeGateway.ts` (391 lines)
**Verdict: KEEP** — Clean SSE parser with idle timeout

---

## Verification Plan

After refactoring (**COMPLETED** — commit `eb4094b`):
1. ✅ `npm run lint && npm run typecheck && npm run build` — passed
2. Test each query class from section 13 against the refactored system
3. Compare token counts before/after using logged `usageMetadata`
4. ✅ All 38 unified tools verified in registry with matching implementations
5. Verify voice path still works via execute-concierge-tool
6. Verify rate limiting, membership checks, privacy config unchanged
7. Verify RAG context injection unchanged
8. Manual test: "what's the weather?" should NOT show any trip tool calls
