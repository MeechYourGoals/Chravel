# Push Notification RLS Fix

**Issue:** Client-side code queries `push_tokens` table directly, which fails due to Row Level Security (RLS) policies that only allow users to access their own tokens.

**Impact:** Urgent/reminder broadcasts never send push notifications because the RLS error is swallowed and the function returns `true` without actually sending.

---

## Problem

When trying to send push notifications to multiple trip members from client-side code:

```typescript
// ❌ THIS FAILS DUE TO RLS
const { data: tokens } = await supabase
  .from('push_tokens')
  .select('token, platform')
  .in('user_id', userIds); // RLS blocks access to other users' tokens
```

The `push_tokens` table has RLS policies that only allow users to see their own tokens. When querying for multiple users (other trip members), RLS blocks access and returns an error. If this error is swallowed, the function returns `true` but no push notifications are actually sent.

---

## Solution

### 1. Database RPC Function (✅ Created)

Created `get_trip_member_push_tokens()` RPC function that:
- Uses `SECURITY DEFINER` to bypass RLS
- Checks trip membership before returning tokens
- Only returns tokens for active trip members
- Can filter by specific user IDs if needed

**File:** `supabase/migrations/fix_push_notification_rls.sql`

**Usage:**
```sql
-- Get all push tokens for trip members
SELECT * FROM get_trip_member_push_tokens('trip-id-here');

-- Get push tokens for specific users (if they are trip members)
SELECT * FROM get_trip_member_push_tokens('trip-id-here', ARRAY['user-id-1', 'user-id-2']);
```

### 2. Edge Function Pattern (✅ Already Correct)

The `send-trip-notification` edge function already uses the service role key correctly:

```typescript
// ✅ CORRECT - Uses service role
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role bypasses RLS
);

// Then queries push_tokens directly (works because of service role)
const { data: tokens } = await supabase
  .from('push_tokens')
  .select('token, platform')
  .eq('user_id', member.user_id);
```

**File:** `supabase/functions/send-trip-notification/index.ts`

---

## Required Actions

### 1. Run Database Migration ⚠️ CRITICAL

```bash
# Run in Supabase dashboard SQL editor or via CLI
supabase migration up
# Or manually run: supabase/migrations/fix_push_notification_rls.sql
```

### 2. Update Client-Side Code (If Any Exists)

If there's any client-side code trying to query `push_tokens` for multiple users, it should:

**Option A:** Call an edge function instead
```typescript
// ✅ CORRECT - Use edge function
const { data, error } = await supabase.functions.invoke('send-trip-notification', {
  body: {
    tripId: tripId,
    title: 'Urgent Broadcast',
    body: message,
    type: 'trip_update',
    excludeUserIds: [currentUserId]
  }
});
```

**Option B:** Use the RPC function (if called from edge function)
```typescript
// ✅ CORRECT - Use RPC function from edge function
const { data: tokens } = await supabase.rpc('get_trip_member_push_tokens', {
  p_trip_id: tripId,
  p_user_ids: userIds // Optional: filter by specific users
});
```

**Option C:** Remove client-side push sending entirely
- All push notifications should be sent from edge functions
- Client-side code should only trigger edge functions

### 3. Verify Edge Functions Are Used

Ensure all push notification sending goes through:
- `supabase/functions/send-trip-notification/index.ts` - For trip-scoped notifications
- `supabase/functions/push-notifications/index.ts` - For general push notifications

---

## Files Modified/Created

### Created:
1. ✅ `supabase/migrations/fix_push_notification_rls.sql` - RPC functions for token fetching

### Already Correct:
1. ✅ `supabase/functions/send-trip-notification/index.ts` - Uses service role correctly
2. ✅ `supabase/functions/push-notifications/index.ts` - Uses service role correctly

### Need to Check:
1. ⚠️ Any client-side code that queries `push_tokens` directly
2. ⚠️ Broadcast creation flows that might try to send pushes from client

---

## Testing

After applying the migration:

1. **Test RPC Function:**
```sql
-- Should return tokens for all trip members
SELECT * FROM get_trip_member_push_tokens('your-trip-id');

-- Should return tokens only for specified users (if they are members)
SELECT * FROM get_trip_member_push_tokens('your-trip-id', ARRAY['user-id-1', 'user-id-2']);
```

2. **Test Edge Function:**
```bash
# Send a test notification
curl -X POST https://your-project.supabase.co/functions/v1/send-trip-notification \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "trip-id",
    "title": "Test",
    "body": "Test notification",
    "type": "trip_update"
  }'
```

3. **Test Urgent Broadcasts:**
- Create an urgent broadcast from the UI
- Verify push notifications are received by all trip members
- Check that errors are not swallowed

---

## Prevention

To prevent this issue in the future:

1. **Never query `push_tokens` from client-side code** for multiple users
2. **Always use edge functions** for sending push notifications
3. **Use service role key** in edge functions to bypass RLS
4. **Don't swallow errors** - log and handle them properly
5. **Test with multiple users** to catch RLS issues early

---

## Related Files

- `supabase/functions/send-trip-notification/index.ts` - Trip notification edge function
- `supabase/functions/push-notifications/index.ts` - General push notification edge function
- `src/services/productionNotificationService.ts` - Client-side notification service (should only call edge functions)
- `src/services/roleBroadcastService.ts` - Role broadcast service (has TODO for push notifications)

---

**Status:** ✅ Migration created, edge functions verified correct  
**Next Steps:** Run migration, check for any client-side push token queries, test urgent broadcasts
