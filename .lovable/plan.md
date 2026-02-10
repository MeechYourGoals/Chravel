

# Fix: Calendar Import Pipeline (All Formats) + Build Error

## Build Error Fix

The `push-notifications/index.ts` function creates a local `corsHeaders` variable inside the `serve()` handler via `getCorsHeaders(req)`, but the sub-functions (`sendPushNotification`, `sendEmailNotification`, `sendSMSNotification`, `savePushToken`, `removePushToken`) reference `corsHeaders` without having access to it -- they're standalone functions outside the `serve()` closure.

**Fix**: Pass `corsHeaders` as a parameter to each sub-function, or restructure so they're inside the closure.

## Calendar Import Failures (5 Root Causes)

### Issue 1: Text Import -- JSON Parse Crash

**Root Cause**: The edge function at line 222 does `JSON.parse(result.choices[0].message.content)` with no error handling. When Gemini returns slightly malformed JSON (markdown fences, trailing commas, etc.), it crashes with a `SyntaxError`. The logs confirm this: `"Expected double-quoted property name in JSON at position 5508"`.

**Fix**: Add robust JSON extraction that strips markdown code fences and handles common JSON malformations before parsing. Wrap in try/catch with a regex fallback.

### Issue 2: PDF Import -- Returns Hallucinated Mock Data

**Root Cause**: The `buildUserMessage()` function (line 555-575) appends a PDF URL as `image_url` only if the fileType starts with `image/`. For PDFs, it just appends the URL as text: `"File URL: https://... (Type: application/pdf)"`. Gemini cannot read a PDF from a URL in a text message -- it has no access to the file content. So it hallucinates generic travel events ("Flight to London", "Hotel Check-in", "Dinner Reservation").

**Fix**: For PDF files, extract the text content server-side first (fetch the PDF, use a text extraction approach), then send the extracted text to Gemini instead of just a URL string. Alternatively, since the Lovable AI gateway supports Gemini which can process PDFs via `file_data`, we can use that format.

### Issue 3: Excel Import -- Header Row Not on Row 1

**Root Cause**: The Excel file has "NIAJ 2026 Shows" as a title in cell A1, with the actual column headers ("Show Date", "Artist", "Venue", "Notes") on row 3. The parser (`parseExcelCalendar`) always treats row 1 as headers. Since "NIAJ 2026 Shows" doesn't match any column patterns (date, title, time, etc.), `detectColumns()` returns null and the import fails with "Could not detect required columns".

**Fix**: Scan the first 10 rows looking for the best header row (the one that matches the most column patterns). Also add "artist" and "show" to the title pattern, and "show date" / "show.?date" to the date pattern (already partially there but the compound header "Show Date" has a space that the pattern handles).

### Issue 4: Image Import -- AI Prompt Too Narrow

**Root Cause**: The `extractCalendarEvents` system prompt focuses exclusively on travel bookings: "Flight bookings, Hotel reservations, Restaurant reservations, Activity bookings, Transportation bookings, Tour schedules, Meeting times." A screenshot of a comedy festival spreadsheet doesn't match any of these categories, so Gemini either returns nothing or hallucinates travel data.

**Fix**: Broaden the system prompt to extract ANY scheduled events, not just travel-specific ones. Include: "concerts, shows, performances, conferences, meetings, sports events, festivals" etc.

### Issue 5: AI Prompt Category Mismatch

**Root Cause**: The category enum in the extraction prompt is `"dining|lodging|activity|transportation|entertainment|business"` which doesn't match the actual database enum that includes `"other"`. Events that don't fit these categories get forced into wrong categories.

**Fix**: Add `"other"` to the category enum and broaden the extraction instruction.

## Implementation Plan

### Step 1: Fix build error in `push-notifications/index.ts`

Pass the `corsHeaders` object to each sub-function as a parameter, so they have access to the CORS headers created from the request.

### Step 2: Fix JSON parsing in `enhanced-ai-parser/index.ts`

Add a `safeParseJSON()` helper that:
- Strips markdown code fences (` ```json ... ``` `)
- Handles trailing commas
- Falls back to regex extraction if `JSON.parse` fails

Apply this to all `JSON.parse(result.choices[0].message.content)` calls (lines 222, 300, 361, 435, 543).

### Step 3: Fix PDF handling in `enhanced-ai-parser/index.ts`

For PDFs, fetch the file content and convert to base64, then send as inline data to Gemini using the `file_data` or `inline_data` format that the Lovable AI gateway supports. This allows Gemini to actually read the PDF content instead of seeing just a URL string.

### Step 4: Broaden the calendar extraction prompt

Update the system prompt in `extractCalendarEvents()` to extract ALL types of scheduled events -- not just travel bookings. Include shows, concerts, festivals, conferences, sports events, etc.

### Step 5: Fix Excel header detection

Update `parseExcelCalendar()` to scan the first 10 rows for the best header row instead of assuming row 1. Also add common column name variants ("Artist", "Show", "Show Date", "Act", "Performer", "Event Name") to the detection patterns.

### Step 6: Ensure Gemini-only fallback works

The URL import path uses Firecrawl with Gemini as the AI layer. If Firecrawl credits run out, it should fall back to raw fetch + Gemini. Verify this fallback path is intact in `scrape-schedule`.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/push-notifications/index.ts` | Pass `corsHeaders` to sub-functions as parameter |
| `supabase/functions/enhanced-ai-parser/index.ts` | (a) Add `safeParseJSON()` helper, (b) fix PDF handling to send actual content, (c) broaden calendar prompt to all event types |
| `src/utils/calendarImportParsers.ts` | (a) Scan first 10 rows for header row in Excel, (b) add more column name variants to detection patterns |

## Testing Checklist

After implementation, test all import formats with the Netflix Festival data:
1. **Text paste**: The CSV-formatted text with 21 comedy shows
2. **PDF upload**: The NIAJ 2026 Shows PDF (should extract 50+ shows)
3. **Excel upload**: The NIAJ_2026_Shows.xlsx file (should handle title row and find headers on row 3)
4. **Image upload**: Screenshot of the Excel grid (should extract visible shows)
5. **URL import**: Verify Firecrawl path still works and Gemini-only fallback is intact

