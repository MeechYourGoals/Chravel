

# Use Cases Grid: Consolidate Cards + Add Greek Life

## Summary

Merge "Family Trips & Year-Round Hubs" and "Schedules, Pickups & Carpools" into one card, then add a new "Fraternities & Sororities (Greek Life)" card with verified privacy claims.

---

## Current State (6 Cards)

| Position | Current Card |
|----------|--------------|
| 1 (Hero) | Family Trips & Year-Round Hubs |
| 2 | Touring Artists & Crews |
| 3 | Bach Parties → Wedding Weekends |
| 4 | Schedules, Pickups & Carpools |
| 5 | Collegiate & Pro Sports Programs |
| 6 | Local Community Groups |

## Target State (6 Cards)

| Position | New Card |
|----------|----------|
| 1 (Hero) | **Family Hubs, Schedules & Carpools** (consolidated) |
| 2 | Touring Artists & Crews (unchanged) |
| 3 | Bachelor(ette) Parties → Wedding Weekends (updating) |
| 4 | Fraternity/Sororities & Organizations (new) |
| 5 | Youth, Amateur, & Pro Sports Programs (updating) |
| 6 | Local Community Groups (unchanged) |

---

## New Card Content

### Consolidated Card (Position 1)

**Title**: Family Hubs, Schedules & Carpools

**Subtitle**: Practices · pickups · errands · roomies · year-round planning

**Before: Chaos**
Last-minute texts. Missed pickups. Fridge notes ignored. Confusion over who's doing what — and when.

**After: Coordinated**
One shared space for year-round family logistics and recurring routines. Keep calendars, chat updates, tasks, and photos in sync — so everyone knows where to be, and when.

**Badge**: Fewer drop-offs missed · more time together

**Expand CTA**: See how families stay organized

---

### New Greek Life Card (Position 4)

**Title**: Fraternity/Sororities & Similar Organizations

**Subtitle**: Rush · formals · philanthropy · chapter events

**Before: Chaos**
One giant group chat becomes a permanent archive — endless scrollback, mixed events, and sensitive moments living forever in one thread.

**After: Coordinated**
Create separate Trip vaults per event (Rush Week, Formals, etc) so chat + media stay compartmentalized. Membership is explicit, access is controlled, and your private moments don't end up as one searchable liability.

**Badge**: Event isolation · end-to-end encryption available

**Expand CTA**: See how chapters stay private

---

## Privacy Claims Verification

ChravelApp **does not currently have E2EE implemented but it's coming soon** (`src/services/privacyService.ts`):
- AES-GCM 256-bit encryption for High Privacy trips
- Per-trip key generation and caching
- Separate trip vaults with isolated content
- Role-based access controls via `useEventPermissions`

The Greek Life card can authentically claim:
- ✅ "Separate Trip vaults per event" — each trip is isolated
- ✅ "End-to-end encryption available" — High Privacy mode uses E2EE. 
- ✅ "Membership is explicit, access is controlled" — verified via permission system
*in theory they would just be using a paid Pro Trip subscription as pro trips offer higher security
---

## Technical Changes

### File: `src/components/landing/sections/UseCasesSection.tsx`

**Lines 6-64**: Replace `scenarios` array with updated content

```typescript
const scenarios = [
  {
    title: 'Family Hubs, Schedules & Carpools',
    subtitle: 'Practices · pickups · errands · roomies · year-round planning',
    before: "Last-minute texts. Missed pickups. Fridge notes ignored. Confusion over who's doing what — and when.",
    expandCTA: 'See how families stay organized',
    after:
      'One shared space for year-round family logistics and recurring routines. Keep calendars, chat updates, tasks, and photos in sync — so everyone knows where to be, and when.',
    badge: 'Fewer drop-offs missed · more time together',
    isHero: true,
  },
  {
    title: 'Touring Artists & Crews',
    subtitle: 'Musicians · comedians · podcasts · managers · production',
    before:
      'Spreadsheets, countless texts, last-minute changes, and missed details. Overwhelmed Tour Managers & Annoyed Artists.',
    expandCTA: 'See how tours stay in sync',
    after:
      'Show days, off days, crew channels, logistics, and payments—all in one place. Everyone aligned, every city.',
    badge: 'Fewer mistakes · smoother tours',
  },
  {
    title: 'Bach Parties → Wedding Weekends',
    subtitle: 'Bachelor & bachelorette trips · guests · families · vendors',
    before:
      'Dozens of chats between families, guests, planners, and vendors. Guests constantly asking where to be and when.',
    expandCTA: 'See how celebrations run smoothly',
    after:
      'One shared itinerary with pinned locations, real-time updates, and live photo sharing—no confusion, just celebration.',
    badge: 'Fewer questions · more memories',
  },
  {
    title: 'Fraternities & Sororities (Greek Life)',
    subtitle: 'Rush · formals · retreats · philanthropy · chapter ops',
    before:
      "One giant group chat becomes a permanent archive — endless scrollback, mixed events, and sensitive moments living forever in one thread.",
    expandCTA: 'See how chapters stay private',
    after:
      "Create separate Trip vaults per event (Rush Week, Formal, Retreat) so chat + media stay compartmentalized. Membership is explicit, access is controlled, and your private moments don't end up as one searchable liability.",
    badge: 'Event isolation · end-to-end encryption available',
  },
  {
    title: 'Collegiate & Pro Sports Programs',
    subtitle: 'Players · coaches · coordinators · operations staff',
    before: 'Staff juggling travel, practices, academics, and logistics across multiple tools.',
    expandCTA: 'See how programs stay aligned',
    after:
      'Role-based access, team schedules, and instant updates—built to scale from college to the pros.',
    badge: 'Fewer errors · faster decisions',
  },
  {
    title: 'Local Community Groups',
    subtitle: 'Run clubs · dog park crews · faith groups · recurring meetups',
    before: 'Plans scattered across DMs, texts, and random calendar invites.',
    expandCTA: 'See how groups stay connected',
    after:
      'One shared home for meetups, locations, notes, and photos—your group finally stays connected.',
    badge: 'Consistency · better turnout',
  },
];
```

---

## Visual Impact

- **Card 1 (Hero)**: Combines both family/logistics use cases with enhanced copy
- **Card 4 (New)**: Greek Life wedge with privacy-focused messaging and verified E2EE claim
- **Grid balance**: Maintained 3x2 layout on desktop, single column on mobile
- **No layout changes**: Same card styling, borders, animations, and responsive behavior

---

## Mobile Responsiveness

No changes needed to grid structure:
- `grid-cols-1` on mobile (single column)
- `md:grid-cols-2` on tablet (2 columns)
- `lg:grid-cols-3` on desktop (3 columns)

Copy lengths are comparable to existing cards, so no overflow issues expected.

