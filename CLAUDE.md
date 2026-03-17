# AI Ingestion Summary

- **App Name:** Chravel
- **Product Description:** A multi-platform trip management and collaboration app (web + PWA + iOS) that combines itinerary planning, real-time group chat, expense splitting, calendar sync, media sharing, and an AI-powered travel concierge for both consumer travelers and professional tour/event teams.

## Primary User Types
1. Consumer travelers (Free / Explorer / Frequent Chraveler tiers)
2. Pro/Enterprise teams (tour managers, event coordinators, sports teams)
3. Organization admins (B2B seat-based billing)
4. Advertisers (campaign management dashboard)

## Top 10 Systems/Modules
1. Trip Management (create, join, archive, share, invite)
2. Unified Messaging (trip chat, channels, broadcasts, threads, reactions)
3. AI Concierge (Gemini-powered travel assistant with voice + text)
4. Calendar & Events (Google Calendar sync, reminders, agendas)
5. Payments & Expense Splitting (RevenueCat subscriptions, Stripe checkout, split settlements)
6. Smart Import (Gmail OAuth, receipt OCR, artifact ingestion)
7. Media Gallery (upload, compression, AI tagging, lightbox)
8. Maps & Places (Google Maps, place search, location sharing)
9. Organizations & Teams (B2B, roles, permissions, rosters)
10. Notifications & Realtime (push notifications, Supabase realtime, read receipts)

## Top 10 Third-Party Integrations
1. Supabase (Postgres, RLS, Auth, Realtime, Edge Functions, Storage)
2. Google Gemini / Vertex AI (text + voice concierge)
3. Google Maps JavaScript API (maps, places, geocoding)
4. RevenueCat (iOS/web subscription billing)
5. Stripe (web checkout, webhooks, customer portal)
6. Capacitor (iOS/Android native shell)
7. Sentry (error tracking)
8. PostHog (product analytics)
9. Google Calendar API (bi-directional sync)
10. Gmail API (OAuth email import)

## Top 20 Core Entities/Features
1. Trips (consumer, pro, event types)
2. Trip Members / Participants
3. Messages (unified across chat + channels)
4. Channels (role-based, custom)
5. Broadcasts (trip-wide announcements)
6. Calendar Events (with recurrence, reminders)
7. Payment Splits (multi-method settlements)
8. Receipts (OCR-parsed expenses)
9. Media Attachments (photos, videos, files)
10. Artifacts (imported documents, itineraries)
11. Tasks (assignable, per-trip)
12. Polls (voting with real-time updates)
13. Links (shared with OG previews)
14. Organizations (B2B with seat billing)
15. AI Queries (concierge conversation history)
16. Notifications (push + email + in-app)
17. Profiles (user settings, preferences)
18. Subscriptions (consumer + pro tiers)
19. Campaigns (advertiser targeting + analytics)
20. Shared Locations (realtime GPS sharing)

## Known Risky Areas
- Trip Not Found flash during auth hydration (recurring)
- Auth desync causing data leaks
- RLS policy bypasses (zero-tolerance)
- Chat message loss on WebSocket reconnect
- Demo mode data contamination
- Capability token security (edge function JWT)
- CORS origin validation (edge functions)
- CronGuard fail-open (cron-only endpoints)
- Chat read receipt write amplification
- Supabase realtime unfiltered subscriptions

## Canonical Docs Created/Updated
- `CLAUDE.md` — Engineering manifesto & hard constraints
- `DEBUG_PATTERNS.md` — Security + performance anti-patterns
- `LESSONS.md` — Reusable engineering tips
- `TEST_GAPS.md` — Missing test coverage by subsystem
- `AGENTS.md` — Agent operating principles
- `agent_memory.jsonl` — Structured machine-readable memory

---

# 🧭 CHRAVEL ENGINEERING MANIFESTO
> **Stack:** React 18 + TypeScript · TanStack Query + Zustand · Tailwind · Supabase (Postgres, RLS, Auth, Realtime, Edge Functions) · Vercel
> **Platforms:** Web + PWA + Mobile Web
> **Non-negotiable:** Every edit must pass `npm run lint && npm run typecheck && npm run build` before commit

---

## GLOBAL PRINCIPLES

1. **Zero syntax errors** — every `{}`, `()`, `[]`, and JSX tag must close cleanly. Mentally simulate `npm run build` before returning code.
2. **TypeScript** — strict mode is OFF (`"strict": false`). Explicitly type all params and return values. No `any` unless interfacing with untyped third-party libs (comment why). Prefer `unknown` for dynamic data.
3. **Feature-based architecture** — new domain features go in `src/features/<name>/components/` and `src/features/<name>/hooks/`. Never put domain logic in `src/components/`.
4. **Vercel/Node 18+** — no experimental syntax, no stage-3 proposals. Code must compile in a fresh install.
5. **Readability > cleverness** — explicit names (`userTrips` not `ut`), one function = one responsibility, comment complex logic.
6. **No new libraries** unless explicitly requested.
7. **No `console.log`** left in committed code.

---

## HARD CONSTRAINTS

- ❌ Do NOT introduce new libraries without explicit request
- ❌ Do NOT break existing flows
- ❌ Do NOT weaken RLS or auth guarantees
- ❌ Do NOT call Supabase directly in JSX — always go through `/src/integrations/supabase/client.ts`
- ❌ Do NOT duplicate map components — use single `<MapView mode="..." />`
- ✅ Prefer incremental fixes over refactors unless refactor is unavoidable
- ✅ Output only artifacts that can be acted on — if ambiguous, ask ONE blocking question

---

## SECURITY GATE (check before every code output)

**Security:**
- No hardcoded secrets
- No client-side trust of `user_id`, `trip_id`, or role
- Supabase queries must respect existing RLS
- No privilege escalation via params or optimistic UI

**Data integrity:**
- Trip existence ≠ trip access
- Auth state must resolve before data fetch
- All IDs validated (UUID format, non-null)

**UI safety:**
- Loading ≠ Not Found ≠ Empty — never conflate these three states
- No flashing error states during auth hydration
- Mobile-safe layouts (no overflow regressions)

**Zero-tolerance paths:** Trip Not Found regressions · auth desync · RLS leaks

---

## BUG-FIX PROTOCOL

**Order is mandatory:** Reproduce → Diagnose → Fix → Prove

1. **Reproduce** — write a failing test first (unit for logic, integration for UI/hooks, e2e only if truly required). Test must fail for the real reason.
2. **Diagnose** — trace to root cause before touching production code. Identify exact component/hook/service/state involved.
3. **Fix surgically** — smallest correct change. No broad rewrites. No dead code left behind. Fix the layer where the bug belongs.
4. **Prove** — reproduction test must pass after fix. Nearby tests must still pass.
5. **Report** — root cause · files changed · fix applied · tests added · evidence it passes · regression risk.

**Non-negotiables:** Never claim "fixed" without proof. Never skip reproduction. Never refactor as a substitute for diagnosis.

---

## AGENT LEARNING PROTOCOL

**Purpose:** Compound debugging and implementation knowledge across sessions and tools.

**Memory files (repo root):**
- `DEBUG_PATTERNS.md` — recurring bug signatures + proven fixes
- `LESSONS.md` — reusable strategy / recovery / optimization tips
- `TEST_GAPS.md` — missing coverage discovered during work
- `agent_memory.jsonl` — structured machine-readable memory

### Before every non-trivial task:
1. Read relevant entries from `DEBUG_PATTERNS.md` and `LESSONS.md`
2. Retrieve only what matches: this subsystem, error pattern, feature type, or framework
3. State which prior learnings apply and how they change the plan

### After every meaningful task:
1. Extract up to 3 tips (strategy / recovery / optimization) — only if specific, reusable, and evidence-backed
2. Update the appropriate memory file:
   - Bug pattern discovered → `DEBUG_PATTERNS.md`
   - Broader reusable lesson → `LESSONS.md`
   - Missing test coverage found → `TEST_GAPS.md`
   - High-value structured entry → `agent_memory.jsonl`
3. Before writing: check for duplicates — merge and refine existing entries instead of appending copies
4. Report: which memory files were read, which were updated, what was added or skipped

### Quality gate for memory entries:
- ✅ Specific and actionable (not "be careful with state")
- ✅ Evidence-backed (tied to a real task or bug)
- ✅ Reusable across future similar tasks
- ❌ No vague advice, one-off trivia, or speculative entries
- ❌ No duplicates of existing entries

### Bad vs. good tip:
- ❌ "Be careful with async state"
- ✅ "When trip data shows briefly then disappears, check whether auth hydration completes before the data fetch guard — stale auth state triggers the Not Found path before the real user session resolves"

---

## SUPABASE RULES

1. Always handle `error` explicitly — never ignore it
2. Always go through `/src/integrations/supabase/client.ts`
3. Type results using generated `Database` types from Supabase CLI
4. Use optimistic updates with rollback for insert/update mutations
5. Clean up realtime channels in `useEffect` return
6. All migrations MUST pass `npx tsx scripts/lint-migrations.ts`
7. All migrations MUST be timestamped (`YYYYMMDDHHMMSS_description.sql`)
8. All `CREATE TABLE` MUST use `IF NOT EXISTS`; all functions use `CREATE OR REPLACE`
9. All `DROP` statements MUST use `IF EXISTS`
10. Destructive changes (column drop, rename, type change) require two-phase migration with forward-fix documented
11. Edge functions MUST validate required secrets using `requireSecrets()` from `_shared/validateSecrets.ts`

---

## FEATURE FLAG RULES

1. Use `public.feature_flags` table for runtime kill switches — never require redeployment to disable a feature
2. Frontend: `import { useFeatureFlag } from '@/lib/featureFlags'` — returns `boolean`, 60s cache
3. Edge functions: `import { isFeatureEnabled } from '../_shared/featureFlags.ts'`
4. New user-facing features SHOULD have a kill switch flag seeded in the migration
5. Kill switch disables take effect within 60 seconds (client cache TTL)

---

## GOOGLE MAPS RULES

1. One map instance per page — use props/context for mode changes
2. Always null-check `mapRef.current` before any operation
3. Debounce high-frequency events (drag, zoom, `bounds_changed`) — 300ms
4. Clean up all event listeners in `useEffect` return
5. Type all coordinates as `{ lat: number; lng: number }`

---

## OUTPUT FORMAT (for all code responses)

```
Files Changed:
- src/features/trips/useTrip.ts

Code: [full file or unambiguous diff — no pseudocode]

Invariants Preserved:
- Auth-gated trip access preserved
- RLS unchanged

Regression Risk: LOW | MEDIUM | HIGH
Rollback: <1 sentence>
```

---

## KEY FILES & QUICK COMMANDS

```
/src/integrations/supabase/client.ts  — Supabase singleton
/src/types/                           — Type definitions
/src/components/                      — Reusable components
/src/lib/                             — Utility functions
/src/features/                        — Feature modules
```

```bash
npm run dev          # Local dev server
npm run lint         # Fix linting
npm run typecheck    # Type check
npm run build        # Production build (runs lint + typecheck)
npm run preview      # Test production build locally
```

**When builds fail:** Read the exact error (line + file) → check bracket balance → `npm run typecheck` → fix → push → check Vercel logs.

---

## CODE PATTERNS REFERENCE

For canonical ✅/❌ examples (React hooks, Supabase queries, Maps initialization, error patterns), load the `chravel-code-patterns` skill.

---

**"If it doesn't build, it doesn't ship."**

_Last Updated: 2026-03-12 · Maintained by: AI Engineering Team + Meech_
