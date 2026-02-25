# AGENTS.md — Chravel Engineering Guide
> Universal instructions for every AI coding agent (Claude Code, Cursor, Codex, Lovable, Jules, Replit).
> This file is always in context. Keep it dense and navigational. Long explanations live in `/docs/`.
> **Prime directive: If it doesn't build, it doesn't ship.**

---

## 0. Non-Negotiables (read first, enforce always)

1. **No regressions.** If you change behavior, explain why and include a verification checklist.
2. **Surgical diffs win.** Fix the root cause. No "while I'm here" refactors. No mapping-layer hacks to paper over mismatches.
3. **One source of truth.** No duplicate types, constants, hooks, or business logic. When you find duplication, consolidate.
4. **Type safety > vibes.** No `any` unless it's an intentional boundary with an inline comment explaining why.
5. **Mobile-first, always.** Every UI change must be evaluated for small screens, tap targets, and PWA constraints.
6. **Performance is a feature.** No unnecessary re-renders, chatty queries, or heavy mounts on critical paths.
7. **Build passes before commit.** Mentally simulate `npm run lint && npm run typecheck && npm run build` before every output.
8. **Dead code is a liability.** Confirm no imports with `rg "symbolName"`, then delete. Never leave unreachable exports.
9. **Security by default.** No hardcoded secrets, no client-side trust of IDs or roles, no RLS weakening.
10. **When stuck or uncertain: search first, then ask.** Do not hallucinate fixes. Cite sources in commits.

---

## 1. What Chravel Is

**Chravel = Group Travel OS.** It replaces 15+ fragmented apps with one coordination layer for Chat/Broadcasts, Calendar, Places & Links, AI Concierge, Polls, Tasks, Payments tracking, and Media.

**User tiers:** Consumer (friends/family) → Pro (touring artists, sports teams) → Enterprise (corporate/campus) → Advertiser → Admin

**Product guardrail:** Chravel is coordination, not an OTA booking engine. Do not build booking-aggregation workflows that trigger licensing/compliance traps unless explicitly asked.

**Events are the viral engine:** event link → guests → new users. Treat event flows as high-priority, high-regression-risk surfaces.

---

## 2. Repo Map (verify before coding, never guess paths)

```
/src
├── features/           # Domain logic (canonical home for new features)
│   ├── broadcasts/     # Announcements → components/, hooks/
│   ├── calendar/       # Scheduling → components/, hooks/
│   └── chat/           # Messaging → components/, hooks/
├── components/         # Shared UI (also domain-split by subfolder)
│   ├── ui/             # shadcn/ui primitives (Radix-based)
│   ├── trip/           # Trip cards, detail shells
│   ├── events/         # Event flows (viral engine — regression-sensitive)
│   ├── invite/         # Invite + join flows
│   ├── payments/       # Payment UI
│   ├── places/         # Google Maps/Places UI
│   ├── polls/ poll/    # ⚠️ DUPLICATION EXISTS — consolidate on next touch
│   ├── pro/            # Pro-tier features
│   ├── mobile/         # Mobile-specific shells
│   └── ...             # Other domain folders
├── pages/              # Route-level components (TripDetail, AuthPage, etc.)
├── hooks/              # Global shared hooks
├── contexts/           # React contexts
├── store/              # Zustand stores (client state)
├── stores/             # ⚠️ DUPLICATION EXISTS — merge with store/ on next touch
├── services/           # Non-UI logic (messaging, paymentProcessors)
├── types/              # All shared TypeScript types
│   └── index.ts        # Main barrel export
├── integrations/
│   └── supabase/
│       ├── client.ts   # Supabase singleton — always import from here
│       └── types.ts    # Generated DB types
├── lib/                # Pure utilities + adapters
├── native/             # Capacitor native bridges
├── offline/            # Offline/PWA logic
├── voice/              # Gemini Live voice transport
├── billing/            # RevenueCat hooks + providers
├── telemetry/          # Analytics providers
├── platform/           # Platform-detection utilities
└── mockData/           # Dev/demo fixtures
```

**Key config files:**
- `vite.config.ts` — build config
- `capacitor.config.ts` — iOS/PWA native config
- `tailwind.config.ts` — design tokens
- `vitest.config.ts` — unit test config
- `playwright.config.ts` — e2e test config
- `eslint.config.js` — lint rules

---

## 3. Stack Reference

| Layer | Tool | Notes |
|-------|------|-------|
| UI | React 18 + TypeScript | `"strict": false` in tsconfig — be explicit anyway |
| Styling | Tailwind CSS + shadcn/ui | Radix primitives, `cn()` for merging classes |
| Server state | TanStack Query v5 | All data fetching goes through query hooks |
| Client state | Zustand v5 | `src/store/` (canonical) |
| Backend | Supabase | Postgres + RLS + Realtime + Edge Functions |
| Auth | Supabase Auth | Always gate data fetches after auth resolves |
| Real-time | Supabase Realtime | Clean up channels in `useEffect` returns |
| Maps | Google Maps JS API (`@googlemaps/js-api-loader`) | One map instance per page |
| AI | `@google/genai` (Gemini) | Voice via `src/voice/`, concierge via `src/components/ai/` |
| Mobile | Capacitor v8 (iOS) + PWA | `src/native/` for bridge calls |
| Subscriptions | RevenueCat (`src/billing/`) | Web via `purchases-js`, native via `purchases-capacitor` |
| Tests | Vitest (unit) + Playwright (e2e) | `npm run test:run` / `npm run test:e2e` |
| Build | Vite 5 + Node ≥ 20 | Vercel assumes fresh install |

---

## 4. Golden Workflow (execute in order)

### Step A — Reproduce & frame
- State: current behavior → desired behavior → definition of done (DoD).
- Identify which **user tier** and **product surface** is affected.
- Flag if the change touches: Auth, Routing, Realtime, Trip loading, RLS, Payments, Events.

### Step B — Map the truth
Before touching anything, run:
```bash
rg "ComponentOrHookName" src/   # find all usages
rg "fieldName" src/             # trace data flow end-to-end
```
- Types → one place (`src/types/`)
- Validators → one place
- API calls → one place (hooks/services)
- If you find multiple implementations: consolidate, don't fork.

### Step C — Smallest safe change
- Pure functions > side-effectful mutations.
- Narrow component edits > full rewrites.
- Behavior-preserving refactors in separate commits from bug fixes.
- No style churn, no renames-for-taste.

### Step D — Prove it
```bash
npm run lint          # auto-fix lint
npm run typecheck     # zero type errors
npm run build         # must pass
npm run test:run      # relevant unit tests
```
Manual checklist for every change (fill in before marking done):
- [ ] Logged-in user — primary flow works
- [ ] Auth boundary — unauthenticated path handled
- [ ] Empty state — no data shows correct UI (not a crash)
- [ ] Mobile Safari + PWA — layout intact, tap targets ≥ 44px
- [ ] No console errors in prod build

---

## 5. Code Quality Gates

### 5.1 Anti-regression
- **Loading ≠ Not Found ≠ Empty** — never collapse these three states.
- Auth must resolve before any data fetch. No flash of unauthorized content.
- Trip existence ≠ trip access. Check membership/RLS, not just row existence.
- All IDs validated (UUID format, non-null) before Supabase calls.

### 5.2 Dead code removal protocol
```bash
rg "exportedSymbol" src/   # must return 0 usages outside the file
```
- If it's an exported public API, deprecate first, delete in next commit.
- Do not leave `// TODO: remove` comments older than one sprint.

### 5.3 Duplication check (known hotspots)
- `src/store/` vs `src/stores/` — **consolidate into `src/store/`**
- `src/components/poll/` vs `src/components/polls/` — **consolidate**
- Any hook with a near-identical variant → merge and re-export
- Any type defined in multiple files → move to `src/types/` and import

### 5.4 Field-name mismatches are a stop-the-line bug
Chravel has suffered from DB schema ↔ client types ↔ UI props mismatches.
- Trace every field end-to-end before shipping.
- Fix at the source (types + schema), not via runtime mapping hacks.
- Add explicit TypeScript types so mismatches become compile-time errors.

---

## 6. React Patterns

```tsx
// ✅ Component structure: hooks → handlers → return
export function TripCard({ trip }: { trip: Trip }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand = useCallback(() => setIsExpanded(p => !p), []);

  return <div onClick={handleExpand}>{/* JSX */}</div>;
}
```

```tsx
// ✅ Typed state always
const [trips, setTrips] = useState<Trip[]>([]);

// ✅ useEffect with mount guard + cleanup
useEffect(() => {
  let mounted = true;
  async function load() {
    const data = await fetchTrips();
    if (mounted) setTrips(data);
  }
  load();
  return () => { mounted = false; };
}, []);

// ✅ Derived state — compute above return, never store
const activeTrips = trips.filter(t => t.status === 'active');
```

**Never:**
- Hooks inside conditionals or loops
- `useState` for data derivable from existing state
- Unguarded `mapRef.current.setZoom()` — always null-check first
- `console.log` left in committed code

---

## 7. Supabase Patterns

```tsx
// ✅ Always via the singleton
import { supabase } from '@/integrations/supabase/client';

// ✅ Handle errors explicitly
const { data, error } = await supabase.from('trips').select('*').eq('creator_id', userId);
if (error) { console.error(error); setError(error.message); return; }
setTrips(data ?? []);

// ✅ Realtime — always clean up
useEffect(() => {
  const channel = supabase.channel('trip-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, handler)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

**RLS rules:**
- Never weaken existing RLS policies.
- Never trust `user_id`, `trip_id`, or `role` from the client without DB-side verification.
- No privilege escalation via URL params or optimistic UI.

---

## 8. Google Maps Patterns

```tsx
const mapRef = useRef<google.maps.Map | null>(null);

// ✅ Always null-check before operations
if (!mapRef.current) { console.warn('Map not ready'); return; }
mapRef.current.setCenter(location);

// ✅ Debounce high-frequency events (drag, zoom, bounds_changed)
const handleDragEnd = useMemo(() => debounce(() => {
  if (!mapRef.current) return;
  fetchNearbyPlaces(mapRef.current.getCenter());
}, 300), []);

// ✅ Clean up listeners
useEffect(() => {
  if (!mapRef.current) return;
  const listener = mapRef.current.addListener('dragend', handleDragEnd);
  return () => { google.maps.event.removeListener(listener); };
}, [handleDragEnd]);
```

- One map instance per page — pass mode via props, never duplicate `<MapView>`.
- Type all coordinates as `{ lat: number; lng: number }`.

---

## 9. Mobile & Performance Rules

- **Tap targets:** minimum 44×44px for all interactive elements.
- **Scroll:** use `-webkit-overflow-scrolling: touch` or `overflow-y: auto` on scroll containers; never let content overflow the viewport.
- **Capacitor bridges** (`src/native/`) must be guarded:
  ```tsx
  import { Capacitor } from '@capacitor/core';
  if (Capacitor.isNativePlatform()) { /* native call */ }
  ```
- **Memoize** expensive derived values with `useMemo`; stabilize prop callbacks with `useCallback`.
- **TanStack Query:** set sensible `staleTime` / `gcTime` to avoid chatty refetches on mobile networks.
- **Bundle discipline:** do not add new heavy dependencies without a bundle-size justification. Check `BUNDLE_SIZE_BASELINE.md`.
- **Offline:** `src/offline/` handles IndexedDB caching. Do not bypass it for trip data.
- **Images:** use `browser-image-compression` before upload; lazy-load with native `loading="lazy"`.

---

## 10. Security Protocol

**Pre-generation gate — block if any of these fail:**
- [ ] No hardcoded secrets or API keys
- [ ] No client-side trust of user/role claims
- [ ] RLS unchanged or explicitly audited
- [ ] High-impact ops (payments, destructive edits) have explicit user confirmation
- [ ] No new race conditions introduced on auth-gated fetches

**Auth timing:**
```tsx
// ✅ Wait for session before fetching
const { data: { session } } = await supabase.auth.getSession();
if (!session) { redirect('/login'); return; }
// now fetch trip data
```

---

## 11. When Something Is Novel or Hard

1. Search the specific error + your stack version:
   ```
   rg "errorMessage" src/        # check if it's a known local issue
   # then search: "supabase realtime reconnect react 2026"
   ```
2. Prefer: official docs → GitHub issues in official repos → reputable engineering blogs.
3. Include a source link in the commit message or PR description.
4. **Never hallucinate an API that you haven't verified exists.**

---

## 12. Workflow Orchestration

- **Plan before coding** on any non-trivial task (3+ steps). Write plan to `tasks/todo.md`.
- **Subagents:** use for parallel research, deep exploration, or keeping main context clean.
- **Lessons loop:** after any user correction, update `tasks/lessons.md` with the pattern.
- **Elegance check:** before finalizing, ask — "is there a more elegant solution?" For simple fixes, skip this.
- **Autonomous bug fixing:** given a bug, just fix it. Point at logs/errors, resolve, verify.

---

## 13. Monetization & Product Hooks (Chravel-specific)

When adding features, ask:
- Does this strengthen collaboration loops or increase retention?
- Is there a natural, non-dark-pattern Pro upsell hook here?
- Does this work at 10× users and trips (data model, query performance, RLS)?

Do not build booking/OTA aggregation workflows without explicit approval.

---

## 14. Output Format (every non-trivial response)

```
1️⃣ FILES CHANGED
   - src/...

2️⃣ WHAT CHANGED & WHY (1–3 bullets)

3️⃣ CODE (full file or clear diff — no pseudocode)

4️⃣ INVARIANTS PRESERVED
   - Auth gating: unchanged / strengthened
   - RLS: unchanged
   - No additional network calls on mount

5️⃣ MANUAL VERIFICATION CHECKLIST

6️⃣ RISK & ROLLBACK
   Regression Risk: LOW | MEDIUM | HIGH
   Rollback: <one sentence>
```

---

## 15. Never Do These

| ❌ Anti-pattern | Why it breaks things |
|-----------------|---------------------|
| Invent file paths or APIs | Causes silent failures, wrong imports |
| Silently change data shapes | Breaks downstream consumers, RLS, types |
| Add dependencies casually | Bundle bloat, supply chain risk |
| Refactor + fix bug in same commit | Impossible to bisect regressions |
| Solve inconsistency with mapping layers | Symptoms treated, source unfixed |
| Leave `console.log` in commits | Leaks data, pollutes prod logs |
| Mark task done without proof | False confidence, hidden regressions |
| Collapse Loading / NotFound / Empty | Users see wrong state, data never loads |

---

*Last updated: 2026-02-25 — maintained by AI Engineering Team + Meech*
