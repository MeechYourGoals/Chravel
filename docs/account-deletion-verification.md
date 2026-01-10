# Account Deletion Feature - Verification Guide

## Overview

This document describes how to verify the account deletion feature implemented in Chravel.

## Architecture

The account deletion feature uses a secure server-side approach:

1. **RPC Function** (`request_account_deletion`) - PostgreSQL function for validation
2. **Edge Function** (`delete-account`) - Handles actual deletion using service role
3. **Client UI** (`ConsumerGeneralSettings`) - Confirmation dialog with DELETE typing requirement

## Data Handling Strategy

| Data Type | Action | Rationale |
|-----------|--------|-----------|
| Profile | Anonymize (soft delete) | Preserves FK references while removing PII |
| Trip Memberships | Hard delete | User no longer has access |
| Owned Trips (empty) | Hard delete | No other users affected |
| Owned Trips (with members) | Transfer ownership | Preserves trip for other members |
| Messages | Keep (sender anonymized) | Preserves conversation context for others |
| Notifications | Hard delete | Personal data |
| AI Queries | Hard delete | Personal data |
| Storage (avatars, media) | Hard delete | User's uploaded files |
| Auth User | Hard delete | Supabase Auth record |

## How to Verify Locally

### Prerequisites

1. Local Supabase instance running (`supabase start`)
2. Environment variables configured
3. Test user account created

### Step 1: Apply Migration

```bash
# Apply the new migration
supabase db reset
# OR
supabase migration up
```

### Step 2: Deploy Edge Function (Local)

```bash
# Start Edge Functions locally
supabase functions serve delete-account --env-file .env.local
```

### Step 3: Run Unit Tests

```bash
# Run account deletion tests
npm test -- --grep "Account Deletion"

# Or run all tests
npm test
```

### Step 4: Manual Testing

1. **Create Test User:**
   - Sign up with a test email
   - Create a trip
   - Upload some media
   - Send some messages
   - Add other members to the trip

2. **Navigate to Delete Account:**
   - Go to Settings → General Settings → Account Management
   - Click "Delete Account"

3. **Verify Confirmation Dialog:**
   - Dialog appears with warning text
   - "Delete My Account" button is disabled
   - Type "DELETE" in the input
   - Button becomes enabled

4. **Execute Deletion:**
   - Click "Delete My Account"
   - Wait for processing
   - Verify toast message appears
   - Verify user is signed out

5. **Verify Database State:**

```sql
-- Check profile is anonymized
SELECT user_id, display_name, email, phone, subscription_status
FROM profiles
WHERE user_id = 'your-user-id';

-- Expected: display_name = '[Deleted User]', email = NULL, subscription_status = 'deleted'

-- Check memberships are removed
SELECT * FROM trip_members WHERE user_id = 'your-user-id';
-- Expected: no rows

-- Check notifications are deleted
SELECT * FROM notifications WHERE user_id = 'your-user-id';
-- Expected: no rows

-- Check admin deleted accounts view
SELECT * FROM admin_deleted_accounts;
-- Expected: your user appears here
```

6. **Verify Storage Cleanup:**

```bash
# Check avatars bucket
supabase storage ls avatars/your-user-id
# Expected: empty or not found

# Check trip-media bucket for user's uploads
# (should be cleaned up)
```

7. **Verify Auth User Deleted:**

```sql
-- In Supabase Auth schema
SELECT * FROM auth.users WHERE id = 'your-user-id';
-- Expected: no rows
```

### Step 5: Test Edge Cases

1. **Already Deleted Account:**
   - Try to access the deleted account
   - Should show appropriate error

2. **Trips with Other Members:**
   - Create trip with other members
   - Delete account
   - Verify trip still exists for other members
   - Verify ownership transferred or creator marked as deleted

3. **Idempotency:**
   - Run deletion twice (simulate race condition)
   - Should not explode

## Troubleshooting

### RPC Function Not Found

If you see "function does not exist", run the migration:

```bash
supabase migration up
```

### Edge Function Timeout

If deletion takes too long for users with lots of data:

1. Increase timeout in `supabase/config.toml`
2. Consider batching deletions

### Storage Deletion Failures

Storage cleanup is non-blocking - check logs for warnings:

```bash
supabase functions logs delete-account
```

## Security Considerations

1. **Never** store service role key in client
2. **Always** verify user JWT before deletion
3. **Always** require explicit confirmation ("DELETE")
4. **Log** all deletions server-side for compliance
5. **Idempotent** - running twice should not cause errors

## Rollback

To rollback this feature:

1. Remove the Edge Function:
   ```bash
   rm -rf supabase/functions/delete-account
   ```

2. Revert the migration:
   ```sql
   DROP FUNCTION IF EXISTS public.request_account_deletion();
   DROP VIEW IF EXISTS admin_deleted_accounts;
   ```

3. Revert the UI changes in `ConsumerGeneralSettings.tsx`

## Related Files

- `supabase/functions/delete-account/index.ts` - Edge Function
- `supabase/migrations/20260110000000_account_deletion_rpc.sql` - Migration
- `src/components/consumer/ConsumerGeneralSettings.tsx` - UI
- `src/components/__tests__/AccountDeletion.test.tsx` - Tests
- `src/integrations/supabase/types.ts` - Type definitions
