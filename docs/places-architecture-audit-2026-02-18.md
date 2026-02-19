# Places Architecture Audit (Trip + Personal Basecamp, Ideas Toggle)

Date: 2026-02-18
Scope reviewed:
- `src/components/PlacesSection.tsx`
- `src/components/places/BasecampsPanel.tsx`
- `src/components/places/LinksPanel.tsx`
- `src/components/places/TripLinksDisplay.tsx`
- `src/components/TripTabs.tsx`
- `src/components/mobile/MobileTripTabs.tsx`
- `src/components/pro/ProTabContent.tsx`
- `src/hooks/useTripBasecamp.ts`
- `src/hooks/usePersonalBasecamp.ts`
- `src/services/tripLinksService.ts`

## Grades (0–100)

| Dimension | Score | Rationale |
|---|---:|---|
| Code elegance | 68 | Good use of TanStack Query + optimistic updates, but significant dead props/state in `LinksPanel` and mixed concerns in `PlacesSection` (data loading + realtime + UI + offline fallback). |
| Functionality | 74 | Core trip/personal basecamp flows and links CRUD exist, but there are production-impacting correctness gaps (e.g., Pro Places tab can point to wrong trip ID, drag reorder persistence mismatch). |
| Edge-case handling | 61 | Some solid handling (offline guard for basecamp writes, mutation rollback), but several edge cases are currently unhandled (URL sanitization, race conditions in voting/reordering, realtime notification false positives). |
| Smoothness | 80 | UX is generally responsive with lazy loading, prefetching, and kept-mounted tab content; still has potential jank on larger data sets and extra rerenders due to broad component responsibilities. |
| Intuitiveness | 77 | Basecamps/Ideas split is understandable; however, current “Ideas” tab content diverges from Places semantics and some hidden/non-functional controls reduce clarity. |
| Scale & concurrency readiness | 57 | Current design is acceptable at small scale but has no pagination/virtualization and includes non-atomic update patterns that can break under concurrent usage. |

## Key Bugs / Cleanup Items

### P0 (Fix before broad rollout)
1. **Pro Places tab can load wrong trip**
   - `ProTabContent` renders `<PlacesSection />` without `tripId`; `PlacesSection` defaults to `tripId = '1'`.
   - Impact: users may read/write Places against the wrong trip.

2. **Trip link reorder does not persist reliably**
   - UI updates DnD order and calls `updateTripLinksOrder`, but reads still sort by `created_at`.
   - Service “reorder” writes `updated_at` as a proxy while fetch ignores it.
   - Impact: order reverts or appears inconsistent across clients/sessions.

3. **Potential unsafe URL rendering**
   - User-entered URLs are rendered directly in `<a href={link.url}>` without normalization/scheme allow-list.
   - Impact: security/abuse risk (`javascript:`/malformed URIs), broken UX.

### P1 (High-value reliability)
4. **Realtime toast logic can misclassify local vs remote updates**
   - Debounce uses only timestamp window; if another user updates within 2s, toast can be suppressed incorrectly.
   - Subscription listens to any trip row update, not specifically basecamp fields.

5. **LinksPanel has dead/unused API surface**
   - Props/states/imports for category filtering/add-place behavior are mostly unused in rendered output.
   - Impact: maintainability debt + confusion about true feature behavior.

6. **Concurrent writes not atomic for voting**
   - Voting does read-then-write in two calls; vulnerable to lost updates under concurrent voting.

### P2 (Performance/UX hardening)
7. **No pagination/virtualization for links list**
   - Full fetch + full render every time; will degrade with larger trip datasets.

8. **Cross-platform toggle UX consistency**
   - Sub-tab toggle is embedded only in Places content, with absolute-centered layout and spacer hack; likely brittle across narrow tablet widths/localized text.

## Production Readiness Plan (10 users → 100k+ MAU)

### 1) Correctness & security first (P0)
- Pass `tripId` into `PlacesSection` from all parents (especially Pro tab).
- Add explicit `sort_order` column to `trip_links` and migrate reorder logic to transactional update/RPC.
- URL validation + normalization:
  - allow `https://` and optionally `http://`
  - reject script/data schemes
  - show field-level validation errors.

### 2) Concurrency safety (P1)
- Move vote increment to atomic DB-side operation (RPC/`increment` pattern).
- For basecamp realtime:
  - include updater user id/version in payload handling
  - ignore updates authored by current user explicitly (not just time window)
  - trigger toasts only when basecamp fields actually changed.

### 3) Scale & performance (P1/P2)
- Paginate links (`limit`/cursor) and progressively load; virtualize long lists.
- Add optimistic update rollback for reorder failures.
- Remove dead code in `LinksPanel`; split data logic from presentational component.
- Add query invalidation strategy for cross-tab consistency and stale data boundaries.

### 4) Observability & resilience
- Add structured telemetry events for:
  - basecamp set/clear conflict/failure paths
  - link reorder success/failure latency
  - URL validation rejects
- Reduce console logging noise in production builds.

### 5) Accessibility + UX polish
- Ensure toggle controls have `aria-pressed`/role semantics and keyboard parity.
- Validate responsive behavior at common tablet widths (768/820/1024) and long labels.
- Clarify naming: “Ideas” vs “Trip Links” alignment (single vocabulary).

## Suggested Acceptance Criteria for “Production Ready”
- Correct trip scoping validated by tests in consumer/pro/mobile contexts.
- Reorder persists across refresh/device and is conflict-safe.
- URL inputs are sanitized/validated with tests for malicious/malformed cases.
- Basecamp realtime notifications are deterministic under concurrent updates.
- Links list remains smooth with 1k+ records (pagination + virtualization).
- No dead props/imports in Places subcomponents; lint/typecheck clean.
