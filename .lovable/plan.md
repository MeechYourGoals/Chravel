

# Fix: Build Error in PostHog Provider

## Root Cause
`posthog.shutdown()` does not exist in the `posthog-js` API. This causes a TypeScript build error that prevents the entire app from loading.

## Fix
Replace `posthog.shutdown()` with a no-op (just reset the ready flag). The posthog-js SDK doesn't expose a shutdown/destroy method — it auto-manages its lifecycle. We already have `reset()` as a separate method for clearing identity.

## Change
**File:** `src/telemetry/providers/posthog.ts` (line 82)
- Remove `posthog.shutdown();`
- Keep the `this.ready = false;` flag so the provider stops tracking

One line change. Build will pass, preview will load.

