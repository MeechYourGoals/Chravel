
# Instant Calendar Update After Import (No Refresh Required)

## Root Cause

When you import events, the data IS saved to the database successfully — but the calendar UI doesn't update immediately because of how the cache layer works:

1. **Mobile (`MobileGroupCalendar`)**: The `handleImportComplete` callback only calls `refreshEvents()` without first invalidating the query cache. TanStack Query's `refetch()` respects the 60-second `staleTime` and may return the stale cached data instead of fetching fresh data from the server.

2. **Desktop (`GroupCalendar`)**: This one correctly calls `invalidateQueries()` first (which marks the cache as stale) then `refreshEvents()`. However, this happens asynchronously AFTER the modal closes — and there's no guarantee the UI re-renders with the new data before the user sees the calendar.

3. **Realtime subscription gap**: The `useCalendarEvents` hook (used by mobile) has a Supabase realtime subscription that should catch INSERT events. However, `useCalendarManagement` (used by desktop) does NOT have a realtime subscription at all. For bulk imports (20 sequential inserts with 100ms delays), the realtime events may arrive with some lag.

## Solution

Three targeted changes to ensure events appear instantly after import on both desktop and mobile, with zero refresh needed:

### 1. Fix `MobileGroupCalendar.tsx` — Add cache invalidation before refetch

The mobile `handleImportComplete` currently only calls `refreshEvents()`. Change it to invalidate the query cache first (matching what desktop already does), then refetch:

```typescript
// Before (mobile):
const handleImportComplete = async () => {
  await refreshEvents();
};

// After (mobile):
const handleImportComplete = async () => {
  await queryClient.invalidateQueries({ queryKey: tripKeys.calendar(tripId) });
  await refreshEvents();
};
```

This requires adding `useQueryClient` and `tripKeys` imports to `MobileGroupCalendar.tsx`.

### 2. Add realtime subscription to `useCalendarManagement.ts` (desktop)

The desktop calendar hook has no realtime subscription. Add the same Supabase channel listener that `useCalendarEvents.ts` already uses. This ensures that when bulk import inserts events one-by-one, each INSERT fires a realtime event that updates the cache directly — the calendar UI updates live as events are imported, with no explicit refresh needed.

Changes to `useCalendarManagement.ts`:
- Add a `useEffect` that subscribes to `postgres_changes` on `trip_events` for the current `tripId`
- On INSERT: append the new event to the cached data via `queryClient.setQueryData`
- On UPDATE: replace the matching event in the cache
- On DELETE: remove the matching event from the cache
- Clean up the channel subscription on unmount

### 3. Force-invalidate in `CalendarImportModal.tsx` after bulk insert completes

The import modal currently calls `onImportComplete()` after all inserts finish. Add an explicit `queryClient.invalidateQueries` call directly inside the modal's import handler BEFORE calling `onImportComplete`. This ensures that regardless of which parent component (mobile or desktop) is using the modal, the cache is always invalidated:

```typescript
// In CalendarImportModal.tsx, after successful bulk insert:
// Force invalidate before notifying parent
const queryClient = useQueryClient();
await queryClient.invalidateQueries({ queryKey: tripKeys.calendar(tripId) });

// Then notify parent
if (onImportComplete) {
  await onImportComplete();
}
```

This creates a "belt and suspenders" approach — the modal itself ensures cache invalidation, and the parent components also invalidate as a backup.

## Summary of File Changes

| File | Change | Purpose |
|------|--------|---------|
| `src/components/mobile/MobileGroupCalendar.tsx` | Add `invalidateQueries` before `refreshEvents` in `handleImportComplete` | Mobile calendar updates immediately after import |
| `src/features/calendar/hooks/useCalendarManagement.ts` | Add Supabase realtime subscription for `trip_events` | Desktop calendar updates live as events are inserted one-by-one |
| `src/features/calendar/components/CalendarImportModal.tsx` | Add explicit `invalidateQueries` after bulk insert completes | Guarantees cache is refreshed regardless of which parent uses the modal |

## Expected Outcome

- After clicking "Import" in the modal and seeing the success toast, the calendar will immediately show all imported events — no refresh needed
- On desktop: realtime subscription updates the UI live as each event is inserted during sequential import
- On mobile: cache invalidation + refetch ensures fresh data is pulled from the server
- Both platforms: the import modal itself forces cache invalidation as an additional safety net
