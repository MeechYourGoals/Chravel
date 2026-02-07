

# Default All Recap Sections + Add Event Card Visual Parity with Recap Support

## Overview

Two related changes:

1. **All 8 recap sections selected by default** for every trip type (consumer, pro, event) -- no more "proOnly" gating in the section list
2. **Event cards get the same 4-button layout** as consumer/pro trip cards (Recap + View + Invite + Share) with a new Event Recap modal showing 6 event-specific sections

---

## Part 1: Default All 8 Sections Selected

### Current Behavior
- `TripExportModal` initializes `selectedSections` with only 6 sections (missing Broadcasts and Roster)
- Broadcasts and Roster are marked `proOnly: true`, making them disabled/unchecked for consumer trips
- Users must manually check them even on pro/event trips

### Change

**File: `src/components/trip/TripExportModal.tsx`**

- Add `'broadcasts'` and `'roster'` to the default `selectedSections` array (line 31-38)
- Remove the `proOnly: true` flag from both Broadcasts and Roster in the `sections` definition (lines 50-51)
- Remove the `disabled` logic that checks `section.proOnly && isConsumer` (line 194)
- All 8 sections will be checked by default for all trip types

Before:
```
selectedSections = ['calendar', 'payments', 'polls', 'places', 'attachments', 'tasks']
// broadcasts and roster marked proOnly: true
```

After:
```
selectedSections = ['calendar', 'payments', 'polls', 'places', 'attachments', 'tasks', 'broadcasts', 'roster']
// No proOnly flags -- all sections always available
```

---

## Part 2: Event Cards -- Visual Parity with 4-Button Layout

### Current Event Card Layout
Event cards (desktop `EventCard.tsx` and mobile `MobileEventCard.tsx`) only have 2 buttons:
- View Event
- Invite

### Target Layout (matching TripCard/ProTripCard)
2x2 grid:
- **Row 1**: Recap + Invite
- **Row 2**: View + Share

### Files to Modify

**A. `src/components/EventCard.tsx` (Desktop)**

- Add imports for `FileDown`, `Share2`, `ShareTripModal`, `TripExportModal`
- Add state: `showExportModal`, `showShareModal`
- Add `handleExportPdf` callback (same pattern as ProTripCard -- fetch data, generate PDF, download)
- Replace the 2-button `grid-cols-2` with a 4-button `grid-cols-2` layout:
  - Recap button (opens TripExportModal)
  - Invite button (existing)
  - View button (existing)
  - Share button (opens ShareTripModal)
- Add `TripExportModal` and `ShareTripModal` at the bottom of the component
- The TripExportModal receives the event's tripId so it can determine available sections

**B. `src/components/MobileEventCard.tsx` (Mobile)**

- Same changes as desktop EventCard but with mobile-appropriate sizing
- Add imports, state, handler, 4-button layout, and modals

---

## Part 3: Event-Specific Recap Sections

### Current Problem
The `TripExportModal` shows sections designed for trips (Calendar, Payments, Polls, Places, Attachments, Tasks, Broadcasts, Roster). Events need different sections: **Agenda, Calendar, Broadcasts, Lineup, Polls, Tasks**.

### Solution

**A. Extend the `ExportSection` type**

**File: `src/types/tripExport.ts`**

Add two new section types to the `ExportSection` union:
```typescript
export type ExportSection = 
  | 'calendar' 
  | 'payments' 
  | 'polls' 
  | 'places' 
  | 'tasks'
  | 'roster'
  | 'broadcasts'
  | 'attachments'
  | 'agenda'    // NEW - Event agenda/sessions
  | 'lineup';   // NEW - Event speakers/performers
```

**B. Make TripExportModal context-aware**

**File: `src/components/trip/TripExportModal.tsx`**

- Add a new optional prop `tripType?: 'consumer' | 'pro' | 'event'`
- When `tripType === 'event'`, show event sections instead of trip sections:
  - Agenda, Calendar, Broadcasts, Lineup, Polls, Tasks (all 6 default selected)
- When `tripType` is not `'event'`, show the existing 8 trip sections (all selected by default)
- Update header text: "Create Event Recap" vs "Create Trip Recap" based on trip type

**C. Add agenda and lineup data fetching**

**File: `src/services/tripExportDataService.ts`**

- Add `agenda` and `lineup` fields to `ExportTripData` interface:
  ```typescript
  agenda?: Array<{
    title: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    track?: string;
    speakers?: string[];
  }>;
  lineup?: Array<{
    name: string;
    title?: string;
    company?: string;
    type?: string;
  }>;
  ```
- Add Supabase fetch for `event_agenda_items` when `sections.includes('agenda')`
- Add Supabase fetch for lineup/speakers from the event data when `sections.includes('lineup')`

**D. Add PDF rendering for agenda and lineup sections**

**File: `src/utils/exportPdfClient.ts`**

- Add `agenda` and `lineup` fields to the `ExportData` interface
- Add rendering functions for:
  - **Agenda section**: Table with columns for Time, Session, Location, Track, Speakers
  - **Lineup section**: Table with columns for Name, Title, Company, Type
- Wire these into the main `generateClientPDF` function's section rendering loop

**E. Update section ordering**

**File: `src/utils/exportSectionOrder.ts`**

- Add `'agenda'` and `'lineup'` to `DEFAULT_EXPORT_SECTION_ORDER`

**F. Update edge function types**

**File: `supabase/functions/export-trip/types.ts`**

- Add `'agenda'` and `'lineup'` to the `ExportSection` type

---

## Part 4: Wire Event Cards to Recap

**File: `src/components/EventCard.tsx`**

- Pass `tripType="event"` to `TripExportModal` so it shows event-specific sections
- The export handler fetches event data using the same `tripExportDataService` with the event's trip ID

**File: `src/components/MobileEventCard.tsx`**

- Same as above for mobile

---

## Summary of All Files

| File | Change |
|------|--------|
| `src/types/tripExport.ts` | Add `'agenda'` and `'lineup'` to ExportSection type |
| `src/components/trip/TripExportModal.tsx` | All 8 trip sections default ON; add `tripType` prop for event mode with 6 event sections |
| `src/components/EventCard.tsx` | Add 4-button layout (Recap, Invite, View, Share) + modals + export handler |
| `src/components/MobileEventCard.tsx` | Same 4-button layout for mobile + modals + export handler |
| `src/services/tripExportDataService.ts` | Add agenda + lineup data fetching from Supabase |
| `src/utils/exportPdfClient.ts` | Add agenda + lineup PDF rendering sections |
| `src/utils/exportSectionOrder.ts` | Add agenda + lineup to ordering |
| `supabase/functions/export-trip/types.ts` | Add agenda + lineup to ExportSection type |

## Default Selections Summary

**Trips (consumer, pro)**: Calendar, Payments, Polls, Places, Attachments, Tasks, Broadcasts, Roster -- all 8 ON

**Events**: Agenda, Calendar, Broadcasts, Lineup, Polls, Tasks -- all 6 ON

