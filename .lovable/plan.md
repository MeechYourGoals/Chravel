

## Fix Calendar Icon Recognizability + Increase Stats Icon Size

### Problem
The current `CalendarDays` icon renders as a near-featureless rounded rectangle at 14–18px, especially under the gold gradient stroke. Additionally, `ArchivedTripCard` still uses a different icon (`Calendar`) with flat amber color instead of the gold gradient.

### Solution

**1. Swap `CalendarDays` → `CalendarCheck2` everywhere**

`CalendarCheck2` has a bold checkmark inside the calendar frame, giving it a distinctive non-square silhouette that reads clearly at small sizes even with the gradient applied.

**Files to update (7 total):**

| File | Current Icon | Change |
|------|-------------|--------|
| `src/components/TripCard.tsx` | `CalendarDays` | → `CalendarCheck2` |
| `src/components/ProTripCard.tsx` | `CalendarDays` | → `CalendarCheck2` |
| `src/components/EventCard.tsx` | `CalendarDays` | → `CalendarCheck2` |
| `src/components/MobileEventCard.tsx` | `CalendarDays` | → `CalendarCheck2` |
| `src/components/PendingTripCard.tsx` | `CalendarDays` | → `CalendarCheck2` |
| `src/components/trip/PendingTripCard.tsx` | `CalendarDays` | → `CalendarCheck2` |
| `src/components/home/ArchivedTripCard.tsx` | `Calendar` + flat `text-amber-400` | → `CalendarCheck2` + `gold-gradient-icon` |

Each file: update the import statement and all JSX references. No other changes.

**2. Increase stats-row icon size by 1.5x**

In `src/components/ui/CardStatItem.tsx`, change `CARD_ICON_SIZE.stat` from `14` to `21` (14 × 1.5). This automatically scales People, Days, and Places icons across all card variants that use `CardStatItem`.

**3. No CSS changes needed** — the existing `.gold-gradient-icon` selectors already target `.lucide path`, `.lucide line`, `.lucide circle`, `.lucide polyline`, `.lucide rect` which covers all internal SVG elements of `CalendarCheck2`.

### Summary of changes
- 7 component files: icon import swap
- 1 shared token file (`CardStatItem.tsx`): stat icon size 14→21
- 1 archived card: also fix color from flat amber to gold-gradient-icon
- 0 CSS changes

