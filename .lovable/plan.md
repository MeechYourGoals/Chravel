

# Fix: Smart Import Dates Off by One

## Root Cause

The bug is `Date.toISOString().split('T')[0]`. This converts to **UTC** before extracting the date string. If the user is in a timezone behind UTC (e.g., US Eastern = UTC-5), a date like **June 15 at 7:00 PM local** becomes **June 16 at 00:00 UTC**, and `toISOString()` returns `"2025-06-16T..."` -- shifting the date forward by one day.

This pattern appears in **4 critical locations** across the import pipeline:

| File | Line(s) | Context |
|------|---------|---------|
| `src/utils/calendarImportParsers.ts` | 343 | Excel cell Date objects converted to string |
| `src/utils/agendaImportParsers.ts` | 37 | ICS event start time to session date |
| `src/utils/agendaImportParsers.ts` | 243 | Agenda Excel cell Date objects |
| `src/services/tripService.ts` | 25 | `normalizeDateInput` ISO datetime branch |

## Fix

Replace every `date.toISOString().split('T')[0]` with a local-date extraction helper:

```typescript
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

### Changes

1. **Create `src/utils/dateHelpers.ts`** -- export `formatLocalDate()` as a shared utility so all files use one function.

2. **`src/utils/calendarImportParsers.ts` (line 343)** -- change `cell.toISOString().split('T')[0]` to `formatLocalDate(cell)`.

3. **`src/utils/agendaImportParsers.ts` (lines 37, 243)** -- same replacement for ICS event dates and Excel cell dates.

4. **`src/services/tripService.ts` (line 25)** -- in the ISO datetime branch of `normalizeDateInput`, change `date.toISOString().split('T')[0]` to `formatLocalDate(date)`.

5. **Existing unit test** (`src/services/__tests__/tripService.unit.test.ts`) -- the test for "extract date from ISO datetime strings" currently expects UTC behavior. Update it to expect local-date extraction, and add a test case for a timezone-offset ISO string that would previously shift.

No other files need changes. The `calendarAdapter.ts` already uses local extraction (`getHours`/`getMinutes`) for time, so it's unaffected.

