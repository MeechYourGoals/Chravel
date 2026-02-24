
# Fix Build Errors + Standardize Calendar + Event Tasks Button

## 1. Fix AIConciergeChat.tsx Build Errors (3 issues)

### Issue A: Duplicate/merged useEffect (lines 502-526)
Lines 503-504 contain two overlapping guards from a bad merge:
```
if (!VOICE_ENABLED) return;
if (geminiState === 'playing' && assistantTranscript) {
if (!VOICE_LIVE_ENABLED) return;
if (geminiState === 'speaking' && assistantTranscript) {
```
**Fix**: Remove lines 503-504 (the old `VOICE_ENABLED` guards), keeping only the `VOICE_LIVE_ENABLED` version (lines 505-506). The effect body from 507-524 and closing at 525-526 are correct.

### Issue B: Mangled JSX at lines 1250-1289
The voice status bar and circuit breaker bar are merged into one block. The `<button>` at line 1272 has no closing tag — its `>` at line 1277 is mis-indented and followed by circuit breaker content.

**Fix**: Restructure into two separate conditional blocks:
1. Voice active status bar (when voice is active, not circuit-broken): shows listening/speaking status + end session button (properly closed)
2. Circuit breaker bar (when `circuitBreakerOpen`): shows amber warning + "Try voice again" button

### Issue C: Stale `useEffect` dependency references
The first voice useEffect (around line 470-499) may reference `VOICE_ENABLED` instead of `VOICE_LIVE_ENABLED`. Will verify and align during implementation.

## 2. Standardize Calendar Across All Trip Types

**Problem**: When the calendar has zero events, `CalendarEmptyState` renders a full CTA page with a gold button and three info cards ("Shared Calendar", "Event Details", "Itinerary View"). The user wants the calendar to always show the day-picker grid + events sidebar (as in screenshot 2), regardless of whether events exist.

**Fix** (in `src/components/GroupCalendar.tsx`):
- In the default `viewMode === 'calendar'` branch (lines 309-311): Replace the `CalendarEmptyState` conditional with the standard calendar grid (day picker + event panel), letting the event panel show "No events scheduled for this day" when empty.
- In the `viewMode === 'grid'` branch (lines 207-208): Same change -- show the `CalendarGrid` even with zero events.
- In the `viewMode === 'itinerary'` branch (lines 269-270): Show the `ItineraryView` with an empty events array instead of the empty state.

This ensures Events, Group Trips, and Pro Trips all see the calendar interface immediately, since they all use `GroupCalendar`.

The `CalendarEmptyState` component itself is NOT deleted (it may be useful later), just no longer rendered in these paths.

## 3. Event Tasks Button Changes

**File**: `src/components/events/EventTasksTab.tsx`

### Change A: Header layout (lines 202-221)
Replace the `flex justify-between` wrapper with the event parity grid system:
- Title spans columns 1-7 using `EVENT_PARITY_HEADER_SPAN_CLASS`
- "+" button placed in column 8 using `EVENT_PARITY_COL_START.tasks`
- Button uses `ActionPill variant="manualOutline" iconOnly leftIcon={<Plus />}` (just a "+" icon, no text)

### Change B: Form submit button (line 251-255)
Replace gold gradient styling with standard dark style:
- From: `bg-gradient-to-r from-yellow-500 to-yellow-600 ... text-black`
- To: `bg-black/60 border border-white/30 text-white hover:bg-white/10 shadow-none`

### Change C: Add imports
Add `EVENT_PARITY_ROW_CLASS`, `EVENT_PARITY_COL_START`, `EVENT_PARITY_HEADER_SPAN_CLASS` from `@/lib/tabParity`.

## Files Changed

| File | Change |
|------|--------|
| `src/components/AIConciergeChat.tsx` | Fix merged useEffect (remove lines 503-504), fix mangled JSX (lines 1250-1289) |
| `src/components/GroupCalendar.tsx` | Remove `CalendarEmptyState` renders in all 3 view modes; always show calendar UI |
| `src/components/events/EventTasksTab.tsx` | Parity grid header, icon-only "+" button, dark submit button |

## No Regressions
- `GroupCalendar` still renders all three view modes correctly
- Add Event modal still works
- Import/Export still works
- Voice and text chat in Concierge unaffected (fixing existing broken JSX)
- Task creation flow preserved (only button styling changes)
