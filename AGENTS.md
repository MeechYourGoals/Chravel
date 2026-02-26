# AGENTS.md — Chravel Engineering Guide

> **For all AI coding agents**: Claude Code, Codex, Cursor, Lovable, Jules, Replit
> **One rule**: If it doesn't build, it doesn't ship.
> **Last updated**: 2026-02-25 | Maintained by AI Engineering Team + Meech

---

## 0. Non-Negotiables (read first, follow always)

1. **No regressions.** Changing behavior requires explicit explanation + verification checklist.
2. **Small diffs win.** Surgical fixes beat refactors. Refactor only in behavior-preserving phases with separate commits.
3. **One source of truth.** Never duplicate types, constants, or business logic. Find the canonical source.
4. **Type safety > vibes.** No `any` without a comment explaining why. Prefer `unknown` for dynamic data.
5. **Mobile-first.** Every UI change must work on small screens, PWA, and iOS (Capacitor). Check tap targets, scroll, overflow at 375px width.
6. **Performance is a feature.** No heavy re-renders, chatty queries, excessive providers, or unnecessary mounts.
7. **Build gate.** Every commit must pass `npm run lint && npm run typecheck && npm run build`.
8. **Realtime = minimal hardening first.** On hot realtime paths (chat, subscriptions, presence), prefer a closure/state-race patch over a rewrite. Fix the race; don't touch unrelated logic.
9. **Verify push before closing.** After any fix, run `git branch -vv` and confirm the branch is tracking remote and the push succeeded. Do not mark done until confirmed.
10. **"Yes please" = add the spec now.** When a user confirms they want regression coverage, add an automated test for that exact flow immediately — don't re-explain behavior instead.

---

## 1. What Chravel Is

**Group travel coordination OS** — consolidates Chat, Broadcasts, Calendar, Places, AI Concierge, Polls, Tasks, Payments, and Media so groups stop juggling 15+ apps.

**Tiers**: Consumer (friends/family), Pro/Enterprise (touring artists, sports teams, corporate), Events (viral loop: event link → guests → new users).
**Platform targets**: Web, PWA, iOS (Capacitor native shell), Mobile Web.

---

## 2. Stack (Source of Truth)

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript (`strict: false`, `noImplicitAny: false`, `strictNullChecks: false`) |
| Styling | Tailwind CSS + Radix UI (shadcn/ui components) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| Backend | Supabase (Postgres, Auth, Realtime, Edge Functions) |
| Maps | Google Maps JS API + `@googlemaps/js-api-loader` |
| Mobile | Capacitor (iOS) + PWA (service worker + IndexedDB offline) |
| Payments | RevenueCat (`@revenuecat/purchases-capacitor`, `@revenuecat/purchases-js`) |
| AI | `@google/genai` (Gemini) — direct API, not a proxy |
| Build | Vite 5 (SWC), Node 18+, manual vendor chunks |
| Testing | Vitest + Testing Library (unit) + Playwright (e2e) |
| Deployment | Vercel (fresh install, Node 18+) |

**Quick commands:**
```bash
npm run dev           # Local dev server
npm run lint          # Auto-fix lint
npm run typecheck     # tsc --noEmit
npm run validate      # lint + typecheck + format check
npm run test          # Vitest unit tests
npm run test:e2e      # Playwright e2e
npm run build         # Production build (Vite + service worker)
npm run preview       # Test production build locally
```

---

## 3. Codebase Map (Docs Index — verify paths before coding)

```
src/
├── App.tsx                         # Router: lazy routes + retry logic + auth init
├── features/                       # Domain logic (expand this, not components/)
│   ├── broadcasts/{components,hooks}/
│   ├── calendar/{components,hooks}/
│   └── chat/{components,hooks}/
├── pages/                          # Route-level components (lazy-loaded)
│   ├── TripDetail.tsx              # Consumer trip (mobile-first)
│   ├── MobileTripDetail.tsx        # Mobile-optimized variant
│   ├── ProTripDetail.tsx           # Pro/touring features
│   ├── EventDetail.tsx / MobileEventDetail.tsx
│   └── JoinTrip.tsx                # Invite join flow
├── components/                     # Reusable UI (97+ components)
├── hooks/                          # 128 shared hooks
│   ├── useAuth.tsx                 # ← resolve before ANY data fetch
│   ├── useDeepLinks.ts             # Deep link / URL param handling
│   └── use-mobile.tsx              # Breakpoint detection
├── services/                       # 112 business logic / Supabase services
├── stores/                         # Zustand: entitlementsStore, locationStore
├── store/                          # Zustand: demoModeStore, conciergeSessionStore, etc.
├── contexts/                       # React contexts (4): Basecamp, DataSource, TripVariant, SwipeableRow
├── types/                          # 32 type definition files
│   └── index.ts                    # Barrel export — always import from here
├── lib/
│   ├── queryKeys.ts                # ← TanStack Query key factory — ALWAYS use tripKeys.*
│   └── utils.ts
├── integrations/
│   ├── supabase/client.ts          # ← Supabase singleton — NEVER instantiate directly
│   └── supabase/types.ts           # Auto-generated DB types (115k lines, do not edit)
├── native/lifecycle.ts             # Capacitor lifecycle (attachNavigator, onNativeResume)
├── platform/                       # Web vs native abstractions
├── offline/                        # Offline queue (calendar, tasks, IndexedDB)
└── telemetry/                      # Error tracking, performance
```

**Task tracking:**
```
tasks/todo.md       # Write plan here BEFORE implementing
tasks/lessons.md    # Capture learnings after corrections
```

**Extended docs (deep dives only):**
```
docs/ARCHITECTURE.md
docs/DATABASE_SCHEMA.md
docs/AI_CONCIERGE_SETUP.md
docs/CHANNELS.md
docs/BILLING_STRATEGY.md
docs/IOS_*.md
docs/ADRs/           # Architecture Decision Records
```

---

## 4. Pre-Task Protocol (MANDATORY — before writing a single line)

**A. Scope it**
- State the goal in one sentence.
- List files to touch, Supabase tables affected, risk level (LOW / MED / HIGH).
- Flag if this touches: Auth, Routing, Realtime, Trip loading, Payments.

**B. Find the source of truth**
- Types → `src/types/index.ts`
- Query keys → `src/lib/queryKeys.ts`
- Supabase calls → `src/services/` or `src/features/*/hooks/`
- Verify: `rg "symbolName" src/` before adding anything new.

**C. Dead code + duplicate check (required)**
- Before adding logic: search for existing implementations first.
- Found a duplicate? Consolidate to the canonical version, delete the copy.
- Found dead code (zero imports)? Delete it. Don't leave unused exports.
- For public API: deprecate in this PR, delete in next.

**D. Security gate (hard block — stop if unresolvable)**
- No hardcoded secrets or API keys.
- No client-side trust of `user_id`, `trip_id`, or `role`.
- All Supabase queries must respect existing RLS.
- Auth state MUST resolve before any data fetch.
- Three distinct states required: `isLoading` ≠ `!trip` (not found) ≠ `trip.members.length === 0` (empty).

---

## 5. Golden Workflow

**Step 1 — Implement the smallest safe change**
- One pure function = one responsibility.
- Narrow component changes only — no "while I'm here" refactors.
- No style churn, no mass renames.

**Step 2 — Verify before calling it done**
- Mentally simulate `npm run build` before writing.
- Run `npm run validate` locally before committing.
- Trace field names end-to-end (DB schema → TS type → hook → component prop).
- Fix field mismatches at the source — never add a mapping layer to paper over them.

**Step 3 — Include in every response**
```
Files changed:
- src/...

Invariants preserved:
- Auth-gated access unchanged
- RLS policies unchanged
- No new network calls on mount

Manual test checklist:
- [ ] Logged-in user: <flow> works correctly
- [ ] Non-member opens link: invite flow shown (not crash)
- [ ] Mobile Safari + PWA verified

Regression Risk: LOW | MEDIUM | HIGH
Rollback: <one sentence>
```

---

## 6. Code Quality Gates

### 6.1 Query Key Discipline
Always use `tripKeys.*` from `src/lib/queryKeys.ts`. Never hardcode query key strings.
Always spread `QUERY_CACHE_CONFIG.<domain>` — it contains tuned stale/gc times per data type.

```ts
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';

// ✅
const { data } = useQuery({ queryKey: tripKeys.chat(tripId), ...QUERY_CACHE_CONFIG.chat });

// ❌ — breaks cache invalidation and loses tuned cache config
const { data } = useQuery({ queryKey: ['chat', tripId] });
```

**`QUERY_CACHE_CONFIG` stale times at a glance** (pick the right domain, never invent custom values):

| Domain | `staleTime` | Notes |
|---|---|---|
| `trip` | 60s | refetchOnWindowFocus: true |
| `members` | 30s | refetchOnWindowFocus: false |
| `chat` | 10s | Realtime handles live updates |
| `calendar` | 60s | refetchOnWindowFocus: true |
| `tasks` | 30s | refetchOnWindowFocus: true |
| `polls` | 60s | — |
| `media` | 2min | Large payloads, no focus refetch |
| `payments` | 30s | Verify often |

### 6.2 Field Name Mismatches → Stop-the-Line
Chravel has had regressions from DB schema ↔ TS type ↔ UI prop ↔ query key mismatches.
- Trace the field end-to-end before touching data flow.
- Fix at the source — not with ad-hoc mapping layers.
- Update types so mismatches become compile-time errors.

### 6.3 No Dead Services / Hooks
With 112 services and 128 hooks, duplication is a real risk. Before creating:
- `rg "functionName\|hookName\|ServiceName" src/` — verify it doesn't exist.
- If a partial duplicate exists: extend it, don't create a second copy.

### 6.4 Loading / Empty / Not Found (Critical UI Distinction)
```tsx
// ✅ Three explicit states — never conflate them
if (isLoading) return <LoadingSpinner />;
if (!trip)     return <NotFound />;
if (!members.length) return <EmptyState />;
return <TripView trip={trip} members={members} />;

// ❌ Triggers "not found" during auth hydration
if (!trip) return <NotFound />;  // too early
```

---

## 7. React & TypeScript Patterns

### Component structure: hooks → handlers → return
```tsx
export function TripCard({ trip }: { trip: Trip }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return <div onClick={handleExpand}>{/* JSX */}</div>;
}
```

### useEffect: cleanup + mount guard (required for async)
```tsx
useEffect(() => {
  let mounted = true;
  async function load() {
    const data = await fetchData();
    if (mounted) setState(data);
  }
  load();
  return () => { mounted = false; };
}, []);
```

### Derived state: compute above return, never store
```tsx
// ✅ Derived
const activeTrips = trips.filter(t => t.status === 'active');

// ❌ Unnecessary duplicate state
const [activeTrips, setActiveTrips] = useState([]);
```

### TypeScript: explicit types, no new `any`
```tsx
const [trips, setTrips] = useState<Trip[]>([]);
const [loading, setLoading] = useState(false);
// If you must use any: // eslint-disable-next-line @typescript-eslint/no-explicit-any — explain why
```

---

## 8. Supabase Integration

**Always go through** `src/integrations/supabase/client.ts`. Never call Supabase from JSX or instantiate a new client.

```tsx
// ✅ Query + error handling
const { data, error } = await supabase
  .from('trips').select('*').eq('creator_id', userId);
if (error) { console.error('Failed:', error); return; }
setTrips(data ?? []);

// ✅ Optimistic update + rollback
const optimistic = { ...newItem, id: 'temp-id' };
setItems(prev => [...prev, optimistic]);
const { data, error } = await supabase.from('trips').insert(newItem).select().single();
if (error) {
  setItems(prev => prev.filter(t => t.id !== 'temp-id')); // rollback
  return;
}
setItems(prev => prev.map(t => t.id === 'temp-id' ? data : t));

// ✅ Realtime subscription with cleanup
useEffect(() => {
  const channel = supabase.channel('trip-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, handler)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

**Hard rules:**
- Handle `error` explicitly — never silently ignore it.
- Use generated types from `src/integrations/supabase/types.ts` — do not write manual DB types.
- Trip existence ≠ trip access — RLS decides access, not the client.
- Never trust `user_id`, `trip_id`, or `role` from client params.

---

## 9. Google Maps & Location

```tsx
const mapRef = useRef<google.maps.Map | null>(null);

// Always null-check before operations
if (!mapRef.current) return;
mapRef.current.setCenter(location);

// Debounce high-frequency events (drag, zoom, bounds_changed)
const handleDragEnd = useMemo(() => debounce(() => {
  if (!mapRef.current) return;
  const center = mapRef.current.getCenter();
  if (!center) return;
  fetchNearby({ lat: center.lat(), lng: center.lng() });
}, 300), []);

// Clean up listeners
useEffect(() => {
  if (!mapRef.current) return;
  const listener = mapRef.current.addListener('dragend', handleDragEnd);
  return () => { google.maps.event.removeListener(listener); };
}, [handleDragEnd]);
```

**Rules:**
- **One map instance per page** — use a `mode` prop, never duplicate map components.
- Type all coordinates as `{ lat: number; lng: number }`.
- Clean up every listener in `useEffect` return.

---

## 10. Mobile, Native & Performance

### Layout (always verify at 375px)
```
┌─────────────────────────────┐
│   Map (50–60vh)             │
├─────────────────────────────┤
│   Scrollable content        │
├─────────────────────────────┤
│ [Chat][Media][Pay][⚙️]      │  ← fixed bottom tabs
└─────────────────────────────┘
```

### Adding a new route
Every route in `App.tsx` requires two wrappers — missing either is a silent bug:

```tsx
// ✅ Public route (no auth required)
const MyPage = lazy(() => retryImport(() => import('./pages/MyPage')));

<Route path="/my-path" element={
  <LazyRoute>        {/* error boundary + Suspense fallback */}
    <MyPage />
  </LazyRoute>
} />

// ✅ Auth-gated route
<Route path="/protected" element={
  <ProtectedRoute>  {/* redirects to /auth if not logged in */}
    <LazyRoute>
      <MyPage />
    </LazyRoute>
  </ProtectedRoute>
} />
```

- `LazyRoute` (`src/components/LazyRoute.tsx`) — wraps `<Suspense>` + `<ErrorBoundary>`. Required for all lazy pages.
- `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) — redirects unauthenticated users to `/auth`. Accounts for demo mode and auth loading state.
- Use `retryImport()` (already defined in `App.tsx`) for all `lazy()` calls — it retries chunk load failures with exponential backoff.

### Capacitor / iOS
- Use `src/native/` modules for Capacitor APIs — never call `Capacitor.*` directly in components.
- Platform abstractions live in `src/platform/` — use these for web/native branching.
- Deep links: `useDeepLinks` hook.
- Push notifications: `src/native/push.ts`.
- After changes: test on iOS Safari + PWA + Chrome mobile.

### Performance rules
- All routes are already lazy-loaded in `App.tsx` — maintain this pattern for new pages.
- Use `@tanstack/react-virtual` for long lists (already installed).
- Memoize expensive derived values with `useMemo`; stabilize callbacks with `useCallback`.
- No unstable object literals or inline arrow functions passed as props to heavy components.
- Justify any new dependency against bundle size impact.
- Vite already splits vendors into manual chunks — don't import from vendor chunks in ways that break splitting.

### Offline
- Calendar and task operations have offline queues (`src/offline/`).
- IndexedDB caching available (`idb` package).
- Service worker handles PWA caching — don't break SW registration in `utils/serviceWorkerRegistration.ts`.

### Demo mode
- Check `useDemoModeStore()` before live Supabase fetches.
- Demo data lives in `src/data/` and `src/mockData/`.

### Vite chunk strategy (do not break)
Named manual chunks in `vite.config.ts` — adding a heavy import from a named chunk into an unexpected code path will split it and break caching:

| Chunk | Contains |
|---|---|
| `react-vendor` | react, react-dom, react-router-dom |
| `ui-vendor` | @radix-ui/* (core components) |
| `supabase` | @supabase/supabase-js |
| `utils` | date-fns, clsx, tailwind-merge |
| `charts` | recharts |
| `pdf` | jspdf, jspdf-autotable, html2canvas |

**Externalized** (optional telemetry — may not be installed): `@sentry/capacitor`, `@sentry/react`, `posthog-js`.
- Do not add imports of these in core paths — they are optional and will throw if absent.
- `chunkSizeWarningLimit` is 1000 KB — if a chunk exceeds this, split it, don't raise the limit.
- New heavy deps (xlsx, recharts, jspdf) belong in lazy-loaded pages, not in shared hooks.

---

## 11. Testing

```bash
npm run test          # Vitest + Testing Library (unit/integration)
npm run test:coverage # Coverage report
npm run test:e2e      # Playwright (e2e/, e2e/specs/)
```

**When to add tests:**
- Any pure utility function → unit test in `src/__tests__/` or colocated `__tests__/`.
- Any regression fix → a test that directly proves the bug is fixed.
- Critical flows → Playwright spec in `e2e/specs/`.

**Critical regression scenarios (always verify manually):**
- Logged-in user opens their own trip → loads correctly, no flicker.
- Logged-in user opens demo trip → loads correctly.
- Non-member opens trip link → invite flow shown, no crash or "not found".
- Mobile Safari + PWA + iOS Safari verified.
- Auth hydration timing → no flash of "not found" during session restore.

---

## 12. Research Rule (Novel / Hard Problems)

If you encounter something unfamiliar — Supabase RLS edge case, Capacitor API behavior, Vite chunk issue, build error:

1. **Search before guessing** — use web search for the exact error + your stack version.
2. **Prefer**: official docs → GitHub issues in official repos → reputable engineering blogs.
3. **Cite the source** in the commit message or PR description.
4. **Never hallucinate fixes** — unverified "solutions" create the regressions you're trying to avoid.

---

## 13. Workflow Orchestration

### Planning
- Enter plan mode for any non-trivial task (3+ steps or architectural decisions).
- Write plan to `tasks/todo.md` with checkable items before implementing.
- If scope expands mid-task: STOP, re-plan, check in.
- Break large changes into atomic commits (behavior-preserving first, then cleanup).

### Subagents
- Use subagents to keep the main context window clean.
- Offload research, exploration, and parallel analysis to subagents.
- One focused task per subagent.
- Never mark a task complete without proving it works.

### Self-Improvement
- After any correction: add the pattern to `tasks/lessons.md`.
- Read `tasks/lessons.md` at session start for relevant context.
- Ask yourself before finalizing: "Would a staff engineer approve this PR?"

---

## 14. Anti-Patterns (Hard Prohibitions)

| ❌ Never | ✅ Instead |
|---|---|
| Invent file paths or API names | Verify with `rg` / `ls` first |
| Silently change data shapes | Trace end-to-end, update types |
| Add dependencies without justification | Audit against existing deps |
| Refactor + bug fix in same commit | Separate commits |
| Fix inconsistency with mapping layers | Fix the source |
| Output partial code that won't compile | Complete, buildable code only |
| Leave `console.log` in committed code | Remove before commit |
| Hooks inside conditionals | Hooks at top level only |
| Supabase calls in JSX | Use service/hook abstraction |
| Hardcode query key strings | Use `tripKeys.*` from `queryKeys.ts` |
| `any` without comment | `unknown` or typed alternative |
| New Supabase client instance | Use `src/integrations/supabase/client.ts` |
| Duplicate component for different contexts | Single component with `mode` prop |

---

## 15. Product Guardrails

- Chravel is **coordination**, not an OTA booking engine. Don't build booking aggregation without explicit request.
- **Zero tolerance**: Trip Not Found regressions, auth desync, RLS leaks, payments bugs.
- **Performance-sensitive paths**: TripDetail, Chat, Calendar, Invite/Join flow.
- **When uncertain on scope**: default to the professional/touring use case (30+ person tour across cities) — if it works there, it works for a 5-person friend trip.
- **On high-impact operations** (payments, destructive edits): design for explicit user confirmation and safe rollback.
- **Privacy and security by default**: least-privilege access, clear user control, no dark patterns.

---

## 16. Billing & Entitlements

**Single source of truth**: `src/stores/entitlementsStore.ts` (`useEntitlementsStore`).
**Product/tier config**: `src/billing/config.ts` (`BILLING_PRODUCTS`, `TIER_ENTITLEMENTS`).
**Types**: `src/billing/types.ts` (`SubscriptionTier`, `EntitlementId`, `PurchaseType`).

### Entitlement sources (priority order)
| Source | When set |
|---|---|
| `admin` | Super admin email allowlist (`isSuperAdminEmail`) or `enterprise_admin` role |
| `revenuecat` | iOS/Android IAP via RevenueCat |
| `stripe` | Web subscription via Stripe |
| `demo` | Demo mode — gets `frequent-chraveler` tier (full access) |
| `none` | Unauthenticated / free user |

### How to gate a feature
```tsx
// ✅ Always read from the store — never re-derive from user profile or JWT
const { isPro, isSuperAdmin, entitlements } = useEntitlementsStore();

if (!entitlements.has('pdf_export')) return <UpgradePrompt />;
```

### Tiers (as defined in `src/billing/types.ts`)
- `free` → `plus` (Explorer, consumer) → `frequent-chraveler` (Pro, consumer) → `pro-enterprise`
- Consumer plans (`explorer`, `frequent-chraveler`) **must use Apple IAP on iOS** (`requiresIAPOnIOS: true`).
- B2B/Enterprise plans (`pro-enterprise`) **may use external payment** (App Store Reader Rule exception).
- Trip split payments for real-world services are **not subject to IAP**.

### Rules
- Never trust `plan` or `role` from URL params or JWT claims on the client.
- Call `refreshEntitlements(userId, userEmail)` on auth state change, not on every render.
- Super admin bypasses all entitlement checks — the email allowlist is the failsafe.
- `setDemoMode(true)` grants full access — always check `isDemoMode` before branching on entitlements in tests.
- Do not add a new `EntitlementId` without adding it to `TIER_ENTITLEMENTS` in `billing/config.ts`.

---

## 17. AI Concierge Rate Limits

**Service**: `src/services/conciergeRateLimitService.ts` (singleton: `conciergeRateLimitService`).
**Model**: DB-backed for real users (`concierge_usage` table), localStorage for demo mode.

### Limits (per user, per trip — no daily reset)
| Tier | `userTier` param | Queries per trip |
|---|---|---|
| Free | `'free'` | 5 |
| Explorer / Plus | `'plus'` | 10 |
| Frequent Chraveler / Pro | `'pro'` | Unlimited |

### Usage pattern
```ts
// ✅ Always check before sending to Gemini
const canProceed = await conciergeRateLimitService.canQuery(userId, tripId, userTier);
if (!canProceed) { showUpgradePrompt(); return; }

// ✅ Increment after a successful query
await conciergeRateLimitService.incrementUsage(userId, tripId, userTier);

// ✅ Show remaining to the user
const remaining = await conciergeRateLimitService.getRemainingQueries(userId, tripId, userTier);
```

### Deprecated methods (do not use)
- `getDailyLimit()` → use `getTripLimit()` (per-trip, not daily)
- `getTimeUntilReset()` → always returns `''`; remove callsites when encountered

### Rules
- Limits persist for the **lifetime of the trip** — there is no reset mechanism for users.
- Demo mode falls back to localStorage (no DB write) — don't add DB assertions in demo test paths.
- Pro users bypass all checks — `canQuery` returns `true` immediately.
- If the DB insert fails, the service falls back to localStorage to avoid blocking the user.
- The `concierge_usage` table is append-only (one row per query) — count rows, don't sum a column.

---

> **"If it doesn't build, it doesn't ship."**
