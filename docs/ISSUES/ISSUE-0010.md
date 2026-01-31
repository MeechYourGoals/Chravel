# ISSUE-0010: Deprecated bundledWebRuntime in Capacitor Config

**Severity:** Minor
**Area:** Config
**Status:** Open

## Description

`capacitor.config.ts` contains `bundledWebRuntime: false` which was deprecated in Capacitor 5 and removed in Capacitor 6+.

## Fix Plan

Remove the `bundledWebRuntime` line from `capacitor.config.ts`.

## Verification

- `npm run cap:sync` succeeds without warnings
