# Chravel Accent Design System

> **Last Updated:** 2026-03-08
> **Maintained By:** AI Engineering Team + Meech

---

## Overview

Chravel uses a **dual-mode accent system** that distinguishes between authenticated product UI and public marketing surfaces.

| Context | Treatment | Purpose |
|---------|-----------|---------|
| **App / Product UI** | Gold Ring | Dark interior + metallic gold border ring + subtle glow |
| **Marketing / Public UI** | Gold Fill | Premium gradient gold fill for CTAs and conversion elements |

Both modes share the same premium gold color family but apply it differently.

---

## Premium Gold Color Family

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-gold-bronze` | `#533517` | Dark bronze — ring gradient anchor, darkest tone |
| `--accent-gold-mid` | `#c49746` | Warm metallic gold — primary brand gold |
| `--accent-gold-light` | `#feeaa5` | Light champagne — ring highlight, subtle accents |
| `--accent-gold-glow` | `#e8af48` | Warm glow gold — glows, shadows, ambient light |

### Static Highlight Accents

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-iridescent-silver` | `#c0c8d4` | Metallic silver highlights |
| `--accent-iridescent-blue` | `#7ba4d9` | Cool blue highlights |

### Rules

- No pink, rainbow, or animated gradient effects
- No cheap yellow / mustard / orange drift
- No greenish gold
- Everything should read as: premium, metallic, warm, cinematic, restrained

---

## App Ring Treatment (Authenticated Product UI)

### When to Use

Use the ring treatment for **all authenticated product UI** selected/active states:

- In-trip navigation tabs (Chat, Calendar, Concierge, Media, Payments, Places, Polls, Tasks)
- Trips homepage segmented controls (My Trips, Pro Trips, Events)
- Settings action surfaces
- Subscription plan selectors (in-app paywalls)
- Concierge control buttons
- Toggles and switches (checked state)
- NativeSegmentedControl, NativePillSegment, NativeTripTypeSwitcher

### CSS Classes

```css
/* Selected/active state */
.accent-ring-active

/* Idle/unselected state */
.accent-ring-idle
```

### Visual Specification

1. **Outer ambient glow** — subtle blurred `#e8af48` at low opacity
2. **Metallic ring edge** — static gradient: `#533517 → #c49746 → #feeaa5 → #c49746`
3. **Inner surface** — dark/charcoal/graphite with subtle gold tint (`rgba(196,151,70,0.10)`)
4. **No rotation, no shimmer, no animated conic spin**

### Tailwind Tokens

| Token | Value |
|-------|-------|
| `shadow-ring-glow` | Subtle gold glow shadow |
| `shadow-ring-glow-lg` | Larger gold glow shadow |
| `text-gold-primary` | `#c49746` — for active icon/text color |
| `bg-gold-primary/15` | Subtle gold tint background |
| `border-gold-primary/40` | Gold border for selections |

---

## Marketing Fill Treatment (Public-Facing UI)

### When to Use

Use filled gold for **public marketing conversion surfaces**:

- Homepage CTA buttons (Login / Signup)
- Contact Sales buttons
- Pricing page CTA buttons (Start Free, Upgrade, Subscribe)
- Public nav CTA buttons
- "Most Popular" badges on pricing cards
- Trip Preview page CTAs
- AuthModal Sign In/Sign Up tabs
- MobileAuthHeader auth button
- StickyLandingNav elements

### CSS Class

```css
.accent-fill-gold
```

### Visual Specification

- Premium gradient: `#e8af48 → #c49746 → #a07a32`
- Subtle edge lighting via border: `rgba(254,234,165,0.25)`
- Warm glow shadow
- Black text for maximum contrast
- Hover state: slightly lighter gradient + stronger shadow

### Important

- **Do NOT convert marketing CTAs to outline-only buttons**
- Marketing gold fill should feel: richer, more dimensional, less flat, more premium
- Keep black text where contrast is excellent

---

## Toggle/Switch Treatment

For app UI switches (checked state):

```css
.accent-switch-checked
```

- Gradient track: `#533517 → #c49746 → #e8af48`
- Gold border + subtle glow
- White thumb on dark track

Tailwind approach for Radix switches:
```
data-[state=checked]:bg-gold-primary
data-[state=checked]:border-gold-primary/50
data-[state=checked]:shadow-ring-glow
```

---

## Motion Rules

### Bounce Select Animation

```
animate-bounce-select
```

- Scale: `1 → 1.25 → 0.95 → 1`
- Duration: `0.4s`
- Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` (bouncy overshoot)

### Where Bounce IS Allowed

- Homepage nav switching (NativeTabBar)
- Mobile bottom nav tab changes
- Trips homepage view switching (My Trips / Pro Trips / Events)

### Where Bounce is NOT Allowed

- In-trip tabs (Polls, Tasks, Calendar, Places, Concierge)
- Settings toggles
- Form inputs
- Small utility controls

### Sliding Indicator

Used in NativeSegmentedControl — CSS `transition-transform` on the indicator div.

---

## Deprecated Patterns

These patterns should NOT be used in new code:

| Pattern | Replacement |
|---------|-------------|
| `bg-[#C4912F]` | `accent-fill-gold` or `bg-gold-primary` |
| `from-yellow-500 to-yellow-600` | `accent-fill-gold` or `from-gold-primary to-gold-dark` |
| `bg-primary text-primary-foreground` (for app selected states) | `accent-ring-active text-white` |
| `bg-primary/20 ring-2 ring-primary` (for app selections) | `accent-ring-active` |
| `bg-white/20 text-white border border-white/30` (old trip tabs) | `accent-ring-active text-white` |
| `text-yellow-400` (for brand gold text) | `text-gold-primary` |
| `bg-yellow-500/20 text-yellow-400 border-yellow-500/30` | `bg-gold-primary/15 text-gold-primary border-gold-primary/30` |

---

## File Reference

| File | Purpose |
|------|---------|
| `src/index.css` | CSS custom properties + utility classes |
| `tailwind.config.ts` | Tailwind color tokens + shadows + animations |
| `src/components/TripTabs.tsx` | In-trip tab navigation (ring treatment) |
| `src/components/native/NativeTabBar.tsx` | Bottom tab bar (gold active + bounce) |
| `src/components/native/NativeSegmentedControl.tsx` | Segmented controls (ring treatment) |
| `src/components/native/NativeTripTypeSwitcher.tsx` | Trip type selector (ring treatment) |
| `src/components/ui/switch.tsx` | Toggle switches (gold checked state) |
| `src/components/ui/button.tsx` | Button variants (default = gold fill) |
| `src/components/landing/sections/HeroSection.tsx` | Hero CTA (marketing fill) |
| `src/components/conversion/PricingSection.tsx` | Pricing (marketing fill) |
| `src/components/landing/GoldAccentOverlay.tsx` | Landing page decorative overlays |
| `src/components/landing/MobileAuthHeader.tsx` | Mobile auth CTA (marketing fill) |

---

## Decision Guide

When adding a new gold-accented element:

1. **Is it inside the authenticated app?** → Use `accent-ring-active` / `accent-ring-idle`
2. **Is it a public marketing CTA?** → Use `accent-fill-gold`
3. **Is it a toggle/switch?** → Use `bg-gold-primary` + `shadow-ring-glow`
4. **Is it a badge/label?** → Use `bg-gold-primary/15 text-gold-primary border-gold-primary/30`
5. **Is it decorative text?** → Use `text-gold-primary`
6. **Need a glow shadow?** → Use `shadow-ring-glow` (subtle) or `shadow-ring-glow-lg` (prominent)
