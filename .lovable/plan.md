

# Add Date Selector to Agenda Sessions + Rename Track to Category + Auto-Populate Lineup from Speakers

## Overview

Three connected changes to improve the agenda session editor for multi-day events and reduce manual data entry:

1. **Add a Date field** to agenda sessions so multi-day events (Coachella, conferences) can assign sessions to specific days
2. **Rename "Track/Category" to "Category"** throughout the UI (keeping the DB column as `track` to avoid migration complexity)
3. **Auto-populate the Lineup tab** when speakers/performers are added to agenda sessions -- no more duplicate data entry

---

## Part 1: Add Date Column to Database

**New Migration**

Add a `session_date` column to `event_agenda_items`:
```sql
ALTER TABLE event_agenda_items ADD COLUMN IF NOT EXISTS session_date date;
```

This is a nullable column so existing sessions remain valid. The Supabase types file will be regenerated to include the new field.

---

## Part 2: Update the EventAgendaItem Type

**File: `src/types/events.ts`**

Add `session_date?: string` to the `EventAgendaItem` interface (between `description` and `start_time`).

---

## Part 3: Redesign the Add/Edit Session Form Layout

Both the desktop `AgendaModal.tsx` and mobile `EnhancedAgendaTab.tsx` need the same form changes.

### New Form Layout (both files)

Row 1: **Title** (full width -- unchanged)

Row 2: **Date**, **Start Time**, **End Time** (3 columns on a single row)
- Date uses `type="date"` input
- Start and End time inputs stay as `type="time"`
- On mobile, all three fit in a `grid-cols-3` row since each is compact

Row 3: **Location** and **Category** (2 columns -- relabel "Track/Category" to just "Category")

Row 4: **Speakers/Performers** (full width -- unchanged)

Row 5: **Description** (full width -- unchanged)

### File: `src/components/events/AgendaModal.tsx`

- Add `session_date` to `newSession` initial state (line 63-71)
- Add `session_date` to `resetForm` (lines 198-206)
- Add `session_date` to `handleSaveSession` output (lines 146-155)
- Add `session_date` to `handleEditSession` mapping (lines 173-181)
- Restructure the form grid (lines 268-371):
  - Title stays full-width `md:col-span-2`
  - Replace the current 2-column Start/End time layout with a 3-column `grid-cols-3` row containing Date, Start Time, End Time
  - Location and Category stay as 2 columns
  - Rename the "Track/Category" label to just "Category"
- Update session list display (line 401-406): show date before time when present (e.g., "Jan 15 -- 12:00 - 1:30 PM")
- Update sort logic (line 161): sort by `session_date` first, then by `start_time`

### File: `src/components/events/EnhancedAgendaTab.tsx`

- Add `session_date` to the `AgendaSession` interface (line 10-17)
- Add `session_date` to `newSession` state (line 38-44)
- Add `session_date` to `handleAddSession` (line 81-88)
- Restructure the form grid (lines 234-278):
  - Title stays full-width
  - Add 3-column row: Date, Start Time, End Time
  - Location field stays; add a Category field (currently missing from this simpler form)
- Update session list display (lines 314-320): show date before time
- Update sort logic (line 90): sort by `session_date` first, then `start_time`

---

## Part 4: Rename Track to Category in Display

### File: `src/components/events/AgendaModal.tsx`

- Line 314: Change label from "Track/Category" to "Category"
- Line 319: Keep placeholder as "e.g., Main Stage, Workshop"
- Session list badge (line 394-397): no change needed -- it just displays the value

### File: `src/components/events/ScheduleImporter.tsx`

- Keep accepting both `track` and `category` as CSV column headers (already does this on line 67)
- No label changes needed (this is a background importer)

---

## Part 5: Auto-Populate Lineup from Agenda Speakers

When a user adds speakers to an agenda session and saves, those speaker names should automatically appear in the Lineup tab. This avoids having to manually add every person twice.

### Approach: Callback from AgendaModal/EnhancedAgendaTab to parent

**A. Add an `onLineupUpdate` callback prop**

Both `AgendaModal` and `EnhancedAgendaTab` will accept an optional `onLineupUpdate?: (speakers: Speaker[]) => void` callback.

When `handleSaveSession` is called and `newSession.speakers` has entries:
- For each speaker name, check if it already exists in the current lineup (passed down or tracked)
- If not, create a new `Speaker` object with the name and add it
- Call `onLineupUpdate` with the updated list

**B. Wire it in the parent components**

**File: `src/components/events/EventDetailContent.tsx` (Desktop)**

- Add state: `const [lineupSpeakers, setLineupSpeakers] = useState<Speaker[]>(eventData.speakers || [])`
- Pass `onLineupUpdate={setLineupSpeakers}` to `AgendaModal`
- Pass `lineupSpeakers` (instead of `eventData.speakers`) to `LineupTab`

**File: `src/components/mobile/MobileTripTabs.tsx` (Mobile)**

- Same pattern: lift `lineupSpeakers` state
- Pass `onLineupUpdate` to `EnhancedAgendaTab`
- Pass `lineupSpeakers` to `LineupTab`

**C. Update AgendaModal and EnhancedAgendaTab**

In `handleSaveSession`, after saving the session, extract any new speaker names and call `onLineupUpdate` with deduplicated Speaker objects (merged with existing lineup data).

---

## Part 6: Update Export Service

**File: `src/services/tripExportDataService.ts`**

- Add `session_date` to the agenda query select (line 434)
- Include `session_date` in the mapped agenda export data

**File: `src/utils/exportPdfClient.ts`**

- Add a "Date" column to the Agenda PDF table rendering

---

## Summary of All Files

| File | Change |
|------|--------|
| New migration SQL | Add `session_date date` column to `event_agenda_items` |
| `src/types/events.ts` | Add `session_date?: string` to `EventAgendaItem` |
| `src/components/events/AgendaModal.tsx` | Add date input, 3-col Date/Start/End row, rename Track to Category, auto-push speakers to lineup callback |
| `src/components/events/EnhancedAgendaTab.tsx` | Add date input, 3-col row, add Category field, auto-push speakers to lineup callback |
| `src/components/events/EventDetailContent.tsx` | Lift lineup state, wire `onLineupUpdate` callback between Agenda and Lineup |
| `src/components/mobile/MobileTripTabs.tsx` | Same lifted state + callback wiring for mobile |
| `src/services/tripExportDataService.ts` | Include `session_date` in agenda export query |
| `src/utils/exportPdfClient.ts` | Add Date column to agenda PDF table |

