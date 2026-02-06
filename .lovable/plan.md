
# Fix Calendar Header Buttons Alignment

## Problem

The Import, Export, Month Grid, and Add Event buttons in the CalendarHeader extend past the edges of the content area. They should align perfectly with the tab row above (specifically under Payments, Places, Polls, and Tasks) and the Events box below.

**Root cause:** The tab row is wrapped in a `max-w-7xl px-2` container, but the CalendarHeader sits inside a content area with no matching width constraints. Even though the flex ratios are correct (flex-[4] title + 4x flex-1 buttons = 8 parts matching 8 tabs), the different container widths cause the buttons to be wider than the tabs.

## Fix

Two changes to `CalendarHeader.tsx`:

### 1. Remove the "Group Calendar" title from the header row

The title currently takes `flex-[4]` and pushes the buttons into the right half. Instead, the 4 buttons should span the full width using a grid that matches the 8-column tab layout -- placing buttons in columns 5-8 only (under Payments, Places, Polls, Tasks).

Replace the current `flex` layout with a CSS grid approach:

```text
Before:  [     Group Calendar (flex-4)     ] [Import] [Export] [Month Grid] [Add Event]
After:   [          empty cols 1-4         ] [Import] [Export] [Month Grid] [Add Event]
```

The "Group Calendar" title will move above the button row (as a standalone heading), giving the buttons proper alignment.

### 2. Match button sizing to tab buttons

Apply identical sizing classes from the tab buttons:
- Same `px-3.5 py-2.5 min-h-[42px]` (already matching)
- Same `rounded-xl font-medium text-sm` (already matching)
- Use `grid grid-cols-8 gap-2` to match the 8-tab layout, with buttons spanning columns 5-8

## File Change

| File | Change |
|------|--------|
| `src/features/calendar/components/CalendarHeader.tsx` | Replace flex layout with 8-column grid; move title above; buttons occupy cols 5-8 |

## Technical Detail

The CalendarHeader layout changes from:

```text
<div class="flex gap-2">
  <div class="flex-[4]">Group Calendar</div>  // takes 4/8 of width
  <Button class="flex-1">Import</Button>       // takes 1/8
  <Button class="flex-1">Export</Button>        // takes 1/8
  <Button class="flex-1">Month Grid</Button>   // takes 1/8
  <Button class="flex-1">Add Event</Button>    // takes 1/8
</div>
```

To:

```text
<div class="mb-6">
  <h2>Group Calendar</h2>                        // standalone title row
  <div class="grid grid-cols-8 gap-2">           // matches 8-tab grid
    <div class="col-span-4" />                   // empty space (cols 1-4)
    <Button>Import</Button>                      // col 5 (under Payments)
    <Button>Export</Button>                      // col 6 (under Places)
    <Button>Month Grid</Button>                  // col 7 (under Polls)
    <Button>Add Event</Button>                   // col 8 (under Tasks)
  </div>
</div>
```

The buttons will use the same styling as the tab buttons: `bg-white/10 text-gray-300 border border-white/30` for the outline appearance, keeping the existing icon + label pattern. On smaller screens where tab labels are hidden, the button labels will also hide (using the existing `hidden lg:inline` pattern).

This guarantees pixel-perfect alignment because both the tab row and the calendar header use the same 8-column grid with the same gap, and both are constrained within the same content width.
