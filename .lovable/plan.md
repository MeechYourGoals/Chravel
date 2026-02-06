

# Consolidate Calendar Header into One Row

## Problem

The current layout has two rows:
1. "Group Calendar" title spanning full width
2. Empty space (cols 1-4) + buttons (cols 5-8)

This wastes vertical space with the empty area above the buttons and below the title.

## Solution

Merge both rows into a single row by placing "Group Calendar" inside the `col-span-4` empty div that currently occupies columns 1-4. The title will be vertically centered in the row alongside the buttons.

```text
Before (2 rows):
  Row 1: [ Group Calendar __________________________ ]
  Row 2: [ ________________ ] [Import] [Export] [Grid] [Add]

After (1 row):
  [ Group Calendar   ] [Import] [Export] [Grid] [Add]
     (cols 1-4)          col 5    col 6   col 7  col 8
```

## File Change

| File | Change |
|------|--------|
| `src/features/calendar/components/CalendarHeader.tsx` | Move the h2 title inside the col-span-4 div; remove the separate title row; keep the grid as-is |

## Technical Detail

The change is minimal -- move the `<h2>` from above the grid into the existing `<div className="col-span-4" />` placeholder, and add `items-center` to the grid so the title and buttons are vertically aligned on the same row. The `mb-4` on the h2 gets removed since it's no longer a separate row.

