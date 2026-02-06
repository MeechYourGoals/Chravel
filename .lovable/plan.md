

# Fix URL Import: Strip HTML Cruft to Capture Full Schedules

## Problem

When importing from a URL like nba.com/lakers/schedule, only 3 events are found instead of all 32+ games through April 2026.

**Root cause (confirmed by logs):**
- The raw HTML from nba.com is massive (hundreds of KB of JavaScript, CSS, SVG logos, tracking scripts)
- The edge function truncates at 50,000 characters, cutting off most of the actual schedule content
- Gemini only sees a tiny fraction of the page and can only extract the few events visible in that fragment

## Solution

Two changes to `supabase/functions/scrape-schedule/index.ts`:

### 1. Strip non-content HTML before truncation

Add an HTML cleaning step that removes:
- `<script>` tags and their contents
- `<style>` tags and their contents
- `<svg>` tags and their contents
- `<noscript>` tags and their contents
- HTML comments (`<!-- ... -->`)
- `<head>` section (meta tags, links, etc.)
- `<nav>`, `<footer>`, `<header>` tags (navigation chrome, not schedule content)
- Inline event handlers and data attributes
- Excessive whitespace (collapse multiple spaces/newlines)

This can reduce a 500KB page down to 30-80KB of actual content text -- meaning the schedule data will fit comfortably within the token limit.

### 2. Increase limits for full-season schedules

- Increase `MAX_HTML_LENGTH` from 50,000 to 150,000 characters (after stripping, most pages will be well under this)
- Increase `max_tokens` from 8,000 to 16,000 (a full NBA season of 82 games needs room in the AI response)
- Add logging for how much content was stripped to help debug future issues

## File Change

| File | Change |
|------|--------|
| `supabase/functions/scrape-schedule/index.ts` | Add `stripHtmlCruft()` function; call it before truncation; increase HTML limit to 150k; increase max_tokens to 16k |

## Technical Detail

The new `stripHtmlCruft(html)` function is added directly in the edge function file (no imports needed). It uses regex replacements to strip non-content elements:

```text
Raw HTML from nba.com:     ~400KB
After stripping scripts:   ~150KB  (removes JS bundles)
After stripping styles:    ~120KB  (removes CSS)
After stripping SVGs:      ~100KB  (removes logo SVGs)
After stripping head:      ~90KB   (removes meta/links)
After stripping nav/footer:~60KB   (removes chrome)
After collapsing whitespace:~40KB  (fits in 150k limit easily)
```

The cleaning function:

```typescript
function stripHtmlCruft(html: string): string {
  return html
    // Remove script tags and contents
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Remove style tags and contents
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Remove SVG tags and contents
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    // Remove noscript tags and contents
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove head section
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    // Remove nav, footer, header tags (keep content structure tags)
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    // Remove data attributes and inline handlers
    .replace(/\s+(data-[\w-]+|on\w+)="[^"]*"/gi, '')
    // Remove image tags (logos, ads - not useful for schedule data)
    .replace(/<img[^>]*>/gi, '')
    // Collapse whitespace
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

The function is called right after fetching the HTML and before the truncation step. Logging will show the before/after sizes so we can verify the stripping is effective.

**Expected result:** The Lakers schedule URL will now return all 32+ future games (Feb through April 2026) instead of just 3.

