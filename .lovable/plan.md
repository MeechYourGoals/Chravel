
# Fix Desktop Empty Space in Travel Intelligence Section

## Problem Analysis
Looking at the screenshots you provided, the desktop view of the "Travel Intelligence" (AI Features) section has excessive vertical empty space around the AI Concierge and Trip BaseCamp screenshot containers. The issue stems from:

1. **Fixed maxHeight constraint** - `maxHeight: '420px'` limits the screenshot container
2. **Negative margin cropping** - Using `marginTop: '-60px'` and `marginBottom: '-30px'` which doesn't fill the available space
3. **Grid stretch mismatch** - The pills column stretches vertically while the screenshot column is height-constrained

## Solution Approach

### Option A: Scale Screenshots to Fill Container (Recommended)
Use `object-cover` with a fixed height that fills the entire container, removing the maxHeight constraint and letting the screenshots scale proportionally to match the pill card heights.

### Option B: Side-by-Side Single Row Layout
Display both screenshots in a single row above all 6 feature cards on desktop, reducing the need for height matching.

### Option C: Vertical Stack with Constrained Heights
Stack screenshots with explicit aspect ratios that fill without empty space.

## Recommended Implementation (Option A)

### Changes to `src/components/landing/sections/AiFeaturesSection.tsx`:

1. **Remove `maxHeight: '420px'`** - Let the container grow naturally
2. **Replace negative margin cropping with aspect-ratio containers** - Use `aspect-[16/10]` or similar to create consistent screenshot dimensions
3. **Use `object-cover` with `object-top`** - Fill the container while prioritizing the top of the screenshot (hiding the status bar)
4. **Match heights with `items-stretch` + `min-h-[400px]` on desktop** - Ensure both columns have the same height

### Desktop Layout Fix:
```text
+------------------------+------------------------+
|                        |  Context-Aware         |
|   AI Concierge         |  Payment Tracking      |
|   Screenshot           |  Decision Lock-In      |
|   (fills container)    |                        |
+------------------------+------------------------+
|                        |  BaseCamps             |
|   Places/BaseCamp      |  Relevant Notif        |
|   Screenshot           |  Recap PDFs            |
|   (fills container)    |                        |
+------------------------+------------------------+
```

### Code Changes Summary:

**Row 1 Screenshot Container:**
- Remove `maxHeight: '420px'`
- Add `min-h-[350px] lg:min-h-[400px]` to match pill column height
- Change inner div from negative margins to `h-full` with `object-cover object-top`

**Row 2 Screenshot Container:**
- Same treatment as Row 1
- Remove `marginTop: '-60px'`
- Add matching height constraints

**Both Pill Columns:**
- Keep `grid-rows-3` for equal distribution
- Add `min-h-[350px] lg:min-h-[400px]` to ensure consistency

### Result:
- Screenshots will fill their containers completely (no empty space)
- Pills will match the screenshot height
- Mobile/tablet layouts remain unchanged (already working well)
- The `object-top` ensures the iPhone status bar (which was previously cropped) stays hidden

## Files to Modify
1. `src/components/landing/sections/AiFeaturesSection.tsx` - Update container heights and image rendering logic
