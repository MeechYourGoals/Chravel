

## What Needs to Change

Three issues visible in the screenshot:

### 1. Calendar selected day (Mar 8) — old yellowish gold fill
The `calendar.tsx` component uses `bg-primary text-primary-foreground` for `day_selected`. While `--primary` is set to `hsl(37 55% 52%)` which IS `#c49746`, I'll switch to the explicit `bg-gold-primary` token for guaranteed consistency, and also update `day_today` to use the gold palette.

**File:** `src/components/ui/calendar.tsx` (line 37-39)
- `bg-primary text-primary-foreground` → `bg-gold-primary text-black`
- Also update hover/focus states on the same line

### 2. CTA buttons (Search, Upload, Send, Waveform) — border too thin
User loves the gold border treatment but wants it **thicker** so the gradient is more visible. Currently using `border` (1px). Change to `border-2` (2px).

**File:** `src/lib/ctaButtonStyles.ts` (line 13-14)
- Change `border border-gold-primary/60` → `border-2 border-gold-primary/60`

### 3. Trip Members icon — dynamic class not picked up by Tailwind JIT
`TripHeader.tsx` line 610 uses `` text-${accentColors.primary} `` which produces `text-gold-primary` at runtime, but Tailwind's JIT compiler can't detect dynamic class strings. The icon appears with no gold styling. Fix by using the static class directly.

**File:** `src/components/TripHeader.tsx` (line 610)
- `` className={`text-${accentColors.primary}`} `` → `className="text-gold-primary"`
- Same fix on line 634 for the manage users button hover color

