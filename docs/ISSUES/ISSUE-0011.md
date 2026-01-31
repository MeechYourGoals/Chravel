# ISSUE-0011: Mobile Viewport Projects Commented Out in Playwright Config

**Severity:** Minor
**Area:** Testing
**Status:** FIXED

## Description

Mobile Chrome and Mobile Safari Playwright projects were commented out, meaning no mobile viewport E2E tests were running.

## Fix Applied

Uncommented both projects in `playwright.config.ts`. Added `e2e/specs/pwa/mobile-viewport.spec.ts` with 6 mobile-specific tests.
