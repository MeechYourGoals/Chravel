
# Multi-Fix Plan: Persistent Toast, Import UI Polish, and Pro Category Editing

## 1. Persistent Import Toast Notifications

**Problem**: The "Found X events" toast disappears after 10 seconds. If the user is on another tab (Chat, Payments, etc.), they miss it and must restart the import.

**Fix**: Change `duration: 10000` to `duration: Infinity` in both background import hooks. Add a close button so users can dismiss manually. The toast persists until the user clicks "View Events" or closes it with X.

**Files**:
- `src/features/calendar/hooks/useBackgroundImport.ts` (line 85) -- change `duration: 10000` to `duration: Infinity`
- `src/features/calendar/hooks/useBackgroundAgendaImport.ts` (line 63) -- change `duration: 10000` to `duration: Infinity`

---

## 2. URL Input Field -- Gold Border and Button Height Parity

**Problem**: The URL input field blends into the dark background and is hard to identify as an input. The Import button is slightly shorter than the input.

**Fix**: Add a gold/amber border to the URL input (`border-amber-500/60`) and ensure both the input and button use `h-11` for matching heights.

**File**: `src/features/calendar/components/CalendarImportModal.tsx` (lines 372-393)
- Input: add `border-amber-500/60 focus:border-amber-400 h-11`
- Button: change `min-h-[40px]` to `h-11`

---

## 3. Paste Schedule Text -- Confirmation

The "Paste schedule text instead" feature routes through the `parseTextWithAI` function which calls the `enhanced-ai-parser` edge function with the raw text. This function uses Gemini to extract only date/event data and ignores irrelevant text. So yes, pasting an entire webpage's content works -- the AI extracts only valid events. No code changes needed.

---

## 4. File Import Formats (ICS, CSV, Excel, PDF, Image)

The `parseCalendarFile` function in `calendarImportParsers.ts` already has dedicated parsers for all five formats:
- **ICS**: Native parser via `parseICSFile`
- **CSV**: `parseCSVCalendar` -- reads CSV, maps columns
- **Excel**: `parseExcelCalendar` -- uses the `xlsx` library
- **PDF/Image**: `parseWithAI` -- uploads to storage, calls `enhanced-ai-parser` edge function with Gemini

All paths are wired and functional. No code changes needed for the parsers themselves. The accepted file types in the modal already include all formats.

---

## 5. Pro Trip Category in Edit Modal

**Problem**: The Edit Trip Details modal has no category selector for Pro trips. Users cannot change a trip's category after creation (e.g., fixing "Sports" to "Tour").

**Fix**: Add a category dropdown to `EditTripModal.tsx` for Pro trips, positioned after the Card Color picker. The category is stored in the `categories` JSONB column on the `trips` table (currently `[]` for all pro trips based on DB check). The update will write `[{"type": "pro_category", "value": "Tour..."}]` to the categories field and the `handleSave` function will include it in the Supabase update.

**File**: `src/components/EditTripModal.tsx`
- Import `ProTripCategory, getAllCategories, getCategoryConfig` from `types/proCategories`
- Add `proCategory` state initialized from `trip.categories`
- Add category selector UI after Card Color section (Pro trips only)
- Include `categories` in the save payload

---

## Technical Summary

| File | Change |
|------|--------|
| `useBackgroundImport.ts` | `duration: Infinity` on success toast |
| `useBackgroundAgendaImport.ts` | `duration: Infinity` on success toast |
| `CalendarImportModal.tsx` | Gold border on URL input, matched button height |
| `EditTripModal.tsx` | Add Pro category selector, persist to `categories` JSONB |

No changes to parsers, edge functions, or database schema required.
