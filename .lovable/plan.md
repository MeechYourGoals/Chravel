

# Speed Up Bulk Calendar Event Import

## Problem

When importing 20 events, the modal froze at "1/20" because each event is inserted **one at a time** via `calendarService.createEvent()`. Each call runs a cascade of expensive sub-operations:

1. Conflict check (fetches ALL existing trip events)
2. Demo mode check
3. Online status check
4. `supabase.auth.getUser()` call
5. Super admin email check
6. `ensureTripMembership()` (2-3 Supabase queries)
7. The actual insert with `retryWithBackoff` (up to 3 retries)
8. Cache the event in offline storage

For 20 events, that is **~120 sequential network requests** -- each waiting for the previous one to complete. A single event takes 1-3 seconds, so 20 events can take 30-60+ seconds (or hang entirely if any request stalls).

## Solution

Add a `bulkCreateEvents()` method to `calendarService` that does all the expensive checks **once**, then inserts all events in a **single Supabase `.insert([array])` call**.

### Part 1: Add `bulkCreateEvents` to calendarService

**File: `src/services/calendarService.ts`**

Add a new method `bulkCreateEvents(events: CreateEventData[])` that:

1. Runs `supabase.auth.getUser()` **once**
2. Checks super admin status **once**
3. Calls `ensureTripMembership()` **once** (all events share the same trip)
4. Builds the full array of insert rows
5. Calls `supabase.from('trip_events').insert(allRows).select('*')` in a **single request**
6. Caches all returned events in one pass
7. Returns the count of successfully inserted events

If the single bulk insert fails (e.g., one bad row), fall back to inserting in small **batches of 5** using `Promise.all` for parallelism -- this is still 4x faster than sequential.

```typescript
async bulkCreateEvents(events: CreateEventData[]): Promise<{
  imported: number;
  failed: number;
  events: TripEvent[];
}> {
  // 1. Auth check ONCE
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in');

  // 2. Super admin check ONCE
  const isSuperAdmin = user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

  // 3. Membership check ONCE (all events share tripId)
  const tripId = events[0].trip_id;
  await this.ensureTripMembership(tripId, user.id);

  // 4. Build insert rows
  const rows = events.map(e => ({
    trip_id: e.trip_id,
    title: e.title,
    description: e.description || null,
    location: e.location || null,
    start_time: e.start_time,
    end_time: e.end_time || null,
    created_by: user.id,
    event_category: e.event_category || 'other',
    include_in_itinerary: e.include_in_itinerary ?? true,
    source_type: e.source_type || 'manual',
    source_data: e.source_data || {},
  }));

  // 5. Single bulk insert
  const { data, error } = await supabase
    .from('trip_events')
    .insert(rows)
    .select('*');

  if (error) {
    // Fallback: batch insert in groups of 5
    return await this.batchInsertFallback(rows);
  }

  return { imported: data.length, failed: 0, events: data };
}
```

### Part 2: Update CalendarImportModal to use bulk insert

**File: `src/features/calendar/components/CalendarImportModal.tsx`**

Replace the sequential `for` loop in `handleImport()` with:

1. Filter out duplicates upfront (build the array of events to import)
2. Call `calendarService.bulkCreateEvents(eventsToInsert)` -- one call
3. Update progress to show completion immediately
4. Show the same success/failure toast

The progress indicator will show a simpler flow:
- "Preparing X events..." (brief)
- "Inserting events..." (the single bulk call)
- Complete

```typescript
const handleImport = useCallback(async () => {
  if (!parseResult) return;
  setState('importing');

  // Build array of non-duplicate events
  const eventsToInsert = parseResult.events
    .filter((_, i) => !duplicateIndices.has(i))
    .map(event => {
      let endTime: string | undefined;
      if (event.endTime && event.endTime.getTime() !== event.startTime.getTime()) {
        endTime = event.endTime.toISOString();
      } else if (event.isAllDay) {
        const endOfDay = new Date(event.startTime);
        endOfDay.setHours(23, 59, 59, 999);
        endTime = endOfDay.toISOString();
      }
      return {
        trip_id: tripId,
        title: event.title,
        start_time: event.startTime.toISOString(),
        end_time: endTime,
        description: event.description,
        location: event.location,
        event_category: 'other' as const,
        include_in_itinerary: true,
        source_type: 'manual',
        source_data: { imported_from: parseResult.sourceFormat, original_uid: event.uid },
      };
    });

  const skipped = duplicateIndices.size;
  setImportProgress({ imported: 0, skipped, failed: 0 });

  try {
    const result = await calendarService.bulkCreateEvents(eventsToInsert);
    setImportProgress({ imported: result.imported, skipped, failed: result.failed });
  } catch (error) {
    setImportProgress({ imported: 0, skipped, failed: eventsToInsert.length });
  }

  setState('complete');
  onImportComplete?.();
}, [...]);
```

### Part 3: Update progress UI for bulk mode

**File: `src/features/calendar/components/CalendarImportModal.tsx`**

The importing state display (lines 512-525) will show a cleaner message for bulk operations:
- "Importing X events..." instead of "1 / 20"
- The spinner remains the same
- Progress bar shows indeterminate since it's a single operation

## Performance Impact

| Metric | Before (sequential) | After (bulk) |
|--------|---------------------|--------------|
| Network requests for 20 events | ~120 | 1-5 |
| Time for 20 events | 30-60+ seconds | 1-3 seconds |
| Time for 80 events (NBA season) | 2-4+ minutes | 2-5 seconds |
| Auth checks | 20 | 1 |
| Membership checks | 20 | 1 |
| Conflict checks | 20 | 0 (already handled by duplicate detection in preview) |

## Files Modified

| File | Change |
|------|--------|
| `src/services/calendarService.ts` | Add `bulkCreateEvents()` method with single-insert and batch fallback |
| `src/features/calendar/components/CalendarImportModal.tsx` | Replace sequential loop with bulk insert call, update progress UI text |

