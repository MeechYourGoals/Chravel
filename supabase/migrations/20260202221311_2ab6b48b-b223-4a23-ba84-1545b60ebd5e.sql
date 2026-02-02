-- Migration: Fix profiles_public empty result issue
-- Root cause: security_invoker view respects restrictive RLS on base profiles table
-- Solution: Allow authenticated users to SELECT from profiles; view handles column-level privacy

-- Step 1: Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Step 2: Add permissive policy for authenticated users
-- The profiles_public view handles column-level privacy for email/phone via CASE statements
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);