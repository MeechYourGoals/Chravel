

# Match Collapsed Hero Height to Description Box + Enlarge Text

## Problem

When the trip cover photo hero is collapsed, two visual issues exist:

1. The collapsed hero bar (`140px`) is shorter than the description/members box below it, breaking visual symmetry.
2. The trip title, location, and dates shrink to very small sizes (`text-xl` title, `text-sm` details) -- too small now that the photo is de-emphasized and text should be the focal point.

## Changes (1 file)

### `src/components/TripHeader.tsx`

**A. Match height to description box**

The description box (lines 578-585) has no fixed height -- it grows with content. To achieve visual parity, the collapsed hero needs a `min-h` that matches the description box's natural height. From the screenshots, the description box is roughly 200-220px. Setting the collapsed hero to `min-h-[200px]` with auto height ensures parity.

```
Line 421:
- 'h-[140px] min-h-[140px]'
+ 'min-h-[200px]'
```

This removes the fixed `h-[140px]` constraint and lets the collapsed bar breathe to match the box below.

**B. Enlarge collapsed text to match expanded styling**

The collapsed layout (lines 442-487) currently uses undersized text. Update to prominent, bold typography that makes title/location/dates the visual focus:

- **Title**: `text-xl` becomes `text-2xl md:text-3xl font-bold` (matches expanded hero sizing)
- **Location**: `text-sm text-gray-300` becomes `text-base md:text-lg font-bold text-white` with larger icon
- **Dates**: Same upgrade as location -- `text-base md:text-lg font-bold text-white`

```
Line 446 (title):
- <h1 className="text-xl font-bold text-white line-clamp-1">
+ <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg line-clamp-1">

Line 449 (container):
- <div className="flex items-center gap-3 text-sm text-gray-300">
+ <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-base md:text-lg font-bold text-white">

Line 452 (MapPin icon):
- <MapPin size={14} ...
+ <MapPin size={18} ...

Line 460 (Calendar icon):
- <Calendar size={14} ...
+ <Calendar size={18} ...
```

## Visual Result

- Collapsed hero bar and description box will have matching heights for clean alignment
- Trip name becomes large and bold -- the clear focal point when the photo is minimized
- Location and dates become prominent, bold, and white -- matching their expanded-state styling
- Icons scale up proportionally (14px to 18px) to match the larger text

## No other files affected

All changes are isolated to `TripHeader.tsx` collapsed layout section (lines 420-465).
