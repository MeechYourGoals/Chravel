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
