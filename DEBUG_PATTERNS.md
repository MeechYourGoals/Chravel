# Debug Patterns

> Canonical memory for recurring bugs, root causes, regression risks, and proven fixes.
> Read relevant entries before debugging. Refine existing entries over creating duplicates.

---

## Trip Not Found flash during auth hydration
- **Status:** confirmed
- **Subsystem:** trip loading / auth
- **Bug class:** async/timing
- **Symptom:** User navigates to a valid trip URL and briefly sees "Trip Not Found" before the real trip data loads
- **User-facing impact:** Confusing error flash; users may navigate away thinking the trip doesn't exist
- **Trigger conditions:** Page load on an auth-gated trip route when auth session hasn't resolved yet
- **Known non-causes:** Trip actually deleted, RLS policy misconfigured (check these but they're usually not the issue)
- **Likely root cause:** Data fetch fires before auth state resolves, gets rejected/empty result, UI treats it as "not found"
- **Root cause chain:**
  - Immediate cause: Not Found component renders
  - Proximate cause: Trip query returns null/error before auth token is available
  - Underlying cause: No guard ensuring auth hydration completes before trip data fetch executes
- **How to reproduce:**
  1. Log in as a user with trip access
  2. Hard-refresh or navigate directly to `/trip/<valid-trip-id>`
  3. Observe brief flash of error/not-found state before trip loads
- **How to confirm:** Add logging to auth state and trip query — confirm query fires before auth session is established
- **Smallest safe fix:** Gate trip data fetch on auth session being resolved (not just present — fully hydrated)
- **Regression risks:** Introducing a loading delay on all trip pages; breaking unauthenticated/demo trip views
- **Related files:** Trip loading hooks, auth provider, trip page components
- **Evidence:** Documented as zero-tolerance path in CLAUDE.md. Referenced in CLAUDE.md § UI Safety: "No flashing error states during auth hydration"
- **Provenance:** CLAUDE.md § Security Gate; historical regression reports
- **Confidence:** high

## Demo mode data contamination
- **Status:** confirmed
- **Subsystem:** demo mode / data layer
- **Bug class:** schema/data
- **Symptom:** Authenticated user data appears in demo mode, or demo mock data gets modified/deleted
- **User-facing impact:** Demo experience breaks; real user data exposed in wrong context
- **Trigger conditions:** Code path that doesn't properly branch between demo and authenticated data sources
- **Known non-causes:** Supabase RLS issues (demo mode uses local mock data, not Supabase)
- **Likely root cause:** Shared data fetching path doesn't check demo mode flag, or mutation handler modifies mock data source
- **Root cause chain:**
  - Immediate cause: Wrong data appears in UI
  - Proximate cause: Data hook returns real data in demo context or vice versa
  - Underlying cause: Demo/auth data paths not fully isolated at the hook layer
- **How to reproduce:**
  1. Enter demo mode
  2. Verify only mock data appears
  3. Check that mutations don't persist to mock data source
- **How to confirm:** Trace data source selection in hooks — verify demo flag is checked before any fetch/mutation
- **Smallest safe fix:** Ensure data hooks branch on demo mode at the earliest possible point
- **Regression risks:** Breaking demo mode entirely; blocking authenticated features behind demo check
- **Related files:** Data hooks, demo mode provider, mock data files
- **Evidence:** AGENTS.md § 0.7: "Demo mode is sacred. Mock data is NEVER modified."
- **Provenance:** AGENTS.md § 0 Non-Negotiables
- **Confidence:** high
