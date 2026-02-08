
# Fix URL Scraping for JavaScript-Rendered Sites (Trevor Noah, etc.)

## The Real Problem

Trevor Noah's website (and most comedian/artist tour sites built on Squarespace, Wix, custom React/Next.js, etc.) renders show dates entirely via JavaScript **after** the page loads. When our edge function uses `fetch()`, it gets back a ~69K HTML shell that contains zero show data -- just framework code and contact info.

This is NOT a Gemini problem. Gemini never even sees the show data because the data is never in the HTML we send it. No amount of loosening restrictions or increasing character caps can fix this -- the data literally isn't there.

**Proof**: Multiple independent tools (Lovable's own fetch, web scrapers, code search) all fail to see Trevor Noah's show dates from the raw HTML. Only tools with JavaScript rendering capability (like a real browser) can see the content shown in your screenshot.

## The Solution: Firecrawl Integration

Firecrawl is a web scraping service with **headless browser rendering** -- it executes JavaScript just like a real browser, then returns the fully rendered HTML/markdown. It's available as a Lovable connector.

The approach:
1. Connect Firecrawl (one-time setup via connector)
2. Update `scrape-schedule` and `scrape-agenda` to use Firecrawl FIRST for JavaScript rendering
3. Fall back to raw `fetch()` if Firecrawl is not available (for simpler sites that don't need JS)
4. Send the Firecrawl-rendered markdown directly to Gemini (cleaner than raw HTML, smaller payload)

## How It Works

```text
Current (broken for JS sites):
  URL --> fetch() --> empty HTML shell --> Gemini --> "no events found"

With Firecrawl:
  URL --> Firecrawl (headless browser) --> fully rendered markdown with show dates --> Gemini --> structured events
```

For trevornoah.com/shows, Firecrawl would return clean markdown like:
```text
FEB 9, 2026
RYMAN AUDITORIUM    NASHVILLE, TN
FEB 10, 2026
RYMAN AUDITORIUM    NASHVILLE, TN
FEB 12, 2026
THE PALACE STAMFORD    STAMFORD, CT
...
```

Gemini would then easily extract every show date, venue, and city.

## Changes

### 1. Connect Firecrawl (User Action Required)

You will need to connect the Firecrawl service via the Lovable connector system. This gives the edge functions access to a `FIRECRAWL_API_KEY` environment variable. I will prompt this connection during implementation.

### 2. Update `supabase/functions/scrape-schedule/index.ts`

Add Firecrawl as the primary scraping method:

- **Step 1**: Check if `FIRECRAWL_API_KEY` is available
- **Step 2 (Firecrawl path)**: Call `https://api.firecrawl.dev/v1/scrape` with the URL, requesting `markdown` format with `waitFor: 3000` (wait 3 seconds for JS to render). This returns the fully rendered page content as clean markdown.
- **Step 3**: Send the Firecrawl markdown to Gemini (much smaller and cleaner than raw HTML -- typically 5-20KB vs 69-200KB)
- **Fallback**: If Firecrawl is not configured or fails, fall back to the existing raw `fetch()` approach
- Keep all existing protections: 45s AI timeout, future-date filtering, error handling

### 3. Update `supabase/functions/scrape-agenda/index.ts`

Same Firecrawl-first approach for agenda imports.

### 4. No Frontend Changes Needed

The background import hooks, toast notifications, and modal UI all work correctly already. The fix is entirely in the edge functions -- once they return actual data, everything downstream works.

## What This Solves

| Site Type | Before | After |
|-----------|--------|-------|
| trevornoah.com (JS-rendered) | "No events found" | All show dates extracted |
| nursejohnnshows.com (server-rendered) | Works | Still works (Firecrawl or raw fetch) |
| NBA/NFL/ESPN (structured data) | Works | Still works (Firecrawl gives even cleaner data) |
| Squarespace artist sites | "No events found" | Works via Firecrawl JS rendering |
| Netflix Is A Joke Fest (tabbed) | Only first day | Gets default day via Firecrawl (multi-tab still needs manual supplement) |

## What About Multi-Page/Tab Navigation?

Firecrawl's `scrape` endpoint renders a single page with JavaScript execution. For sites like Netflix Is A Joke Fest where you need to click through day tabs:
- Firecrawl will get the default/first day automatically (improvement over current zero results)
- For additional days, users can still take screenshots and upload them -- the additive flow works perfectly
- Future enhancement: Firecrawl's `crawl` feature could potentially navigate multiple pages if they have different URLs

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/scrape-schedule/index.ts` | Add Firecrawl-first scraping with JS rendering, fallback to raw fetch |
| `supabase/functions/scrape-agenda/index.ts` | Same Firecrawl-first approach |

## Cost Consideration

Firecrawl charges per scrape (typically a few cents per page). For a GTM targeting comedians and artists, this is minimal compared to the manual data entry it replaces. Each import saves an organizer 15-30 minutes of work.
