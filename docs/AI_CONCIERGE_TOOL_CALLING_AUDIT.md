# AI Concierge Tool-Calling Audit (Text + Voice)

Date: 2026-03-07
Owner: AI engineering audit (Codex)

## Scope
- Audited the **text concierge** tool declarations in `lovable-concierge`.
- Audited the **voice concierge** tool declarations in `gemini-voice-session`.
- Audited executable coverage in shared `functionExecutor` and voice bridge/client handler.
- Audited prompt-level routing triggers, semantic behavior, rich card support, and flight deeplink behavior.

## 1) Comprehensive tool inventory

### Text concierge: declared tools (37)
`addToCalendar`, `createTask`, `createPoll`, `getPaymentSummary`, `searchPlaces`, `getDirectionsETA`, `getTimezone`, `getPlaceDetails`, `searchImages`, `getStaticMapUrl`, `searchWeb`, `getDistanceMatrix`, `validateAddress`, `savePlace`, `setBasecamp`, `addToAgenda`, `searchFlights`, `emitSmartImportPreview`, `emitReservationDraft`, `updateCalendarEvent`, `deleteCalendarEvent`, `updateTask`, `deleteTask`, `searchTripData`, `detectCalendarConflicts`, `createBroadcast`, `createNotification`, `getWeatherForecast`, `convertCurrency`, `generateTripImage`, `setTripHeaderImage`, `browseWebsite`, `makeReservation`, `settleExpense`, `getDeepLink`, `explainPermission`, `verify_artifact`.

### Voice concierge: declared tools (26)
`addToCalendar`, `createTask`, `createPoll`, `searchPlaces`, `getPaymentSummary`, `getDirectionsETA`, `getTimezone`, `getPlaceDetails`, `searchImages`, `getStaticMapUrl`, `searchWeb`, `getDistanceMatrix`, `validateAddress`, `updateCalendarEvent`, `deleteCalendarEvent`, `updateTask`, `deleteTask`, `searchTripData`, `detectCalendarConflicts`, `createBroadcast`, `getWeatherForecast`, `convertCurrency`, `browseWebsite`, `makeReservation`, `settleExpense`, `generateTripImage`.

### Actually executable today via shared backend executor (5)
`addToCalendar`, `createTask`, `createPoll`, `savePlace`, `verify_artifact`.

### Voice execution path
- Voice tool handler executes 4 tools directly (`addToCalendar`, `createTask`, `createPoll`, `getPaymentSummary`) and proxies 22 tools through `execute-concierge-tool`.
- Proxied tools rely on shared `functionExecutor`; most currently return `Unknown function` because they are declared but not implemented there.

## 2) Implementation status verdict

## ✅ Working end-to-end (text + voice)
- `addToCalendar`, `createTask`, `createPoll`.

## ✅ Working in text only
- `savePlace` (declared in text, implemented in shared executor, not in voice declarations).

## ⚠️ Partial / path-dependent
- `getPaymentSummary` works in voice (client-side implementation) but is not implemented in shared executor for text flow.

## ❌ Declared but not implemented in shared executor
`searchPlaces`, `getDirectionsETA`, `getTimezone`, `getPlaceDetails`, `searchImages`, `getStaticMapUrl`, `searchWeb`, `getDistanceMatrix`, `validateAddress`, `setBasecamp`, `addToAgenda`, `searchFlights`, `emitSmartImportPreview`, `emitReservationDraft`, `updateCalendarEvent`, `deleteCalendarEvent`, `updateTask`, `deleteTask`, `searchTripData`, `detectCalendarConflicts`, `createBroadcast`, `createNotification`, `getWeatherForecast`, `convertCurrency`, `generateTripImage`, `setTripHeaderImage`, `browseWebsite`, `makeReservation`, `settleExpense`, `getDeepLink`, `explainPermission`.

## 3) Text vs voice tool parity

Not all tools are available in both modalities today.

- **Text-only declared tools**: `savePlace`, `setBasecamp`, `addToAgenda`, `searchFlights`, `emitSmartImportPreview`, `emitReservationDraft`, `createNotification`, `setTripHeaderImage`, `getDeepLink`, `explainPermission`, `verify_artifact`.
- **Voice-only behavior**: voice forbids markdown/links in spoken output and expects cards in chat for visual payloads.
- **Shared executor gap** causes both text and voice proxied tools to fail for many declarations.

## 4) Prompt/trigger behavior currently encoded

### Deterministic trigger rules in prompt text
- Task trigger phrases: “remind me/us”, “don’t let me forget”, “make sure we…”, “to-do”, “need to” ⇒ instruct model to call `createTask`.
- Calendar trigger: date/time + scheduling intent ⇒ instruct model to call `addToCalendar`.
- Booking safety: use `emitReservationDraft`/`makeReservation`; do not complete purchases.

### Deterministic regex routing outside the LLM
- Trip-related gating regex routes whether heavy trip context/RAG is loaded.
- Artifact/content regex boosts retrieval for docs, receipts, attachments.
- General-knowledge regex skips trip context for sports/finance/general queries to reduce latency.
- Image-intent regex adds explicit inline-image instructions.

### Tool-specific natural-language hints in declarations
Each function declaration embeds “Use when user says/asks…” examples (e.g., save flight, weather, conflicts, broadcasts, permission explanation, etc.).

## 5) Semantic understanding assessment

Yes, semantic tool selection exists, but it is **instruction-driven LLM routing**, not a hardcoded full intent classifier.

- The model receives rich tool descriptions and examples and can map natural phrasing to tools.
- Reliability depends on declaration clarity + implementation availability.
- Because many declared tools are not executable in shared backend, semantic routing can choose a tool that still fails at execution.

## 6) Markdown + rich cards assessment

### Markdown priority
- Text mode strongly enforces markdown/link formatting in system prompt.
- Voice mode explicitly disables markdown/links in spoken output.

### Rich cards
- Chat renderer supports place cards, flight cards, hotel cards, action cards, reservation draft cards, smart import preview cards.
- Concierge stream parser supports `trip_cards` payload and function-call event rendering.

### Google Flights card + deeplink
- There is a `searchFlights` declaration with explicit “Google Flights deeplink” intent.
- UI has hardened external links for flight cards and tests for safe anchor behavior.
- But `searchFlights` is not implemented in shared executor, so backend tool execution for that declaration is currently not complete.

## 7) Preferences filtering behavior

User preferences (dietary, vibe, accessibility, budget, time preference) are loaded into trip context (DB or client fallback) and injected into prompts, so filtering is primarily LLM-instruction-based today.

There is no strict post-filtering engine in the shared executor for place/weather/flight outputs in this audited path.

## 8) Exact “full prompt list” reality check

There is no finite canonical list of every possible user prompt. Current behavior is a combination of:
1. Explicit hardcoded triggers/rules (regex + instruction bullets).
2. Tool declaration “use when…” examples.
3. Model semantic interpretation of natural language.

For production reliability and latency, the safer artifact is an **intent registry** (tool → trigger patterns → required slots → fallback behavior) instead of trying to enumerate all user phrasings.

## 9) Simplification plan to keep functionality and reduce latency

1. **Single source of truth for tools**
   - Generate text + voice function declarations from one schema.
   - Generate executor stubs/tests from same schema.

2. **Enforce declaration/executor parity in CI**
   - Fail build if any declared tool lacks executor implementation.

3. **Two-tier routing**
   - Keep current fast regex pre-router.
   - Add lightweight intent classifier for high-frequency intents (calendar/task/poll/flight/place/weather/payment) before LLM tool-planning.

4. **Prompt compression**
   - Move verbose examples from giant system prompt to compact per-tool metadata.
   - Keep only high-value global constraints in system prompt.

5. **Prefer structured card payloads where possible**
   - For flights/hotels/places, return typed card payload + markdown summary (text mode), chat card only in voice mode.

6. **Add missing high-impact implementations first**
   - Priority: `searchFlights`, `searchPlaces`, `getPlaceDetails`, `getDirectionsETA`, `searchWeb`, `getWeatherForecast`, `update/delete calendar/task`, `searchTripData`, `detectCalendarConflicts`, `createBroadcast`.

## 10) Recommended immediate next actions

1. Ship a parity hotfix PR that implements the top 10 missing tools in shared executor.
2. Add one test that diffs declarations vs executor cases for both text and voice.
3. Add explicit fallback user message template when a tool is declared but not executable.
4. Add telemetry field `tool_execution_outcome` with reason (`ok`, `unknown_function`, `validation_error`, `provider_error`).
