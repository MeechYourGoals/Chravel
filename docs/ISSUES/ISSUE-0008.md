# ISSUE-0008: SPA Fallback Routing Not Verified for Capacitor

**Severity:** Major
**Area:** Navigation
**Status:** Open

## Description

BrowserRouter expects all paths to serve `index.html`. Capacitor's built-in server does this by default for `webDir`, but this needs explicit verification for deep links and Universal Links.

## Fix Plan

1. Verify `capacitor.config.ts` server config (default is correct for SPA)
2. Test cold start to `/trip/:id` in simulator
3. Add `server` config if needed:
   ```ts
   server: {
     url: undefined, // uses local files
     cleartext: false,
   }
   ```

## Verification

- Kill app → tap push notification with deep link → app opens to correct trip
- Cold start to `/trip/some-id` → doesn't 404
