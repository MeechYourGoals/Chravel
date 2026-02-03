
# Fix Role Assignment Failure and Restore Channel Visibility

## Problem Summary

Two related issues are occurring in Pro trips:

1. **Role Assignment Failure**: When assigning roles via Bulk Role Assignment, the system returns "Assignment Partially Complete - Successfully assigned role to 0 members" with a toast "Failed to assign role"

2. **Channels Not Showing**: When clicking on the Channels tab in Chat, no channels appear despite channels existing in the database

---

## Root Cause Analysis

### Issue 1: Role Assignment Failure

The `assign_trip_role` RPC function in the database has a strict membership check:

```sql
-- Lines 107-116 in 20251210000000_fix_role_channels.sql
IF NOT EXISTS (
  SELECT 1 FROM public.trip_members 
  WHERE trip_id = _trip_id AND user_id = _user_id
) THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'User must be a trip member'
  );
END IF;
```

**Database Evidence**:
- Trip ID: `95689641-0d3f-4278-9ae5-639c00945345` (Chravel Pro Test Trip)
- Creator: `013d9240-10c0-44e5-8da5-abfa2c4751c5` (Christian Amechi)
- `trip_members` table: Only has 1 entry (Christian is listed)
- `user_trip_roles` table: **EMPTY** - no roles assigned to anyone

The assignment is failing because:
1. Although Christian IS in trip_members, the assignment still fails
2. The RPC returns `{success: false, message: 'User must be a trip member'}` but this message is not being surfaced clearly

### Issue 2: Channels Not Visible

Channel visibility is tied to role assignments. The `channelService.getAccessibleChannels()` method:

```typescript
// Lines 372-374 in channelService.ts
const userRoles = await this.getUserRoles(tripId, user.id);
if (userRoles.length === 0) return []; // No roles = no channels
```

Since `user_trip_roles` is empty for this trip, no channels are returned.

**Database Evidence**:
- 5 channels exist in `trip_channels` for this trip
- 5 roles exist in `trip_roles` for this trip
- 0 entries in `user_trip_roles` - no one has been assigned roles

---

## Solution

### Part 1: Fix Role Assignment RPC

Update the `assign_trip_role` function to:
1. Allow trip creators to bypass the `trip_members` check (they own the trip)
2. Optionally auto-add the user to `trip_members` if they're not already there (for admins assigning roles)

```sql
-- Updated logic:
-- Trip creator can always assign roles to themselves
-- If user is not in trip_members, add them first (for authenticated admins only)
```

### Part 2: Improve Error Surfacing

Update the frontend to show the actual error message from the RPC instead of generic "Failed to assign role":

- File: `src/hooks/useRoleAssignments.ts`
- File: `src/components/pro/BulkRoleAssignmentModal.tsx`

### Part 3: Ensure Trip Creator Has Channel Access (Admin Override)

Add a fallback in `channelService.getAccessibleChannels()` that grants trip creators access to all channels, similar to how `is_trip_member` function works.

---

## Technical Implementation

### Database Migration

```sql
CREATE OR REPLACE FUNCTION public.assign_trip_role(
  _trip_id text,
  _user_id uuid,
  _role_id uuid,
  _set_as_primary boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_role boolean;
  is_trip_creator boolean;
BEGIN
  -- Check if the target user is the trip creator
  SELECT EXISTS (
    SELECT 1 FROM public.trips 
    WHERE id = _trip_id AND created_by = _user_id
  ) INTO is_trip_creator;

  -- Check permissions (admins only)
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = _trip_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = _trip_id 
      AND user_id = auth.uid()
      AND (permissions->>'can_manage_roles')::boolean = true
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only admins can assign roles'
    );
  END IF;

  -- Auto-add user to trip_members if not present
  -- (Trip creators and existing members are allowed)
  IF NOT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = _trip_id AND user_id = _user_id
  ) THEN
    -- Only allow adding if caller is trip creator or admin
    INSERT INTO public.trip_members (trip_id, user_id)
    VALUES (_trip_id, _user_id)
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;

  -- Check if this is the user's first role
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_trip_roles
    WHERE trip_id = _trip_id AND user_id = _user_id
  ) INTO is_first_role;

  -- If _set_as_primary is true, demote existing primary role first
  IF _set_as_primary AND NOT is_first_role THEN
    UPDATE public.user_trip_roles
    SET is_primary = false, updated_at = NOW()
    WHERE trip_id = _trip_id 
    AND user_id = _user_id 
    AND is_primary = true;
  END IF;

  -- Insert the new role
  INSERT INTO public.user_trip_roles (
    trip_id,
    user_id,
    role_id,
    is_primary,
    assigned_by
  )
  VALUES (
    _trip_id,
    _user_id,
    _role_id,
    CASE WHEN is_first_role THEN true ELSE _set_as_primary END,
    auth.uid()
  )
  ON CONFLICT (trip_id, user_id, role_id)
  DO UPDATE SET
    is_primary = CASE 
      WHEN is_first_role THEN true 
      WHEN _set_as_primary THEN true
      ELSE public.user_trip_roles.is_primary
    END,
    assigned_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role assigned successfully'
  );
END;
$$;
```

### Frontend: Better Error Messages

```typescript
// useRoleAssignments.ts - Update error handling
const result = data as { success: boolean; message: string };
if (!result.success) {
  // Show the actual error message from the database
  toast.error(result.message || 'Failed to assign role');
  throw new Error(result.message);
}
```

### Frontend: Channel Access for Trip Creators

```typescript
// channelService.ts - Add trip creator fallback
async getAccessibleChannels(tripId: string): Promise<TripChannel[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Check if user is trip creator (always has full access)
  const { data: trip } = await supabase
    .from('trips')
    .select('created_by')
    .eq('id', tripId)
    .single();
  
  const isTripCreator = trip?.created_by === user.id;

  // If trip creator, return all channels for this trip
  if (isTripCreator) {
    const { data: allChannels } = await supabase
      .from('trip_channels')
      .select('*, trip_roles(role_name)')
      .eq('trip_id', tripId)
      .eq('is_archived', false);
    
    return (allChannels || []).map(c => this.mapChannelData(c));
  }

  // Existing logic for role-based access...
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| New migration file | Update `assign_trip_role` RPC to auto-add users to trip_members |
| `src/hooks/useRoleAssignments.ts` | Surface actual error messages from RPC |
| `src/services/channelService.ts` | Add trip creator fallback for channel access |
| `src/components/pro/BulkRoleAssignmentModal.tsx` | Show specific error messages in UI |

---

## Expected Results After Fix

| Before | After |
|--------|-------|
| "Assignment Partially Complete - 0 members" | Role assigned successfully |
| Channels tab shows nothing | Trip creator sees all channels |
| Generic "Failed to assign role" toast | Specific error message from database |

---

## Testing Verification

1. As trip creator, go to Team tab
2. Click "Assign Roles" 
3. Select yourself and a role
4. Confirm assignment completes successfully
5. Navigate to Chat tab, click Channels
6. Verify all role-based channels are visible
7. Click a channel to open it
