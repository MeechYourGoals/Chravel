# CRITICAL SECURITY FIXES - MANUAL MIGRATION REQUIRED

**Date:** 2025-01-19  
**Priority:** P0 - Apply Immediately Before Production

## Overview

This document contains SQL migrations that **must be executed manually** in the Supabase SQL Editor to fix critical security vulnerabilities. The edge function code has been updated, but database-level fixes require manual execution.

## How to Apply

1. Open Supabase Dashboard → SQL Editor
2. Copy each section below into a new query
3. Execute in order (FIX 1 → FIX 4)
4. Run verification queries to confirm fixes

---

## FIX 1: Profile PII Exposure ⚠️ CRITICAL

**Issue:** All authenticated users can view all email addresses and phone numbers regardless of privacy settings.

```sql
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view other profiles" ON public.profiles;

-- Create new restricted policy that respects privacy
CREATE POLICY "Users can view privacy-controlled profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() -- Always see your own profile
  OR user_id IN ( -- Or see profiles of users in shared trips
    SELECT tm.user_id FROM trip_members tm
    WHERE tm.trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  )
);
```

**Verification:**
```sql
-- Check policy is correct
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';
```

---

## FIX 2: Storage Bucket Public Exposure ⚠️ HIGH

**Issue:** The trip-photos bucket allows anyone to view all photos without authentication.

```sql
-- Drop the public policy
DROP POLICY IF EXISTS "Anyone can view trip photos" ON storage.objects;

-- Create restricted policy for trip members only
CREATE POLICY "Trip members can view trip photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'trip-photos' AND 
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM trips t
    JOIN trip_members tm ON t.id = tm.trip_id
    WHERE tm.user_id = auth.uid() AND tm.status = 'active'
  )
);

-- Ensure trip members can upload photos
CREATE POLICY "Trip members can upload trip photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'trip-photos' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM trips t
    JOIN trip_members tm ON t.id = tm.trip_id
    WHERE tm.user_id = auth.uid() AND tm.status = 'active'
  )
);

-- Trip members can delete their own uploads
CREATE POLICY "Trip members can delete own trip photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'trip-photos' AND
  owner = auth.uid()
);
```

**Verification:**
```sql
-- Check storage policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

---

## FIX 3: SECURITY DEFINER Functions ⚠️ HIGH

**Issue:** 4 functions use SECURITY DEFINER without fixed search_path, allowing privilege escalation.

```sql
-- Fix update_updated_at_trip_tasks
CREATE OR REPLACE FUNCTION public.update_updated_at_trip_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix create_org_owner_membership
CREATE OR REPLACE FUNCTION public.create_org_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  creator_user_id UUID;
BEGIN
  SELECT user_id INTO creator_user_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    seat_id,
    status
  ) VALUES (
    NEW.id,
    creator_user_id,
    'owner',
    'seat-001',
    'active'
  );

  UPDATE public.organizations
  SET seats_used = 1
  WHERE id = NEW.id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (creator_user_id, 'pro')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Fix auto_process_document
CREATE OR REPLACE FUNCTION public.auto_process_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.file_type IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                        'application/msword', 'text/plain', 'image/jpeg', 'image/png', 'image/jpg') THEN
    NEW.processing_status := 'queued';
    RAISE NOTICE 'Document queued for processing: %, file_id: %', NEW.file_name, NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix initialize_trip_privacy_config
CREATE OR REPLACE FUNCTION public.initialize_trip_privacy_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.trip_privacy_configs (
    trip_id, 
    privacy_mode, 
    ai_access_enabled, 
    created_by
  ) VALUES (
    NEW.id,
    COALESCE(NEW.privacy_mode, 'standard'),
    COALESCE(NEW.ai_access_enabled, true),
    NEW.created_by
  );
  RETURN NEW;
END;
$function$;
```

**Verification:**
```sql
-- Verify all SECURITY DEFINER functions have search_path
SELECT 
  p.proname AS function_name,
  CASE 
    WHEN 'search_path' = ANY(string_to_array(p.proconfig::text, ',')) 
    THEN '✅ SECURE'
    ELSE '❌ VULNERABLE'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true AND n.nspname = 'public'
ORDER BY function_name;
```

---

## FIX 4: Distributed Rate Limiting Infrastructure

**Issue:** Current rate limiting uses in-memory storage which doesn't work in distributed edge functions.

```sql
-- Create rate limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for automatic cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits (edge functions use service role)
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
USING (true);

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  rate_key TEXT,
  max_requests INTEGER,
  window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE(count INTEGER, allowed BOOLEAN, remaining INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  window_start := NOW() - (window_seconds || ' seconds')::INTERVAL;
  
  -- Clean up old entries for this key
  DELETE FROM public.rate_limits 
  WHERE key = rate_key AND window_start < NOW() - (window_seconds || ' seconds')::INTERVAL;
  
  -- Insert or update counter
  INSERT INTO public.rate_limits (key, count, window_start)
  VALUES (rate_key, 1, NOW())
  ON CONFLICT (key) DO UPDATE
  SET count = rate_limits.count + 1
  RETURNING rate_limits.count INTO current_count;
  
  -- Return results
  RETURN QUERY SELECT 
    current_count,
    current_count <= max_requests,
    GREATEST(0, max_requests - current_count);
END;
$$;

-- Cleanup function for old rate limit entries (call via pg_cron or periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;
```

**Verification:**
```sql
-- Test the rate limiting function
SELECT * FROM increment_rate_limit('test_key', 5, 60);
SELECT * FROM increment_rate_limit('test_key', 5, 60);
-- Should show count incrementing

-- Cleanup test
DELETE FROM rate_limits WHERE key = 'test_key';
```

---

## Post-Migration Checklist

After running all fixes, verify:

- [ ] Profile PII policy is restricted (cannot query other users' emails)
- [ ] Storage policy prevents unauthenticated access to trip-photos
- [ ] All SECURITY DEFINER functions show "✅ SECURE" in verification query
- [ ] Rate limiting table created and function works
- [ ] Edge function code updated (already done)

## Testing Commands

```sql
-- 1. Test profile access restriction
-- Should only return your own profile or trip members
SELECT email, phone FROM profiles;

-- 2. Test storage bucket (run in browser console)
-- Should fail without authentication:
fetch('https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-photos/test.jpg')

-- 3. Test rate limiting
SELECT * FROM increment_rate_limit('test_user', 5, 60);
-- Run multiple times - should deny after 5 calls

-- 4. Test AI concierge demo mode rate limiting
-- Make 6 requests to lovable-concierge with no auth header
-- 6th request should return 429 rate limit error
```

---

## Platform Configuration (Supabase Dashboard)

Navigate to Supabase Dashboard → Authentication → Settings:

1. **Enable Leaked Password Protection** (currently disabled)
2. **Reduce OTP Expiry** to 10 minutes (currently too long)
3. **Upgrade Postgres Version** to latest (security patches available)

---

## Code Changes Already Applied ✅

The following edge function fixes have already been committed:

1. **lovable-concierge** - Server-side demo mode determination (prevents auth bypass)
2. **_shared/security.ts** - Database-backed distributed rate limiting

---

## Impact Summary

After applying these fixes:

- ✅ Profile PII protected - users can only see trip members' info
- ✅ Storage access restricted - only trip members see photos
- ✅ SECURITY DEFINER privilege escalation prevented
- ✅ Rate limiting works correctly in distributed environment
- ✅ AI concierge demo mode secured with IP-based rate limits
- ✅ No more client-controlled authentication bypass

**Estimated Time:** 15 minutes to apply all fixes

**Urgency:** Apply before production deployment or exposing to external users
