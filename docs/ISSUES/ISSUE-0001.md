# ISSUE-0001: Main Bundle Exceeds 1MB

**Severity:** Blocker
**Area:** Performance
**Status:** Open

## Description

The main `index-*.js` chunk is 1,009 kB (275 kB gzip). While gzip size is acceptable, the raw size triggers Vite's chunk size warning and may cause slow first-paint on low-end devices or throttled connections.

## Repro Steps

1. Run `npm run build`
2. Observe output: `dist/assets/js/index-*.js  1,009.70 kB`

## Expected

No single chunk exceeds 500 kB uncompressed.

## Actual

Main index chunk is 1,009 kB.

## Root Cause

Large dependencies bundled into the main chunk instead of being code-split. Likely candidates: Supabase client, UI component library, utility functions.

## Fix Plan

1. Review `vite.config.ts` `manualChunks` configuration
2. Move heavy deps (recharts, jspdf, xlsx) to separate lazy chunks
3. Verify they are only imported via `lazy()` routes

## Tests

- Build output assertion: `npm run build 2>&1 | grep 'index-' | awk '{print $2}'` should be < 500

## Verification

```bash
npm run build
# Confirm no chunk exceeds 500kB (except vendor chunks)
```
