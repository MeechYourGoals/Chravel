

# Fix Build Errors + Bulk Calendar Import for Large Event Sets (82+ Events)

## Problem Summary

Two connected issues:

1. **Build errors in `calendarService.ts`** block the entire app from loading. Three TypeScript errors prevent compilation:
   - Lines 618/630/674: `source_data` typed as `Record<string, unknown>` but Supabase expects `Json`
   - Line 758: `event.version` accessed on `TripEvent` interface but `version` property doesn't exist

2. **Bulk import of 82 events works but events don't appear in calendar** -- partly caused by the build errors above, and partly because the batch insert strategy (batches of 5 sequential) is too slow for large imports, causing potential timeouts or UI disconnects.

---

## Fix 1: Add `version` to `TripEvent` Interface

**File: `src/services/calendarService.ts`, line 25**

Add `version?: number;` to the `TripEvent` interface (between `updated_at` and the closing brace). The database schema has this column, and `cacheEventsInBackground` (line 758) already references `event.version`.

---

## Fix 2: Change `source_data` Type from `Record<string, unknown>` to `Json`

**File: `src/services/calendarService.ts`**

Three locations need the same fix:

| Location | Current Type | Fix |
|----------|-------------|-----|
| Line 1 (import) | -- | Add `import type { Json } from '@/integrations/supabase/types';` |
| Line 618 (row type in `bulkCreateEvents`) | `source_data: Record<string, unknown>` | Change to `source_data: Json` |
| Line 630 (cast) | `as Record<string, unknown>` | Change to `as Json` |
| Line 674 (row type in `batchInsertEvents`) | `source_data: Record<string, unknown>` | Change to `source_data: Json` |

This aligns the insert row types with what Supabase expects (`Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]`).

---

## Fix 3: Increase Batch Size for Large Imports

**File: `src/services/calendarService.ts`, line 677**

Change `BATCH_SIZE` from `5` to `20`. Supabase handles bulk inserts well, and inserting 5 at a time means 82 events require 17 sequential rounds. With a batch size of 20, that drops to 5 rounds. This dramatically reduces total import time from minutes to seconds.

Also update the small-batch threshold on line 634 from `<= 5` to `<= 20` to match, so imports of up to 20 events use the fast single-insert path.

---

## Summary of Changes

All changes are in a single file: `src/services/calendarService.ts`

| Line(s) | Change |
|---------|--------|
| 1 | Add `import type { Json } from '@/integrations/supabase/types'` |
| 25 | Add `version?: number` to `TripEvent` interface |
| 618 | Change row type `source_data` to `Json` |
| 630 | Change cast to `as Json` |
| 634 | Change threshold from `5` to `20` |
| 674 | Change param type `source_data` to `Json` |
| 677 | Change `BATCH_SIZE` from `5` to `20` |

These are 7 surgical line edits in one file. No logic changes, no new dependencies -- just type alignment and a batch size tuning.
