

# Fix: Blank Screen Caused by Externalized Dependencies

## Root Cause

The blank screen is caused by a **fatal module loading error** that prevents React from mounting.

Three packages are listed as `external` in `vite.config.ts` (line 51):
```
external: ['@sentry/capacitor', '@sentry/react', 'posthog-js']
```

But these same packages are imported as **top-level static imports** in eagerly-loaded files:
- `posthog-js` in `src/telemetry/providers/posthog.ts` line 8 → imported by `src/telemetry/service.ts` line 21 → imported by `src/main.tsx`
- `@sentry/react` in `src/services/errorTracking.ts` line 22 → imported by `src/App.tsx` line 26

When Vite marks a package as `external`, it **excludes it from the bundle** and expects it to be available as a global at runtime. In a browser SPA, there is no such global — the import fails immediately, crashing the entire app before any React component renders.

This produces zero console logs, zero network requests, and a blank white screen — exactly matching the symptom.

## Fix Plan (2 files)

### 1. `vite.config.ts` — Remove problematic externals

Remove `posthog-js` and `@sentry/react` from the `external` array. Keep `@sentry/capacitor` external since it's only used on native platforms via lazy import.

Alternatively, remove the entire `external` array and let Vite bundle or tree-shake these packages naturally:

```
external: ['@sentry/capacitor']
```

This is the minimal, correct fix. These packages are in `package.json` as dependencies and should be bundled normally. If they're not installed, Vite will warn at build time rather than silently producing a broken bundle.

### 2. `index.html` — Update cache buster

Bump the cache buster comment to force a fresh preview build cycle.

## Why This Is Safe

- `posthog-js` and `@sentry/react` are already listed as dependencies in `package.json`
- They will be tree-shaken if unused or conditionally loaded
- The `optimizeDeps.exclude` array (line 100) already handles dev-server optimization separately
- No runtime behavior changes — this just ensures the packages are actually included in the bundle

## What NOT to Touch

- No changes to telemetry, error tracking, auth, routing, or provider code
- No Supabase, CORS, or edge function changes
- No env var changes needed

## Secondary Issue (Not Blocking Render)

The edge function `lovable-concierge` is crashing on boot because `SUPABASE_JWT_SECRET` is not set in Edge Function secrets. This doesn't block the frontend from loading but will cause AI concierge features to fail. You should add this secret in **Supabase Dashboard → Edge Functions → Secrets**.

