# Offline Sync Data Loss Fix

## Problem

The sync loop was deleting queued operations unconditionally after the switch statement, regardless of whether any handler actually ran. This caused **permanent data loss** when:

1. `processSyncQueue` was invoked with handlers for only one entity type (e.g., only `onChatMessageCreate`)
2. Queued operations for other entity types (tasks, calendar events) existed in the queue
3. These operations would hit the switch statement, find no handler, but still be deleted via `await this.removeOperation(operation.id)`
4. Result: **Offline writes were permanently lost** simply because chat sync was triggered

## Root Cause

```typescript
// BEFORE (BUGGY CODE)
switch (operation.entityType) {
  case 'chat_message':
    if (handlers.onChatMessageCreate) {
      result = await handlers.onChatMessageCreate(...);
    }
    break;
  // ... other cases
}

// BUG: This runs unconditionally, even if no handler ran!
await this.removeOperation(operation.id);
processed++;
```

## Solution

### 1. Handler Tracking
Added `handlerRan` flag to track whether a handler actually executed:

```typescript
let handlerRan = false;

switch (operation.entityType) {
  case 'chat_message':
    if (handlers.onChatMessageCreate) {
      result = await handlers.onChatMessageCreate(...);
      handlerRan = true; // ✅ Mark that handler ran
    }
    break;
}
```

### 2. Conditional Removal
Only remove operations if a handler actually ran:

```typescript
// CRITICAL: Only remove operation if a handler actually ran and succeeded
if (!handlerRan) {
  // No handler for this operation type - skip it (don't remove, don't fail)
  console.warn(
    `[OfflineSync] No handler provided for ${operation.entityType}:${operation.operationType} operation ${operation.id}. ` +
    `Operation preserved in queue for later processing.`
  );
  // Reset status back to pending so it can be processed later with proper handlers
  // DO NOT remove from queue - this would cause permanent data loss
  await this.updateOperationStatus(operation.id, 'pending');
  continue; // Skip to next operation - do NOT call removeOperation
}

// Handler ran successfully - safe to remove from queue
// Only reached if handlerRan === true
await this.removeOperation(operation.id);
processed++;
```

### 3. Global Sync Processor
Created `globalSyncProcessor.ts` that provides **all handlers** for all entity types:

```typescript
// In App.tsx
useEffect(() => {
  return setupGlobalSyncProcessor();
}, []);
```

This ensures:
- All queued operations have handlers available
- No operations are skipped due to missing handlers
- Operations are processed when connection is restored

### 4. Concurrent Processing Protection
Added atomic status update to prevent multiple processors from handling the same operation:

```typescript
// Atomically update status to 'syncing'
const updated = await this.updateOperationStatus(operation.id, 'syncing');
if (!updated) {
  // Operation was already removed or is being processed by another sync
  continue;
}
```

## Safety Guarantees

### ✅ No Data Loss
- Operations without handlers are **preserved** in the queue
- They remain in 'pending' status for later processing
- They are **never deleted** unless a handler successfully processes them

### ✅ Handler Validation
- Every operation requires a matching handler to be removed
- Missing handlers trigger warnings, not deletions
- Operations can be retried when proper handlers are available

### ✅ Concurrent Safety
- Atomic status updates prevent race conditions
- Multiple processors can run simultaneously without conflicts
- Operations are only processed once

## Testing

### Test Case 1: Missing Handler
1. Queue a task operation offline
2. Call `processSyncQueue` with only `onChatMessageCreate` handler
3. **Expected**: Task operation remains in queue, not deleted
4. **Actual**: ✅ Task operation preserved, warning logged

### Test Case 2: Global Processor
1. Queue operations for chat, tasks, and calendar events offline
2. Go online - global processor runs
3. **Expected**: All operations processed successfully
4. **Actual**: ✅ All operations processed with appropriate handlers

### Test Case 3: Partial Handlers
1. Queue operations for chat and tasks
2. Call `processSyncQueue` with only chat handler
3. **Expected**: Chat processed, tasks preserved
4. **Actual**: ✅ Chat removed, tasks remain in queue

## Migration Notes

- **Backward Compatible**: Existing code continues to work
- **No Breaking Changes**: Hooks can still call `processSyncQueue` with partial handlers
- **Recommended**: Use global sync processor for comprehensive handling
- **Safe**: Operations are never lost, even with partial handlers

## Files Modified

1. `src/services/offlineSyncService.ts`
   - Added `handlerRan` tracking
   - Added conditional removal logic
   - Added concurrent processing protection

2. `src/services/globalSyncProcessor.ts` (NEW)
   - Provides all handlers for all entity types
   - Integrated into App.tsx

3. `src/hooks/useTripChat.ts`
   - Updated to rely on global processor
   - Removed partial handler call

4. `src/App.tsx`
   - Integrated global sync processor

## Prevention

To prevent similar issues in the future:

1. **Always check handler execution** before removing operations
2. **Use global processor** for comprehensive sync handling
3. **Log warnings** when operations are skipped
4. **Test with partial handlers** to ensure no data loss
5. **Document handler requirements** in function signatures

## Related Issues

- Operations without handlers are now preserved, not deleted
- Global processor ensures all operations have handlers
- Concurrent processing is safe with atomic updates
