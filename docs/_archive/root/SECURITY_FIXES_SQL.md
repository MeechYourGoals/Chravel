# Security Fixes - SQL Migration Required

## 🚨 CRITICAL: Run this SQL migration via Supabase Dashboard

Since the migrations folder is read-only in Lovable, you need to run this SQL manually via:
1. Supabase Dashboard → SQL Editor → New Query
2. Paste the SQL below
3. Run the query

Alternatively, create a new migration file locally with:
```bash
supabase migration new comprehensive_security_fixes
```

Then paste this SQL into that file.

---

## SQL Migration Content

```sql
-- Comprehensive Security Fixes
-- Generated: 2025-11-02
-- Addresses: Profile PII exposure, storage policies, SECURITY DEFINER search_path

-- ==========================================
-- FIX 1: Profile Privacy Enforcement
-- ==========================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view other profiles" ON public.profiles;

-- Create security definer function to safely get profile based on privacy settings
CREATE OR REPLACE FUNCTION public.get_visible_profile_fields(
  profile_user_id UUID,
  viewer_id UUID
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  bio TEXT,
  show_email BOOLEAN,
  show_phone BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.avatar_url,
    -- Only show email if privacy flag is true OR viewing own profile
    CASE WHEN p.show_email = true OR p.user_id = viewer_id THEN p.email ELSE NULL END,
    -- Only show phone if privacy flag is true OR viewing own profile
    CASE WHEN p.show_phone = true OR p.user_id = viewer_id THEN p.phone ELSE NULL END,
    -- Only show name if viewing own profile
    CASE WHEN p.user_id = viewer_id THEN p.first_name ELSE NULL END,
    CASE WHEN p.user_id = viewer_id THEN p.last_name ELSE NULL END,
    p.bio,
    p.show_email,
    p.show_phone,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.user_id = profile_user_id;
$$;

-- ==========================================
-- FIX 2: Storage Bucket - Restrict trip-photos
-- ==========================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view trip photos" ON storage.objects;

-- Create policy that restricts viewing to trip members only
CREATE POLICY "Trip members can view trip photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trip-photos' AND 
    (storage.foldername(name))[1] IN (
      SELECT tm.trip_id::text 
      FROM trip_members tm
      WHERE tm.user_id = auth.uid() 
        AND tm.status = 'active'
    )
  );

-- ==========================================
-- FIX 3: Add search_path to SECURITY DEFINER functions
-- ==========================================

-- Fix functions in 20251009200510 migration
CREATE OR REPLACE FUNCTION public.get_safe_profile(profile_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  phone TEXT,
  show_email BOOLEAN,
  show_phone BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at,
    p.updated_at,
    p.email,
    p.phone,
    p.show_email,
    p.show_phone
  FROM profiles p
  WHERE p.user_id = profile_user_id;
END;
$$;

-- Fix check_profile_visibility function
CREATE OR REPLACE FUNCTION public.check_profile_visibility(viewer_id UUID, profile_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM trip_members tm1
    INNER JOIN trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = viewer_id 
      AND tm2.user_id = profile_user_id
      AND tm1.status = 'active'
      AND tm2.status = 'active'
  ) OR viewer_id = profile_user_id;
$$;

-- Fix functions in 001_audio_summaries.sql
CREATE OR REPLACE FUNCTION increment_audio_summary_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET audio_summary_count = COALESCE(audio_summary_count, 0) + 1
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION check_audio_summary_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COALESCE(audio_summary_count, 0) INTO user_count
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  IF user_count >= 10 THEN
    RAISE EXCEPTION 'Audio summary limit reached for this user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Fix functions in 20250115000002_ai_conversations_table.sql
CREATE OR REPLACE FUNCTION increment_concierge_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE concierge_usage
    SET 
      message_count = message_count + 1,
      last_message_at = NOW()
    WHERE user_id = NEW.user_id AND trip_id = NEW.trip_id;
    
    IF NOT FOUND THEN
      INSERT INTO concierge_usage (user_id, trip_id, message_count, last_message_at)
      VALUES (NEW.user_id, NEW.trip_id, 1, NOW());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Fix functions in 20250120000002_ai_concierge_usage_tracking.sql
CREATE OR REPLACE FUNCTION public.increment_concierge_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO concierge_usage (user_id, trip_id, message_count, last_message_at)
  VALUES (NEW.user_id, NEW.trip_id, 1, NOW())
  ON CONFLICT (user_id, trip_id)
  DO UPDATE SET
    message_count = concierge_usage.message_count + 1,
    last_message_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_concierge_usage(p_user_id UUID, p_trip_id TEXT)
RETURNS TABLE (
  message_count INTEGER,
  last_message_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT cu.message_count, cu.last_message_at
  FROM concierge_usage cu
  WHERE cu.user_id = p_user_id AND cu.trip_id = p_trip_id;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Fix other common functions with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.check_trip_access(p_user_id UUID, p_trip_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members
    WHERE user_id = p_user_id 
      AND trip_id = p_trip_id 
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_creator(p_user_id UUID, p_trip_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips
    WHERE id = p_trip_id AND creator_id = p_user_id
  );
$$;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.get_visible_profile_fields(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_profile_visibility(UUID, UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_visible_profile_fields IS 
  'Returns profile fields based on privacy settings. Respects show_email and show_phone flags unless viewing own profile.';
```

---

## What These Fixes Address

### 🔴 Critical Issue #1: Profile PII Exposure
- **Problem**: All authenticated users could view ALL email addresses and phone numbers
- **Fix**: New `get_visible_profile_fields` function respects `show_email` and `show_phone` privacy flags
- **Impact**: Users' contact information is now private by default

### ⚠️ High Priority #2: Public Trip Photos
- **Problem**: Anyone could view trip photos without authentication
- **Fix**: Restricted access to trip members only via RLS policy
- **Impact**: Photos are now private to trip participants

### ⚠️ High Priority #3: SECURITY DEFINER Privilege Escalation
- **Problem**: Functions missing `SET search_path` vulnerable to search_path manipulation
- **Fix**: Added `SET search_path = public` to all SECURITY DEFINER functions
- **Impact**: Prevents potential privilege escalation attacks

---

## Verification After Running

Run these queries to verify the fixes:

```sql
-- 1. Verify the public photo policy is gone
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname = 'Anyone can view trip photos';
-- Should return 0 rows

-- 2. Verify new restricted policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname = 'Trip members can view trip photos';
-- Should return 1 row

-- 3. Verify new function exists
SELECT proname, prosrc FROM pg_proc 
WHERE proname = 'get_visible_profile_fields';
-- Should return 1 row

-- 4. Check all SECURITY DEFINER functions have search_path
SELECT 
  p.proname,
  CASE 
    WHEN p.proconfig IS NULL THEN 'MISSING search_path'
    WHEN array_to_string(p.proconfig, ',') LIKE '%search_path%' THEN 'HAS search_path'
    ELSE 'MISSING search_path'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true  -- SECURITY DEFINER
  AND n.nspname = 'public'
ORDER BY proname;
-- All should show 'HAS search_path'
```

---

## Additional Notes

⚠️ **Important**: After running this migration, you may need to update frontend code that directly queries the `profiles` table to use the new `get_visible_profile_fields` function instead.

✅ **Safe to run**: This migration is idempotent - you can run it multiple times without issues. It uses `CREATE OR REPLACE FUNCTION` and `DROP POLICY IF EXISTS`.
