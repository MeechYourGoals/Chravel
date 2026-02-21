

# Fix: Calendar "Cannot access 've' before initialization" Crash

## Root Cause

The runtime error "Cannot access 've' before initialization" is caused by a **variable hoisting violation** in three import modal files. In each file, `processFile` (a `useCallback`) references `processParseResult` in its body and dependency array, but `processParseResult` is declared ~30 lines later. JavaScript's `const` is block-scoped and not hoisted, so this crashes at runtime.

This is the **sole cause** of the Calendar tab crash. The error boundary catches it and displays the red error you see.

## Surgical Fixes (4 files, no feature changes)

### Fix 1 -- CalendarImportModal.tsx (lines 86-94 to 118+)
Move the `processParseResult` useCallback **above** `processFile`. Currently `processFile` is at line 86 and `processParseResult` at line 118. Swap their order so `processParseResult` is declared first.

### Fix 2 -- AgendaImportModal.tsx (lines 118-126 to 151+)
Same pattern. Move `processParseResult` (line 151) above `processFile` (line 118).

### Fix 3 -- LineupImportModal.tsx (lines 85-93 to 117+)
Same pattern. Move `processParseResult` (line 117) above `processFile` (line 85).

### Fix 4 -- useSmartImportDropzone.ts (line 52)
Type error: `validMimes.includes(mime)` fails because `mime` is `string` but the array is `readonly` literal types. Fix by casting: `validMimes.includes(mime as any)` or widening the array type.

## Additional Build Errors (not causing the crash but must be fixed)

### Fix 5 -- SeatManagement.tsx (line 46)
The query selects `job_title` and `show_job_title` from `profiles_public`, but those columns do not exist in the table. Fix by removing those two fields from the `.select()` and removing the conditional logic that references them (lines 53-54). Display name falls back to `resolved_display_name || display_name || 'Unknown'`.

### Fix 6 -- chatSearchService.test.ts (lines 28-37)
Mock chain methods typed as `unknown` need explicit casting. Wrap mock returns with `(supabase.from(...) as any).mockReturnValue(...)` or type the mock properly.

## What This Restores
- Calendar tab loads without crash
- All calendar views (day/month/itinerary) render normally
- Import modals (Calendar, Agenda, Lineup) function correctly
- Add Event and Export continue working (they were never broken, just unreachable due to the crash)
- Clean build with zero TypeScript errors

## Files Modified
| File | Change | Risk |
|------|--------|------|
| `CalendarImportModal.tsx` | Reorder two `useCallback` declarations | None -- pure declaration order fix |
| `AgendaImportModal.tsx` | Reorder two `useCallback` declarations | None |
| `LineupImportModal.tsx` | Reorder two `useCallback` declarations | None |
| `useSmartImportDropzone.ts` | Widen type in `.includes()` call | None |
| `SeatManagement.tsx` | Remove non-existent column references | None -- columns don't exist |
| `chatSearchService.test.ts` | Fix mock typing | None -- test file only |

