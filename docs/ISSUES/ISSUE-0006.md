# ISSUE-0006: Stripe Checkout window.open Won't Work in Native Webview

**Severity:** Major
**Area:** Payments
**Status:** Open

## Description

Stripe checkout uses `window.open(data.url, '_blank')` which is blocked in WKWebView.

## Affected Files

- `src/billing/providers/stripe.ts:97,142`

## Fix Plan

Use `@capacitor/browser` to open Stripe checkout URL in an in-app browser on native.
Configure Stripe return URL to use the app's Universal Link domain.

## Verification

- Initiate subscription purchase on native → Stripe checkout opens in-app browser
- Complete purchase → returns to app
