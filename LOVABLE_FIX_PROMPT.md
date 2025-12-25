# Comprehensive Fix Prompt for Lovable

## Context
Over the last several updates, Composer added features that reference Supabase tables, columns, and functions that either:
1. Don't exist in the database yet (migrations exist but haven't been run)
2. Exist but aren't reflected in TypeScript types (types need regeneration)
3. Are referenced incorrectly (edge functions vs database functions)

## Root Cause Analysis

### Missing/Incorrect Type References:
1. **`trip_members.permissions` column** - Referenced in `useTripPermissions.ts` but not in generated types
2. **`basecamp_change_history` table** - Migration exists but types not generated
3. **`push_tokens` table** - Multiple migrations exist, but types may be outdated
4. **`payment_split_patterns` table** - Migration exists but types not generated
5. **`trip_presence` table** - Migration exists but types not generated
6. **`log_basecamp_change` function** - Database function exists, but called incorrectly as RPC
7. **`mark_broadcast_viewed` function** - Database function exists, but return type mismatch
8. **`get_broadcast_read_count` function** - Database function exists, but return type mismatch
9. **`trip_events.version` column** - Referenced but may not exist in schema
10. **`task_status.is_completed` and `version` columns** - Referenced but may not exist

### Build Errors:
- TypeScript errors from accessing properties that don't exist in generated types
- Type mismatches from incorrect function signatures
- Missing type assertions causing strict mode failures

## Comprehensive Fix Strategy

### Phase 1: Verify Database Schema
1. **Check if migrations have been run:**
   - `basecamp_change_history` table exists
   - `push_tokens` table exists (check which migration version)
   - `payment_split_patterns` table exists
   - `trip_presence` table exists
   - `trip_members.permissions` column exists (JSONB)
   - `trip_events.version` column exists
   - `task_status.is_completed` and `version` columns exist

2. **Verify database functions exist:**
   - `log_basecamp_change()` - Should be RPC function, not edge function
   - `mark_broadcast_viewed(broadcast_uuid UUID)` - Returns void
   - `get_broadcast_read_count(broadcast_uuid UUID)` - Returns INTEGER

### Phase 2: Regenerate TypeScript Types
1. Run Supabase CLI to regenerate types:
   ```bash
   npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
   ```
   OR if using local:
   ```bash
   npx supabase gen types typescript --local > src/types/database.types.ts
   ```

2. Verify the generated types include:
   - All tables mentioned above
   - All columns (permissions, version, is_completed, etc.)
   - All RPC functions with correct signatures

### Phase 3: Fix Type Errors in Code

#### File: `src/hooks/useTripPermissions.ts`
**Issue:** Line 112, 186, 219 - `permissions` column not in types
**Fix:** 
- If column exists: Add proper type assertion or update query to handle optional permissions
- If column doesn't exist: Add migration to add `permissions JSONB` column to `trip_members`

```typescript
// Line 110-115: Fix query with proper type handling
const { data: member, error } = await supabase
  .from('trip_members')
  .select('role, permissions')
  .eq('trip_id', tripId)
  .eq('user_id', userId)
  .single();

// Cast to expected type if permissions column exists but not in types
const typedMember = member as { role: string; permissions?: PermissionMatrix } | null;
```

#### File: `src/hooks/useTripTasks.ts`
**Issue:** Line 493, 513, 515, 529 - Missing columns `is_completed`, `version` in `task_status`
**Fix:**
- Check if columns exist in database
- If missing, add migration to add `is_completed BOOLEAN DEFAULT false` and `version INTEGER DEFAULT 1` to `task_status`
- Update type assertions to handle these columns

```typescript
// Line 513-518: Fix with proper type handling
const { data: currentStatus, error: statusError } = await supabase
  .from('task_status')
  .select('is_completed, version')
  .eq('task_id', taskId)
  .eq('user_id', authUser.id)
  .single();

// Cast to expected type
const typedStatus = currentStatus as { is_completed: boolean; version: number } | null;
```

#### File: `src/services/basecampService.ts`
**Issue:** Lines 159, 282, 345, 381 - `log_basecamp_change` called as RPC (correct), but `basecamp_change_history` table not in types
**Fix:**
- Verify `log_basecamp_change` is a database function (not edge function)
- Fix RPC call to handle return type correctly
- Add type assertion for `basecamp_change_history` queries

```typescript
// Lines 159-172: Fix RPC call (it's a database function, not edge function)
try {
  const { data, error } = await supabase.rpc('log_basecamp_change', {
    p_trip_id: tripId,
    p_user_id: userId,
    p_basecamp_type: 'trip',
    p_action: isUpdate ? 'updated' : 'created',
    p_previous_name: currentBasecamp?.name || null,
    p_previous_address: currentBasecamp?.address || null,
    p_previous_latitude: currentBasecamp?.coordinates?.lat || null,
    p_previous_longitude: currentBasecamp?.coordinates?.lng || null,
    p_new_name: basecamp.name || null,
    p_new_address: basecamp.address,
    p_new_latitude: finalLatitude || null,
    p_new_longitude: finalLongitude || null
  });
  
  if (error) throw error;
} catch (historyError) {
  console.warn('[BasecampService] Failed to log history:', historyError);
}

// Line 381: Fix table query with type assertion
const { data, error } = await supabase
  .from('basecamp_change_history')
  .select('*')
  .eq('trip_id', tripId)
  .order('created_at', { ascending: false });

const typedHistory = (data || []) as BasecampChangeHistory[];
```

#### File: `src/services/broadcastService.ts`
**Issue:** Lines 200, 214, 219, 266-267, 285 - Missing functions and table types
**Fix:**
- `mark_broadcast_viewed` returns void, not data
- `get_broadcast_read_count` returns INTEGER, handle as number
- `push_tokens` table query needs type assertion

```typescript
// Line 200-204: Fix mark_broadcast_viewed (returns void)
const { error } = await supabase.rpc('mark_broadcast_viewed', {
  broadcast_uuid: broadcastId
});
return !error;

// Line 214-219: Fix get_broadcast_read_count (returns INTEGER)
const { data, error } = await supabase.rpc('get_broadcast_read_count', {
  broadcast_uuid: broadcastId
});
if (error) throw error;
return Number(data || 0);

// Lines 266-269: Fix push_tokens query with type assertion
const { data: tokens, error: tokensError } = await supabase
  .from('push_tokens')
  .select('token, platform')
  .in('user_id', userIds);

const typedTokens = (tokens || []) as Array<{ token: string; platform: string }>;
const tokenList = typedTokens.map(t => t.token);
```

#### File: `src/services/calendarService.ts`
**Issue:** Lines 68, 263, 293 - Missing `created_by` and `version` properties
**Fix:**
- Ensure `created_by` is set from authenticated user
- Handle `version` column if it exists, otherwise default to 1

```typescript
// Line 68-74: Fix offline event creation
const { data: { user } } = await supabase.auth.getUser();
return {
  id: queueId,
  ...eventData,
  created_by: user?.id || '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  version: 1,
} as TripEvent;

// Lines 263, 293: Safe version handling
if (updates.version !== undefined && typeof updates.version === 'number') {
  // Handle version update
}
```

#### File: `src/services/chatAnalysisService.ts`
**Issue:** Multiple lines - `payment_split_patterns` table not in types
**Fix:**
- Add type assertions for all queries to `payment_split_patterns`
- Handle gracefully if table doesn't exist (already has try-catch)

```typescript
// Line 416-422: Fix with type assertion
const { data: patterns, error: patternError } = await supabase
  .from('payment_split_patterns')
  .select('participant_id, frequency, last_split_at')
  .eq('trip_id', tripId)
  .eq('user_id', userId)
  .order('frequency', { ascending: false })
  .limit(10);

const typedPatterns = (patterns || []) as Array<{
  participant_id: string;
  frequency: number;
  last_split_at: string;
}>;
```

### Phase 4: Create Missing Migrations (if needed)

If any tables/columns don't exist, create migrations:

1. **Add `permissions` column to `trip_members`:**
```sql
ALTER TABLE trip_members 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;

COMMENT ON COLUMN trip_members.permissions IS 'Granular permission overrides for trip members (JSONB object)';
```

2. **Add `version` column to `trip_events`:**
```sql
ALTER TABLE trip_events 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

COMMENT ON COLUMN trip_events.version IS 'Optimistic locking version for conflict detection';
```

3. **Add `is_completed` and `version` to `task_status`:**
```sql
ALTER TABLE task_status 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

COMMENT ON COLUMN task_status.is_completed IS 'Whether the task is completed by this user';
COMMENT ON COLUMN task_status.version IS 'Optimistic locking version for conflict detection';
```

### Phase 5: Verify Build Passes

1. Run type check: `npm run typecheck`
2. Run lint: `npm run lint`
3. Run build: `npm run build`
4. Fix any remaining errors

## Implementation Priority

1. **CRITICAL:** Regenerate TypeScript types from Supabase
2. **HIGH:** Fix type errors in the 6 affected files
3. **MEDIUM:** Add missing migrations if columns/tables don't exist
4. **LOW:** Clean up any remaining `@ts-ignore` comments with proper types

## Testing Checklist

After fixes:
- [ ] `npm run typecheck` passes with no errors
- [ ] `npm run lint` passes with no errors  
- [ ] `npm run build` completes successfully
- [ ] All affected features still work:
  - [ ] Trip permissions system
  - [ ] Task completion with versioning
  - [ ] Basecamp change history logging
  - [ ] Broadcast read receipts
  - [ ] Push notifications
  - [ ] Calendar events with versioning
  - [ ] Payment split pattern detection

## Expected Outcome

- All TypeScript build errors resolved
- All Supabase queries properly typed
- No `@ts-ignore` or `as any` casts (or minimal, well-documented ones)
- Code maintains all existing functionality
- Ready for production deployment
