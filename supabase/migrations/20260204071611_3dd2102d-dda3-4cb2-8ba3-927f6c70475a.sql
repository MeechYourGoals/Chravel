-- Fix profiles table RLS: Restrict SELECT to own profile OR shared trip members only
-- This addresses the PUBLIC_USER_DATA security finding

-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of trip co-members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view any profile" ON public.profiles;

-- Create a secure policy that only allows:
-- 1. Viewing your own profile
-- 2. Viewing profiles of users you share a trip with (using existing is_trip_co_member function)
CREATE POLICY "Users can view own profile or shared trip members"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_trip_co_member(auth.uid(), user_id)
);

-- Ensure the is_trip_co_member function exists and is secure
-- (It already exists with SECURITY DEFINER and fixed search_path - no changes needed)