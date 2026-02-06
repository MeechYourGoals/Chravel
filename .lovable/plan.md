

# Revert HTML Stripping, Increase Limits for Full-Page Parsing

## Root Cause (Confirmed by Logs)

The `stripHtmlCruft()` function removes `<script>` tags, but NBA.com (and many modern sites) render schedule data entirely via JavaScript. The schedule data is embedded inside `<script>` tags as JSON payloads. Stripping scripts removed ALL schedule content.

```
Before: 624,845 characters (full page with schedule data in scripts)
After:  74 characters (empty shell - zero schedule data)
AI got: 74 chars -> returned [] -> "No events found"
```

## Solution

Remove `stripHtmlCruft()` entirely and increase the character limit so Gemini Flash can parse the full raw HTML. Gemini Flash has a 1M token context window -- 600KB of HTML is roughly 150-200K tokens, well within capacity.

## Changes

**File: `supabase/functions/scrape-schedule/index.ts`**

| Change | Detail |
|--------|--------|
| Remove `stripHtmlCruft()` function | Delete lines 24-54 (the entire function definition) |
| Remove the call to `stripHtmlCruft()` | Delete lines 153-156 where it's called and logged |
| Increase MAX_HTML_LENGTH | Change from 150,000 to 800,000 characters (~200K tokens, well within Gemini Flash 1M limit) |
| Keep max_tokens at 16,000 | Already increased from previous fix, sufficient for full-season schedules |
| Update truncation log message | Simplify since there's no more stripping step |

### After the change, the flow is:

1. Fetch raw HTML from URL (624KB for nba.com)
2. Truncate to 800K chars if needed (most pages won't hit this)
3. Send full HTML directly to Gemini Flash
4. Gemini extracts schedule data from script tags, tables, divs -- wherever it lives
5. Return all future events

No other files need to change. The frontend CalendarImportModal already handles the response correctly.

