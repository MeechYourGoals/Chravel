

# Marketing Page Updates + Build Error Fixes

## Overview

Three marketing page updates plus two pre-existing build errors that need fixing.

---

## 1. Replace "Create New Trip" Screenshot (How It Works)

**File**: `src/components/landing/sections/ProblemSolutionSection.tsx`

The current screenshot (`create-trip-modal-final.png`) shows the old styling. The user has uploaded a new screenshot (IMG_3776.jpeg) showing the updated Create New Trip modal with the streamlined dark UI.

**Steps**:
- Copy uploaded image `user-uploads://IMG_3776.jpeg` to `src/assets/app-screenshots/create-trip-modal-v2.png`
- Update the import in `ProblemSolutionSection.tsx` from `create-trip-modal-final.png` to `create-trip-modal-v2.png`

---

## 2. Fix AI Concierge Screenshot Cutoff (Travel Intelligence)

**File**: `src/components/landing/sections/AiFeaturesSection.tsx`

The AI Concierge screenshot (`ai-concierge.png`) is displayed with `object-cover object-top` (line 109), which crops the right side -- cutting off the tab bar (Chat, Calendar, Concierge, Media, Payments, Places, Polls, Tasks). The full tab bar and chat input are not visible.

**Fix**: Change `object-cover object-top` to `object-contain` and adjust the container to ensure the full-width screenshot is visible without cropping. Add a dark background (`bg-card`) to the container so letterboxing blends with the card aesthetic.

---

## 3. Add "Chravel Agent" Feature Pill (Travel Intelligence)

**File**: `src/components/landing/sections/AiFeaturesSection.tsx`

Add a new feature pill to the `aiFeatures1` array (or replace an existing less-important one) highlighting **Chravel Agent** capabilities:

- **Title**: "Chravel Agent"
- **Description**: Something like: "Your AI assistant takes action -- add places to BaseCamps, save links, create polls, update calendars, assign tasks, plus pull flights, hotels, and activity suggestions."
- **Icon**: A `Bot` or `Sparkles` icon from lucide-react

Since `aiFeatures1` currently has 3 items (matching a 3-row grid), the simplest approach is to either:
- Replace one of the existing pills (e.g., "Decision Lock-In" is less impactful) with Chravel Agent
- Or add a 4th row, which requires adjusting the grid from `grid-rows-3` to `grid-rows-4` (but this changes layout parity with the Places row)

Recommendation: Replace "Decision Lock-In" (Polls) with "Chravel Agent" since agent capabilities are a bigger differentiator. Polls can be mentioned in the agent description or elsewhere.

---

## 4. Fix Build Errors (Pre-existing, Unrelated to Marketing)

### 4a. `src/services/conciergeGateway.ts` -- `idleTimer` scope error

`idleTimer` is declared at line 286 inside the SSE-handling block, but the `catch` block at line 362 references it from an outer scope where it doesn't exist.

**Fix**: Move the `let idleTimer` declaration above the `try` block (or to the top of the async IIFE) so it's visible in both the `try` body and the `catch` handler. Initialize it as `undefined`.

### 4b. `src/__tests__/utils/supabaseMocks.ts` -- Type errors

- Line 41: `r.id` on `unknown` -- needs a type assertion: `(r as any).id` or `(r as Record<string, unknown>).id`
- Lines 276, 289, 295, 301, 383, 388, 394, 400: `resolve` typed as `unknown` but called as a function -- needs typing as `(value: any) => any` or `Function`

**Fix**: Cast `resolve` parameters to `(value: any) => any` and add a type assertion for the `.id` access.

---

## Files Changed Summary

| File | Change |
|---|---|
| `src/assets/app-screenshots/create-trip-modal-v2.png` | New file (copied from upload) |
| `src/components/landing/sections/ProblemSolutionSection.tsx` | Update screenshot import |
| `src/components/landing/sections/AiFeaturesSection.tsx` | Fix concierge screenshot cropping; add Chravel Agent pill |
| `src/services/conciergeGateway.ts` | Move `idleTimer` declaration to fix scope |
| `src/__tests__/utils/supabaseMocks.ts` | Fix type assertions for `unknown` calls |

## Regression Risk: LOW
All changes are isolated -- marketing page visuals, one variable scope fix, and test utility type fixes.

