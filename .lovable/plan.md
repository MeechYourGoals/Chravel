

# Smart Calendar Import: Multi-Format Support

## Current State (Good News)

The ICS import is fully functional - it parses .ics files, detects duplicates, previews events, and writes them to your Supabase database. This is NOT a mock feature.

The AI parsing infrastructure also exists in your edge functions (`enhanced-ai-parser` and `file-ai-parser`) - they already know how to extract calendar events from images and documents using Gemini. They're just not connected to the import modal yet.

The `xlsx` library is also already installed but unused.

## What Needs to Change

Upgrade the import modal from "ICS only" to "Smart Import" that accepts ANY format a team might already have their schedule in.

---

## Supported Formats

| Format | How It Works |
|--------|-------------|
| `.ics` files | Existing parser (already works) |
| `.csv` files | Client-side parsing - detect date/time/title columns |
| `.xlsx` / `.xls` files | Use installed `xlsx` library to read spreadsheet, then same column detection |
| PDF files | Upload to Supabase storage, send URL to `enhanced-ai-parser` with `extractionType: 'calendar'`, Gemini extracts events |
| Images (JPG/PNG) | Same as PDF - Gemini vision reads the schedule image |
| Plain text / pasted text | Send to `enhanced-ai-parser` as `messageText` |

---

## Implementation Plan

### 1. Rename and Expand `ICSImportModal` to `CalendarImportModal`

Transform the current ICS-only modal into a universal import modal:

- Update file accept to: `.ics, .csv, .xlsx, .xls, .pdf, image/jpeg, image/png`
- Update the drag-and-drop zone text: "Drag and drop a file here, or click to browse"
- Add supported format badges: ICS, CSV, Excel, PDF, Image
- Remove the "V1 Limitations" card (no longer just V1)
- Add a "Paste schedule text" option (textarea that appears on a toggle)

### 2. Create `src/utils/calendarImportParsers.ts` - Multi-Format Router

A new utility that routes files to the right parser:

```text
.ics  --> existing parseICSFile() (no change)
.csv  --> new parseCSVCalendar() - client-side
.xlsx --> new parseExcelCalendar() - uses xlsx library, client-side
.pdf  --> new parseWithAI() - uploads file, calls enhanced-ai-parser edge function
.jpg/.png --> new parseWithAI() - same as PDF
text  --> new parseTextWithAI() - calls enhanced-ai-parser with messageText
```

**CSV/Excel Column Detection Logic:**
- Scan headers for date-like columns: "date", "start", "when", "day", "scheduled"
- Scan for title-like columns: "title", "name", "event", "summary", "description", "what"
- Scan for time-like columns: "time", "start_time", "begins", "from"
- Scan for location columns: "location", "venue", "where", "place", "address"
- If headers aren't clear, use Gemini to classify columns

### 3. Add AI-Powered Parsing Path

For PDFs and images:
1. Upload the file to Supabase storage (temporary bucket)
2. Get the public URL
3. Call `enhanced-ai-parser` edge function with `extractionType: 'calendar'`
4. The edge function already returns structured event JSON with dates, times, locations, categories
5. Map the AI response to `ICSParsedEvent[]` format so the existing preview/import flow works unchanged

### 4. Update the Preview Step

The existing preview step (showing parsed events with duplicate detection) stays the same - all parsers output the same `ICSParsedEvent[]` format. Add one enhancement:
- Show a confidence indicator per event for AI-parsed results (the AI returns confidence scores)
- Show the source format badge ("Parsed from PDF", "Parsed from Excel", etc.)

### 5. Add Paste Schedule Option

Add a toggle in the idle state: "Or paste your schedule text"
- Opens a textarea where users can paste a schedule from email, website, etc.
- On submit, sends to `enhanced-ai-parser` with `extractionType: 'calendar'`
- Same preview/import flow

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/calendar/components/ICSImportModal.tsx` | **Rename + Rewrite** | Become `CalendarImportModal.tsx` - multi-format support, paste option |
| `src/utils/calendarImportParsers.ts` | **Create** | Multi-format router: CSV parser, Excel parser, AI parser wrapper |
| `src/utils/calendarImport.ts` | **Keep as-is** | ICS parser stays unchanged |
| `src/components/GroupCalendar.tsx` | **Update imports** | Switch from `ICSImportModal` to `CalendarImportModal` |
| `src/components/mobile/MobileGroupCalendar.tsx` | **Update imports** | Same import swap |
| `src/features/calendar/components/CalendarHeader.tsx` | **No change** | Import button already wired correctly |

---

## Technical Details

### CSV Parser (Client-Side)

```text
1. Read file as text
2. Split by newlines, split by comma (handle quoted values)
3. Use first row as headers
4. Auto-detect columns by header name matching
5. If ambiguous, fall back to AI classification
6. Parse each row into ICSParsedEvent format
7. Skip rows with invalid/missing dates
```

### Excel Parser (Client-Side)

```text
1. Read file as ArrayBuffer
2. Use xlsx.read() to parse workbook
3. Get first sheet (or let user pick if multiple)
4. Convert to JSON array with xlsx.utils.sheet_to_json()
5. Same column detection as CSV
6. Same row-to-event mapping
```

### AI Parser (Edge Function - Already Exists)

```text
1. Upload file to Supabase storage
2. Get signed URL
3. Call enhanced-ai-parser with:
   - fileUrl: signed URL
   - extractionType: 'calendar'
   - fileType: mime type
4. Gemini returns structured JSON with events
5. Map to ICSParsedEvent[] format
6. Clean up uploaded file after parsing
```

### Column Detection Heuristic

Priority matching for spreadsheet headers:

```text
Date columns: /date|start|when|day|scheduled|begins/i
Title columns: /title|name|event|summary|subject|what|activity/i  
Time columns: /time|start.time|hour|begins|from|at/i
End time: /end.time|ends|to|until|through/i
Location columns: /location|venue|where|place|address|site/i
Description: /description|details|notes|info|about/i
```

---

## User Experience

### Enterprise Onboarding Scenario (Chicago Bulls Example)

1. Team coordinator opens Chravel trip calendar
2. Clicks "Import"
3. Modal shows: "Import from any format - ICS, CSV, Excel, PDF, or paste text"
4. Coordinator drags their existing Excel schedule (82 games + practices)
5. System detects columns: "Date", "Opponent/Event", "Time", "Arena"
6. Preview shows all 82 games mapped to calendar events
7. Coordinator clicks "Import 82 Events"
8. Done - entire season schedule populated in seconds

### Casual User Scenario

1. User receives hotel confirmation PDF via email
2. Drags PDF into import modal
3. Gemini vision extracts: "Check-in: Feb 15, Check-out: Feb 18, Hilton Rome, Confirmation #HX82934"
4. Preview shows the event
5. One click to add to trip calendar

---

## Scope

- No database changes needed
- No new edge functions needed (existing `enhanced-ai-parser` handles it)
- `xlsx` library already installed
- Existing duplicate detection and calendarService.createEvent() work unchanged
- All parsers output the same `ICSParsedEvent[]` format for a unified preview flow

