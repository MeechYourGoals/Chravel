

# Fix Build Errors from Incomplete Feature Migration

## Problem Summary
The codebase has **3 build errors** resulting from an incomplete migration of chat hooks to the feature-based folder structure. This is consistent with the Perplexity report noting "Duplicate Hook Locations" and incomplete feature migration.

| Error | File | Root Cause |
|-------|------|------------|
| TS2307 | `MessageItem.tsx:2` | Import path `@/hooks/useChatComposer` doesn't exist - hook moved to `@/features/chat/hooks/` |
| TS2307 | `MessageList.tsx:4` | Same broken import path |
| TS2322 | `conflictResolutionService.ts:127` | Generic type constraint issue with `VersionedData` return type |

## Solution Overview

### Fix 1: Update Chat Component Imports (MessageItem.tsx & MessageList.tsx)

**Current (broken):**
```typescript
import { ChatMessage } from '@/hooks/useChatComposer';
```

**Fixed:**
```typescript
import { ChatMessage } from '@/features/chat/hooks/useChatComposer';
```

Both files are already in `src/features/chat/components/`, so these can use a relative import for cleaner organization:
```typescript
import { ChatMessage } from '../hooks/useChatComposer';
```

### Fix 2: TypeScript Generic Constraint (conflictResolutionService.ts)

**Problem:** Line 127 returns `resolution.resolvedData || serverData`, but `resolvedData` is typed as `VersionedData | undefined`. When the function declares it returns `T extends VersionedData`, TypeScript correctly complains that `VersionedData` is not necessarily assignable to `T`.

**Fix:** Cast the return to `T` since we know the data structure is maintained:
```typescript
// Line 127
return (resolution.resolvedData || serverData) as T;
```

This is type-safe because:
- `serverData` is already typed as `T`
- `resolvedData` comes from either `optimisticData` or `serverData` (both `T`)
- The merge operation preserves the structure

## Files to Modify

| File | Line(s) | Change |
|------|---------|--------|
| `src/features/chat/components/MessageItem.tsx` | 2 | Update import path to `../hooks/useChatComposer` |
| `src/features/chat/components/MessageList.tsx` | 4 | Update import path to `../hooks/useChatComposer` |
| `src/services/conflictResolutionService.ts` | 127 | Add `as T` type assertion |

## Risk Assessment

| Change | Risk Level | Rationale |
|--------|------------|-----------|
| Import path updates | **Zero** | Just fixing broken paths to where the hook actually exists |
| Type assertion | **Low** | The assertion is logically correct - we're returning data of the same shape that was passed in |

**No functionality changes** - these are purely path corrections and type fixes to restore the build.

## Verification

After these fixes:
- `npm run typecheck` will pass
- `npm run build` will succeed
- All chat functionality remains intact (same code, just corrected imports)

## Notes on Perplexity Report

This fix addresses the "Duplicate Hook Locations" issue by ensuring the feature-based components correctly reference their co-located hooks. The Perplexity report correctly identified this as incomplete migration work.

