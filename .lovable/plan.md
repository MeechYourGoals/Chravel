

# Fix URL Import: Smart HTML Reduction + Background Processing

## Why Your Concern About Stripping Scripts Is Correct

You are right that blindly removing all `<script>` tags would break imports for many sites. Here is why:

- **NBA.com, ESPN, NFL.com**: Schedule data lives inside `<script type="application/ld+json">` (structured data) or `<script id="__NEXT_DATA__">` (Next.js hydration payload). Stripping ALL scripts would delete the actual schedule data.
- **The current 800K limit exists for a reason**: It was specifically set to handle full-season schedules (82+ NBA games) from JS-heavy sports sites.

## What Actually Happened with nursejohnnshows.com

I tested this site directly -- it **cannot be fetched at all** from a server. The site either:
- Blocks non-browser requests (bot protection / Cloudflare)
- Requires JavaScript execution to render any content (Squarespace/Wix)
- Returns an empty shell or redirect loop

This means the edge function's `fetch()` either got zero usable HTML, or got a massive Squarespace JS bundle with zero actual show data in the HTML source. Either way, Gemini received garbage and spent minutes trying to make sense of it before the Supabase edge function timed out at 60 seconds -- which is what caused the freeze on your end.

## Revised Plan: Smart Reduction (Not Blind Stripping) + Background Processing

### Fix 1: Smart HTML Cleaning (Keep Data-Bearing Scripts, Remove Junk)

**File**: `supabase/functions/scrape-schedule/index.ts`

Instead of stripping ALL scripts, use a **selective** approach:

**KEEP these script types** (they contain actual schedule data):
- `<script type="application/ld+json">` -- Google structured data, often has event listings
- `<script id="__NEXT_DATA__">` -- Next.js data payload
- `<script type="application/json">` -- generic data payloads
- `<script>` blocks containing JSON arrays with date-like patterns

**REMOVE these** (they are always noise):
- `<script src="...">` -- external JS bundles (React, jQuery, analytics)
- `<style>...</style>` -- CSS rules
- `<svg>...</svg>` -- icon definitions
- HTML comments `<!-- ... -->`
- `<noscript>...</noscript>` -- fallback content
- Inline scripts that are clearly code (containing `function(`, `var `, `window.`, etc.)

This approach preserves the data Gemini needs while removing 60-80% of the noise. The key insight: **scripts with `src` attributes are always external bundles (safe to remove)**, while **inline scripts without src may contain data (inspect before removing)**.

Additionally, add an **early-exit check**: if the cleaned HTML has less than 200 characters of actual text content (after stripping all tags), return an immediate error telling the user the site requires JavaScript rendering and suggesting they paste the schedule text instead. This prevents sending garbage to Gemini and waiting 60 seconds for a useless response.

### Fix 2: Add 45-Second Timeout to Gemini Call

**File**: `supabase/functions/scrape-schedule/index.ts`

The HTML fetch already has a 15-second timeout (line 97: `AbortSignal.timeout(15000)`), but the Gemini AI call on line 166 has **no timeout at all**. Add `signal: AbortSignal.timeout(45000)` to the Gemini fetch. This ensures:

- HTML fetch: max 15 seconds
- AI extraction: max 45 seconds  
- Total worst case: ~60 seconds (within Supabase limits)
- If Gemini hangs on bad HTML, the user gets a clear error instead of infinite spinning

### Fix 3: Background Import with Toast Notifications

This is the user-facing fix that eliminates the freeze regardless of how long the backend takes.

**New file**: `src/features/calendar/hooks/useBackgroundImport.ts`

A hook that:
- Accepts a URL and fires the `parseURLSchedule()` call
- Immediately returns control to the user (they can navigate away)
- Shows a persistent Sonner toast: "Scanning website for schedule..."
- On success: updates toast to "Found X events from [domain]" with a "View Events" button
- On failure: updates toast with the error message
- Stores the parsed result so the modal can open in preview state

**Modified file**: `src/features/calendar/components/CalendarImportModal.tsx`

- Add a new prop `pendingResult?: SmartParseResult` that, when provided, opens the modal directly in "preview" state (skipping the idle/parsing states)
- Modify `handleUrlImport` to call the background hook instead of running synchronously:
  - Close the modal
  - Start the background import
  - User navigates freely
  - When the toast's "View Events" button is clicked, reopen the modal with the result

**Modified files**: `src/components/GroupCalendar.tsx` and `src/components/mobile/MobileGroupCalendar.tsx`

- Wire the `useBackgroundImport` hook at the calendar level
- Pass the `startBackgroundImport` function down to the modal
- When a background result arrives and user clicks the toast action, set `showImportModal = true` and pass the pending result as a prop

### Fix 4: Content Quality Check Before Sending to AI

**File**: `supabase/functions/scrape-schedule/index.ts`

After cleaning the HTML, extract just the visible text content (strip all remaining tags) and check:

1. If text content is less than 200 characters: return immediately with a helpful error -- "This website requires a browser to load its content. Try copying the schedule text from the page and pasting it instead."
2. If text content is less than 500 characters but contains common "enable JavaScript" messages: same early exit with clear messaging
3. Log the cleaned HTML size for debugging: `console.log('[scrape-schedule] Cleaned HTML: X chars, text content: Y chars')`

This prevents wasting 45+ seconds on sites that clearly have no server-rendered content.

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `supabase/functions/scrape-schedule/index.ts` | Smart HTML cleaning (keep data scripts, remove junk); 45s AI timeout; content quality check with early exit | Faster AI processing; immediate error for empty/JS-only sites; no more infinite hangs |
| `src/features/calendar/hooks/useBackgroundImport.ts` | New hook for background URL import with toast notifications | Users can navigate away during import |
| `src/features/calendar/components/CalendarImportModal.tsx` | Accept `pendingResult` prop; delegate URL imports to background hook | Modal closes immediately on URL import; reopens in preview state when ready |
| `src/components/GroupCalendar.tsx` | Wire `useBackgroundImport` hook; pass result to modal | Background import persists across tab navigation |
| `src/components/mobile/MobileGroupCalendar.tsx` | Same wiring as desktop | Mobile parity |

## What This Does NOT Do (Protecting What Works)

- Does NOT reduce `MAX_HTML_LENGTH` below 200,000 for cleaned HTML (preserving ability to capture full seasons)
- Does NOT strip `<script type="application/ld+json">` or `__NEXT_DATA__` (preserving structured data extraction from sports sites)
- Does NOT change the Gemini model or prompt (those work correctly when given good data)
- Does NOT break existing ICS, CSV, Excel, PDF, or text import flows (those are untouched)

## Expected Outcome

- Sites with server-rendered content (NBA, ESPN, most schedule pages): Import completes in 5-15 seconds with cleaned HTML
- Sites that block server fetch or require JS rendering (nursejohnnshows.com, some Squarespace sites): User gets an immediate clear error within 2-3 seconds suggesting they paste the text instead -- no more minutes of spinning
- All URL imports run in the background: user can switch to Chat, Concierge, or any tab and get a toast when done
