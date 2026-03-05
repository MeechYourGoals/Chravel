

# Remove Calendar Empty State — Always Show Calendar UI

## Problem
When a trip has zero events, the mobile calendar shows a full-page "No events scheduled" empty state with a CTA button and info cards (screenshot 1), blocking the actual calendar UI. Per the memory note `calendar/universal-interface-standardization`, CalendarEmptyState should not render — the standard calendar UI should always mount immediately.

## Changes

### 1. `src/components/mobile/MobileGroupCalendar.tsx`
- **Remove the `events.length === 0` gate** (lines 346-349) that renders `CalendarEmptyState` instead of the calendar. The calendar UI (month nav, day view, compact calendar) will always render regardless of event count.
- **Simplify the per-day empty state** (lines 389-399): Remove the Clock icon and "Add an event" CTA link. Replace with a simple `"No events for this day."` text — clean, no call to action (the `+` button in the day header already handles adding).

### 2. `src/components/GroupCalendar.tsx`
- **Remove the `CalendarEmptyState` import** (line 22) — desktop never gates on it but the import is dead code.
- The desktop per-day empty text ("No events scheduled for this day.") at line 348-352 is fine as-is — it's inline contextual text, not a blocking CTA page.

### 3. `src/features/calendar/components/CalendarEmptyState.tsx`
- **Delete this file entirely.** No remaining consumers after the above changes.

### Files

| File | Change |
|------|--------|
| `src/components/mobile/MobileGroupCalendar.tsx` | Remove empty-state gate; simplify per-day empty text |
| `src/components/GroupCalendar.tsx` | Remove unused CalendarEmptyState import |
| `src/features/calendar/components/CalendarEmptyState.tsx` | Delete file |

