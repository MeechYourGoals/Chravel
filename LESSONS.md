# Lessons

> Reusable engineering lessons extracted from debugging and implementation work.
> Read relevant entries before planning. Update after meaningful tasks. Merge, don't duplicate.

---

## Strategy Tips

### Always distinguish Loading, Not Found, and Empty states
- **Tip:** When building data-dependent UI, explicitly handle three distinct states: Loading (fetch in progress), Not Found (fetch completed, resource missing or inaccessible), and Empty (fetch completed, resource exists but has no items). Never let a loading state fall through to a Not Found or Empty render path.
- **Applies when:** Trip loading, any auth-gated data page, lists that can be empty, resource detail views
- **Avoid when:** Static pages with no data dependencies
- **Evidence:** Documented as zero-tolerance path in CLAUDE.md. Recurring Trip Not Found regression pattern caused by conflating loading with not-found during auth hydration.
- **Provenance:** CLAUDE.md § Security Gate / UI Safety; historical Trip Not Found regressions
- **Confidence:** high

### Trace field names end-to-end before patching data bugs
- **Tip:** When a data value renders incorrectly, trace the field from DB schema → Supabase types → hook/query → component props → render. Fix at the source layer, not via mapping hacks. Field name mismatches between layers are a historically common Chravel regression.
- **Applies when:** Data displays wrong value, type errors on data fields, query returns unexpected shape
- **Avoid when:** Pure UI/styling bugs with no data dependency
- **Evidence:** Documented in AGENTS.md § 5.2 as a stop-the-line bug class. Multiple historical incidents of DB ↔ client type ↔ UI prop mismatches.
- **Provenance:** AGENTS.md § 5.2 Field Name Mismatches
- **Confidence:** high

### When adding feature parity to a secondary surface, use the existing data layer before adding schema
- **Tip:** When a feature exists in surface A (e.g., TripChat) and needs to be added to surface B (e.g., Channels), first check what shared components and data services already exist. Often the components are reusable but the data layer wiring is missing. Use JSON metadata fields for lightweight data (reply context, link previews) before resorting to schema migrations.
- **Applies when:** Adding threading, link previews, or other chat features to Channels or Broadcasts
- **Avoid when:** The feature requires foreign key integrity or complex queries
- **Evidence:** Channel threading achieved via metadata JSON field instead of new reply_to_id column. Client-side link previews via existing fetch-og-metadata edge function instead of new DB column.
- **Provenance:** Messaging upgrade March 2026 — ChannelChatView threading + link preview parity
- **Confidence:** high

### Unified permission guard hook for multi-trip-type codebases
- **Tip:** When permission models differ by trip type (consumer=open, pro=role-based, event=organizer-only), create a single `useMutationPermissions(tripId)` hook that resolves trip type once and returns flat boolean flags. Import this in every mutation hook rather than duplicating trip-type branching logic. The guard must be client-side UX only — RLS remains authoritative.
- **Applies when:** Adding permission checks to shared hooks that serve consumer, pro, and event trips simultaneously
- **Avoid when:** The permission model is identical across all trip types
- **Evidence:** Stage B hardening added `useMutationPermissions` to 5 hooks (tasks, polls, calendar, basecamp, links) with zero call-site changes. Consumer trips return all-true by default, preserving existing behavior.
- **Provenance:** Shared mutation audit Stage B, March 2026
- **Confidence:** high

### AI tool writes should go through a pending buffer, not directly to shared state
- **Tip:** When an AI agent (voice concierge, text concierge) wants to create shared objects (tasks, polls, calendar events), write to `trip_pending_actions` instead of directly to the target table. The user then confirms or rejects. This prevents AI hallucination-driven data corruption and gives users agency over their shared trip state. Use `tool_call_id` as idempotency key to prevent duplicate pending actions on retry.
- **Applies when:** Any AI-initiated write to shared trip state (tasks, polls, calendar, basecamp)
- **Avoid when:** Read-only AI operations (search, recommendations, summaries) or low-risk append-only operations (saving a link)
- **Evidence:** Stage B routed `createTask`, `createPoll`, and `addToCalendar` through pending buffer in both `functionExecutor.ts` (edge function) and `useVoiceToolHandler.ts` (client). `savePlace` and `setBasecamp` left as direct writes (lower risk).
- **Provenance:** Shared mutation audit Stage B, March 2026
- **Confidence:** high

## Recovery Tips

### Gate third-party SDK boot on preview/runtime compatibility
- **Tip:** If the Lovable preview looks blank or unstable after a dependency/config change, check startup SDKs first (analytics, billing, native wrappers). A web preview can break or flood logs when a browser-only bundle boots with a native/mobile API key or unsupported runtime. Add a small compatibility gate at the SDK entrypoint instead of scattering checks across the app.
- **Applies when:** App initializes RevenueCat, native plugins, analytics, or other third-party SDKs during `main.tsx` startup
- **Avoid when:** The SDK is already lazy-loaded behind an explicit user action
- **Evidence:** Chravel preview was throwing `Invalid API key. Use your Web Billing API key.` from `@revenuecat/purchases-js` during startup until web initialization was skipped for Lovable preview and non-`rcb_` keys
- **Provenance:** March 2026 preview recovery fix — `src/config/revenuecat.ts`
- **Confidence:** high

## Optimization Tips

### useEffect dependencies on array state cause O(N) re-execution storms
- **Tip:** When a useEffect depends on a TanStack Query array (like `liveMessages`), it fires on every cache update. If the effect does work proportional to array length (fetching reactions for all messages, marking all as read), it creates O(N) work on every INSERT. Use a ref to track what's already been processed and only handle new items.
- **Applies when:** Any useEffect that processes a growing array of messages, notifications, or list items
- **Avoid when:** The effect truly needs to reprocess all items (e.g., full re-render)
- **Evidence:** Chat reaction refetch + read receipt storms both caused by this pattern
- **Provenance:** March 2026 chat reliability audit
- **Confidence:** high

### Supabase realtime subscriptions without table-column filters receive ALL events globally
- **Tip:** `postgres_changes` subscriptions with no `filter` parameter on tables like `message_read_receipts` (which lack a `trip_id` column) receive INSERT events for ALL rows across ALL trips. This is invisible at low scale but becomes a bandwidth/CPU problem. Either add a filterable column to the table or use client-side filtering with a Set of known IDs.
- **Applies when:** Subscribing to any table that doesn't have the scoping column (trip_id) needed for a filter
- **Evidence:** read_receipts and reactions subscriptions both had this issue
- **Provenance:** March 2026 chat reliability audit
- **Confidence:** high

### Always backfill on realtime channel reconnect — Supabase does not replay missed events
- **Tip:** Supabase realtime `postgres_changes` does NOT buffer or replay events missed during a websocket disconnection. On reconnect (channel status returns to SUBSCRIBED), you must fetch the gap yourself using the last known server timestamp. Also handle `visibilitychange` for mobile background/foreground transitions.
- **Applies when:** Any feature using Supabase realtime where data loss during connectivity gaps is unacceptable
- **Evidence:** Chat messages were silently lost during websocket drops with no user-visible indication
- **Provenance:** March 2026 chat reliability audit
- **Confidence:** high


### Explicit `reconnecting` state prevents misleading voice UX
- **Tip:** For realtime voice sessions, avoid overloading `requesting_mic` during auto-reconnect. Use a dedicated `reconnecting` state so the UI can communicate retry intent and avoid permission confusion after mid-session socket failures.
- **Applies when:** WebSocket reconnect loops in live audio/chat interfaces
- **Avoid when:** First session initialization before any successful connection
- **Evidence:** Gemini Live auto-reconnect paths were previously mapped to `requesting_mic`; inline status looked like fresh mic permission setup instead of network recovery. Adding `reconnecting` improved state-machine clarity and user feedback while preserving containment in the chat window.
- **Provenance:** March 2026 concierge live-mode hardening
### Treat schema migrations as a product compatibility API, not just SQL files
- **Tip:** In large Supabase/Postgres repos, migration safety is mostly about compatibility windows and operational sequencing, not syntax correctness. Enforce expand/contract phases, one concern per migration, and dual-version app/schema test windows. Without that, even “idempotent” SQL can break rolling deploys.
- **Applies when:** Any migration touches shared high-traffic tables (`trips`, `trip_members`, `trip_chat_messages`, `notifications`) or changes RLS/enum/status behavior
- **Avoid when:** Local-only prototypes not shipped to shared environments
- **Evidence:** Repo migration corpus shows repeated edits of critical tables and mixed-purpose migrations, increasing rollout coupling risk.
- **Provenance:** 2026-03 data evolution hardening audit
- **Confidence:** high

### Internal admin surfaces need route-level role guards, not auth-only protection
- **Tip:** Treat internal pages as production-critical privileged surfaces. `ProtectedRoute` (auth only) is insufficient for `/admin/*`; use explicit role guard components and test redirects for non-admin users.
- **Applies when:** Adding or updating any internal/admin route in `App.tsx`
- **Evidence:** `/admin/scheduled-messages` was reachable by any authenticated account until `InternalAdminRoute` hardening.
- **Provenance:** March 2026 support/admin hardening pass
### QA confidence drift happens when docs describe planned suites as implemented
- **Tip:** Keep E2E documentation split into explicit implemented vs planned sections and enforce with a lightweight CI doc-drift script.
- **Applies when:** Large test architecture transitions where some suites are roadmap-only.
- **Evidence:** Chravel had roadmap-level suite structure in E2E docs; guardrails were added to validate documented implemented suites.
- **Provenance:** March 2026 QA governance hardening pass.
### Reliability posture audits must separate “controls exist” from “controls are exercised”
- **Tip:** In resilience reviews, never treat documented backup/DR procedures as operational readiness. Grade each control on two axes: presence (configured?) and proof (drilled recently with pass/fail evidence?). Mark unexercised controls as risk, not mitigation.
- **Applies when:** SLO/DR/capacity audits, production-readiness reviews, launch gating for pro/event usage
- **Avoid when:** Throwaway prototypes with no continuity commitments
- **Evidence:** March 2026 reliability constitution audit found multiple backup/DR docs present but explicit “action required” status and missing drill evidence.
- **Provenance:** `docs/audits/reliability-resilience-constitution-2026-03-16.md`
- **Confidence:** high

### Vertex Live setup payloads should omit optional objects when unset
- **Tip:** For Gemini/Vertex Live setup, avoid sending empty objects for optional fields (e.g., `sessionResumption: {}`); include optional sections only when populated.
- **Applies when:** Building setup envelopes for bidirectional WS sessions with optional resumption handles/features.
- **Evidence:** Chravel voice sessions had intermittent setup instability while always sending empty sessionResumption; hardening changed to conditional inclusion only.
- **Provenance:** March 2026 Gemini Live production hardening.
- **Confidence:** medium

### URL import modals stay stable when UI gating and submit normalization share one helper
- **Tip:** Put URL trimming, protocol normalization, and scheme validation in one small utility used by both button-disabled logic and submit handlers; this prevents Enter-key/programmatic bypasses and keeps UX messages consistent.
- **Applies when:** Import flows accept pasted URLs and have both click + keyboard submit paths.
- **Evidence:** Calendar import modal had separate checks (`trim`, `new URL`, submit path) causing weak gating and inconsistent enabled state; consolidating with `validateImportUrl()` aligned UI state, Enter behavior, and submit normalization.
- **Provenance:** March 2026 Calendar Import modal forensic fix.
- **Confidence:** high

### Demo-mode media should not depend on external uptime without a local fallback path
- **Tip:** For demo-critical visuals (trip cards, hero surfaces), keep remote URLs as primary if needed but always provide deterministic local fallbacks and use a single automatic retry at the image component boundary.
- **Applies when:** Demo mode relies on externally hosted images (Supabase Storage/CDN/third-party assets) that may be unavailable in some environments.
- **Evidence:** Demo trip covers intermittently failed, showing broken alt text/empty headers. Adding `fallbackSrc` in `OptimizedImage` plus id-based local cover mapping restored card visuals without touching demo data semantics.
- **Provenance:** March 2026 demo trip cover resilience hardening.
### Never block chat delivery on preview metadata fetch
- **Tip:** Link unfurl/OG fetch must run asynchronously after message persistence. Composer-level preview fetches in the critical send path can deadlock both Enter and send-button flows when the metadata request hangs or fails.
- **Applies when:** Any chat surface supports URL previews.
- **Evidence:** Main chat web send path was blocked by `isFetchingPreview` in `ChatInput`, causing Enter/button sends to appear nonfunctional for link messages.
- **Provenance:** March 2026 chat send + unfurl forensic fix.
### Remove visual effects at the trigger class, not with clipping overrides
- **Tip:** When a conditional animation class is the sole activation path for a decorative effect, remove the class usage in the component and delete the paired keyframes/utilities instead of masking with `overflow-hidden`/z-index patches.
- **Applies when:** UI regressions from over-scoped pseudo-element effects tied to active/listening states.
- **Evidence:** AI Concierge dictation regression came from `.dictation-ring-active` + `::after` conic-gradient rotation mounted during listening; removing class wiring and CSS definitions fully eliminated the oversized gold sweep without touching dictation behavior.
- **Provenance:** March 2026 AI Concierge dictation visual rollback.
### For event-scale chat gating, enforce threshold as both mode-resolution and write-validation
- **Tip:** For size-based permission limits, add a single shared resolver (effective mode) for UI/runtime behavior and pair it with backend write validation (trigger/check) + send-path authorization. This prevents stale legacy values from silently bypassing product rules when group size changes.
- **Applies when:** Permission mode validity depends on dynamic counts (members/attendees) and legacy records may become invalid over time.
- **Evidence:** Event chat `everyone` mode now degrades to effective `admin_only` above 50 members while DB trigger blocks setting invalid `chat_mode='everyone'` for large events.
- **Provenance:** March 2026 event chat permission scaling implementation.
### Mention chips inside themed chat bubbles should be bubble-context aware, not brand-accent aware
- **Tip:** Keep mention styling separate from hyperlink styling and derive mention colors from bubble context (own/broadcast vs incoming) so text remains readable on colored surfaces; use font-weight + subtle background chip for distinction instead of a hardcoded accent text color.
- **Applies when:** Chat/message renderers that support mentions inside multiple bubble themes.
- **Evidence:** Outgoing blue bubbles rendered mentions in blue (`text-blue-400`), causing severe contrast loss. Moving mention classes into a shared helper keyed by bubble context fixed readability while preserving visual distinction.
- **Provenance:** March 2026 forensic fix for mention rendering in `MessageBubble`.
- **Confidence:** high
