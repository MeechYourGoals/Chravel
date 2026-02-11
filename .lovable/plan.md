

# Fix Smart Import Hang + Permission Race Condition

## Issue 1: Smart Import Hangs at "Importing 29 events..."

### Root Cause

The `bulkCreateEvents` method in `calendarService.ts` has a threshold at line 636: `if (rows.length <= 20)` it tries a single bulk insert. For 29 events (above 20), it falls through to `batchInsertEvents` which does **sequential one-by-one inserts with 100ms delays**.

29 individual network round trips (each 200-500ms) + 2.8s delays = ~8-17 seconds under ideal conditions. However, the actual hang ("several minutes") points to a deeper problem:

1. **No unique constraint on trip_events**: The database has no unique index on `(trip_id, title, start_time)`. Your previous Lakers import already inserted these events. The `findDuplicateEvents` function checks against `existingEvents` passed as a prop -- but this is populated from the calendar query cache, which may not include all events (e.g., if only the current month's events are loaded, or the 1000-row Supabase default limit is hit).

2. **RLS policy overhead per insert**: Each individual INSERT triggers the RLS `WITH CHECK` policy which runs a subquery against `trip_members` AND `trips`. 29 sequential subqueries add latency.

3. **No timeout or progress feedback**: The modal shows a static "This should only take a moment" with no progress indicator, no timeout, and no way to cancel. If any single insert hangs (network issue, RLS evaluation delay), the entire chain stalls silently.

### Fix

**A. Raise the bulk insert threshold from 20 to 50** so 29 events use the fast single-insert path instead of sequential one-by-one.

**B. Allow duplicates (skip-on-conflict at DB level is not possible without a unique constraint, so we just insert and let them through)**. This matches your preference: "allow duplicates to make sure imports don't fail." The client-side `findDuplicateEvents` will still flag known duplicates in the preview, but it won't block the import if some slip through.

**C. Add a 30-second timeout to the entire import** so it never hangs forever. If the timeout fires, report partial progress.

**D. Add a progress counter** to the importing state so users see "Importing 5/29..." instead of a static message.

**E. Wrap the entire import in a try/catch with guaranteed state transition** to `complete` (or `error`), so the modal never gets stuck.

---

## Issue 2: "Permission denied" Toast When Clicking Smart Import Immediately

### Root Cause

Found it in `src/components/GroupCalendar.tsx` lines 73-84:

```typescript
const handleImport = useCallback(() => {
  if (!canPerformAction('calendar', 'can_edit_events')) {
    toast({ title: 'Permission denied', ... });
    return;
  }
  setShowImportModal(true);
}, [canPerformAction, toast]);
```

`canPerformAction` comes from `useRolePermissions(tripId)` which is **async** -- it starts in `isLoading: true` state and `featurePermissions: null`. While loading, `canPerformAction` returns `false` because it hits the `if (!featurePermissions) return false` check at line 126.

The super admin bypass is completely missing from `useRolePermissions`. It only checks for demo mode and explicit role data from the `user_trip_roles` table. If the super admin doesn't have a row in `user_trip_roles`, permissions depend on the `trip_members` query, which is async.

### Fix

**A. Add super admin bypass to `useRolePermissions`**: Import `SUPER_ADMIN_EMAILS` and check the user's email synchronously. If super admin, immediately set `permissionLevel: 'admin'` and full permissions without waiting for async queries.

**B. Guard import button against loading state**: In `GroupCalendar.tsx`, check `isLoading` from `useRolePermissions` before denying -- if still loading, either wait or optimistically allow for known paid/admin users.

---

## Technical Changes

### File 1: `src/services/calendarService.ts`

- Raise bulk insert threshold from 20 to 50
- Add `onProgress` callback parameter to `bulkCreateEvents` and `batchInsertEvents`
- Add 30-second timeout wrapper around the entire import
- Ensure guaranteed return (never hang)

### File 2: `src/features/calendar/components/CalendarImportModal.tsx`

- Pass progress callback to `bulkCreateEvents` to update a counter
- Show "Importing 5/29..." with real-time count instead of static text
- Add 30-second client-side timeout with error state transition
- Ensure `setState('complete')` or `setState('idle')` always fires (no stuck modal)

### File 3: `src/hooks/useRolePermissions.ts`

- Import `SUPER_ADMIN_EMAILS` from `@/constants/admins`
- At the top of `loadPermissions`, check if user email is in `SUPER_ADMIN_EMAILS`
- If yes, immediately grant full admin permissions and return (no async queries needed)
- This is a synchronous check that runs before any Supabase calls

### File 4: `src/components/GroupCalendar.tsx`

- Read `isLoading` from `useRolePermissions`
- In `handleImport`: if `isLoading` is true, allow the action (optimistic) rather than blocking with "Permission denied"

