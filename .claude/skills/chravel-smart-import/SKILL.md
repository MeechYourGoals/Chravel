---
name: chravel-smart-import
description: Implement and debug Chravel's Smart Import feature — AI-powered import of trip data from emails, PDFs, links, and other sources. Use when working on import flows, parsing logic, or artifact ingestion. Triggers on "smart import", "import from email", "import PDF", "parse reservation", "artifact import".
---

# Chravel Smart Import

Smart Import uses AI to extract trip-relevant data from various sources and add it to trips.

## Architecture

### Key Locations
- `src/features/smart-import/` — Smart Import feature module
- `src/hooks/useArtifactIngest.ts` — Artifact ingestion hook
- `src/hooks/useArtifactSearch.ts` — Artifact search hook
- `src/types/artifacts.ts` — Artifact type definitions

### Import Sources
- Email content (forwarded reservations)
- PDF documents (booking confirmations, itineraries)
- URLs (hotel/restaurant/activity pages)
- Images (screenshots of bookings)
- Manual text paste

### Import Pipeline
1. **Ingest** — Accept input from source
2. **Extract** — Use Gemini to parse structured data from raw content
3. **Classify** — Determine entity type (flight, hotel, restaurant, activity, etc.)
4. **Map** — Map extracted fields to Chravel data model
5. **Preview** — Show parsed data for user confirmation
6. **Save** — Create trip artifacts and associated entities
7. **Confirm** — Show confirmation with link to saved item

## Implementation Rules

### 1. Parse Quality
- Extract ALL relevant fields (dates, times, locations, confirmation numbers, costs)
- Handle ambiguous dates gracefully (show user for confirmation)
- Preserve original source for reference
- Handle partial data (some fields missing is OK)

### 2. User Control
- Always show preview before saving
- Allow editing of parsed fields
- Allow selecting which trip to import into
- Allow canceling without side effects

### 3. Error Handling
- Unparseable content: Show what was extracted with "we couldn't parse everything" message
- API failures: Retry with backoff, fallback to manual entry
- Duplicate detection: Warn if similar artifact already exists

### 4. State Management
- Use TanStack Query for artifact queries
- Invalidate trip artifact cache after successful import
- Show imported items in the relevant trip tab immediately
