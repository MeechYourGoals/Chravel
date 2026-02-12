

# Fix Polls and Tasks Layout: Consolidate Header + Button onto One Row

## Root Cause

The header label (e.g., "Group Polls") spans N-1 columns via `*_PARITY_HEADER_SPAN_CLASS`, but the action button is placed in a column that falls WITHIN that span. CSS Grid pushes the button to a new row since the header already occupies that column.

For example in Pro (9 columns):
- Header spans cols 1-8 (`md:col-span-8`)
- "New Poll" button is at col 7 (`PRO_PARITY_COL_START.polls`) -- col 7 is inside the header span, so it wraps to a new row

The fix: place the button in the LAST column (col N) so it sits next to the header, not overlapping it.

## Changes

### File 1: `src/components/CommentsWall.tsx`

Change the "New Poll" button column from `.polls` to the last column for each variant:
- Consumer (8 cols): `TRIP_PARITY_COL_START.tasks` (col 8) instead of `.polls` (col 7)
- Pro (9 cols): `PRO_PARITY_COL_START.team` (col 9) instead of `.polls` (col 7)
- Events (7 cols): `EVENT_PARITY_COL_START.tasks` (col 7) instead of `.polls` (col 6)

This ensures "Group Polls" (spanning cols 1 to N-1) and "New Poll" (at col N) sit on the same row with no overlap.

### File 2: `src/components/todo/TripTasksTab.tsx`

Change the "Add Task" button column for Pro variant:
- Pro: `PRO_PARITY_COL_START.team` (col 9) instead of `.tasks` (col 8)
- Consumer and Events already use the last column correctly (col 8 and col 7 respectively)

This puts "Tasks" label (spanning cols 1-8) and "Add Task" (at col 9) on the same row in Pro view.

## Result

Both Polls and Tasks tabs will render as a single compact row:

```text
[Group Polls                                          ] [New Poll]
[description text...]           [badges...]

[Tasks                                                ] [Add Task]
[description text...]           [Filter: All Open ...]
```

The buttons align directly under the Team tab (last column), matching the visual parity pattern. All whitespace from the separate rows is eliminated, shifting content upward.

