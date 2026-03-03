

# Fix: Build Errors + Trip Deletion Failure

## Issues Identified

There are **4 distinct build errors** preventing the app from deploying correctly. The trip deletion failure ("Failed to remove trip") is likely a downstream consequence of these build errors preventing fresh deploys, but I'll also verify the deletion logic itself.

### Build Error 1: Missing `functionExecutorTypes.ts`
**File**: `supabase/functions/_shared/functionExecutor.ts` line 1
**Problem**: Imports `LocationContext` from `./functionExecutorTypes.ts` which doesn't exist.
**Fix**: Create `supabase/functions/_shared/functionExecutorTypes.ts` exporting the `LocationContext` interface (used as `{ lat?: number; lng?: number }` based on usage in `execute-concierge-tool/index.ts`).

### Build Error 2: Duplicate `idempotency_key` properties in `functionExecutor.ts`
**File**: `supabase/functions/_shared/functionExecutor.ts` lines 118-120 and 166-168
**Problem**: Object literals have `idempotency_key` defined twice in both the `createTask` and `createPoll` insert objects.
**Fix**: Remove the duplicate `idempotency_key` line in each insert block.

### Build Error 3: Duplicate `idempotency_key` in tool schema definition
**File**: `supabase/functions/lovable-concierge/index.ts` line 1258
**Problem**: The `createTask` tool schema has `idempotency_key` defined twice in `properties`.
**Fix**: Remove the duplicate property definition, keep only one.

### Build Error 4: Missing `errorTracking` import in calendar hook
**File**: `src/features/calendar/hooks/useCalendarManagement.ts` lines 57, 73, 94
**Problem**: `errorTracking` is used but never imported.
**Fix**: Add `import { errorTracking } from '@/utils/errorTracking';` at the top of the file.

### Build Error 5: Duplicate `vi` in test file
**File**: `src/services/__tests__/calendarService.integration.test.ts` line 1 and 8
**Problem**: `vi` imported/declared twice.
**Fix**: Remove the duplicate declaration.

---

## Trip Deletion Analysis

The `deleteTripForMe` function in `archiveService.ts` and the RLS policies on `trip_members` both look correct:
- "Users can leave trips" DELETE policy: `auth.uid() = user_id` ✓
- SELECT policies allow membership check ✓
- No FK constraints block deletion ✓

The deletion failure is most likely caused by the **build errors above preventing a clean deploy**. Once these are fixed, trip deletion should work. If it still fails after fixing builds, we'll add console logging to capture the specific Supabase error.

## Changes Summary

| # | File | Change |
|---|------|--------|
| 1 | `supabase/functions/_shared/functionExecutorTypes.ts` | Create with `LocationContext` type |
| 2 | `supabase/functions/_shared/functionExecutor.ts` | Remove 2 duplicate `idempotency_key` lines |
| 3 | `supabase/functions/lovable-concierge/index.ts` | Remove duplicate `idempotency_key` property in schema |
| 4 | `src/features/calendar/hooks/useCalendarManagement.ts` | Add missing `errorTracking` import |
| 5 | `src/services/__tests__/calendarService.integration.test.ts` | Remove duplicate `vi` declaration |

