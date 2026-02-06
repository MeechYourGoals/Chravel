

# Center "Group Calendar" Title Above Calendar

## Problem

The "Group Calendar" title is left-aligned within its col-span-4 area, causing the word "Group" to extend slightly past the left edge of the Chat button above. It also leaves a lot of dead space between "Calendar" and the Import button. Centering it above the actual calendar widget would look cleaner and more balanced.

## Solution

A single CSS change to the `<h2>` element in `CalendarHeader.tsx`: add `text-center` so the title is horizontally centered within its col-span-4 area. This places it visually centered above the calendar widget (which occupies the left half of the `md:grid-cols-2` layout below) without affecting button positioning at all.

## File Change

| File | Change |
|------|--------|
| `src/features/calendar/components/CalendarHeader.tsx` | Add `text-center` to the h2 element on line 50 |

## Technical Detail

Line 50 changes from:
```
<h2 className="text-2xl font-bold text-foreground">Group Calendar</h2>
```
To:
```
<h2 className="text-2xl font-bold text-foreground text-center">Group Calendar</h2>
```

The buttons in columns 5-8 are completely unaffected since the title lives in its own `col-span-4` div. The grid layout remains identical -- only the text alignment within the left half changes.

