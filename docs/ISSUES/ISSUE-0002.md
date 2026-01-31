# ISSUE-0002: window.location.href Used for In-App Navigation

**Severity:** Blocker
**Area:** Navigation / Native
**Status:** Open

## Description

Multiple components use `window.location.href = '/path'` for navigation. In Capacitor's WKWebView, this causes a full webview reload, losing all React state, auth session, and causing visible flicker.

## Repro Steps

1. Open app in Capacitor iOS simulator
2. Navigate to a trip
3. Click "View Plans" toast action (ArchivedTripsSection) or upgrade CTA
4. Observe full page reload instead of smooth SPA transition

## Expected

Smooth client-side navigation via React Router.

## Actual

Full page reload, state lost, possible auth re-hydration delay.

## Root Cause

Components use `window.location.href` directly instead of `useNavigate()` from React Router.

## Affected Files

- `src/components/ArchivedTripsSection.tsx:148` — `window.location.href = '/settings'`
- `src/components/AIConciergeChat.tsx:549,556,611` — `window.location.href = upgradeUrl`
- `src/components/TripCard.tsx:208` — `window.location.href = '/settings'`
- `src/components/CreateTripModal.tsx:282` — `window.location.href = '/settings'`
- `src/components/payments/PaymentsTab.tsx:443` — `window.location.href = '/settings?tab=subscription'`
- `src/components/SmartTripDiscovery.tsx:229` — `window.location.href = rec.deepLink`
- `src/components/conversion/PricingSection.tsx:139` — `window.location.href = 'mailto:...'`

**Exceptions (OK to keep):**
- `src/hooks/useAuth.tsx:808,812` — OAuth redirect (must use window.location for external URL)
- `src/hooks/useAuth.tsx:930` — Post-logout redirect (acceptable)

## Fix Plan

For each file:
1. Import `useNavigate` from `react-router-dom`
2. Replace `window.location.href = '/path'` with `navigate('/path')`
3. For components inside callbacks that can't use hooks, lift `navigate` to parent

## Tests

```bash
grep -rn 'window.location.href' src/components/ --include='*.tsx'
# Should return 0 results for in-app paths
```

## Verification

- `npm run typecheck` passes
- `npm run build` passes
- Navigate to settings from trip card → smooth transition, no reload
