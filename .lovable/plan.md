# Onboarding Demo Screens: Match Real Chravel UI

## Problem

The current onboarding demos render generic "travel chat app" styling. The real Chravel UI has signature elements: top pill tab bar, Messages/Broadcasts segmented control, itinerary timeline with gold day circles, and rich AI concierge cards. None of these are present in the current demos.

## Architecture Decision

**Option B: Extract UI primitives from production code.** Real components are too coupled (hooks, Supabase, trip context). Instead, update `DemoPrimitives.tsx` with new mini-components that copy the exact class strings from production files. All tokens stay in `demoTokens.ts`.

**Folder restructure**: Move all onboarding demo internals into `src/components/onboarding/demo/` to prevent leakage into core UI:

```
src/components/onboarding/
├── OnboardingCarousel.tsx
├── OnboardingProgressDots.tsx
├── index.ts
├── demo/
│   ├── tokens.ts          (was demoTokens.ts)
│   ├── primitives.tsx      (was DemoPrimitives.tsx)
│   ├── PhoneFrame.tsx      (moved)
│   ├── useOnboardingLayout.ts (moved)
│   └── screens/
│       ├── ChatDemoScreen.tsx
│       ├── CalendarDemoScreen.tsx
│       ├── PaymentsTrackingDemoScreen.tsx
│       ├── WelcomeScreen.tsx
│       └── FinalCTAScreen.tsx
```

## Color Discipline Rule (enforced in tokens)


| Color                    | Usage                                                      |
| ------------------------ | ---------------------------------------------------------- |
| Gold (`bg-primary`)      | Selection indicators, itinerary day circles, CTA highlight |
| Orange (`bg-orange-500`) | Broadcast only                                             |
| Blue (`bg-blue-600`)     | "Messages" active segment, own chat bubble                 |
| Emerald/Cyan gradient    | Concierge avatar only                                      |
| White/10, White/20       | Pill backgrounds (inactive/active)                         |


## Changes Per File

### 1. `demo/tokens.ts` — Add production-matched tokens

Add tokens extracted from real source files:

- **TripTabs pill bar** (from `TripTabs.tsx:311-322`):
  - `pillActive: 'bg-white/20 text-white border border-white/30 shadow-sm'`
  - `pillInactive: 'bg-white/10 text-gray-300'`
  - `pillBar: 'flex items-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium text-sm'`
- **MessageTypeBar** (from `MessageTypeBar.tsx:57-88`):
  - `segmentBar: 'inline-flex items-center bg-neutral-900/70 backdrop-blur-md border border-white/10 rounded-xl p-0.5'`
  - `segmentMessages: 'bg-blue-600 text-white shadow-md'`
  - `segmentBroadcasts: 'bg-orange-500 text-white shadow-md'`
  - `segmentInactive: 'text-white/70'`
- **Itinerary** (from `ItineraryView.tsx:132-159`):
  - `itineraryCard: 'bg-slate-900/30 rounded-lg border border-slate-700/30 p-4'`
  - `itineraryDayCircle: 'w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold'`
  - `timelineDot: 'w-3 h-3 bg-primary rounded-full'`
  - `timelineConnector: 'w-0.5 h-8 bg-slate-600 mt-2'`
  - Category colors: `dining: 'bg-red-500/20 text-red-300'`, `activity: 'bg-green-500/20 text-green-300'`
- **Concierge avatar** (from `MessageRenderer.tsx:151`):
  - `conciergeAvatar: 'bg-gradient-to-r from-blue-500 to-emerald-500'` (not emerald-to-cyan)

### 2. `demo/primitives.tsx` — New primitives

**Replace** `DemoTabStrip` (bottom icon bar) with `DemoPillBar`:

- Renders 4-5 horizontal pills matching TripTabs styling
- Accepts `active` prop to highlight one pill
- Uses `layoutId` for sliding indicator animation

**Add `DemoSegmentedControl**`:

- Replicates `MessageTypeBar` exactly: Messages | Broadcasts
- Accepts `active: 'messages' | 'broadcasts'`
- Animated highlight slide between segments

**Add `DemoDayHeader**`:

- Gold circle with day number + date text (matches `ItineraryView.tsx:134-145`)

**Add `DemoTimelineEvent**`:

- Timeline dot + connector + event card (matches `ItineraryView.tsx:150-198`)
- Props: emoji, title, category, time, location

**Add `DemoConciergeCard**`:

- Rich card with: image placeholder (gradient rect), title, 2 bullet lines, link, "Save to Trip" button
- Concierge avatar uses real gradient (`from-blue-500 to-emerald-500` with "CA" text)

**Update `DemoBubble**`:

- `broadcast` variant adds a small `📢 Broadcast` pill above the orange bubble

### 3. `demo/PhoneFrame.tsx` — Top pills, no bottom bar

- Remove bottom `DemoTabStrip`
- Add `DemoPillBar` at top after status bar
- Show pills: Chat, Calendar, Concierge, Payments
- Active pill shifts per screen prop
- During AI cameo, briefly glow "Concierge" pill

### 4. `demo/screens/ChatDemoScreen.tsx` — Full rewrite

Animation sequence (~6s loop):

1. `0.5s` — `DemoSegmentedControl` shows with "Messages" active. First message slides in (Alex: "Found an amazing sushi spot")
2. `1.5s` — Own message slides in ("We're down! Let's lock it in 🙌")
3. `2.0s` — Animated highlight slides from "Messages" to "Broadcasts" segment
4. `2.3s` — Broadcast message appears with orange styling + `📢 Broadcast` pill fades in above it
5. `4.0s` — Reaction pops on first message
6. `5.5s` — Crossfade reset

### 5. `demo/screens/CalendarDemoScreen.tsx` — Itinerary timeline

Animation sequence (~6s loop):

1. `0.5s` — Day 1 header: gold "1" circle + "Friday, June 3" (using `DemoDayHeader`)
2. `1.0s` — `DemoTimelineEvent`: 🍽️ Dinner Reservation · `dining` badge · 7:30 PM · Sushi Saito
3. `1.8s` — `DemoTimelineEvent`: 🎯 Museum Visit · `activity` badge · 10:00 AM · National Art Museum
4. `2.5s` — Shared indicator: "👥 Shared with 4 Chravelers"
5. `3.5s` — AI Concierge cameo: `DemoConciergeCard` slides up from bottom with:
  - "CA" gradient avatar + user query "Best sushi near Shinjuku?"
  - Rich card: image area, "Sushi Saito", ⭐ 4.8, 2 bullet details, "Save to Trip" button
  - Concierge pill in top bar briefly glows
6. `4.8s` — "Save to Trip" pulses → changes to "✓ Saved to Explore" → `DemoToast` slides up
7. `5.5s` — Crossfade reset

### 6. `demo/screens/PaymentsTrackingDemoScreen.tsx` — Minor polish

- Use `itineraryCard` token for card styling (consistent with calendar screen)
- Add category badge (e.g., `dining`) on the expense card

### 7. `OnboardingCarousel.tsx` — Update imports

- Point to `demo/` folder paths
- Add subtitle to desktop right column: "Works on web + mobile." below each screen's subtitle

### 8. Cleanup

- Delete old top-level files: `demoTokens.ts`, `DemoPrimitives.tsx`, `PhoneFrame.tsx`, `useOnboardingLayout.ts`, and `screens/` directory
- Update `index.ts` exports

## Acceptance Criteria

1. Chat demo includes: top pill bar + MessageTypeBar segmented control + animated Messages→Broadcasts switch + broadcast label pill
2. Calendar demo includes: itinerary day circles (gold) + timeline connector line + category badges on events
3. AI cameo includes: gradient "CA" avatar + rich card (image block + bullets + link) + "Save to Trip" → "Saved to Explore" toast
4. Visual parity: radii, spacing, and typography match production components within one step (verified by comparing real `ItineraryView`, `MessageTypeBar`, `TripTabs` class strings against demo tokens)
5. No bottom icon tab bar anywhere — top pill bar only

## Files Summary


| File                                                                                             | Action                                    |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `src/components/onboarding/demo/tokens.ts`                                                       | Create (move + extend demoTokens.ts)      |
| `src/components/onboarding/demo/primitives.tsx`                                                  | Create (move + extend DemoPrimitives.tsx) |
| `src/components/onboarding/demo/PhoneFrame.tsx`                                                  | Create (move + rewrite: top pills)        |
| `src/components/onboarding/demo/useOnboardingLayout.ts`                                          | Create (move, unchanged)                  |
| `src/components/onboarding/demo/screens/ChatDemoScreen.tsx`                                      | Create (rewrite)                          |
| `src/components/onboarding/demo/screens/CalendarDemoScreen.tsx`                                  | Create (rewrite)                          |
| `src/components/onboarding/demo/screens/PaymentsTrackingDemoScreen.tsx`                          | Create (update)                           |
| `src/components/onboarding/demo/screens/WelcomeScreen.tsx`                                       | Create (move, unchanged)                  |
| `src/components/onboarding/demo/screens/FinalCTAScreen.tsx`                                      | Create (move, unchanged)                  |
| `src/components/onboarding/OnboardingCarousel.tsx`                                               | Update imports                            |
| `src/components/onboarding/index.ts`                                                             | Update exports                            |
| Old files (demoTokens.ts, DemoPrimitives.tsx, PhoneFrame.tsx, useOnboardingLayout.ts, screens/*) | Delete                                    |
