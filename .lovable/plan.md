

## Problem

The My Trips / Pro / Events toggle items use `data-[state=on]:text-gold-light` for active text, which renders as pale yellow (#feeaa5). User wants:
1. Active text stays **bright white** (same as inactive)
2. Active background is **pure black** (not `black/60`)
3. Gold border around the active pill

## Changes

### `src/components/home/TripViewToggle.tsx`

On all four `ToggleGroupItem` elements (lines 49, 57, 64, 76), change:
- `data-[state=on]:text-gold-light` → `data-[state=on]:text-white`
- `data-[state=on]:bg-black/60` → `data-[state=on]:bg-black`

This applies to the My Trips, Pro, Events, and Recs toggle items.

