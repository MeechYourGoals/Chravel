

# URL Import for Smart Calendar: Scrape Any Schedule Website

## Summary

Add a URL input field to the CalendarImportModal so users can paste a link to any schedule page (ESPN, MaxPreps, team websites, concert tour pages, etc.) and have the system scrape the page HTML, send it to Gemini for extraction, and auto-populate future-only events into the calendar.

---

## Architecture

The flow is straightforward and uses infrastructure that already exists:

1. **User pastes URL** into a new text field in the import modal
2. **New edge function** (`scrape-schedule`) fetches the webpage HTML server-side (avoids CORS)
3. **Gemini AI** parses the HTML and extracts schedule events as structured JSON
4. **Client receives** the same `ICSParsedEvent[]` format used by all other parsers
5. **Existing preview/import flow** handles duplicate detection and database insertion

The key insight: we do NOT need Firecrawl. Deno's native `fetch()` in edge functions can grab page HTML directly (same pattern as `fetch-og-metadata` already does). Then Gemini's large context window handles the parsing -- it's excellent at reading HTML tables.

---

## What Gets Built

### 1. New Edge Function: `supabase/functions/scrape-schedule/index.ts`

This function:
- Accepts a URL from the client
- Validates it (HTTPS only, no internal IPs -- reusing existing `validateExternalHttpsUrl`)
- Fetches the page HTML with a browser-like User-Agent
- Sends the HTML to Gemini with a sports/events-specific prompt
- Gemini extracts structured events (title, date, time if available, location)
- Returns only events from today forward (critical requirement)
- Does NOT fill in end times or descriptions (per your instructions)

**Gemini Prompt Strategy:**

The system prompt will be specifically tuned for schedule extraction:

```text
You are a schedule extraction expert. Extract ONLY games/events/shows
from this webpage HTML. For each event extract:
- title: The matchup or event name (e.g., "Lakers at Memphis Grizzlies")
- date: DD-MM-YYYY format
- start_time: HH:MM format IF clearly listed, otherwise omit
- location: The opponent/venue name. For home games use the team name.
  For away games use the opponent name. Do NOT guess addresses.

CRITICAL RULES:
- Only include events dated {today's date} or later
- Do NOT include past games/events
- Do NOT fill in end_time
- Do NOT fill in description
- If no time is listed, omit start_time entirely
- Return valid JSON array
```

### 2. Updated CalendarImportModal UI

Add a URL input section below the "Choose File" button, inside the drop zone area:

```text
 ┌─────────────────────────────────────────────────────────────┐
 │  Drag and drop a file here, or click to browse             │
 │  [ICS] [CSV] [Excel] [PDF] [Image]                        │
 │                                                             │
 │  [ Choose File ]                                            │
 │                                                             │
 │  ─── or import from a URL ───                              │
 │                                                             │
 │  🔗 [ https://www.espn.com/nba/team/schedule... ]          │
 │  [ Import from URL ]                                        │
 └─────────────────────────────────────────────────────────────┘
 │                                                             │
 │  [toggle] Paste schedule text instead                       │
 └─────────────────────────────────────────────────────────────┘
```

The URL input will have:
- A text field with placeholder: "Paste a schedule URL (team's site, tour dates, etc.)"
- A "Import from URL" button with a globe/link icon
- Loading state: "Scanning website for schedule..." with spinner
- A new "URL" badge added to the format badges row

### 3. New Parser Function in `calendarImportParsers.ts`

```typescript
export async function parseURLSchedule(url: string): Promise<SmartParseResult>
```

This calls the `scrape-schedule` edge function and maps the response to the standard `ICSParsedEvent[]` format. Source format will be `'url'` (new type added to `ImportSourceFormat`).

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/scrape-schedule/index.ts` | **Create** | Edge function: fetch HTML, send to Gemini, return structured events |
| `supabase/config.toml` | **Update** | Add `[functions.scrape-schedule]` with `verify_jwt = true` |
| `src/utils/calendarImportParsers.ts` | **Update** | Add `'url'` to `ImportSourceFormat`, add `parseURLSchedule()` function, update `getFormatLabel()` |
| `src/features/calendar/components/CalendarImportModal.tsx` | **Update** | Add URL input field, "Import from URL" button, URL badge, handler |

---

## Edge Function Details: `scrape-schedule`

**Input:**
```json
{
  "url": "https://www.espn.com/nba/team/schedule/_/name/ind"
}
```

**Output:**
```json
{
  "success": true,
  "events": [
    {
      "title": "Pacers vs Celtics",
      "date": "2026-02-10",
      "start_time": "19:00",
      "location": "Pacers"
    },
    {
      "title": "Pacers at Lakers",
      "date": "2026-02-15",
      "location": "Lakers"
    }
  ],
  "source_url": "https://www.espn.com/...",
  "events_found": 42,
  "events_filtered": 12
}
```

**Key implementation details:**
- Uses `Deno.env.get('LOVABLE_API_KEY')` for Gemini (already configured)
- Reuses `validateExternalHttpsUrl` from `_shared/validation.ts` for SSRF protection
- Fetches with a browser User-Agent to avoid bot blocking
- Sets a 15-second timeout on the fetch
- Sends raw HTML to Gemini (not markdown) -- Gemini handles HTML tables extremely well
- Truncates HTML to first ~50,000 characters to stay within token limits
- Filters to today-forward dates server-side before returning
- Returns `events_found` (total on page) and `events_filtered` (how many were past and removed) so the UI can show "Found 82 events, showing 41 remaining games"

**Date filtering logic:**
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
const futureEvents = events.filter(e => {
  const eventDate = new Date(e.date);
  return eventDate >= today;
});
```

---

## CalendarImportModal UI Changes

### New state variables:
```typescript
const [urlInput, setUrlInput] = useState('');
const [isUrlMode, setIsUrlMode] = useState(false);
```

### New handler:
```typescript
const handleUrlImport = async () => {
  if (!urlInput.trim()) return;
  setState('parsing');
  const result = await parseURLSchedule(urlInput.trim());
  processParseResult(result);
};
```

### URL validation (simple client-side check):
```typescript
const isValidUrl = (str: string) => {
  try {
    const url = new URL(str);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};
```

### Updated FORMAT_BADGES:
Add `{ label: 'URL', icon: Globe }` to the existing badges array.

### Parsing state message update:
When parsing from URL, show "Scanning website for schedule..." instead of the generic message.

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| ESPN blocks the fetch | Return clear error: "Could not access this website. Try copying the schedule text and pasting it instead." |
| No schedule data found | Return: "No schedule or events found on this page. Make sure the URL points to a schedule page." |
| All events are in the past | Return: "Found X events but all are in the past. Only future events are imported." |
| No start times listed | Events import as all-day events (no time set) |
| Page is JS-rendered (SPA) | Some sites won't work with simple fetch. The error message will suggest using the paste or file option instead. |
| URL is HTTP (not HTTPS) | Auto-upgrade to HTTPS before sending to edge function |
| Malformed URL | Button disabled, input shows validation hint |
| Rate limited by Lovable AI | Show toast: "AI service is busy, please try again in a moment" |

---

## Why This Works Without Firecrawl

- Most sports schedule pages (ESPN, MaxPreps, NBA.com, MLB.com, etc.) serve their schedules as server-rendered HTML tables
- Deno's native `fetch()` in edge functions can grab this HTML directly
- The `fetch-og-metadata` edge function already does exactly this pattern
- Gemini 2.5 Flash has a massive context window and excels at parsing HTML structure
- No additional API keys or connectors needed -- LOVABLE_API_KEY is already configured

For the small percentage of sites that are fully client-rendered SPAs (schedule loads via JavaScript after page load), the fallback is clear: the user can just copy-paste the schedule text into the existing paste input, or screenshot it and use the image import. The error message will guide them.

---

## Security

- URL validation via existing `validateExternalHttpsUrl` (blocks localhost, private IPs, non-HTTPS)
- JWT authentication required (user must be logged in)
- HTML truncated to prevent sending excessive data to Gemini
- No user-controlled HTML is rendered in the app -- only extracted structured data
- Edge function has a fetch timeout to prevent hanging

