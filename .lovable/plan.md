

# Onboarding Redesign: Premium Animated Product Tour (Final Revised Plan)

## What Changes From Previous Plan

Six concrete upgrades based on review feedback:

1. **Semantic tokens mapped to real CSS variables** — no guessed Tailwind colors
2. **Three layout modes** (mobile/tablet/desktop) via `useOnboardingLayout` — not just `useIsMobile()`
3. **DemoTabStrip** inside PhoneFrame showing active tab per screen
4. **AI cameo with "Saved" action animation** — not just a static chip
5. **Demo UI primitives** (DemoBubble, DemoCard, DemoChip, DemoAvatar) — reusable across screens
6. **CTA: subtle gold shimmer** replaces childish confetti

---

## Architecture

### 1. Shared Token System (`demoTokens.ts`)

Maps directly to the app's CSS variables from `src/index.css`:

```text
chatBubbleOwn     → 'bg-[hsl(var(--chat-bubble-own))]'          // #007AFF iMessage blue
chatBubbleOther   → 'bg-muted/80 text-white'                     // exact from MessageBubble.tsx:391
broadcastBg       → 'bg-orange-500 text-white'                   // exact from MessageBubble.tsx:393
cardBg            → 'bg-card border border-border'               // exact from EventItem.tsx:24
paymentCardOwed   → 'bg-card/50 border-border'                   // exact from PaymentCard:686
paymentCardSettled→ 'bg-green-500/5 border-green-500/20'         // exact from PaymentCard:685
conciergeAvatar   → 'bg-gradient-to-r from-blue-500 to-emerald-500'  // from MessageRenderer.tsx:151
primaryGold       → 'bg-[hsl(var(--primary))]'                   // --primary: 38 61% 48%
```

Motion presets: `{ duration: 0.3, ease: 'easeOut' }` — all slides use `y: 12→0, opacity: 0→1`. No springs.

### 2. Demo UI Primitives (`DemoPrimitives.tsx`)

Small, zero-dependency building blocks:

- **DemoAvatar** — colored circle with initial letter (mirrors real `Avatar` + `AvatarFallback`)
- **DemoBubble** — chat message with variant: `own | other | broadcast` (uses token classes from above)
- **DemoCard** — rounded card matching `EventItem` / `PaymentCard` styling
- **DemoChip** — small status pill (Pending/Settled/Saved)
- **DemoToast** — floating mini-toast for "Saved ✓" animation

### 3. PhoneFrame Wrapper (`PhoneFrame.tsx`)

- Glassy border: `border border-white/10 rounded-[2rem]`
- Inner shadow + drop shadow for depth
- Dark gradient background matching `--background: 0 0% 0%`
- Status bar strip at top (time + battery dots — purely decorative)
- **DemoTabStrip** at bottom: 4 tabs (`Chat | Calendar | Payments | AI`) with active tab highlighted per screen via prop

### 4. Layout Hook (`useOnboardingLayout.ts`)

Returns `'mobile' | 'tablet' | 'desktop'`:
- **Mobile**: `width < 640` — full-bleed, no phone frame, swipe-only
- **Tablet**: `640 ≤ width < 1024` — phone frame centered, swipe + buttons
- **Desktop**: `width ≥ 1024` — two-column layout (left: phone animation, right: headline + copy + progress + buttons)

This is separate from `useIsMobile()` which serves the rest of the app.

---

## Screen Structure (5 total)

### Screen 0: WelcomeScreen (minor update)
- Keep morphing icons, no structural changes
- Verify icons match app tab bar icons (they use Luggage/Map/MessageCircle which is fine)

### Screen 1: ChatDemoScreen
**Hero: Communication**
- DemoTabStrip active: `Chat`
- Headline (desktop): "One trip. One chat."
- Subline: "Messages, broadcasts, and reactions — all in your trip."

Animation (~6s loop, crossfade reset):
- 0.5s — `DemoBubble variant="other"`: avatar "A" Alex — "Found an amazing sushi spot near the hotel"
- 1.5s — `DemoBubble variant="own"`: "I'm in! Book it 🙌"
- 2.5s — `DemoBubble variant="broadcast"`: "📢 Dinner reservation added to calendar"
- 4.0s — Small emoji reaction pops on first message (scale 0→1)
- 5.5s — crossfade opacity 0→1 reset

### Screen 2: CalendarDemoScreen
**Hero: Scheduling**
- DemoTabStrip active: `Calendar`
- Headline: "Plans that don't drift."
- Subline: "Shared calendar with AI-powered suggestions."

Animation (~6s loop):
- 0.5s — `DemoCard`: 🍽️ Dinner Reservation · 7:30 PM (matches EventItem styling)
- 1.5s — `DemoCard`: 🎯 Museum Visit · 10:00 AM
- 2.5s — `👥 4 travelers` shared badge glows
- 3.5s — **AI cameo overlay**: floating card appears bottom-right
  - User query bubble: "Best sushi near Shinjuku?"
  - AI response: "Sushi Saito · ⭐ 4.8" with concierge avatar gradient
  - `DemoChip` "Save to Trip" appears → tap pulse animation → transforms to `DemoToast` "Saved ✓" that slides up and fades
- 5.5s — crossfade reset

### Screen 3: PaymentsTrackingDemoScreen
**Hero: Money**
- DemoTabStrip active: `Payments`
- Headline: "Money, organized."
- Subline: "Track expenses, split bills, settle up."

Animation (~6s loop):
- 0.5s — `DemoCard` (PaymentCard style): "Dinner — $240" with DemoAvatar "A" + "Paid by Alex"
- 1.5s — Split detail: 4 small DemoAvatars with "$60 each"
- 2.5s — Status chips animate: `DemoChip variant="pending"` (yellow) on 2, `DemoChip variant="settled"` (green) on 1
- 3.5s — One pending chip toggles to settled (green) with checkmark
- 5.5s — crossfade reset

### Screen 4: FinalCTAScreen (updated)
- Remove confetti entirely. Replace with subtle gold shimmer/particle drift behind CTA area using CSS radial gradient animation (lightweight, no canvas-confetti dependency)
- Add merged invite copy: "One link. Everyone's in." as subtitle
- Sharper headline: "Spin up your first trip in 30 seconds."
- Primary CTA: "Create Your First Trip"
- Secondary CTA: "Explore Demo Trip"

---

## Files

| File | Action |
|------|--------|
| `src/components/onboarding/demoTokens.ts` | **Create** — CSS-var-mapped tokens + motion presets |
| `src/components/onboarding/DemoPrimitives.tsx` | **Create** — DemoAvatar, DemoBubble, DemoCard, DemoChip, DemoToast |
| `src/components/onboarding/PhoneFrame.tsx` | **Create** — glassy wrapper + DemoTabStrip |
| `src/components/onboarding/useOnboardingLayout.ts` | **Create** — mobile/tablet/desktop hook |
| `src/components/onboarding/screens/ChatDemoScreen.tsx` | **Create** |
| `src/components/onboarding/screens/CalendarDemoScreen.tsx` | **Create** — includes AI cameo |
| `src/components/onboarding/screens/PaymentsTrackingDemoScreen.tsx` | **Create** |
| `src/components/onboarding/OnboardingCarousel.tsx` | **Update** — 5 screens, two-column desktop, layout modes |
| `src/components/onboarding/screens/FinalCTAScreen.tsx` | **Update** — gold shimmer, invite copy, sharper headline |
| `src/components/onboarding/screens/WelcomeScreen.tsx` | **Keep** (minor icon check) |
| `src/components/onboarding/screens/FeatureReelScreen.tsx` | **Delete** |
| `src/components/onboarding/screens/InviteCrewScreen.tsx` | **Delete** |
| `src/components/onboarding/index.ts` | **Update** — fix exports |

---

## Key Technical Details

**Desktop two-column layout** in OnboardingCarousel:
```text
┌──────────────────────────────────────────────┐
│  ┌─────────────┐    One trip. One chat.      │
│  │  PhoneFrame  │    Messages, broadcasts...  │
│  │  (animated)  │                             │
│  │             │    ● ○ ○ ○ ○   progress     │
│  │             │    [Continue]   Skip →       │
│  └─────────────┘                             │
└──────────────────────────────────────────────┘
```

**DemoTabStrip** inside PhoneFrame bottom:
```text
[ Chat | Calendar | Payments | ✨ AI ]
   ^^^
   active = gold underline, others = muted
```

Active tab shifts per screen with a subtle sliding indicator animation.

**AI Cameo "Save to Trip" sequence** (CalendarDemoScreen):
1. Card appears (slide up 12px + fade)
2. "Save to Trip" chip pulses once (scale 1→1.05→1)
3. Chip transforms: text changes to "Saved ✓", bg changes to green
4. Mini DemoToast slides up from chip position and fades out
5. Entire cameo fades out

This makes the AI feel like a real workflow action, not decoration.

