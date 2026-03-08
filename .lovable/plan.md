

## Problem

Two color inconsistencies:

1. **Calendar dates with events** use `hsl(var(--primary) / 0.3)` (a muted HSL color) instead of the metallic gold palette. The selected date uses `bg-gold-primary` (flat fill). These don't match the premium gradient border seen on the Concierge tab.

2. **CTA buttons** (Search, Upload, Send, Waveform) use a flat `border-2 border-gold-primary/60` but the Concierge tab's active border uses `accent-ring-active` — a CSS gradient border (`linear-gradient(135deg, #533517 0%, #c49746 40%, #feeaa5 70%, #c49746 100%)`). The CTA buttons should use this same gradient border treatment.

## Changes

### 1. Calendar event-highlighted dates — `src/components/GroupCalendar.tsx` (line 322)

Replace the `hasEvents` modifier style from `hsl(var(--primary))` to gold:

```tsx
// Before
backgroundColor: 'hsl(var(--primary) / 0.3)',
color: 'hsl(var(--primary-foreground))',

// After  
backgroundColor: 'rgba(196, 151, 70, 0.3)',
color: '#feeaa5',
```

### 2. Mobile calendar — `src/components/mobile/MobileGroupCalendar.tsx`

**Compact view selected date** (line 511): `bg-primary text-primary-foreground` → `bg-gold-primary text-black`

**Compact view today** (line 513): `bg-primary/20 text-primary` → `bg-gold-primary/20 text-gold-light`

**Compact view event dot** (line 520): `bg-primary` → `bg-gold-primary`

**Grid view today text** (line 602): `text-primary` → `text-gold-primary`

### 3. CTA buttons get gradient border — `src/lib/ctaButtonStyles.ts`

Replace the flat `border-2 border-gold-primary/60` with the `accent-ring-active`-style gradient border. Since these are round buttons, the cleanest approach is to apply the same `::before` pseudo-element technique. However, since these are Tailwind utility strings composed in JS, we'll use a CSS class instead:

**New CSS class** in `src/index.css` (after the existing accent-ring section):

```css
/* CTA button gold gradient ring (matches accent-ring-active gradient) */
.cta-gold-ring {
  position: relative;
  border: 1.5px solid transparent;
  background-clip: padding-box;
  box-shadow: 0 0 8px rgba(196, 151, 70, 0.15);
}
.cta-gold-ring::before {
  content: '';
  position: absolute;
  inset: -1.5px;
  border-radius: inherit;
  padding: 1.5px;
  background: linear-gradient(135deg, #533517 0%, #c49746 40%, #feeaa5 70%, #c49746 100%);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  pointer-events: none;
}
```

**Update `CTA_GRADIENT`** in `src/lib/ctaButtonStyles.ts`:

```ts
// Before
'bg-gray-800/80 text-white border-2 border-gold-primary/60 shadow-[0_0_8px_rgba(196,151,70,0.15)]'

// After
'bg-gray-800/80 text-white cta-gold-ring'
```

This makes the Search, Upload, Send, and Waveform buttons use the exact same metallic gold gradient border as the Concierge tab selection ring.

### 4. Desktop calendar `day_selected` — `src/components/ui/calendar.tsx` (line 38)

Already uses `bg-gold-primary` which is correct for selected state. No change needed.

## Summary

- 5 files touched
- Calendar dates align to gold palette
- CTA buttons get the same gradient border as Concierge tab
- All gold accents now share the same gradient source: `#533517 → #c49746 → #feeaa5 → #c49746`

