
# Fix Calendar Import Failures + Improve Scraping Resilience

## Issue 1: Import Always Fails (Root Cause Found)

The database has two versions of the `should_send_notification` function:
- **2-arg version**: `should_send_notification(uuid, text)` 
- **3-arg version**: `should_send_notification(uuid, text, text DEFAULT 'push')`

When any event is inserted into `trip_events`, a trigger fires `notify_on_calendar_event` which calls `send_notification`, which calls `should_send_notification(user_id, type)` with 2 arguments. PostgreSQL cannot determine which function to use because the 3-arg version's default parameter means both match a 2-arg call. This causes **every single calendar event insert to fail** -- not just bulk imports.

### Fix

**Database**: Drop the older 2-arg version of `should_send_notification`. The 3-arg version with `DEFAULT 'push'` already handles all 2-arg calls identically. This is a single SQL command:

```text
DROP FUNCTION IF EXISTS should_send_notification(uuid, text);
```

This immediately unblocks all calendar event creation (manual, import, bulk).

**Fallback in code** (`calendarService.ts`): Even after the DB fix, add a sequential one-by-one insert fallback. If the single bulk INSERT fails, insert events individually with a small delay between each. This ensures that even if one event fails (e.g., bad data), the rest still import successfully. The current code tries individual inserts but fires them all in parallel via `Promise.allSettled` -- change this to **sequential** to avoid overwhelming the trigger system with 20 simultaneous notification calls.

Changes to `bulkCreateEvents`:
- First attempt: single bulk INSERT (fast path for <= 20 events)
- If that fails: sequential one-by-one inserts with 100ms delay between each
- Each individual insert catches its own error so others can proceed
- Log each failure reason for debugging

## Issue 2: Trevor Noah and Similar Client-Rendered Sites

Trevor Noah's website (`trevornoah.com/shows`) either blocks non-browser requests or renders show data entirely via JavaScript after page load. The edge function's `fetch()` receives a 69K HTML shell containing framework code (React/Next.js) but zero actual show data. Gemini correctly returns an empty array because the data simply isn't there.

This is a **fundamental limitation** of server-side `fetch()` -- it cannot execute JavaScript. Sites like nursejohnnshows.com work because their HTML contains the show data server-side.

### Improvements

**Better error detection** in `scrape-schedule` and `scrape-agenda`:
- After Gemini returns an empty array, check if the HTML contains signals of a JS-rendered site (common patterns: `__NEXT_DATA__` with empty props, `<div id="root"></div>` with no content, `<noscript>` tags referencing JavaScript requirement)
- If detected, return a specific error message: "This website loads its content dynamically and can't be read by our scanner. Try one of these alternatives: (1) Copy the schedule text from the page and paste it, or (2) Take a screenshot of the schedule and upload it."
- This gives the user actionable next steps instead of a generic "no events found" message

**Improved User-Agent and headers** in both scrape functions:
- Add `Sec-Fetch-Mode: navigate` and `Sec-Fetch-Site: none` headers to better mimic a real browser request
- Some sites serve different (more complete) HTML to requests that look more like real navigation

## Issue 3: Mobile/PWA Optimization for Toast Notifications

The background import toast notifications need to work well on mobile:
- Ensure toast actions ("View Events" / "Review Sessions") have touch-friendly tap targets (min 44px)
- Position toasts at the bottom on mobile (they currently render at bottom-right on desktop)
- Verify the toast persists across tab switches on both mobile and desktop views

### Changes

**`useBackgroundImport.ts`** and **`useBackgroundAgendaImport.ts`**:
- No code changes needed for mobile toast positioning -- Sonner handles responsive positioning automatically when configured with `position="bottom-center"` on mobile
- Verify the Toaster component in the app root has proper mobile positioning (check `App.tsx` or layout root)

## Summary of Changes

| File | Change | Purpose |
|------|--------|--------|
| Database SQL | Drop 2-arg `should_send_notification` function | Unblock ALL calendar event inserts |
| `src/services/calendarService.ts` | Sequential one-by-one fallback in `batchInsertEvents` with 100ms delays | Reliable import even if individual events fail |
| `supabase/functions/scrape-schedule/index.ts` | Better error messages for JS-rendered sites; improved request headers | Actionable user guidance instead of generic failure |
| `supabase/functions/scrape-agenda/index.ts` | Same improvements as scrape-schedule | Consistent behavior across both scrapers |

## What This Does NOT Change

- The 1M character cap on HTML sent to Gemini stays (no restrictions on what Gemini receives)
- Background import hooks and toast notifications stay as-is (they work correctly)
- The Gemini model and prompts are unchanged
- No changes to the import modal UI (it already works great as shown in the screenshots)
- Agenda import (`AgendaImportModal`) is unaffected -- it uses `event_agenda_items` table which does not have the notification trigger issue

## Expected Outcome

- **Nurse John import**: All 20 events insert successfully once the DB function is fixed
- **Trevor Noah**: User gets a clear message suggesting they paste text or upload a screenshot instead
- **All future imports**: Sequential fallback ensures partial success even when individual events have issues
- **Mobile**: Toast notifications continue to work seamlessly across tab navigation on all devices
