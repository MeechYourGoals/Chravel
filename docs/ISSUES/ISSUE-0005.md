# ISSUE-0005: mailto/sms Links Need Capacitor Intent Handling

**Severity:** Major
**Area:** Native
**Status:** Open

## Description

`window.open('mailto:...')` and `window.open('sms:...')` may not work in Capacitor WKWebView. Need to use native intent handling.

## Affected Files

- `src/hooks/useInviteLink.ts:290,297,355,364`

## Fix Plan

Use `@capacitor/app` `openUrl` for protocol handlers on native platform.

## Verification

- Share invite via email from native app → opens mail composer
- Share invite via SMS from native app → opens messages
