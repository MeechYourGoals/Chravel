# AI Concierge RAG / Contextual Awareness — Forensic Audit

**Date:** 2026-02-19  
**Scope:** Full mapping of how the AI Concierge gets context about a trip/user (chat, calendar, places/links, tasks, polls, uploads/imports, preferences).  
**Method:** Repo-grounded, file + function + line citations.

---

## A) Executive Summary

The AI Concierge uses a **hybrid approach**:

1. **Structured retrieval** (primary): `TripContextBuilder` in `supabase/functions/_shared/contextBuilder.ts` fetches trip data via SQL (chat, calendar, tasks, payments, polls, broadcasts, places, files, links, teams/channels) and passes it into the system prompt.  
2. **Keyword-only RAG** (secondary): When trip-related queries are detected, `lovable-concierge` runs PostgreSQL full-text search on `kb_chunks` via `.textSearch('content_tsv', ...)` — **no vector embeddings or vector search at query time**.  
3. **Vector infrastructure exists but is unused for retrieval**: `trip_embeddings`, `match_trip_embeddings()`, and `hybrid_search_trip_context()` exist but are **not called** by `lovable-concierge`. The docs (`RAG_SYSTEM_COMPLETE.md`) describe a vector-based RAG that the code no longer uses.

**Main entry point:** `supabase/functions/lovable-concierge/index.ts` (lines 413–1361).  
**Client:** `AIConciergeChat` → `conciergeGateway.invokeConciergeStream()` → `POST /functions/v1/lovable-concierge`.

---

## B) Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (React)                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  AIConciergeChat.tsx (L381, 422)                                                             │
│  │  message, tripId, preferences, chatHistory, attachments                                 │
│  │  → invokeConciergeStream(requestBody, { stream: true })                                   │
│  └──────────────► conciergeGateway.ts (L107-139)                                            │
│                      POST /functions/v1/lovable-concierge                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              EDGE FUNCTION: lovable-concierge                                │
│                              supabase/functions/lovable-concierge/index.ts                   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  AUTH & GATES                                 PARALLEL PRE-FLIGHT (L496-562)                │
│  ├─ Auth header → supabase.auth.getUser()    ├─ trip_members (membership check)             │
│  ├─ trip_privacy_configs (ai_access_enabled)  ├─ TripContextBuilder.buildContext()          │
│  ├─ get_concierge_trip_usage (usage limits)  ├─ kb_chunks.textSearch() [keyword RAG]        │
│  └─ resolveUsagePlanForUser()                └─ trip_privacy_configs                        │
│                                                                                             │
│  CONTEXT ASSEMBLY (L596-658)                                                                │
│  ├─ comprehensiveContext = contextResult || tripContext                                     │
│  ├─ ragContext = ragResult (keyword search)                                                 │
│  └─ Client preferences fallback if server prefs empty                                      │
│                                                                                             │
│  PROMPT (L668-728)                                                                          │
│  ├─ buildSystemPrompt(comprehensiveContext) + ragContext                                    │
│  ├─ buildEnhancedSystemPrompt() for few-shot + chain-of-thought                             │
│  └─ Truncation: MAX_SYSTEM_PROMPT_LENGTH=8000, MAX_CHAT_HISTORY=10                         │
│                                                                                             │
│  MODEL CALL                                                                                 │
│  ├─ Gemini API: streamGenerateContent (stream) or generateContent (non-stream)              │
│  ├─ Tools: tripRelated ? functionDeclarations : googleSearch                                 │
│  └─ Fallback: Lovable gateway if GEMINI_API_KEY missing or 403                              │
│                                                                                             │
│  POST-Response                                                                              │
│  ├─ incrementConciergeTripUsage()                                                           │
│  ├─ storeConversation() → ai_queries                                                        │
│  └─ concierge_usage insert                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  DATA SOURCES                                                                               │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  TripContextBuilder (contextBuilder.ts)          kb_chunks (keyword RAG)                    │
│  ├─ trips (metadata)                            ├─ .textSearch('content_tsv', query)       │
│  ├─ trip_members (collaborators)                ├─ JOIN kb_documents ON trip_id           │
│  ├─ trip_chat_messages (messages)                └─ limit 10, top 300 chars/chunk         │
│  ├─ trip_events (calendar)                       Populated by: document-processor,          │
│  ├─ trip_tasks (tasks)                           ai-ingest (messages, polls, files, links) │
│  ├─ trip_payment_messages (payments)                                                       │
│  ├─ trip_polls (polls)                                                                      │
│  ├─ broadcasts (broadcasts)                                                                 │
│  ├─ trips + trip_places (places)                                                           │
│  ├─ trip_personal_basecamps (personal basecamp)                                             │
│  ├─ trip_files (media.files)                                                               │
│  ├─ trip_links (media.links)                                                                │
│  ├─ user_trip_roles + trip_channels (teams)                                                │
│  └─ user_preferences (preferences, paid only)                                               │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## C) Context Sources Table

| Source | Where Stored | How Retrieved | How Injected | Scope Rules |
|--------|--------------|----------------|--------------|-------------|
| **Chat** | `trip_chat_messages` | `TripContextBuilder.fetchMessages()` — SQL: `eq('trip_id', tripId)`, `order('created_at', desc)`, `limit(50)`; extends to 72h if 50 fit; filters `privacy_encrypted` and `privacy_mode === 'high'` | System prompt section `=== RECENT CHAT ACTIVITY ===` | `trip_id`; RLS via trip_members |
| **Calendar** | `trip_events` | `TripContextBuilder.fetchCalendar()` — SQL: `eq('trip_id', tripId)`, `order('start_time')` | System prompt `=== UPCOMING EVENTS ===` | `trip_id` |
| **Places** | `trips` (basecamp), `trip_places`, `trip_personal_basecamps` | `TripContextBuilder.fetchPlaces()` — SQL per table | System prompt `TRIP BASECAMP`, `YOUR PERSONAL BASECAMP`, `savedPlaces` | `trip_id`; personal basecamp by `user_id` |
| **Links** | `trip_links` | `TripContextBuilder.fetchRawLinks()` — SQL: `eq('trip_id', tripId)` | System prompt `=== SHARED LINKS & IDEAS ===` (if present) | `trip_id` |
| **Tasks** | `trip_tasks` | `TripContextBuilder.fetchRawTasks()` — SQL: `eq('trip_id', tripId)` | System prompt `=== TASK STATUS ===` | `trip_id` |
| **Polls** | `trip_polls` | `TripContextBuilder.fetchPolls()` — SQL: `eq('trip_id', tripId)` | System prompt `=== GROUP POLLS & DECISIONS ===` | `trip_id` |
| **Uploads/Imports** | `trip_files` (metadata), `kb_documents` + `kb_chunks` (content) | `TripContextBuilder.fetchRawFiles()` for metadata; `kb_chunks.textSearch()` for full-text | System prompt `media.files`; RAG keyword results in `=== RELEVANT TRIP CONTEXT (Keyword Search) ===` | `trip_id`; RLS on kb_documents/kb_chunks |
| **Preferences** | `user_preferences` (JSON) | `TripContextBuilder.fetchUserPreferences()` — only when `isPaidUser` | System prompt `=== CRITICAL USER PREFERENCES ===` | `user_id`; paid users only |
| **Broadcasts** | `broadcasts` | `TripContextBuilder.fetchRawBroadcasts()` — SQL: `eq('trip_id', tripId)`, `eq('is_sent', true)`, `limit(10)` | System prompt `=== ORGANIZER BROADCASTS ===` | `trip_id` |
| **Payments** | `trip_payment_messages` | `TripContextBuilder.fetchRawPayments()` — SQL: `eq('trip_id', tripId)` | System prompt `=== RECENT PAYMENTS ===`; `getPaymentSummary` tool for live data | `trip_id` |
| **Teams/Channels** | `user_trip_roles`, `trip_channels`, `trip_members` | `TripContextBuilder.fetchRawTeamsAndChannels()` | System prompt `=== TEAM MEMBERS & ROLES ===`, `=== TRIP CHANNELS ===` | `trip_id` |

**File references:** `contextBuilder.ts` L128–469 (buildContext), L316–469 (fetch methods).

---

## D) Retrieval Layer

### Vector Store (NOT USED for retrieval)

- **`trip_embeddings`** exists: `supabase/migrations/20251031213136_904989d2-8433-4a71-89b3-3745a5e46fcb.sql` L7–23.
- **`match_trip_embeddings()`** exists: same migration L26–59.
- **`hybrid_search_trip_context()`** exists: `20251221_fix_security_definer_search_path.sql` L134–222 — combines `trip_embeddings` (vector) + `kb_chunks` (keyword).
- **`lovable-concierge` does NOT call `match_trip_embeddings` or `hybrid_search_trip_context`.** It uses only `kb_chunks.textSearch()`.

### Keyword search (ACTIVE)

- **Table:** `kb_chunks` with `content_tsv` (GIN index, `to_tsvector('english', content)`).
- **Location:** `lovable-concierge/index.ts` L514–558.
- **Query:** `message.split(' ').slice(0, 5).join(' & ')` — first 5 words of user message.
- **API:** `supabase.from('kb_chunks').select('id, content, doc_id, modality').textSearch('content_tsv', query, { type: 'plain' }).limit(10)`.
- **Filter:** `kb_documents` join to `doc.trip_id === tripId`.
- **Chunk limit:** 300 chars per chunk in prompt (L543).

### Structured SQL (ACTIVE)

- **TripContextBuilder:** `contextBuilder.ts` L128–284.
- **Phase 1:** Parallel fetches for: trip metadata, members, messages, calendar, tasks, payments, polls, broadcasts, places, files, links, teams/channels, preferences.
- **Phase 2:** `batchFetchNames()` for all user IDs from `profiles_public`.
- **Phase 3:** Assemble final structured context.

### Other AI paths (not main concierge)

- **ai-search:** `get_trip_search_data` RPC → full trip data → Gemini for JSON ranking. No vector/keyword.
- **ai-answer:** `get_trip_context` RPC → context string → Gemini. No RAG.
- **ai-ingest:** Writes to `kb_documents` + `kb_chunks` (with embeddings when available).
- **document-processor:** Writes `kb_documents` + `kb_chunks` (with embeddings when available).
- **generate-embeddings:** Writes `trip_embeddings` from chat, tasks, polls, etc. Not used by lovable-concierge.

---

## E) Prompt Assembly

### Template location

- **`supabase/functions/_shared/promptBuilder.ts`** — `buildSystemPrompt()` L1–406.

### Main prompt structure

1. **Base:** Role, date, scope policy, communication style, capabilities, function-calling rules.
2. **Trip context:** `tripMetadata`, `collaborators`, `places`, `userPreferences`, `broadcasts`, `calendar`, `payments`, `polls`, `tasks`, `messages`, `teamsAndChannels`.
3. **RAG:** `ragContext` appended to base prompt (L668–669): `buildSystemPrompt(...) + ragContext + imageIntentAddendum`.

### Guardrails

- **"Use only provided context":** `promptBuilder.ts` L98–100: "Never invent facts. If an answer is not present in Trip Context, say what you do know and propose the fastest next step."
- **RAG:** L543–544: "IMPORTANT: Use this retrieved context to provide accurate answers. Cite sources when possible."
- **Source priority:** L99–101: “Calendar items > Places/Basecamps > Saved Links > Chat mentions > Assumptions (clearly labeled).”
- **Context truncation:** `lovable-concierge/index.ts` L702–728: `MAX_SYSTEM_PROMPT_LENGTH=8000`, `MAX_CHAT_HISTORY_MESSAGES=10`.

### Variables

- `contextBuilder.ts` L128–284: `TripContextBuilder.buildContext(tripId, userId, authHeader, isPaidUser)`.
- `lovable-concierge` L516–522: `TripContextBuilder.buildContext()` when `hasTripId && !tripContext && tripRelated`.

---

## F) Tool / Function Calling

### Tools

| Tool | Description | Where Defined | Execution | Context/Return |
|------|-------------|--------------|-----------|----------------|
| `addToCalendar` | Add event to trip calendar | `lovable-concierge/index.ts` L759–770 | `functionExecutor.ts` L58–76 | Inserts into `trip_events`; `tripId`, `userId` |
| `createTask` | Create task | L771–783 | `functionExecutor.ts` L78–96 | Inserts into `trip_tasks` |
| `createPoll` | Create poll | L784–797 | `functionExecutor.ts` L98–121 | Inserts into `trip_polls` |
| `getPaymentSummary` | Get payment summary | L799–806 | `functionExecutor.ts` L124–162 | Queries `trip_payment_messages` + `payment_splits` |
| `searchPlaces` | Search places | L807–818 | `functionExecutor.ts` L164–214 | Google Places API; `locationContext` from basecamp |
| `getDirectionsETA` | Directions/ETA | L819–831 | `functionExecutor.ts` L218–269 | Google Routes API |
| `getTimezone` | Time zone for lat/lng | L832–843 | `functionExecutor.ts` L271–298 | Google Time Zone API |
| `getPlaceDetails` | Place details | L844–854 | `functionExecutor.ts` L300–341 | Google Places API; photo proxy |
| `searchImages` | Web image search | L855–866 | `functionExecutor.ts` L343–371 | Google Custom Search (requires `GOOGLE_CUSTOM_SEARCH_CX`) |

### Execution

- **`supabase/functions/_shared/functionExecutor.ts`** — `executeFunctionCall()` L27–47.
- **`lovable-concierge`** passes `supabase`, `tripId`, `userId`, `locationData` (trip/personal basecamp).

### Tool availability

- **Trip-related:** `functionDeclarations` (L864).
- **General web:** `googleSearch` only (L869–872).

---

## G) Permissions & Safety

### Cross-trip prevention

- **Membership:** `lovable-concierge` L506–558: `trip_members` check for `user_id` + `trip_id`; 403 if not member.
- **RAG:** L531–534: `kb_documents` + `kb_chunks` filtered by `doc.trip_id === tripId`.
- **Context builder:** `contextBuilder.ts` uses `supabase` with user auth; RLS applies to all tables.

### RLS

- **kb_documents:** Trip members can SELECT/INSERT/UPDATE/DELETE (`20251111054523_fix_critical_security_vulnerabilities.sql`).
- **kb_chunks:** Trip members via `kb_documents` join.
- **trip_embeddings:** Writes restricted to service_role (`20260210000000_security_audit_rls_fixes.sql` L86–90).

### Privacy

- **trip_privacy_configs:** `ai_access_enabled` can disable AI for a trip (L569–584).
- **Messages:** `contextBuilder.ts` L291–293: excludes `privacy_encrypted` and `privacy_mode === 'high'`.

### Org boundaries

- `trip_members` is trip-scoped; no org-level checks in concierge path.

---

## H) Caching & Performance

### Context caching

- **Server:** No caching of `TripContextBuilder` output.
- **Client:** `conciergeCacheService.ts` — caches AI responses in localStorage (24h TTL, similarity 0.6).

### Token budgeting

- **Context:** `MAX_SYSTEM_PROMPT_LENGTH=8000` chars; `MAX_CHAT_HISTORY_MESSAGES=10`; `MAX_TOTAL_CONTEXT_LENGTH=12000` (L702–704).
- **Truncation:** L710–728: if over limit, truncate middle, keep base + RAG.

### Streaming

- **Streaming:** `stream: true` → `streamGenerateContent?alt=sse` (L916–918).
- **Non-streaming:** Lovable gateway or Gemini `generateContent`; demo mode uses non-streaming.

---

## I) Observability

### Logging

- **Console:** `console.log` / `console.error` / `console.warn` in `lovable-concierge/index.ts` (e.g. L518, 546, 632, 906).
- **LogError:** `logError('LOVABLE_CONCIERGE', error, {...})` L1310.

### Request IDs

- **NOT FOUND:** No request IDs or trace IDs in the concierge flow.

### Error handling

- **sanitizeErrorForClient:** `errorHandling.ts` — used in `lovable-concierge` L1318.
- **PII redaction:** `redactPII()` in logs (L451–463).

### Storage

- **ai_queries:** `storeConversation()` L1866–1880.
- **concierge_usage:** L1000–1012 (streaming), L1319–1330 (non-streaming).

---

## J) Test Coverage & Gaps

### Existing tests

- **`src/components/__tests__/AIConciergeChat.test.tsx`:** UI, rate limiting, offline, cache.
- **`src/services/__tests__/conciergeCacheService.test.ts`:** Cache service.
- **Mocks:** `supabase.functions.invoke` mocked; no real edge function tests.

### Missing tests

- **Retrieval:** No tests for `TripContextBuilder` or RAG keyword retrieval.
- **Prompt assembly:** No tests for `buildSystemPrompt` or prompt truncation.
- **Tools:** No tests for `executeFunctionCall` or tool execution.
- **Permissions:** No tests for cross-trip isolation or RLS.
- **RAG:** No tests for `kb_chunks` content or `content_tsv` behavior.

---

## Summary: What Is vs What Docs Say

| Aspect | Docs (RAG_SYSTEM_COMPLETE.md) | Actual Implementation |
|--------|-------------------------------|------------------------|
| RAG type | Vector + embeddings | Keyword-only on `kb_chunks` |
| Vector search | `match_trip_embeddings()` | Not called |
| Embeddings at query time | Query embedding → vector search | Not used |
| `trip_embeddings` | Used for retrieval | Populated by `generate-embeddings`; not used by concierge |
| `hybrid_search_trip_context` | Exists | Exists but not called |

**Conclusion:** The current concierge is **structured retrieval + keyword RAG**. Vector infrastructure (embedding generation, `trip_embeddings`, `match_trip_embeddings`, `hybrid_search_trip_context`) is present but unused for retrieval.
