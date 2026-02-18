

# Add Budget Unit to AI Concierge Preferences

## Overview

Add an "Applies to" dropdown alongside the existing Min/Max budget inputs, so the AI knows whether the user's budget means per experience, per day, per person, or per trip. Default: "Per experience".

## Changes

### 1. Type Definition -- `src/types/consumer.ts`

- Add `budgetUnit: 'experience' | 'day' | 'person' | 'trip'` to the `TripPreferences` interface
- Add a new exported constant `BUDGET_UNIT_OPTIONS` mapping values to display labels

### 2. Default Preferences -- `src/services/userPreferencesService.ts`

- Add `budgetUnit: 'experience'` to the `DEFAULT_PREFERENCES.ai_concierge_preferences` object

### 3. Preferences UI -- `src/components/TripPreferences.tsx`

- Add `budgetUnit` to the component's local state initialization (default `'experience'`)
- Add a `handleBudgetUnitChange` handler
- Replace the `grid-cols-2` budget layout with `grid-cols-3` (responsive: stacks on mobile)
- Add third column with label "Applies to" and a `<Select>` dropdown with options:
  - Per experience
  - Per day
  - Per person
  - Per trip
- Add min <= max validation with an inline red error message when violated

### 4. Active Filters Display -- `src/components/consumer/ConsumerAIConciergeSection.tsx`

- Update the budget pill to read:
  - Both values: `Budget: $50-$200 per experience`
  - Only max: `Budget: up to $200 per day`
  - Only min: `Budget: from $50 per person`
  - Zero/unset: don't show the pill

### 5. AI Prompt Integration -- 3 files in `supabase/functions/`

**`supabase/functions/_shared/promptBuilder.ts`** (~line 291):
- Change hardcoded "per person" to use `prefs.budgetUnit`:
  ```
  Budget Range: $50 - $200 per experience
  ```

**`supabase/functions/_shared/contextBuilder.ts`** (~line 662):
- Include unit in the formatted budget string:
  ```
  $50-$200 per experience
  ```

**`supabase/functions/lovable-concierge/index.ts`** (~line 853):
- Include unit in the formatted budget string passed to the system prompt

### 6. Demo Mode -- `src/components/consumer/ConsumerAIConciergeSection.tsx`

- Add `budgetUnit: 'experience'` to the demo mode mock preferences

## Technical Details

### Type change in `src/types/consumer.ts`

```typescript
export interface TripPreferences {
  dietary: string[];
  vibe: string[];
  accessibility: string[];
  business: string[];
  entertainment: string[];
  lifestyle: string[];
  budgetMin: number;
  budgetMax: number;
  budgetUnit: 'experience' | 'day' | 'person' | 'trip';
  timePreference: 'early-riser' | 'night-owl' | 'flexible';
}

export const BUDGET_UNIT_OPTIONS = [
  { value: 'experience', label: 'Per experience' },
  { value: 'day', label: 'Per day' },
  { value: 'person', label: 'Per person' },
  { value: 'trip', label: 'Per trip' },
] as const;
```

### Budget UI layout (TripPreferences.tsx)

Desktop/tablet: 3 equal columns in one row via `grid-cols-1 sm:grid-cols-3`.
Mobile: stacks vertically.

### Backward Compatibility

Existing users without `budgetUnit` saved will default to `'experience'` via:
- The `|| 'experience'` fallback in component state initialization
- The default preferences object in `userPreferencesService.ts`
- The `|| 'experience'` fallback in prompt/context builders

No database migration needed -- `budgetUnit` is stored inside the JSON `preferences` column of `user_preferences` table.

## Manual Test Checklist

1. New user: Open AI Concierge settings -- "Applies to" dropdown defaults to "Per experience"
2. Existing user: Open settings -- dropdown shows "Per experience" (backfill default)
3. Change unit to "Per day", save, reload -- persists correctly
4. Set min=100, max=50 -- inline error "Minimum must be less than or equal to Maximum"
5. Active Filters: Set budget $50-$200 per day -- pill reads "Budget: $50-$200 per day"
6. Active Filters: Set only max $500 per trip -- pill reads "Budget: up to $500 per trip"
7. Ask AI a question -- system prompt includes correct budget unit context
8. Mobile: Budget row stacks to 3 rows with consistent spacing
9. Desktop/tablet: Budget row shows 3 equal-width columns

