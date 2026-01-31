# ISSUE-0003: window.open Calls Blocked in iOS WKWebView

**Severity:** Blocker
**Area:** Native
**Status:** Open

## Description

`window.open('url', '_blank')` is blocked or unreliable in iOS WKWebView (Capacitor). External links, Stripe checkout, and media previews won't open.

## Repro Steps

1. Open app in Capacitor iOS simulator
2. Click a link that uses `window.open` (e.g., external file link in FilesTab)
3. Nothing happens

## Expected

External URL opens in an in-app browser or system browser.

## Actual

Nothing happens. `window.open` returns `null` in WKWebView.

## Affected Files

- `src/billing/providers/stripe.ts:97,142` — Stripe checkout
- `src/features/chat/components/MessageRenderer.tsx:36,39` — Media preview
- `src/components/FilesTab.tsx:224` — File deeplink
- `src/components/MediaSubTabs.tsx:331,392` — Media deeplink
- `src/components/SetBasecampSquare.tsx:211` — Maps URL
- `src/components/AIConciergeChat.tsx:490` — Upgrade URL

## Fix Plan

1. Install `@capacitor/browser` if not present: `npm install @capacitor/browser`
2. Create `src/utils/openUrl.ts`:
   ```typescript
   import { Capacitor } from '@capacitor/core';
   import { Browser } from '@capacitor/browser';

   export async function openUrl(url: string): Promise<void> {
     if (Capacitor.isNativePlatform()) {
       await Browser.open({ url });
     } else {
       window.open(url, '_blank');
     }
   }
   ```
3. Replace all `window.open(url, '_blank')` with `openUrl(url)`

## Tests

```bash
grep -rn "window.open" src/ --include='*.tsx' --include='*.ts' | grep -v node_modules
# After fix: only mailto/sms protocol handlers should remain
```
