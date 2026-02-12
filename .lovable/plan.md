

# Fix UI Parity: Duplicate Add Link, Button Text Overflow, and Alignment

## Issues

1. **Duplicate "Add Link" buttons on tablet Media > Links tab**: The `MobileUnifiedMediaHub` renders two action buttons when on the `urls` tab -- both `actionLeft` and `actionRight` resolve to "Add Link", creating a redundant duplicate.

2. **"Create Poll" text cut off on tablet**: The button text "Create Poll" is too long for the parity column width at tablet breakpoints. It needs to be shortened to "New Poll".

3. **"Create Poll" button alignment on desktop**: The button is slightly taller and shifted left compared to the Tasks tab above it. Root cause: it uses `inline-flex` instead of `flex`, and has extra class overrides that differ from the CalendarHeader parity buttons (the reference standard).

4. **"Add Task" button alignment on desktop**: Slightly shifted right. The button classes differ subtly from the CalendarHeader reference pattern.

## Technical Plan

### File 1: `src/components/mobile/MobileUnifiedMediaHub.tsx`

**Fix duplicate "Add Link" buttons:**
- Change `actionRight` (line ~398-400) so that when `selectedTab === 'urls'`, it returns `null` or a different action instead of duplicating "Add Link"
- When `actionRight` is null, hide the right button entirely for the urls tab
- This leaves a single full-width "Add Link" button

### File 2: `src/components/CommentsWall.tsx`

**Fix "Create Poll" text overflow and alignment:**
- Change button text from "Create Poll" to "New Poll" (shorter, fits tablet column)
- Change `inline-flex` to `flex` in the button className to match the CalendarHeader reference pattern
- Ensure button uses exactly `${TRIP_PARITY_COL_START.tasks} ${PARITY_ACTION_BUTTON_CLASS} flex items-center justify-center gap-1.5` followed by the gradient/color classes -- matching the CalendarHeader pattern exactly

### File 3: `src/components/todo/TripTasksTab.tsx`

**Fix "Add Task" alignment:**
- Add `flex items-center justify-center gap-1.5` to the button className to match the CalendarHeader parity pattern exactly
- This ensures consistent centering and sizing within the parity column

## Reference: CalendarHeader Pattern (the gold standard)

All parity action buttons should follow this exact className pattern:

```
${TRIP_PARITY_COL_START.[column]} ${PARITY_ACTION_BUTTON_CLASS} flex items-center justify-center gap-1.5 [variant/color classes]
```

This ensures identical width, height (min-h-[42px]), centering, and grid positioning across all tabs.

