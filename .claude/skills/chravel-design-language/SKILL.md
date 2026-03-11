---
name: chravel-design-language
description: Enforce Chravel's premium dark/gold design system. Ensure new UI matches existing patterns for surfaces, typography, buttons, modals, cards, and empty states. Use when building new UI or reviewing UI changes for design consistency. Triggers on "design system", "does this match our style", "premium feel", "dark theme consistency", "gold accent".
---

# Chravel Design Language Enforcer

Chravel uses a premium dark/gold design system. Every new UI must match.

## Design Tokens

### Surfaces
- **App background:** `bg-black` or `bg-gray-950` — near-black
- **Card surface:** `bg-gray-900` or `bg-gray-900/50` with `border border-gray-800`
- **Elevated surface:** `bg-gray-800` for active/selected states
- **Modal overlay:** Semi-transparent black backdrop with `bg-gray-900` content

### Colors
- **Gold accent:** `text-amber-400`, `bg-amber-500`, `border-amber-500` — primary brand color
- **Gold hover:** `hover:bg-amber-600`
- **Text primary:** `text-white`
- **Text secondary:** `text-gray-400`
- **Text tertiary:** `text-gray-500`
- **Destructive:** `text-red-400`, `bg-red-500/10`
- **Success:** `text-green-400`, `bg-green-500/10`

### Typography
- **Page title:** `text-xl font-bold text-white`
- **Section header:** `text-lg font-semibold text-white`
- **Card title:** `text-base font-medium text-white`
- **Body:** `text-sm text-gray-300`
- **Caption/meta:** `text-xs text-gray-500`

### Spacing
- **Card padding:** `p-4`
- **Section gap:** `space-y-4` or `gap-4`
- **Inline gap:** `gap-2` or `gap-3`
- **Page padding:** `px-4 py-6` (mobile), `px-6 py-8` (desktop)

### Components
- **Buttons (primary):** `bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg px-4 py-2`
- **Buttons (secondary):** `bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-4 py-2`
- **Buttons (destructive):** `bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-4 py-2`
- **Input fields:** `bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2`
- **Cards:** `bg-gray-900 border border-gray-800 rounded-xl p-4`
- **Modals:** `bg-gray-900 border border-gray-800 rounded-2xl p-6`

### Empty States
- Centered content with icon, heading, description, and CTA
- Icon: `text-gray-600` muted
- Heading: `text-lg font-medium text-white`
- Description: `text-sm text-gray-400`
- CTA: Gold primary button

## Rules

- New UI MUST use these tokens, not ad-hoc color values
- No bright backgrounds — Chravel is dark-first
- Gold accent is reserved for primary CTAs and brand elements — do not overuse
- Maintain contrast ratios for accessibility
- Mobile and desktop use the same color system
- When in doubt, check existing components in `src/components/` for reference patterns
