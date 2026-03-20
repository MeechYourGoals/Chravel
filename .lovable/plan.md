

# Fix Missing Pro Trips and Events on Dashboard

## Root Cause Analysis

After extensive investigation, I identified two compounding issues:

### Issue 1: Build Errors Blocking Deployment (Primary)
There are **20+ TypeScript build errors** across 7 files. While Vite's dev server may tolerate some TS errors, these errors prevent clean builds and can cause stale code to be served. The errors span:
- `SmartImportReview.tsx` — 10 errors (using `new` on non-constructor types, likely `Map` used incorrectly)
- `EventItem.tsx` — passing invalid `title` prop to Lucide icons
- `RoleManager.tsx` — incorrect type casting for `TripChannel`
- `MobileUnifiedMediaHub.tsx` — `metadata: unknown` vs `Record<string, unknown>`
- `gmailAuth.ts` — query on non-existent `profiles_public` columns
- `OrganizationDashboard.tsx` — missing relationship between tables
- `ProTripDetailDesktop.tsx` — `ProTripData` type missing required properties
- `tripService.getUserTrips.test.ts` — mock type mismatch with Supabase client

### Issue 2: Data Flow Verification
The data pipeline is: `useTrips` → `tripService.getUserTrips()` → returns all trip types → `Index.tsx` filters by `trip_type` → `TripGrid` renders. Database queries confirm **4 pro trips and 3 events** exist (non-archived, non-hidden), and RLS policies correctly grant access. The `getUserTrips` function does handle the missing `trip_members.status` column with a fallback. No network request for the main trip list was captured (likely cached), which means the data might be stale from a previous broken build.

## Fix Plan

### Step 1: Fix all build errors (7 files)
Fix each TypeScript error to restore clean builds:

1. **`SmartImportReview.tsx`** — Fix `Map` constructor usage and type arguments
2. **`EventItem.tsx`** — Remove invalid `title` prop from Lucide icon components
3. **`RoleManager.tsx`** — Cast `TripChannel` through `unknown` first: `as unknown as Record<string, unknown>`
4. **`MobileUnifiedMediaHub.tsx`** — Cast `metadata` as `Record<string, unknown>` or default to `{}`
5. **`gmailAuth.ts`** — Fix column references for `profiles_public` view query
6. **`OrganizationDashboard.tsx`** — Fix the `pro_trip_organizations` → `trip_id` relationship query (use explicit join or raw query)
7. **`ProTripDetailDesktop.tsx`** — Ensure the object passed matches `ProTripData` (add missing `title`, `location`, `dateRange`, `tags`, `itinerary`)
8. **`tripService.getUserTrips.test.ts`** — Update mock type to satisfy the Supabase client's stricter typing (cast through `unknown`)

### Step 2: Verify pro/event trip rendering after build fix
Once the build is clean, the dashboard should correctly render pro trips and events since the data pipeline logic is sound. If trips are still missing after the build fix, we would add diagnostic logging to `getUserTrips` to trace exactly what's returned.

## Technical Details

The `filteredData` memo in `Index.tsx` (line 451-508) correctly filters `userTripsRaw` by `trip_type === 'pro'` and `trip_type === 'event'`. The `TripGrid` component at line 1207-1218 receives these filtered records. The `getUserTrips` service function selects `trip_type` in `TRIP_LIST_COLUMNS` and doesn't filter by type. The database has the correct data. The build errors are the most likely explanation for the stale/broken rendering.

