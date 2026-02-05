# Chravel — E2E Test Plan

> Last updated: 2026-02-05 (automated audit)

## Overview

Playwright E2E tests cover critical user paths. Tests are designed to run:
- Locally against dev server (`npm run dev`)
- In CI against preview build (`npm run build && npm run preview`)

## Running Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Run all E2E tests
npm run test:e2e

# Run with UI for debugging
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/specs/smoke.spec.ts
```

## Test Strategy

### Data Strategy
- Tests use the **demo mode** — `VITE_ENABLE_DEMO_MODE=true` seeds deterministic mock data
- Demo data includes pre-built trips, events, channels, and chat messages
- No real Supabase connection needed for smoke tests (mock data service)
- For full integration tests, a test Supabase project with seeded data is required

### Selectors
- All tests use `data-testid` selectors where possible
- Fallback to accessible roles (`getByRole`, `getByText`, `getByPlaceholder`)
- New `data-testid` attributes added where missing for testability

---

## Critical Path Tests (12 minimum)

### 1. App Loads and Renders (`smoke.spec.ts`)
- Navigate to `/`
- Verify the app shell renders (no blank screen)
- Verify no console errors on initial load
- Verify navigation elements are present

### 2. Auth: Sign In Flow (`auth.spec.ts`)
- Navigate to `/auth`
- Verify sign-in form renders with email/password fields
- Verify OAuth buttons render when enabled
- Verify form validation (empty fields, invalid email)

### 3. Demo Mode Entry (`demo.spec.ts`)
- Navigate to `/demo`
- Verify demo entry page loads
- Navigate to a demo trip
- Verify trip detail page renders without "Trip Not Found"

### 4. Trip Detail: Navigation Tabs (`trip-detail.spec.ts`)
- Open a demo trip
- Verify all main tabs are present (Chat, Calendar, Tasks, etc.)
- Click each tab and verify content area changes
- Verify no blank screens or errors on tab switch

### 5. Chat: Message Display (`chat.spec.ts`)
- Open trip chat tab
- Verify message list renders
- Verify message bubbles have content
- Verify chat input is present and functional

### 6. Calendar: Event Display (`calendar.spec.ts`)
- Open trip calendar tab
- Verify calendar view renders
- Verify events are displayed
- Verify event detail modal opens on click

### 7. Tasks: Display and Interaction (`tasks.spec.ts`)
- Open trip tasks tab
- Verify task list renders
- Verify task items are present
- Verify checkbox interaction works

### 8. Polls: Display and Voting (`polls.spec.ts`)
- Open trip polls section
- Verify poll renders with options
- Verify vote interaction
- Verify results display

### 9. Settings: Page Load and Navigation (`settings.spec.ts`)
- Navigate to `/settings`
- Verify settings sections render
- Verify notification preference toggles
- Verify theme toggle works

### 10. Invite Link: Join Flow (`invite.spec.ts`)
- Navigate to `/join/test-token`
- Verify join page renders (even if token invalid, page should load)
- Verify proper error handling for invalid tokens
- Verify redirect behavior

### 11. Pro Trip: Team Tab (`pro-trip.spec.ts`)
- Navigate to a pro trip route
- Verify pro trip detail loads
- Verify team tab is accessible
- Verify role display

### 12. Offline Resilience (`offline.spec.ts`)
- Load the app
- Simulate offline mode
- Verify offline indicator appears
- Verify cached content still accessible
- Restore online mode and verify recovery

### 13. PDF Export: Trigger (`pdf-export.spec.ts`)
- Open trip detail
- Trigger PDF export action
- Verify export starts (button state change, loading indicator)
- Verify no console errors during export

### 14. PWA Manifest Validation (`pwa.spec.ts`)
- Fetch `/manifest.json`
- Validate required fields (name, icons, display, start_url)
- Verify icons are accessible
- Verify service worker registration

### 15. Health Check (`healthz.spec.ts`)
- Navigate to `/healthz`
- Verify build info renders
- Verify no errors

---

## Manual QA Scripts (for features needing real backend)

### Media Upload (requires Supabase Storage)
1. Sign in with test account
2. Open a trip
3. Navigate to media/chat
4. Upload a small image (<1MB)
5. Verify thumbnail appears
6. Verify full-size view works

### Payments (requires Stripe)
1. Enable `VITE_ENABLE_STRIPE_PAYMENTS=true`
2. Sign in and open a trip
3. Navigate to payments tab
4. Create a payment split
5. Verify Stripe checkout flow

### AI Concierge (requires LOVABLE_API_KEY)
1. Enable `VITE_ENABLE_AI_CONCIERGE=true`
2. Open a trip
3. Open AI Concierge
4. Ask a question about the trip
5. Verify response renders

### Push Notifications (requires VAPID + APNS)
1. Enable push notifications
2. Grant notification permission
3. Trigger a notification (e.g., chat message from another user)
4. Verify notification appears

---

## CI Configuration

Tests run in GitHub Actions with:
- Chromium headless
- 2 retries on failure
- Trace + screenshot on first retry
- HTML report + JUnit XML output

```yaml
# .github/workflows/e2e.yml
- name: E2E Tests
  run: |
    npx playwright install chromium
    npm run test:e2e
  env:
    CI: true
    VITE_ENABLE_DEMO_MODE: true
```
