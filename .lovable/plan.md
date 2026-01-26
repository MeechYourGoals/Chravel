
# Fix: Allow Consumer Trip Members to Create Invite Links

## Problem Summary
The "Grammy Weekend Airbnb" trip shows "Failed to generate link" with error "Only the trip creator or admins can create invite links." This restriction is correct for Pro/Event trips but **wrong for consumer trips** where any member should be able to invite others.

## Root Cause Analysis

### 1. Frontend Issue (useInviteLink.ts:122-135)
```typescript
// Current: Restricts ALL trips to creator/admin only
if (trip.created_by !== user.id) {
  const { data: admin } = await supabase
    .from('trip_admins')
    .select('id')
    ...
  if (!admin) {
    toast.error('Only the trip creator or admins can create invite links');
    return false;
  }
}
```
**Problem**: No check for `trip_type` - applies same logic to all trips.

### 2. Backend Issue (RLS Policy)
```sql
-- Current INSERT policy: Only allows creator OR trip_admins
WITH CHECK (
  EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_invites.trip_id 
    AND (t.created_by = auth.uid() OR EXISTS (SELECT 1 FROM trip_admins ta ...)))
)
```
**Problem**: Does not allow consumer trip members (via `trip_members` table).

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     INVITE PERMISSION LOGIC                      │
├─────────────────────────────────────────────────────────────────┤
│  Trip Type  │  Who Can Create Invites                           │
├─────────────────────────────────────────────────────────────────┤
│  consumer   │  Any trip_members member + creator                │
│  pro        │  Only creator + trip_admins                       │
│  event      │  Only creator + trip_admins                       │
│  NULL       │  Treat as 'consumer' (legacy trips)               │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Step 1: Update Frontend Permission Logic

**File: `src/hooks/useInviteLink.ts`**

1. Modify the `createInviteInDatabase` function to:
   - Fetch `trip_type` along with `id, created_by`
   - Normalize NULL to 'consumer' (legacy trips default)
   - Branch permission check by trip type:
     - **consumer**: Check `trip_members` OR creator
     - **pro/event**: Check `trip_admins` OR creator

```typescript
// Fetch trip with type
const { data: trip } = await supabase
  .from('trips')
  .select('id, created_by, trip_type')
  .eq('id', tripIdValue)
  .single();

// Normalize trip type (NULL = consumer for legacy)
const tripType = trip.trip_type || 'consumer';

if (tripType === 'consumer') {
  // Consumer trips: Any member can invite
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripIdValue)
    .eq('user_id', user.id)
    .single();
  
  if (!member && trip.created_by !== user.id) {
    toast.error('Only trip members can create invite links');
    return false;
  }
} else {
  // Pro/Event: Creator or admin only
  if (trip.created_by !== user.id) {
    const { data: admin } = await supabase
      .from('trip_admins')
      .select('id')
      .eq('trip_id', tripIdValue)
      .eq('user_id', user.id)
      .single();
    
    if (!admin) {
      toast.error('Only trip admins can create invite links for this trip');
      return false;
    }
  }
}
```

2. Update error message specificity:
   - Consumer: "Only trip members can create invite links"
   - Pro/Event: "Only trip admins can create invite links for this trip"

### Step 2: Update RLS Policy for Consumer Members

**New Migration: `supabase/migrations/20260126000000_consumer_invite_permissions.sql`**

```sql
-- Allow consumer trip members to create invites
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Trip admins can create invites" ON public.trip_invites;

-- Create new policy that branches by trip_type
CREATE POLICY "Members or admins can create invites based on trip type"
ON public.trip_invites
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the created_by of the invite
  auth.uid() = created_by
  AND
  EXISTS (
    SELECT 1 FROM trips t WHERE t.id = trip_invites.trip_id
    AND (
      -- Trip creator can always create invites
      t.created_by = auth.uid()
      OR
      -- For consumer trips (or legacy NULL): any trip member
      (COALESCE(t.trip_type, 'consumer') = 'consumer' 
       AND EXISTS (
         SELECT 1 FROM trip_members tm 
         WHERE tm.trip_id = t.id AND tm.user_id = auth.uid()
       ))
      OR
      -- For pro/event trips: only admins
      (COALESCE(t.trip_type, 'consumer') IN ('pro', 'event')
       AND EXISTS (
         SELECT 1 FROM trip_admins ta 
         WHERE ta.trip_id = t.id AND ta.user_id = auth.uid()
       ))
    )
  )
);

-- Update UPDATE policy similarly
DROP POLICY IF EXISTS "Trip admins can update invites" ON public.trip_invites;

CREATE POLICY "Members or admins can update invites based on trip type"
ON public.trip_invites
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR
      (COALESCE(t.trip_type, 'consumer') = 'consumer' 
       AND EXISTS (
         SELECT 1 FROM trip_members tm 
         WHERE tm.trip_id = t.id AND tm.user_id = auth.uid()
       ))
      OR
      (COALESCE(t.trip_type, 'consumer') IN ('pro', 'event')
       AND EXISTS (
         SELECT 1 FROM trip_admins ta 
         WHERE ta.trip_id = t.id AND ta.user_id = auth.uid()
       ))
    )
  )
);

-- Update DELETE policy similarly
DROP POLICY IF EXISTS "Trip admins can delete invites" ON public.trip_invites;

CREATE POLICY "Members or admins can delete invites based on trip type"
ON public.trip_invites
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR
      (COALESCE(t.trip_type, 'consumer') = 'consumer' 
       AND EXISTS (
         SELECT 1 FROM trip_members tm 
         WHERE tm.trip_id = t.id AND tm.user_id = auth.uid()
       ))
      OR
      (COALESCE(t.trip_type, 'consumer') IN ('pro', 'event')
       AND EXISTS (
         SELECT 1 FROM trip_admins ta 
         WHERE ta.trip_id = t.id AND ta.user_id = auth.uid()
       ))
    )
  )
);
```

### Step 3: Pass tripType to hook from components (already done)

The `InviteModal` already accepts `tripType` prop but doesn't pass it to `useInviteLink`. We need to add it to the hook interface.

**File: `src/hooks/useInviteLink.ts`**

Add `tripType` to the interface and use it for fallback detection.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useInviteLink.ts` | Add trip_type-aware permission branching |
| `supabase/migrations/20260126000000_consumer_invite_permissions.sql` | New RLS policies for trip_type-based access |

## Testing Checklist

1. **Consumer trip member (not creator/admin)**: Should generate invite link ✅
2. **Consumer trip creator**: Should generate invite link ✅
3. **Pro trip non-admin member**: Should see "Only trip admins can create invite links" ❌
4. **Pro trip admin**: Should generate invite link ✅
5. **Pro trip creator**: Should generate invite link ✅
6. **Event trip**: Same as Pro trip behavior
7. **Legacy trip (trip_type = NULL)**: Should behave as consumer (any member allowed)

## Security Notes

- Consumer trips remain open for viral growth (any member can invite friends)
- Pro/Event trips maintain controlled access (only admins/creators prevent info leaks)
- RLS enforces backend validation even if frontend is bypassed
- `COALESCE(trip_type, 'consumer')` handles legacy NULL values safely
