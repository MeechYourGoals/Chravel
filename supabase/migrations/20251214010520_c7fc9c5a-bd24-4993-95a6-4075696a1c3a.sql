-- =====================================================
-- FIX: Infinite RLS Recursion on trip_members
-- Root Cause: The policy "Trip members can view fellow members" 
-- uses a subquery on trip_members, causing infinite recursion
-- =====================================================

-- Step 1: Drop the problematic recursive policy
DROP POLICY IF EXISTS "Trip members can view fellow members" ON public.trip_members;

-- Step 2: Create SECURITY DEFINER function that bypasses RLS
-- This prevents recursion by executing with owner privileges
CREATE OR REPLACE FUNCTION public.is_trip_member(_user_id uuid, _trip_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_members
    WHERE user_id = _user_id AND trip_id = _trip_id
  )
$$;

-- Step 3: Create new non-recursive SELECT policy using the function
CREATE POLICY "Trip members can view fellow members"
ON public.trip_members
FOR SELECT
TO authenticated
USING (
  public.is_trip_member(auth.uid(), trip_id)
);

-- Step 4: Update trip_chat_messages policies to use the function
-- Drop existing policies that may cause issues
DROP POLICY IF EXISTS "Members can read non-private messages" ON public.trip_chat_messages;
DROP POLICY IF EXISTS "Members can insert messages" ON public.trip_chat_messages;

-- Recreate SELECT policy using is_trip_member function
CREATE POLICY "Members can read messages"
ON public.trip_chat_messages
FOR SELECT
TO authenticated
USING (
  public.is_trip_member(auth.uid(), trip_id)
);

-- Recreate INSERT policy using is_trip_member function
CREATE POLICY "Members can insert messages"
ON public.trip_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_trip_member(auth.uid(), trip_id)
);

-- Step 5: Ensure trips SELECT policy uses the function
DROP POLICY IF EXISTS "Trip creators and members can view trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view trips they're members of" ON public.trips;
DROP POLICY IF EXISTS "Authenticated users can view their own trips" ON public.trips;

-- Create unified trips SELECT policy
CREATE POLICY "Users can view their trips"
ON public.trips
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by 
  OR public.is_trip_member(auth.uid(), id)
);

-- Step 6: Create trigger to ensure trip creator is ALWAYS a member
CREATE OR REPLACE FUNCTION public.ensure_creator_is_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role, status)
  VALUES (NEW.id, NEW.created_by, 'admin', 'active')
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists (from auto_add_trip_creator_as_member)
DROP TRIGGER IF EXISTS ensure_creator_membership ON public.trips;
DROP TRIGGER IF EXISTS auto_add_creator_as_member ON public.trips;

-- Create new trigger
CREATE TRIGGER ensure_creator_membership
AFTER INSERT ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.ensure_creator_is_member();

-- Step 7: Grant execute permissions on the new function
GRANT EXECUTE ON FUNCTION public.is_trip_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_member(uuid, text) TO anon;