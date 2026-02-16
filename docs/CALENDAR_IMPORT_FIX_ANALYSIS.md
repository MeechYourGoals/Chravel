# Calendar Smart Import — Root Cause Analysis & Improved Fix Plan

## Executive Summary

The proposed fix (lower bulk threshold to 5, sequential for >5, remove timeout) **correctly identifies the root cause** but **abandons bulk insert** for most real-world imports. This document proposes an improved plan that **fixes the root cause at the database level** while **preserving bulk insert** for scale (82-game NBA season, 100-city world tour).

---

## 1. Root Cause (Confirmed)

The `notify_on_calendar_event` trigger fires **FOR EACH ROW** on INSERT into `trip_events`. Per event it:

1. `SELECT` from `trips` (get name)
2. `SELECT` from `profiles` (get creator name)
3. `SELECT` from `trip_members` (get ALL members)
4. `PERFORM send_notification(...)` → inserts into `notifications` for each member

For **33 events** with **N trip members**:
- 33 × (3 queries + N notification inserts) = **100+ DB operations** in one transaction
- HTTP request blocks until the entire transaction commits
- PostgREST/Supabase edge times out (~30–60s) before the client gets a response
- **Insert succeeds at DB level**, but the client sees a network error → UI shows "33 failed"

The proposed fix correctly identifies this. The issue is **not** `.select('*')` or response payload size — it's the **synchronous trigger work** inside the transaction.

---

## 2. Problems With the Proposed Fix

| Concern | Impact |
|--------|--------|
| **Abandons bulk insert** | For 82 games or 100 cities, sequential = 82–100 individual inserts × (~1s + 100ms) ≈ **90–110 seconds** of user wait time |
| **Bulk was working** | Bulk insert *does* work for small batches (1–5 events) — the trigger completes quickly. The proposal keeps bulk only for ≤5, which is too conservative |
| **Sequential is slow** | 100ms delay × 100 events = 10s of pure delay; plus ~1s per insert = very long UX |
| **Doesn't fix root cause** | The trigger remains heavy. Any future bulk operation (API, admin tool, migration) will hit the same timeout |

---

## 3. Improved Plan: Fix the Trigger + Keep Bulk Insert

### 3.1 Strategy: Conditional Trigger Behavior

The trigger should **skip or batch notifications** when events are created via **bulk import**. Use `source_type` to distinguish:

- `source_type = 'manual'` (or `'ai_extracted'`, etc.) → **full per-event notifications** (current behavior)
- `source_type = 'bulk_import'` → **skip per-event notifications** (or send one summary notification)

**Rationale:** For bulk import, the user is actively watching the import progress in the UI. They don't need 82 individual push notifications. A single "82 events added to [Trip Name]" is sufficient (optional enhancement).

### 3.2 Implementation

#### A. Database Migration (New File)

```sql
-- supabase/migrations/YYYYMMDD_fix_calendar_bulk_import_trigger.sql

-- Modify notify_on_calendar_event to skip heavy work for bulk imports
CREATE OR REPLACE FUNCTION public.notify_on_calendar_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_creator_name TEXT;
BEGIN
  -- Skip notifications for bulk imports — user sees progress in UI
  IF NEW.source_type = 'bulk_import' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  SELECT COALESCE(
    display_name,
    first_name || ' ' || last_name,
    email
  ) INTO v_creator_name
  FROM profiles
  WHERE user_id = NEW.created_by;
  
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.created_by;
  
  IF v_member_ids IS NOT NULL AND array_length(v_member_ids, 1) > 0 THEN
    PERFORM send_notification(
      v_member_ids,
      NEW.trip_id::UUID,
      'calendar',
      '📅 New event: ' || NEW.title,
      COALESCE(v_creator_name, 'Someone') || ' added a new event' || 
        CASE WHEN NEW.start_time IS NOT NULL 
          THEN ' on ' || to_char(NEW.start_time, 'Mon DD, YYYY at HH:MI AM')
          ELSE ''
        END ||
        CASE WHEN NEW.location IS NOT NULL 
          THEN ' at ' || NEW.location
          ELSE ''
        END,
      jsonb_build_object(
        'event_id', NEW.id,
        'trip_id', NEW.trip_id,
        'start_time', NEW.start_time,
        'location', NEW.location,
        'action', 'event_created'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_on_calendar_event IS 
  'Sends notifications when new calendar events are created. Skips notifications for bulk_import source_type to avoid timeout on large imports.';
```

#### B. Calendar Service (`src/services/calendarService.ts`)

- **Use `source_type: 'bulk_import'`** for all events created via `bulkCreateEvents` and `batchInsertEvents`
- **Keep bulk insert for batches up to 50** (or even 100) — with the trigger fix, bulk insert will complete quickly
- **For batches > 50**: use **chunked bulk inserts** (e.g., 50 events per chunk) to show progress without per-event delay
- **Remove `fetchAndCacheRecentEvents`** if we add `.select('id')` to bulk insert for lightweight confirmation (optional)

#### C. Calendar Import Modal (`CalendarImportModal.tsx`)

- **Remove the timeout race** — agreed; it kills working imports
- **Simple `await`** with progress callback
- **Real-time progress bar** — per-event completion visible; no timeout needed
- For chunked bulk: progress = `(chunkIndex * chunkSize + eventsInChunk) / total`

**Why disable timeouts and rely on visible progress?** When users see "45/100 events" and a filling progress bar, they know the import is working. A timeout that kills a working import (e.g. at 60s when 80/100 events are done) is worse than no timeout. The only reason for a timeout would be if the import could hang indefinitely with no feedback — but with real-time progress, that case doesn't apply.

---

## 4. Chunked Bulk Insert for Scale (82–100+ Events)

To get **real progress** for large imports while keeping bulk speed:

```ts
// Pseudocode for bulkCreateEvents
const CHUNK_SIZE = 50;

if (rows.length <= CHUNK_SIZE) {
  // Single bulk insert — fast, no progress granularity
  const { error } = await supabase.from('trip_events').insert(rows);
  if (!error) {
    onProgress?.(rows.length, rows.length);
    return { imported: rows.length, failed: 0, events: [] };
  }
  // Fallback to sequential on error
}

// Chunked: insert 50 at a time, report progress
for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
  const chunk = rows.slice(i, i + CHUNK_SIZE);
  const { error } = await supabase.from('trip_events').insert(chunk);
  if (error) {
    // Fallback: insert chunk sequentially
    const result = await batchInsertEvents(chunk, (c, t) => 
      onProgress?.(i + c, rows.length)
    );
    imported += result.imported;
    failed += result.failed;
  } else {
    imported += chunk.length;
    onProgress?.(Math.min(i + CHUNK_SIZE, rows.length), rows.length);
  }
}
```

With `source_type: 'bulk_import'`, each chunk insert completes in **<1–2 seconds** (no trigger work). 100 events = 2 chunks ≈ **2–4 seconds total**.

---

## 5. Comparison

| Approach | 33 events | 82 events | 100 events |
|----------|-----------|-----------|------------|
| **Proposed (sequential)** | ~35–40s | ~90s | ~110s |
| **Improved (trigger fix + bulk)** | ~1–2s | ~2–3s | ~2–4s |

---

## 6. Optional: Single Summary Notification for Bulk Import

If you want trip members to be notified when someone bulk-imports 82 events, add a **single** notification after the full import completes. This would be done in the **application layer** (after `bulkCreateEvents` returns), not in the trigger:

```ts
// After successful bulk import
if (imported > 1 && imported <= 100) {
  await supabase.rpc('send_bulk_import_notification', {
    p_trip_id: tripId,
    p_event_count: imported,
    p_creator_id: user.id,
  });
}
```

Requires a new RPC that sends one notification to all members. Can be a follow-up.

---

## 7. Recommended Implementation Order

1. **Database migration** — add `source_type = 'bulk_import'` check to trigger
2. **calendarService.ts** — set `source_type: 'bulk_import'` in bulk paths; implement chunked bulk (50 per chunk) for >50 events
3. **CalendarImportModal.tsx** — remove timeout race; simple await
4. **(Optional)** Add `send_bulk_import_notification` RPC and call from service after bulk import

---

## 8. Rollback Strategy

- **Trigger**: Revert migration to restore full per-event notifications
- **Service**: Revert to sequential fallback for all batches >5
- **Modal**: Re-add timeout (with higher limit) if needed

**Regression Risk:** LOW — trigger change is additive (new branch); bulk path already exists and is tested.
