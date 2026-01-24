
# Landing Page Visual Overhaul: Navy-Gold Gradient System & Hero Enhancement

## Overview

This plan updates the entire marketing landing page with a consistent navy-to-gold gradient system using official design tokens, adds a subtle noise texture overlay for depth, updates the "ChravelApp" and "Less Chaos, More Coordinated" gradients, inserts a new subtitle, and adds a demo mode preview screenshot in the hero section.

---

## Design Tokens (Source of Truth)

| Token | Value | Usage |
|-------|-------|-------|
| Navy base | `#070B1A` | Primary background start |
| Deep navy | `#0B1230` | Primary background end |
| Gold accent | `#F4B23A` | Text gradient highlight |
| Soft gold glow | `rgba(244,178,58,0.18)` | Accent glow overlays |
| Blue glow | `rgba(79,140,255,0.14)` | Cool accent glow overlays |

---

## Files to Modify

### 1. `src/components/landing/FullPageLanding.tsx`

**Changes:**
- Update `GRADIENTS` object to use new navy base/deep navy colors across all 7 sections
- Replace current accent glows with `rgba(244,178,58,0.18)` (gold) and `rgba(79,140,255,0.14)` (blue)

**Updated GRADIENTS object:**
```typescript
const GRADIENTS = {
  hero: {
    colors: ['#070B1A', '#0B1230'] as [string, string],
    direction: 'vertical' as const,
    accentGlow: { color: 'rgba(79,140,255,0.14)', position: 'bottom' as const, opacity: 0.14 }
  },
  replaces: {
    colors: ['#0B1230', '#070B1A'] as [string, string],
    direction: 'diagonal' as const,
    accentGlow: { color: 'rgba(244,178,58,0.18)', position: 'center' as const, opacity: 0.08 }
  },
  howItWorks: {
    colors: ['#070B1A', '#0B1230'] as [string, string],
    direction: 'vertical' as const,
    accentGlow: { color: 'rgba(79,140,255,0.14)', position: 'center' as const, opacity: 0.10 }
  },
  useCases: {
    colors: ['#0B1230', '#070B1A'] as [string, string],
    direction: 'diagonal' as const,
    accentGlow: { color: 'rgba(244,178,58,0.18)', position: 'bottom' as const, opacity: 0.10 }
  },
  aiFeatures: {
    colors: ['#070B1A', '#0B1230'] as [string, string],
    direction: 'vertical' as const,
    accentGlow: { color: 'rgba(244,178,58,0.18)', position: 'bottom' as const, opacity: 0.12 }
  },
  pricing: {
    colors: ['#0B1230', '#070B1A'] as [string, string],
    direction: 'diagonal' as const,
    accentGlow: { color: 'rgba(79,140,255,0.14)', position: 'top' as const, opacity: 0.10 }
  },
  faq: {
    colors: ['#070B1A', '#0B1230'] as [string, string],
    direction: 'vertical' as const,
    accentGlow: { color: 'rgba(244,178,58,0.18)', position: 'center' as const, opacity: 0.06 }
  }
};
```

---

### 2. `src/components/landing/FullPageLandingSection.tsx`

**Changes:**
- Add subtle noise texture overlay (CSS-based, very low opacity ~2-4%)
- Use a pseudo-element or additional div with a noise SVG filter

**Implementation:**
```tsx
{/* Noise texture overlay */}
<div 
  className="absolute inset-0 pointer-events-none opacity-[0.03]"
  style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat'
  }}
/>
```

---

### 3. `src/components/landing/sections/HeroSection.tsx`

**Changes:**

#### A. Update "ChravelApp" gradient to match design tokens
```typescript
// Before
background: 'linear-gradient(135deg, #4A90E2 0%, #E8A838 35%, #F5A623 50%, #E8A838 65%, #4A90E2 100%)'

// After (using #070B1A navy and #F4B23A gold)
background: 'linear-gradient(135deg, #4F8CFF 0%, #F4B23A 40%, #F4B23A 60%, #4F8CFF 100%)'
```

#### B. Update "Less Chaos, More Coordinated" gradient
```typescript
// Before
background: 'linear-gradient(135deg, #1E40AF 0%, #E8A838 35%, #F5A623 50%, #E8A838 65%, #1E40AF 100%)'

// After (matching navy-gold tokens)
background: 'linear-gradient(135deg, #4F8CFF 0%, #F4B23A 40%, #F4B23A 60%, #4F8CFF 100%)'
```

#### C. Add new subtitle between headline and brand name

Insert after "Group Travel Made Easy" heading, before "ChravelApp":
```tsx
{/* New subtitle */}
<p
  className="text-base sm:text-lg md:text-xl text-white/80 font-medium max-w-3xl mx-auto mt-3 mb-4 animate-fade-in"
  style={{
    animationDelay: '0.05s',
    textShadow: '0 2px 4px rgba(0,0,0,0.4)',
  }}
>
  Friends, Families, Sports, Tours, Work Trips & More.<br className="hidden sm:inline" />
  Planning is Frustrating. <span className="text-[#F4B23A] font-semibold">Get UnFrustrated.</span>
</p>
```

#### D. Add Demo Mode preview screenshot

Copy the uploaded image to `src/assets/demo-preview-hero.png` and insert between "ChravelApp" and "Less Chaos, More Coordinated":

```tsx
{/* Demo preview image */}
<div className="w-full max-w-5xl mx-auto px-4 mt-6 mb-6 md:mt-8 md:mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
  <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10">
    <img 
      src={demoPreviewHero}
      alt="ChravelApp trip dashboard preview"
      className="w-full h-auto"
    />
    {/* Optional subtle overlay to blend edges */}
    <div className="absolute inset-0 bg-gradient-to-t from-[#070B1A]/30 via-transparent to-transparent pointer-events-none" />
  </div>
</div>
```

#### E. Adjust spacing

- Reduce vertical padding/margins since new content fills the empty space
- The subtitle and preview image will naturally fill the previously empty middle section

---

## Visual Layout (Hero Section)

```text
+------------------------------------------+
|        "Group Travel Made Easy"          |  <- Main headline
|                                          |
|  "Friends, Families, Sports, Tours..."   |  <- NEW subtitle
|  "Planning is Frustrating. Get..."       |
|                                          |
|           [ ChravelApp ]                 |  <- Gradient brand
|                                          |
|    +--------------------------------+    |
|    |                                |    |
|    |   [Demo Preview Screenshot]    |    |  <- NEW image
|    |                                |    |
|    +--------------------------------+    |
|                                          |
|    "Less Chaos, More Coordinated"        |  <- Bottom tagline
|    "Plans, Photos, Places..."            |
+------------------------------------------+
```

---

## Asset to Copy

- **Source:** `user-uploads://image-1769216632.png` (demo mode screenshot)
- **Destination:** `src/assets/demo-preview-hero.png`

---

## Technical Notes

### Noise Overlay Implementation
Using an inline SVG data URL for the noise texture eliminates the need for an external asset file. The fractal noise filter creates organic grain at 3% opacity.

### Gradient Consistency
All sections now alternate between:
- `#070B1A` (navy base) and `#0B1230` (deep navy)
- Gold glow `rgba(244,178,58,0.18)` or blue glow `rgba(79,140,255,0.14)`

### Text Gradient Colors
The blue in text gradients uses `#4F8CFF` (a brighter blue that reads well against dark backgrounds) paired with the gold accent `#F4B23A`.

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | All 7 landing sections use navy base (#070B1A) and deep navy (#0B1230) |
| 2 | Subtle noise overlay visible on all sections at very low opacity |
| 3 | "ChravelApp" gradient uses matching blue (#4F8CFF) and gold (#F4B23A) |
| 4 | "Less Chaos, More Coordinated" uses same gradient colors |
| 5 | New subtitle appears between headline and brand name |
| 6 | Demo preview screenshot displays between brand and bottom tagline |
| 7 | Empty space in hero is filled without feeling cramped |
| 8 | Mobile responsive - screenshot scales appropriately |
