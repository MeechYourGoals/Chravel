

# Fix Build Error + Ensure Bulk Import Actually Deploys

## Root Cause

The bulk import changes from the previous update **never deployed** because a pre-existing build error in `web-push-send/index.ts` is blocking the entire build. That is why you are still seeing the old "4 / 20" sequential counter -- the app is running stale code.

## Changes (3 files)

### 1. Fix Build Error: `supabase/functions/web-push-send/index.ts`

The `paddedPayload` variable is a `Uint8Array` but Deno's strict typing requires an `ArrayBuffer` for `crypto.subtle.encrypt()`. The same pattern used for `cek` and `nonce` (`.buffer.slice(...)`) needs to be applied here.

**Line 362**: Convert `paddedPayload` to `ArrayBuffer` before passing to encrypt:

```typescript
const paddedPayloadBuffer = paddedPayload.buffer.slice(
  paddedPayload.byteOffset,
  paddedPayload.byteOffset + paddedPayload.byteLength
) as ArrayBuffer;

const encryptedRecord = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: nonceBuffer },
  cekKey,
  paddedPayloadBuffer  // was: paddedPayload
);
```

### 2. Speed Up Caching: `src/services/calendarService.ts`

The sequential caching loop in `bulkCreateEvents` (lines 607-614) awaits each IndexedDB write one at a time. For 20 events that adds unnecessary latency. Replace with `Promise.all` for parallel caching:

```typescript
// Before (sequential - slow):
for (const event of data) {
  await offlineSyncService.cacheEntity(...);
}

// After (parallel - fast):
await Promise.all(
  data.map(event =>
    offlineSyncService.cacheEntity(
      'calendar_event', event.id, event.trip_id, event, event.version || 1
    ).catch(() => {}) // best-effort, don't block on cache failures
  )
);
```

Also simplify the redundant super admin branch (lines 576-580) where both if/else do the same thing.

### 3. Remove Dead Code: `src/features/calendar/components/ICSImportModal.tsx`

This file is the OLD import modal with the sequential "4 / 20" loop. It is not imported anywhere in the codebase (all references use `CalendarImportModal`). Deleting it removes confusion and dead code.

## Result

Once the build error is fixed, the new bulk import code will deploy. Imports will go from 30-60+ seconds (sequential) to 1-3 seconds (single Supabase insert). The user will see "Importing 20 events... This should only take a moment" instead of "4 / 20".

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/web-push-send/index.ts` | Fix `Uint8Array` to `ArrayBuffer` conversion for `paddedPayload` (1 line) |
| `src/services/calendarService.ts` | Parallelize caching loop with `Promise.all`, simplify admin branch |
| `src/features/calendar/components/ICSImportModal.tsx` | Delete (dead code, not imported anywhere) |

