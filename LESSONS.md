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

<!-- Add recovery tips here as they are discovered during debugging work -->

## Optimization Tips

<!-- Add optimization tips here as they are discovered during implementation work -->
