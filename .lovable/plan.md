
## SCOPE_DEFINITION (Gate 1)

**Objective:** Fix authenticated trip access so “Trip Not Found”, “0 members”, and “no access to payments” never appear for trips the user can clearly see on the dashboard.

**What we know (evidence from Live DB):**
- User `ccamechi@gmail.com` exists in `auth.users` with id `013d9240-10c0-44e5-8da5-abfa2c4751c5`.
- The affected trips exist in `public.trips` (Live):
  - **The Good Fellas de Los Tylers** `421120c6-8489-4471-84e4-3db83655e28c` (`trip_type=consumer`, not archived/hidden)
  - **Nard and Mari’s Wedding** `27f3f7a4-595f-48ad-8951-85391654a62d` (`trip_type=consumer`, not archived/hidden)
- The user has memberships in `public.trip_members` for multiple trips including the above (Live).

**Primary hypothesis (most likely root cause):**
- **We are caching “null trip / empty members” results as successful React Query responses** because:
  - `tripService.getTripById()` catches errors and returns `null` (does not throw).
  - `tripService.getTripMembersWithCreator()` catches errors and returns `{ members: [], creatorId: null }` (does not throw).
- If a query runs even once with missing/late auth token (or transient RLS/network failure), React Query stores the “success” result as `null`/`[]` and does not refetch until stale/invalidation → user sees “Trip Not Found” and “0 members” even though the trip exists and they’re authenticated.

**Secondary hypothesis (also likely contributing):**
- `useTripDetailData()` does not gate `enabled` on auth readiness and does not include `userId` in the query key; so it can fire before the session is hydrated and then cache the wrong result.

**Success criteria:**
1. Opening any trip card you can see on Home always loads the trip (no “Trip Not Found” for valid access).
2. Trip Members never shows `0` for real trips; minimum is creator/you while members load.
3. Payments tab never shows “no access” for authorized users; if there is a real permission issue it should show a precise reason + recovery CTA.
4. No regressions in Demo mode or trip invite/join flows.
5. Clear observability: errors are surfaced as errors (not silently converted to null) and are actionable in UI.

---

## TARGET_MANIFEST (Gate 2)

**High-confidence code hotspots (by impact):**
1. `src/services/tripService.ts`
   - `getTripById()` currently uses `.single()` + swallow errors → returns null.
   - `getTripMembersWithCreator()` currently swallows errors → returns empty members.
2. `src/hooks/useTripDetailData.ts`
   - Query `enabled` doesn’t depend on auth readiness; query keys don’t include `userId`.
   - Only returns `tripQuery.error` and hides members errors.
3. `src/pages/TripDetailDesktop.tsx` and `src/pages/MobileTripDetail.tsx`
   - Treat `trip === null` as “Trip Not Found” without checking `error`.
   - Show member count directly from `participants.length` which can be 0 if members query cached empty.
4. Payments layer (exact file(s) to confirm during implementation):
   - Likely a hook/component that interprets any error/empty as “no access”.
   - Needs same treatment: don’t silently map RLS/network failures to “access denied”.

**DB/RLS verification target (only if needed):**
- Ensure payments tables (`trip_payments`, `trip_expenses`, etc.) have SELECT policies using `is_trip_member()`; otherwise fix RLS (minimal and least-privileged).

---

## IMPLEMENTATION DESIGN (Gate 3 — Minimalist, no billing logic changes)

### A) Stop caching failures as “successful null”
**Trip fetch**
- Update `tripService.getTripById(tripId)`:
  - Use `.maybeSingle()` instead of `.single()` to avoid throwing on “0 rows”.
  - If PostgREST returns “no rows” → return `null`.
  - If error is 401/403/JWT/network/other → **throw** so React Query marks it as error and can retry/refetch.
  - Add structured logs (DEV-only) that include `tripId`, `error.code`, `status`, `message`.

**Members fetch**
- Update `tripService.getTripMembersWithCreator(tripId)`:
  - If either trip or members query errors due to auth/RLS/network → **throw** (do not return empty success).
  - Keep the “creator fallback member” only for true empty-data situations (e.g., no rows but trip exists) not for errors.
  - Return a sentinel “minimum member” (creator) only if we can fetch creatorId successfully.

### B) Make `useTripDetailData` auth-aware + query-key correct
- Add auth readiness gating:
  - Pull `user` and `isAuthLoading` (or equivalent) from `useAuth()`.
  - `enabled` should be `!!tripId && !shouldUseDemoPath && !!user && !isAuthLoading`.
- Include `user?.id` in query keys:
  - `tripKeys.detail(tripId, userId)` (or append `userId` to key arrays) so cached anon fetch can never poison authenticated fetch.
- Return richer error surface:
  - `tripError`, `membersError` (or a combined error object) so pages can render correct states.
- Keep progressive rendering:
  - Trip can render first, members can load second, but **members loading must not display “0”**.

### C) Fix “Trip Not Found” screen logic (desktop + mobile)
- Update `TripDetailDesktop` and `MobileTripDetail` rendering rules:
  1. If auth not ready → show skeleton (not “Trip Not Found”).
  2. If `tripError` exists → show “Couldn’t load trip” with **Retry** (invalidate query + refetch) and **Back to My Trips**.
  3. If `trip === null` and no error → show true “Trip Not Found / No Access” UI, ideally reusing `ProTripNotFound` patterns (reasoned messaging).
- Member count display:
  - While `isMembersLoading` (or membersError), show “—” or a small spinner instead of 0.
  - After members load: show real count.
  - If still empty (should not happen) show at least 1 (creator) with a small “syncing…” note (and trigger a refetch).

### D) Payments “no access” bug fix (no regressions)
- Identify the payments hook/component:
  - Ensure it throws on RLS/network errors instead of returning an “access denied” UX for transient failures.
  - Gate payment queries on `user` and (optionally) confirmed membership.
  - If there is a real 403:
    - Show “You don’t have permission for Payments in this trip” with rationale and “Contact organizer” CTA.
- If RLS is actually missing/incorrect for payments tables:
  - Minimal policy update: allow SELECT/INSERT/UPDATE only when `is_trip_member(auth.uid(), trip_id)` (or stricter by role if required).

### E) Optional but recommended: Data integrity backfill (defensive)
Even if the core bug is caching/async auth, we should harden the DB invariant:
- Ensure every trip creator is also in `trip_members` as `admin`.
- Provide a one-time SQL backfill for Live (run via Cloud View > Run SQL in Live) if we discover any creator missing membership rows.
  - This is safe and aligns with the existing “ensure_creator_is_member” trigger pattern.

---

## VERIFICATION (Gate 4)

**Repro + fix validation path (desktop):**
1. Log in as `ccamechi@gmail.com`.
2. Open:
   - The Good Fellas de Los Tylers → should load consistently.
   - Nard and Mari’s Wedding → should load with members count > 0 and populate shortly after.
3. Navigate tabs, especially Payments:
   - No “no access” unless truly unauthorized; errors show retryable state.
4. Hard refresh on a trip detail route:
   - Should not cache “null” and show “Trip Not Found”.

**Regression checks:**
- Demo mode numeric trips still load instantly.
- Trip list page still loads (no query key mismatch).
- JoinTrip flow unchanged (existing error taxonomy remains for invites).

---

## DELIVERY (Gate 5)

**Files expected to change (exact list to confirm once implementation starts):**
- `src/services/tripService.ts`
- `src/hooks/useTripDetailData.ts`
- `src/pages/TripDetailDesktop.tsx`
- `src/pages/MobileTripDetail.tsx`
- Payments-related hook/component (to be identified during implementation)
- Possibly: small UI component for “Retry”/error state reuse

**Rollback strategy:**
- All changes are contained to fetch behavior + UI handling; rollback is reverting those files only.

---

## CRITICAL CLARIFICATIONS (to answer before/while implementing)
Because you asked for a “deep dive”, two quick facts will let me lock the fix fast:
1. Are you seeing this on **Published** (`chravel.lovable.app`) or **Preview**?
2. Does “Trip Not Found” happen **every time** for Goodfellas, or only after refresh / after navigating between trips?

Per your time-critical instruction: I will not run more diagnostics tools in this message. If you want me to proceed, reply “continue” and I’ll start implementing + validating (including capturing the exact Supabase/PostgREST errors that are currently being swallowed).
