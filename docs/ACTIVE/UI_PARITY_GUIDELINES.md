# UI Parity Guidelines (Tabs + Subtabs)

## Goal
Keep action buttons visually aligned with their parent tabs so every page preserves the same symmetry.

## Source of truth
Use `src/lib/tabParity.ts` for all new parity-aligned tab/subtab layouts.

## Core rules
1. **Use parity grid tokens**, not ad-hoc grid classes:
   - `TRIP_PARITY_ROW_CLASS` (8 columns)
   - `EVENT_PARITY_ROW_CLASS` (7 columns)
   - `PRO_PARITY_ROW_CLASS` (9 columns)
2. **Use column maps** to place actions under the matching top tab:
   - `TRIP_PARITY_COL_START`
   - `EVENT_PARITY_COL_START`
   - `PRO_PARITY_COL_START`
3. **Use shared button dimensions** for parity actions:
   - `PARITY_ACTION_BUTTON_CLASS`
4. Keep copy concise enough to fit parity width without wrapping where possible.

## Column mapping reference

### Trip (8)
- 1 Chat
- 2 Calendar
- 3 Concierge
- 4 Media
- 5 Payments
- 6 Places
- 7 Polls
- 8 Tasks

### Event (7)
- 1 Agenda
- 2 Calendar
- 3 Chat
- 4 Media
- 5 Line-up
- 6 Polls
- 7 Tasks

### Pro (9)
- 1 Chat
- 2 Calendar
- 3 Concierge
- 4 Media
- 5 Payments
- 6 Places
- 7 Polls
- 8 Tasks
- 9 Team

## Trip card action buttons (Recap, Invite, View, Share)
- Use `TRIP_CARD_ACTION_BUTTON_CONSUMER` for consumer TripCard
- Use `TRIP_CARD_ACTION_BUTTON_PRO_EVENT` for ProTripCard, EventCard, MobileEventCard
- **Demo mode parity**: Same components/styles for demo and authenticated modes—no gold/yellow/gradient on View or Recap
- All four buttons must match within each card type

## Implementation checklist for new tabs/subtabs
- [ ] Action row uses parity token from `tabParity.ts`
- [ ] Buttons use mapped `col-start` token (no hardcoded index strings)
- [ ] Buttons use `PARITY_ACTION_BUTTON_CLASS` (or explicit override with same dimensions)
- [ ] Desktop screenshot checked for vertical alignment under parent tabs
