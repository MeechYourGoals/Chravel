

## Problem

The Team tab's admin action buttons (Create Role, Manage Roles, Assign Role, Requests) overlap because "Assign Role" and "Requests" are both mapped to the same grid column (`PRO_PARITY_COL_START.places`). The 9-column parity grid is also too tight for these buttons, causing text to bleed outside pills.

## Changes

### `src/components/pro/team/RolesView.tsx` (lines 202-262)

Replace the `PRO_PARITY_ROW_CLASS` (9-col grid) with a simple **4-column grid** layout with adequate gap for these 4 action buttons:

**Desktop container:**
```tsx
// Before
className={`${isMobile ? 'flex flex-col gap-2' : PRO_PARITY_ROW_CLASS} mb-3`}

// After
className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-4 gap-3'} mb-3`}
```

**Each button:** Remove the `PRO_PARITY_COL_START.*` and `PARITY_ACTION_BUTTON_SIZE_CLASS` classes. Use consistent sizing:
```tsx
className="rounded-full bg-black/40 hover:bg-black/60 hover:text-amber-400 
  hover:border-amber-400/50 text-white border-white/20 transition-colors 
  min-h-[42px] justify-center text-xs lg:text-sm font-medium px-3 whitespace-nowrap"
```

**Mobile:** Switch from single-column flex to a **2x2 grid** (`grid grid-cols-2 gap-2`) so all 4 buttons are visible without excessive scrolling, with `min-h-[44px]` for tap targets.

**Button labels stay the same:** Create Role, Manage Roles, Assign Role, Requests — all 4 fit cleanly in equal-width columns with `whitespace-nowrap` and proper padding.

