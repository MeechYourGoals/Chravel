# Regression Checklist — Chravel

Use this checklist before every release / PR merge. Automated where possible.

---

## Pre-Merge Automated Checks

- [ ] `npm run typecheck` passes
- [ ] `npm run lint:check` passes
- [ ] `npm run build` succeeds (< 60s)
- [ ] `npm run test:run` (Vitest unit tests pass)
- [ ] `npx playwright test e2e/specs/smoke/` (smoke E2E green)
- [ ] `npx playwright test` (full E2E green on chromium)

---

## Auth Flows

- [ ] Email signup creates account and redirects to home
- [ ] Email login works, session persists on refresh
- [ ] Google OAuth button (if enabled) initiates OAuth flow
- [ ] Logout clears session, redirects to landing/auth
- [ ] Expired token triggers silent refresh (no user-facing error)
- [ ] Corrupted token triggers sign-out gracefully

---

## Trip Lifecycle (Consumer)

- [ ] Create trip → appears in trip list
- [ ] Open own trip → loads (no "Trip not found")
- [ ] Refresh inside trip → still loads (no race condition)
- [ ] Non-existent trip UUID → shows error state (not blank)
- [ ] Non-member opens trip link → invite/preview flow
- [ ] Generate invite link → share → accept in incognito
- [ ] Archive trip → disappears from main list → appears in archive
- [ ] Unarchive trip → returns to main list

---

## Trip Tabs

- [ ] Chat: send text message, appears for all members
- [ ] Chat: media attachment upload + display
- [ ] Calendar: create event → appears in agenda
- [ ] Calendar: edit event → changes persist
- [ ] Calendar: delete event → removed from agenda
- [ ] Tasks: create task → appears in list
- [ ] Tasks: assign to member → assignee sees it
- [ ] Tasks: complete task → shows completed state
- [ ] Polls: create poll → vote → see results
- [ ] Places: add link/place → appears in list
- [ ] Media: upload photo → appears in gallery
- [ ] Media: delete photo → removed (with permission check)

---

## Pro Trips

- [ ] Pro trip detail page loads (`/tour/pro/:id`)
- [ ] Legacy URL `/tour/pro-:id` redirects correctly
- [ ] Team tab loads (if applicable)
- [ ] Channels: create, post, view
- [ ] Broadcasts: send to segment
- [ ] Travel wallet: add transaction, persists on refresh

---

## AI Concierge

- [ ] Open concierge → no user-facing error toasts
- [ ] If embeddings fail → graceful fallback (no "zero embeddings" toast)
- [ ] Streaming response renders progressively
- [ ] Subscription gate works (shows upgrade if not subscribed)

---

## Payments / Subscription

- [ ] Subscription status shown correctly in settings
- [ ] Upgrade flow initiates (RevenueCat on native, Stripe on web)
- [ ] Payment wall gates are correct per tier

---

## PWA + Mobile

- [ ] No horizontal overflow on iPhone viewport (390x844)
- [ ] Safe area insets respected (no content under notch)
- [ ] Keyboard doesn't cover input fields
- [ ] Bottom nav doesn't overlap with iOS home indicator
- [ ] Offline: app doesn't crash, shows offline indicator
- [ ] SPA routing works after deep link / refresh

---

## Performance

- [ ] Homepage loads in < 3s on 4G throttle
- [ ] Trip detail opens in < 2s
- [ ] Chat scroll is smooth (no jank)
- [ ] Main bundle < 500 kB gzip (currently 275 kB — OK)
- [ ] No unnecessary re-renders on idle

---

## Capacitor / Native

- [ ] `npm run cap:sync` succeeds
- [ ] App opens in iOS simulator
- [ ] Deep links route correctly in native shell
- [ ] Push notification taps navigate to correct screen
- [ ] Camera/photo picker works for media upload
- [ ] Share sheet works for invite links
