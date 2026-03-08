

## Diagnosis: What Claude Code Missed

Claude Code's accent migration was **incomplete**. It updated tokens/CSS variables and a handful of components, but missed the **most visible surfaces**:

### Missed Components (still using old yellow/gold fills)

1. **`TripViewToggle.tsx`** — The "My Trips / Pro / Events" top nav. Uses hardcoded `from-yellow-500 to-yellow-600` and `shadow-yellow-500/30`. This is the most visible offender. Should use `accent-ring-active` (ring treatment for authenticated app UI).

2. **`TripCard.tsx`** — Trip cards use hardcoded `text-yellow-400` for MapPin/Calendar icons, `text-yellow-300` for hover title, `border-yellow-500/30` for hover, `from-yellow-600/20` for gradient, `bg-yellow-500/20 text-yellow-300` for badges. All should use the new gold-primary palette.

3. **`SettingsMenu.tsx`** — Settings tabs (My Trips / Pro / Events) use `bg-primary text-primary-foreground` (filled gold). Should use ring treatment for authenticated UI.

4. **`ActionPill.tsx`** — The `aiOutline` variant uses `border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10`. Should use `border-gold-primary/50 text-gold-primary hover:bg-gold-primary/10`. This affects Import buttons across Calendar, Agenda, Lineup.

5. **`MobileGroupCalendar.tsx`** — Calendar selected day uses `bg-primary text-primary-foreground` (filled gold circle). Should remain filled but use the new gold palette (it already uses `primary` which maps to the new gold — this may actually be fine if the CSS variable is correct).

6. **`LoadingSpinner.tsx`** — Uses `border-t-primary` which already maps to new gold via CSS variable. This should be fine.

### Build Errors (separate issue, pre-existing)

The 11 build errors are all in **Supabase Edge Functions** (`gmail-import-worker/index.ts` and `join-trip/index.ts`), not in the main React app. These are pre-existing type mismatches and a missing `applyRateLimit` function — unrelated to the accent migration.

---

## Implementation Plan

### 1. Update `TripViewToggle.tsx` — Ring treatment for My Trips/Pro/Events

Replace all `data-[state=on]:bg-gradient-to-r data-[state=on]:from-yellow-500 data-[state=on]:to-yellow-600 data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-yellow-500/30` with ring treatment: `data-[state=on]:accent-ring-active data-[state=on]:text-white data-[state=on]:shadow-ring-glow`. Since `accent-ring-active` is a CSS class (not a Tailwind utility), we need to apply it conditionally via className or use the equivalent Tailwind classes inline.

### 2. Update `TripCard.tsx` — Premium gold icons and accents

- `text-yellow-400` → `text-gold-primary` (MapPin, Calendar icons)
- `text-yellow-300` → `text-gold-light` (hover title)
- `border-yellow-500/30` → `border-gold-primary/30` (hover border)
- `from-yellow-600/20 via-yellow-500/10` → `from-gold-dark/20 via-gold-primary/10` (gradient)
- `bg-yellow-500/20 text-yellow-300 border-yellow-500/30` → `bg-gold-primary/20 text-gold-light border-gold-primary/30` (badges)

### 3. Update `SettingsMenu.tsx` — Ring treatment for settings tabs

Replace `bg-primary text-primary-foreground shadow-lg` with `accent-ring-active text-white shadow-ring-glow` for active settings tabs.

### 4. Update `ActionPill.tsx` — Gold palette for AI variant

Replace `border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10` with `border-gold-primary/50 text-gold-primary hover:bg-gold-primary/10`.

### 5. Fix `TripViewToggle` accent-ring-active compatibility

Since Tailwind's `data-[state=on]:` prefix can't apply CSS custom classes like `accent-ring-active`, we'll need to restructure the ToggleGroupItem styling to use a wrapper approach or apply equivalent inline Tailwind classes that replicate the ring treatment.

