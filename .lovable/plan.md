

# Fix Visual Parity for Pro Trips (9-Column Grid)

## Problem

`CalendarHeader`, `CommentsWall`, and `TripTasksTab` all hardcode `TRIP_PARITY_ROW_CLASS` (8-column grid). When rendered inside a Pro trip (which has 9 tabs including Team), the buttons land in the wrong columns and appear misaligned -- shifted left relative to the tabs above.

## Strategy

Make these components **variant-aware** using the existing `useTripVariant()` context. When `variant === 'pro'`, use `PRO_PARITY_ROW_CLASS` (9 columns) and `PRO_PARITY_COL_START`. When `variant === 'events'`, use `EVENT_PARITY_ROW_CLASS` (7 columns) and `EVENT_PARITY_COL_START`. Default to the 8-column consumer grid.

## Changes

### File 1: `src/features/calendar/components/CalendarHeader.tsx`

- Import `useTripVariant` from `TripVariantContext`
- Import `PRO_PARITY_ROW_CLASS`, `PRO_PARITY_COL_START`, `EVENT_PARITY_ROW_CLASS`, `EVENT_PARITY_COL_START`
- Read `variant` from context
- Select the correct row class and column start map based on variant:
  - **Consumer (8 cols)**: Title spans cols 1-4, Import at col 5 (payments), Export at col 6 (places), View Toggle at col 7 (polls), Add Event at col 8 (tasks)
  - **Pro (9 cols)**: Title spans cols 1-5, Import at col 6 (places), Export at col 7 (polls), View Toggle at col 8 (tasks), Add Event at col 9 (team)
  - **Events (7 cols)**: Title spans cols 1-3, Import at col 4 (media), Export at col 5 (lineup), View Toggle at col 6 (polls), Add Event at col 7 (tasks)
- This ensures each button sits directly beneath the correct tab for every trip type

### File 2: `src/components/CommentsWall.tsx`

- Already imports `useTripVariant`; read `variant`
- Switch the parity row class and column start based on variant:
  - Consumer: "New Poll" at col 7 (polls) -- already uses `TRIP_PARITY_COL_START.polls` which is correct, just need to switch the grid container
  - Pro: Use `PRO_PARITY_ROW_CLASS` and `PRO_PARITY_COL_START.polls` (col 7)
  - The header span class also needs to adjust (7 cols for consumer, 8 for pro)

### File 3: `src/components/todo/TripTasksTab.tsx`

- Already imports `useTripVariant`; read `variant`
- Switch the parity row class and column start based on variant:
  - Consumer: "Add Task" at col 8 (tasks) -- already correct for 8-col
  - Pro: Use `PRO_PARITY_ROW_CLASS` and `PRO_PARITY_COL_START.tasks` (col 8)
  - Header span adjusts accordingly (7 for consumer, 8 for pro)

### File 4: `src/lib/tabParity.ts`

- Add `PRO_PARITY_HEADER_SPAN_CLASS = 'md:col-span-8'` (title spans 8 of 9 cols in Pro)
- This keeps the pattern consistent -- every variant has its own header span token

## Why This Works

The `TripVariantProvider` already wraps every trip detail page with the correct variant. The components just need to read it and select the matching grid tokens. No new props needed -- it's all context-driven.

## Verification

After implementation, the buttons will align perfectly under their parent tabs regardless of whether the trip has 7, 8, or 9 columns.
