

## Problem

Both the **My Trips / Pro / Events** toggle container and the **New Trip / Alerts / Settings / Search** action bar have visible outer borders (`border-2 border-border/50`). This border competes visually with the gold highlight border that appears on selected items. 

The user wants these containers to be **borderless** (like the stats row below showing "3 Total, 2 Upcoming..."), so when you select a tab, the gold accent border pops more clearly.

---

## Changes

### 1. `src/components/home/TripViewToggle.tsx` (line 44)

Remove the outer container border from the ToggleGroup:

```tsx
// Before
className={`bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg ...`}

// After
className={`bg-card/50 backdrop-blur-xl rounded-2xl p-1 shadow-lg ...`}
```

### 2. `src/components/home/TripActionBar.tsx` (line 210)

Remove the outer container border from the action bar:

```tsx
// Before
'bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg ...'

// After  
'bg-card/50 backdrop-blur-xl rounded-2xl p-1 shadow-lg ...'
```

---

## Result

Both containers become borderless, allowing the gold ring around selected items (My Trips, Pro, Events) to be the only visible border, providing stronger visual contrast and consistency with the stats row underneath.

