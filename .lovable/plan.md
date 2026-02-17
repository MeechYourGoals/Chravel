
# Fix: Agenda Session Import Failing for 60 Sessions

## Root Cause

The import handler at `AgendaModal.tsx` line 877-880 loops through all 60 sessions calling `addSession` sequentially:

```text
for (const s of importedSessions) {
  await addSession(s);   // <-- This is useMutation.mutateAsync
}
```

**Two critical problems:**

1. **`onSuccess` fires a toast for EVERY session**: The `useEventAgenda` hook (line 103) calls `toast({ title: 'Session added' })` on each successful insert. For 60 sessions, that's 60 toast notifications flooding the UI.

2. **`queryClient.invalidateQueries` fires after EVERY insert** (line 102): Each of the 60 inserts triggers a full refetch of the agenda query. This creates a cascade where insert #2 waits for refetch #1, insert #3 waits for refetch #2, etc. With 60 sessions, these compounding refetches cause the overall operation to take far too long, eventually timing out or erroring.

3. **No progress feedback**: The `AgendaImportModal` `handleImport` function (line 202-243) treats the entire batch as pass/fail. If any single insert throws, the catch block marks ALL sessions as failed (`failed = sessionsToImport.length`). There's no incremental progress counter.

4. **No throttle delay**: Unlike the calendar import (which has a 100ms delay between inserts), the agenda import fires inserts back-to-back with no breathing room.

## Fix (2 files, minimal changes)

### File 1: `src/hooks/useEventAgenda.ts` -- Add a bulk insert method

Add a new `bulkAddSessions` method that:
- Inserts sessions one at a time with a 100ms delay (matching calendar import pattern)
- Suppresses per-item toasts and query invalidation during bulk operations
- Calls `queryClient.invalidateQueries` once at the end
- Accepts a progress callback so the UI can show a counter
- Returns `{ imported: number; failed: number }`

The existing `addSession` mutation stays unchanged for single-session adds.

### File 2: `src/components/events/AgendaImportModal.tsx` -- Wire up progress and use bulk method

- Accept a new `onBulkImportSessions` prop (or modify `onImportSessions` signature)
- Show a progress counter during import (e.g., "Importing 12 / 60...")
- Use the bulk method instead of looping `addSession`

### File 3: `src/components/events/AgendaModal.tsx` -- Pass bulk handler

- Wire the new bulk handler into the `AgendaImportModal` props

Same change applies to `EnhancedAgendaTab.tsx` if it also renders the import modal.

## Technical Details

| File | Change |
|------|--------|
| `src/hooks/useEventAgenda.ts` | Add `bulkAddSessions(sessions, onProgress)` that inserts sequentially with 100ms delay, no per-item toast/invalidation, single invalidation at end |
| `src/components/events/AgendaImportModal.tsx` | Add progress state; show "Importing X / Y..." during import; call bulk handler |
| `src/components/events/AgendaModal.tsx` | Pass `bulkAddSessions` to the import modal |
| `src/components/events/EnhancedAgendaTab.tsx` | Same wiring as AgendaModal |

## What This Fixes
- 60 sessions will import reliably with a visible progress counter
- No more 60 toast spam (single summary toast at end)
- No more 60 query refetches during import (single refetch at end)
- 100ms throttle prevents database overload
- Partial failure handling: if session 45 fails, sessions 1-44 are preserved
