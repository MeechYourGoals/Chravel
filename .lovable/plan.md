
# Fix "Former Member" Display Issue - Root Cause & Solution

## Problem Summary

After running the migration, trip members still show as "Former M." and "Former Member" because the `profiles_public` view returns **empty results** for other users' profiles.

---

## Root Cause Analysis

### Current State

| Component | Configuration | Problem |
|-----------|--------------|---------|
| `profiles` table RLS | `(auth.uid() = user_id)` for SELECT | Users can ONLY see their own profile row |
| `profiles_public` view | `WITH (security_invoker = true)` | View respects the restrictive RLS policy |
| Result | View returns empty for other users | Names fall back to "Former Member" |

### Data Flow Trace

```text
1. useTripMembersQuery.ts fetches trip_members (succeeds)
2. tripService.getTripMembers() queries profiles_public for user_ids
3. profiles_public has security_invoker=true → enforces base table RLS
4. RLS policy only allows auth.uid() = user_id → returns empty for other users
5. No profile data → resolveDisplayName() returns UNRESOLVED_NAME_SENTINEL
6. Frontend displays FORMER_MEMBER_LABEL ("Former Member")
```

---

## Solution: Update profiles Table RLS Policy

The fix requires adding a new SELECT policy on the `profiles` table that allows authenticated users to view basic profile data of **anyone**. The `profiles_public` view will still handle column-level privacy (masking email/phone).

### Why This Approach?

1. **Follows existing architecture** - The memory note confirms "profiles_public view allows all authenticated users to see basic profile information"
2. **Defense in depth** - Base table policy controls row access; view controls column visibility
3. **No regression** - Email/phone remain protected via CASE statements in the view
4. **Performance** - Single policy check vs. complex subqueries

---

## Database Migration Required

```sql
-- Fix profiles_public returning empty by adding permissive SELECT policy
-- The view handles column-level privacy (email/phone), so base table can allow basic SELECT

-- Option 1: Add a new permissive policy for basic profile access
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Keep the existing policy for backwards compatibility
-- "Users can view their own profile" remains but is now redundant
-- (OR just drop it since the new policy is more permissive)
```

Alternatively, we can use a more restrictive policy that only allows trip co-members:

```sql
-- Option 2: More restrictive - only co-members can see profiles
CREATE POLICY "Users can view trip co-member profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id  -- Own profile
  OR public.is_trip_co_member(auth.uid(), user_id)  -- Trip co-member
);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
```

**Recommendation**: Option 1 is simpler and aligns with the memory note. The view already handles privacy for sensitive columns.

---

## Files to Modify

| Location | Change |
|----------|--------|
| New migration file | Add permissive SELECT policy on `profiles` table |
| No frontend changes | The hooks already handle the data correctly when profiles are returned |

---

## Technical Details

### Migration SQL

```sql
-- Migration: Fix profiles_public empty result issue
-- Root cause: security_invoker view respects restrictive RLS on base profiles table

-- Step 1: Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Step 2: Add permissive policy for authenticated users
-- The profiles_public view handles column-level privacy for email/phone
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- The view already has:
-- - CASE statements to protect email/phone based on show_* settings + is_trip_co_member()
-- - WHERE auth.uid() IS NOT NULL to require authentication
```

### Why security_invoker Views Need Matching RLS

When a view uses `security_invoker = true`:
- The view executes with the **caller's** privileges
- RLS policies on base tables are enforced
- If the base table policy is restrictive, the view inherits that restriction

When `security_invoker` is NOT set (or false):
- The view executes with the **owner's** privileges (usually postgres/superuser)
- RLS is bypassed
- The view's internal WHERE clause handles filtering

The current setup uses `security_invoker = true` but the base table RLS is too restrictive.

---

## Expected Result After Fix

| Before | After |
|--------|-------|
| "Former M." for all members except self | Actual names displayed (e.g., "Carla S.", "Phil Q.") |
| Empty profiles_public result | Full profile data returned |
| Only own avatar visible | All member avatars visible |

---

## Regression Prevention

| Check | Status |
|-------|--------|
| Email/phone still protected | ✓ View CASE statements unchanged |
| Own profile access | ✓ Policy allows self-access |
| Authentication required | ✓ Policy is for `authenticated` role only |
| No anon access | ✓ Anon role has no policy |
