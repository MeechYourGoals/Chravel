

# Smart Agenda Import: AI-Powered Session Extraction for Events

## The Business Case

Event organizers (SXSW, Investfest, conferences) already have their agenda on a website, PDF, or image. Asking them to manually type in dozens of sessions creates massive friction. This feature lets them click "Import Agenda," paste a URL or upload a file/image, and have Gemini extract all sessions automatically -- filling only the fields that actually exist in the source material.

This gives Chravel a direct competitive edge over white-label event apps that force manual data entry.

## What Changes

### 1. New Edge Function: `scrape-agenda` (Backend)

A new Supabase edge function specifically tuned for **agenda/session extraction** (different from `scrape-schedule` which is for calendar events like game schedules).

The key difference from `scrape-schedule`:
- Returns agenda-specific fields: title, description, date, start_time, end_time, location, track/category, speakers
- Prompt instructs Gemini to **only fill fields that are clearly present** in the source -- no guessing, no fabricating descriptions or categories
- Does NOT filter by future dates (conferences may list sessions without specific dates)
- Uses the same smart HTML cleaning from `scrape-schedule`
- Same 45-second AI timeout
- Same content quality check with early exit for JS-only sites

Extracted session schema:
```text
{
  title: string (required)
  description?: string (only if present)
  session_date?: string YYYY-MM-DD (only if present)
  start_time?: string HH:MM (only if present)
  end_time?: string HH:MM (only if present)
  location?: string (only if present)
  track?: string (only if present -- e.g., "Main Stage", "Workshop")
  speakers?: string[] (only if present)
}
```

### 2. New Utility: `src/utils/agendaImportParsers.ts`

Handles all agenda import parsing, reusing patterns from `calendarImportParsers.ts`:
- `parseAgendaFile(file)` -- routes PDF/Image to `enhanced-ai-parser` with a new `extractionType: 'agenda'`
- `parseAgendaURL(url)` -- calls the new `scrape-agenda` edge function
- `parseAgendaText(text)` -- sends pasted text to `enhanced-ai-parser` with `extractionType: 'agenda'`

All three return a unified `AgendaParseResult` with an array of `ParsedAgendaSession` objects matching the `EventAgendaItem` type.

### 3. Update `enhanced-ai-parser` Edge Function

Add a new `case 'agenda':` branch in the extraction type switch. This branch uses a Gemini prompt tailored for event agendas:
- Extracts session titles, times, locations, speakers, descriptions, categories
- Only includes fields that are clearly present in the source
- Does NOT fabricate or guess missing data
- Returns `{ sessions: [...] }` instead of `{ events: [...] }`

### 4. New Component: `AgendaImportModal.tsx`

A new modal component (similar to `CalendarImportModal`) that:
- Supports file upload (PDF, Image), URL paste, and text paste
- Shows the same drag-and-drop zone with format badges (PDF, Image, URL)
- Has the same "Paste text instead" toggle
- Preview state shows extracted sessions in a list with all available fields
- Import action calls `useEventAgenda.addSession()` for each extracted session
- Background import via toast (reuses the same pattern from `useBackgroundImport`)

### 5. Update `AgendaModal.tsx` -- Add "Import Agenda" Button

The existing "Upload" button on the right panel currently only uploads a static file for viewing. We modify this to give the organizer a **choice**:

- **Current behavior preserved**: The "Upload" button in the Agenda File section on the right still lets organizers upload a file/image for attendees to view/download (static file viewer)
- **New "Import Agenda" button**: Added next to "Add Session" on the left panel. Opens the new `AgendaImportModal` which extracts sessions with AI and creates them as individual agenda items
- This gives organizers both options: a static viewable file AND/OR AI-extracted individual sessions

### 6. Background Import Hook: `useBackgroundAgendaImport.ts`

Similar to `useBackgroundImport.ts` but adapted for agenda sessions:
- Fires the URL or file parse in the background
- Shows persistent Sonner toast: "Scanning agenda..."
- On success: "Found X sessions" with a "Review Sessions" action button
- Opens the `AgendaImportModal` in preview state when clicked
- User can navigate to other event tabs while it processes

### 7. Update `EnhancedAgendaTab.tsx`

Wire up the import functionality in the alternate agenda view:
- Add "Import Agenda" button alongside "Upload Agenda" and "Add Session"
- Same `AgendaImportModal` integration

## How the Flow Works for an Event Organizer

1. Organizer clicks **"Import Agenda"** on the Agenda tab
2. Modal opens with familiar drag-and-drop zone (same look as Calendar Import)
3. Organizer either:
   - Pastes a URL (e.g., `sxsw.com/schedule`)
   - Uploads a PDF or screenshot of their agenda
   - Toggles "Paste text instead" and pastes the schedule text
4. Modal closes immediately (background processing)
5. Toast shows: "Scanning sxsw.com for agenda sessions..."
6. Organizer can navigate to Chat, Media, or any tab
7. Toast updates: "Found 47 sessions from sxsw.com" with "Review Sessions" button
8. Clicking "Review Sessions" opens modal in preview state showing all extracted sessions
9. Organizer reviews and clicks "Import All" -- sessions are batch-inserted into `event_agenda_items`
10. Speakers from imported sessions automatically populate the Lineup tab

## What Fields Gemini Fills (Only What's Available)

For a site like SXSW that has rich data:
```text
Title: "The Future of AI in Music"
Date: 2026-03-14
Start: 14:00
End: 15:00
Location: Austin Convention Center, Room 4AB
Category: Interactive
Speakers: ["Jane Doe", "John Smith"]
Description: "A panel discussion exploring..."
```

For a site that only has basic info:
```text
Title: "Opening Ceremony"
Start: 09:00
Location: Main Stage
```

No empty placeholders, no fabricated data.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/scrape-agenda/index.ts` | Create | New edge function for agenda URL scraping with agenda-specific Gemini prompt |
| `src/utils/agendaImportParsers.ts` | Create | Agenda parsing utilities (file, URL, text) |
| `src/features/calendar/hooks/useBackgroundAgendaImport.ts` | Create | Background import hook with toast notifications for agenda |
| `src/components/events/AgendaImportModal.tsx` | Create | Import modal with drag-and-drop, URL input, preview, and batch insert |
| `src/components/events/AgendaModal.tsx` | Modify | Add "Import Agenda" button next to "Add Session" |
| `src/components/events/EnhancedAgendaTab.tsx` | Modify | Add "Import Agenda" button |
| `supabase/functions/enhanced-ai-parser/index.ts` | Modify | Add `case 'agenda'` extraction type |
| `supabase/config.toml` | Modify | Register new `scrape-agenda` function |

## What This Does NOT Change

- The existing "Upload" button for static agenda file viewing stays exactly as-is
- Calendar import (`CalendarImportModal`) is completely untouched
- The `scrape-schedule` edge function is untouched
- Manual "Add Session" form remains available
- No schema changes needed -- `event_agenda_items` already has all required columns
- Lineup auto-population from speakers still works (existing `onLineupUpdate` callback)

