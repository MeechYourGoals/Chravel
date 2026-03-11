---
name: chravel-ui-consistency
description: Audit Chravel's UI for visual consistency, component reuse, and interaction pattern coherence across features. Use when checking design consistency, finding visual drift, or standardizing UI patterns. Triggers on "UI consistency", "visual drift", "component consistency", "does this match our design system".
---

# Chravel UI Consistency Audit

Audit whether Chravel feels like one product with one design brain.

## Chravel Design Language

### Surface System
- **App background:** Dark (near-black or deep navy)
- **Elevated surfaces:** Subtle lighter dark with border
- **Modal/sheet shells:** Consistent dark overlay with rounded corners
- **Card surfaces:** Slightly elevated from background

### Color System
- **Primary accent:** Gold/amber for premium feel
- **Interactive elements:** Gold accent for primary CTAs
- **Destructive:** Red for delete/remove actions
- **Success:** Green for confirmations
- **Text hierarchy:** White (primary) → Gray-300 (secondary) → Gray-500 (tertiary)

### Component Patterns
- Consistent card patterns across trips, events, places, tasks, polls
- Modal shells with consistent corner radius, padding, close affordance
- Bottom sheets for mobile with consistent interaction model
- Tab navigation with consistent active/inactive states

## Audit Dimensions

### 1. Surface Consistency
- Same background treatment across all pages?
- Cards using consistent elevation, border, and radius?
- Modals sharing the same shell?

### 2. Button & Control Consistency
- Primary/secondary/destructive buttons look the same everywhere?
- Icon buttons placed consistently?
- Form controls styled uniformly?

### 3. Empty State Consistency
- All empty states have guidance content?
- Consistent tone, iconography, and CTA placement?
- Mobile and desktop use same empty-state patterns?

### 4. Confirmation Patterns
- Same feedback pattern for create/save/delete across features?
- AI action confirmations consistent with manual action confirmations?
- Toast vs inline vs card confirmation used consistently?

### 5. Typography Hierarchy
- Title/subtitle/body sizes consistent across features?
- Label weights consistent across forms and settings?
- Metadata and helper text styled the same way?

## Output

### Diagnosis
- Coherent / Mostly consistent / Drifting / Fragmented

### Top Inconsistencies
For each: what diverges, where, severity, recommended canonical pattern

### Recommended Canon
- The definitive pattern for: surfaces, buttons, modals, cards, empty states, confirmations
