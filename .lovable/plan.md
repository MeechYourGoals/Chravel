

# Fix "How It Works" Section Layout & Remove Redundant Labels

## Problem Summary
Looking at the current desktop layout, there are two issues:
1. **Redundant text labels** ("Create Trip", "Trip Invite", "One Hub") appear above each screenshot, duplicating the step box titles ("Create a trip", "Invite your group", "Everything syncs")
2. **Screenshot alignment is off** - the screenshots container uses `max-w-4xl` while the steps use `max-w-6xl`, plus the flex layout doesn't properly center each screenshot under its corresponding step box

## Solution

### Changes to `src/components/landing/sections/ProblemSolutionSection.tsx`

**1. Remove redundant text labels (desktop)**
- Delete the `<span>` elements containing "Create Trip", "Trip Invite", "One Hub" from lines 174-179, 197-202, 219-225
- This eliminates visual redundancy since the step boxes above already convey the same information

**2. Remove redundant text labels (mobile)**
- Delete the `<span>` elements from the mobile section as well (lines 246-251, 269-274, 292-297)
- Keeps mobile consistent with desktop

**3. Fix screenshot container alignment**
- Change the screenshots wrapper from `max-w-4xl` to `max-w-6xl` to match the steps container width
- This ensures the three columns span the same width as the three step boxes above

**4. Adjust column sizing for proper centering**
- Remove `max-w-[300px]` constraint from each column
- Use equal `flex-1` distribution so each screenshot column takes exactly 1/3 of the container
- Add `justify-between` to ensure even spacing that matches the step boxes

## Visual Result

```text
BEFORE:
┌─────────────────────────────────────────────────────────────┐
│  [Step 1]           [Step 2]           [Step 3]             │ ← max-w-6xl
└─────────────────────────────────────────────────────────────┘
    Create Trip       Trip Invite         One Hub              ← REDUNDANT
┌───────────────────────────────────────────┐
│  [Screenshot 1]  [Screenshot 2]  [Screenshot 3]             │ ← max-w-4xl (narrower!)
└───────────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────────────────────────────┐
│  [Step 1]           [Step 2]           [Step 3]             │ ← max-w-6xl
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  [Screenshot 1]     [Screenshot 2]     [Screenshot 3]       │ ← max-w-6xl (matches!)
└─────────────────────────────────────────────────────────────┘
         ↓                  ↓                  ↓
     Centered           Centered           Centered
```

## Technical Implementation

| Line Range | Current | Change |
|------------|---------|--------|
| 158 | `max-w-4xl` | Change to `max-w-6xl` |
| 165 | `justify-center items-start gap-6` | Change to `justify-between items-start gap-4` |
| 168 | `flex-1 max-w-[300px]` | Change to `flex-1` (remove max-width) |
| 174-179 | `<span>Create Trip</span>` + margin | Delete entirely |
| 191 | `flex-1 max-w-[300px]` | Change to `flex-1` |
| 197-202 | `<span>Trip Invite</span>` + margin | Delete entirely |
| 214 | `flex-1 max-w-[300px]` | Change to `flex-1` |
| 219-225 | `<span>One Hub</span>` + margin | Delete entirely |
| 246-251 | Mobile `<span>Create Trip</span>` | Delete entirely |
| 269-274 | Mobile `<span>Trip Invite</span>` | Delete entirely |
| 292-297 | Mobile `<span>One Hub</span>` | Delete entirely |

## Files Modified
- `src/components/landing/sections/ProblemSolutionSection.tsx`

## Result
- Cleaner visual hierarchy without redundant labels
- Screenshots perfectly centered under their corresponding step boxes
- Symmetrical layout across all three columns

