---
name: chravel-mobile-pwa-parity
description: Audit Chravel's mobile web and PWA experience for parity with desktop. Covers feature availability, touch ergonomics, layout density, and platform-specific behavior. Use when checking mobile experience or debugging mobile-specific issues. Triggers on "mobile parity", "PWA issue", "does this work on mobile", "mobile layout broken", "touch targets".
---

# Chravel Mobile / PWA Parity Audit

Ensure Chravel's mobile experience is first-class, not a squeezed-down desktop.

## Chravel Mobile Architecture

### Page Pairs (Desktop / Mobile)
- `TripDetail.tsx` / `MobileTripDetail.tsx`
- `ProTripDetail.tsx` / `MobileProTripDetail.tsx`
- `EventDetail.tsx` / `MobileEventDetail.tsx`
- Shared components in `src/components/mobile/`

### Mobile-Specific Hooks
- `src/hooks/use-mobile.tsx` — Mobile detection
- Mobile-responsive components throughout `src/components/`

### PWA Concerns
- Service worker registration
- Install prompts
- Offline-capable patterns
- Push notifications

## Critical Parity Paths

### 1. Trip Experience
- Trip discovery / join flow
- Trip detail tabs (Chat, Calendar, Places, Tasks, Polls, Media, Payments)
- Trip creation and editing
- AI Concierge interaction

### 2. Chat & Messaging
- Message composition and sending
- Media attachments
- Channel switching
- Realtime updates

### 3. Calendar & Events
- Event creation and RSVP
- Calendar view navigation
- Event detail and editing

### 4. Payments
- Payment requests and splits
- Balance summaries
- RevenueCat entitlement display

### 5. AI Features
- Smart Import flow
- AI Concierge chat
- Gemini Live voice interaction

## Audit Checklist

- [ ] All desktop features accessible on mobile
- [ ] Touch targets >= 44px
- [ ] Destructive actions not adjacent to primary actions
- [ ] Bottom sheets used appropriately (not desktop modals)
- [ ] No horizontal overflow or layout breakage
- [ ] Loading states visible and not hiding broken states
- [ ] Empty states show guidance, not dead space
- [ ] Confirmation feedback visible on mobile
- [ ] Back navigation works correctly
- [ ] Forms usable with mobile keyboard

## Output

- Parity status: First-class / Partially degraded / Lagging
- Top parity failures with severity and fix recommendations
- Intentional vs accidental differences
