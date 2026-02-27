# State & Truth Audit Report

This report identifies duplicated state, inconsistent data access patterns, and risks to the "Single Source of Truth" principle in the Chravel codebase.

## 1. Duplicate State Stores (Zustand/Context vs Server)

| File / Store | Duplicated Concept | Risk | Recommendation |
|---|---|---|---|
| `src/store/demoTripMembersStore.ts` | **Trip Membership** (Demo) | Mixes local ephemeral state with what should be a unified "Trip Member" interface. Logic for "added members" in demo mode is separate from real DB members. | **Consolidate:** Create a unified `MembershipService` that transparently handles Demo vs Real. The store should only be an implementation detail of the "Demo Provider" within that service. |
| `src/stores/locationStore.ts` | **User Locations** | Stores ephemeral live location data. This is actually **correct** for high-frequency ephemeral data, but needs to ensure it doesn't drift from `trip_members` (e.g., showing location for a kicked member). | **Keep but Guard:** Ensure `getLocationsByTrip` filters against the canonical `trip_members` list to remove stale ghosts. |
| `src/store/conciergeSessionStore.ts` | **Chat History** | Duplicates `ai_queries` DB table. Used for optimistic UI updates. | **Align:** Ensure `hydrateMessages` is strictly called with authoritative DB data on load. The store is fine as a client-side cache/buffer but must not be authoritative for "past history". |
| `src/store/notificationRealtimeStore.ts` | **Notifications** | Duplicates `notifications` DB table. | **Align:** This is a standard client-side cache pattern. Risk is low provided it handles "mark as read" by optimistically updating AND sending RPC. |

## 2. Parallel Fetchers & Inconsistent Read Paths

| Concept | Fetcher 1 (Canonical-ish) | Fetcher 2 (Duplicate/Risk) | Recommendation |
|---|---|---|---|
| **Trip Members** | `tripService.getTripMembers(id)` | `useTripMembers.ts` (has internal `loadTripMembers` with mixed logic + `demoTripMembersStore` merge) | **Refactor:** `useTripMembers` should explicitly call `TDAL.members.get(id)`. The "merge demo members" logic belongs in the TDAL/Repo layer, not the hook. |
| **Payments** | `paymentService.getTripPaymentMessages` | `MobileTripPayments` (sometimes fetches directly via ad-hoc queries in older code paths) | **Enforce:** All payment fetches must go through `TDAL.payments`. |
| **Trip Context** | `TripContextService.ts` | `useTripDetail.ts` (fetches similar data for UI) | **Consolidate:** Concierge context generation (`TripContextService`) creates its own massive object. It should call the exact same Repo methods the UI uses to ensure it "sees" the same data. |

## 3. Data Drift & Invariant Risks

### A. "Effective Travelers" for Payments
- **Current State:** Payment split participants are often passed as a raw array of strings (`splitParticipants`) derived from UI state at the moment of creation.
- **Risk:** If a member leaves the trip, old payment records might point to a ghost user ID, or the UI might try to split costs with a non-member.
- **Fix:** `getEffectiveMembersForPayments(tripId)` must be the authority. Splits must be validated against this list at creation time.

### B. Concierge "Truth"
- **Current State:** `TripContextService` manually constructs a text blob for AI.
- **Risk:** It manually fetches data, potentially missing recent updates or RLS filtering.
- **Fix:** The `buildTripContext` function must use the **exact same** read-path Repos as the UI. If the UI uses `TasksRepo.list()`, Concierge must too.

### C. Demo Mode Leaks
- **Current State:** `tripService.ts` has `if (demoEnabled) ...` checks scattered inside methods.
- **Risk:** "Real" production code paths are cluttered with demo logic.
- **Fix:** The TDAL Repos should use a Strategy pattern or simple "DataSource" abstraction. `TripRepo` points to `SupabaseTripSource` or `MockTripSource`. The Service layer shouldn't care.

## 4. Query Key Inconsistencies
- `src/lib/queryKeys.ts` exists and is good!
- **Risk:** Ad-hoc keys like `['trip', tripId]` vs `tripKeys.detail(tripId)`.
- **Audit Result:** Code mostly uses `tripKeys` but some hooks (`useTripChat`) use `['tripChat', tripId]` manually.
- **Fix:** Enforce usage of `tripKeys` factory everywhere.

## 5. Consolidated Plan

1.  **TDAL Implementation:** The core fix is the **Trip Data Access Layer**.
    *   `src/domain/trip/tripRepo.ts`
    *   `src/domain/trip/membershipRepo.ts`
    *   ...etc.
2.  **Repo Pattern:**
    *   `get(id)`
    *   `list(filter)`
    *   `mutate(action)`
    *   *Internal:* Handle Demo vs Real logic here, once.
3.  **Migration:**
    *   Replace direct `supabase.from('...').select()` calls in `services/*` with Repo calls.
    *   Replace `useTripMembers` internal fetching with `MembershipRepo.list()`.

This audit confirms the need for the **Trip Data Access Layer (TDAL)** as the primary mechanism to eliminate these sources of drift.
