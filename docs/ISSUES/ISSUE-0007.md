# ISSUE-0007: CSP Meta Tag Doesn't Allow Capacitor Scheme

**Severity:** Major
**Area:** Native
**Status:** Open

## Description

The Content-Security-Policy in `index.html` uses `default-src 'self'` which resolves to `https://` on web. In Capacitor, the app is served from `capacitor://localhost` (iOS). Resources may be blocked.

## Affected Files

- `index.html:21` — CSP meta tag

## Fix Plan

Add `capacitor:` and `ionic:` to relevant CSP directives, or use a more permissive CSP for native builds via build-time replacement.

## Verification

- Run app in Capacitor iOS simulator
- Open browser DevTools → no CSP violations in console
