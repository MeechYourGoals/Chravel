# App Store Launch Readiness Audit (UPDATED)
## Chravel - Group Travel & Event Platform
**Audit Date:** January 10, 2026 (Re-audit)
**Previous Audit:** January 9, 2026
**Auditor:** Senior Mobile Lead + Release Engineer
**Platform:** Capacitor 8.0.0 + React 18 + Supabase + RevenueCat

---

## 1) EXECUTIVE SUMMARY

### Launch Readiness Score: **82/100** (↑ from 78/100)

The Chravel iOS app readiness has **improved by 4 points** since the last audit. Key security improvements and data handling were addressed. However, several **critical blockers remain unchanged** and must be resolved before App Store submission.

### Changes Since Last Audit

| Area | Previous | Current | Change |
|------|----------|---------|--------|
| Security Hardening | ⚠️ Partial | ✅ Complete | CVE-2025-48757 fixed, RLS hardened |
| Data Export | ❌ Missing | ✅ Ready | PDF export via Edge Function |
| Rate Limiting | ❌ Missing | ✅ Ready | Database-backed rate limiting |
| Security Audit Log | ❌ Missing | ✅ Ready | `security_audit_log` table added |
| Orphan Data Cleanup | ❌ Missing | ✅ Ready | FK cascades + cleanup function |
| Location Privacy | ⚠️ Partial | ✅ Ready | Coordinates rounded, owner-only access |
| OAuth UI Buttons | ⚠️ Partial | ⚠️ Partial | **NOT FIXED** - Still needed |
| Account Deletion RPC | ⚠️ Partial | ⚠️ Partial | **NOT FIXED** - Still needed |

### Current Top Blockers (Ranked by Risk)

| Priority | Blocker | Risk | Status vs Last Audit |
|----------|---------|------|---------------------|
| **P0** | RevenueCat using TEST API key | CRITICAL | ❌ UNCHANGED |
| **P0** | Push notification entitlement = "development" | CRITICAL | ❌ UNCHANGED |
| **P0** | Apple Team ID not configured | CRITICAL | ❌ UNCHANGED |
| **P0** | App Store Connect products not created | CRITICAL | ❌ UNCHANGED (Human-only) |
| **P1** | Account deletion RPC not implemented | HIGH | ❌ UNCHANGED |
| **P1** | OAuth UI buttons not rendered | HIGH | ❌ UNCHANGED |
| **P1** | APNs certificate not configured | HIGH | ❌ UNCHANGED (Human-only) |
| ~~P1~~ | ~~No App Tracking Transparency~~ | ~~MEDIUM~~ | ✅ DEMOTED (PostHog doesn't require) |
| ~~P2~~ | ~~No rate limiting~~ | ~~MEDIUM~~ | ✅ FIXED |
| ~~P2~~ | ~~No security audit log~~ | ~~LOW~~ | ✅ FIXED |

### Revised Critical Path (Engineering Days)

| Phase | Tasks | Effort | Notes |
|-------|-------|--------|-------|
| **Day 1-2** | P0 blockers (Human-only: RevenueCat prod key, APNs setup, Team ID, entitlements) | 2 days | Apple Developer access required |
| **Day 2** | AI-implementable: OAuth buttons, Account deletion RPC | 0.5 day | Can be done in parallel |
| **Day 3** | App Store Connect setup (products, screenshots, metadata) | 1 day | Human-only |
| **Day 4** | Testing & QA | 1 day | Sandbox purchases, deep links, push |
| **Day 5** | Submit for review | 0.5 day | All items complete |

**Total: ~5 engineering days** (reduced from 5.5 due to security fixes already complete)

---

## 2) UPDATED READINESS MATRIX

### Items Fixed Since Last Audit ✅

| Feature/Area | Previous Status | Current Status | Evidence |
|--------------|-----------------|----------------|----------|
| Rate Limiting | ❌ Missing | ✅ Ready | `20260104100000_security_hardening_cve_2025_48757.sql` |
| Security Audit Log | ❌ Missing | ✅ Ready | `security_audit_log` table with RLS |
| SECURITY DEFINER Fixes | ⚠️ Partial | ✅ Ready | All functions now have `search_path = public` |
| Orphan Data Cleanup | ❌ Missing | ✅ Ready | `cleanup_orphaned_join_requests()` + FK cascades |
| Trip Invite Security | ⚠️ Partial | ✅ Ready | Public enumeration vulnerability fixed |
| Organization Invite Security | ⚠️ Partial | ✅ Ready | Token viewing restricted |
| Profile Privacy View | ⚠️ Partial | ✅ Ready | `profiles_public` view with `security_invoker` |
| Location Privacy | ⚠️ Partial | ✅ Ready | Coordinates rounded to ~1km, owner-only access |
| Data Export | ❌ Missing | ✅ Ready | `export-trip` Edge Function + PDF generation |

### Items Still Requiring Work

#### AI-Implementable (Bucket B)

| Feature/Area | Status | Evidence | Gap | Priority |
|--------------|--------|----------|-----|----------|
| OAuth UI Buttons | ⚠️ Partial | `useAuth.tsx:553-619` has functions | Buttons not rendered in `AuthModal.tsx` | **P1** |
| Account Deletion RPC | ⚠️ Partial | UI calls RPC in `ConsumerGeneralSettings.tsx:50` | RPC `request_account_deletion` doesn't exist | **P1** |
| Hardcoded Supabase Key | ⚠️ Low Risk | `src/integrations/supabase/client.ts` has fallback | Best practice violation (has error handling) | P2 |
| ICS Import | ❌ Missing | ICS Export works in `calendarExport.ts` | Import not implemented | P3 |
| Test Coverage Thresholds | ⚠️ Disabled | `vitest.config.ts` has thresholds commented | Enforcement disabled | P3 |

#### Human-Only (Bucket C) - UNCHANGED

| Feature/Area | Status | Where | Priority |
|--------------|--------|-------|----------|
| RevenueCat Production Key | ❌ Not Set | `AppDelegate.swift:13`, `src/constants/revenuecat.ts:17` | **P0** |
| Push Entitlement Production | ❌ Development | `App.entitlements:11` (`aps-environment`) | **P0** |
| Apple Team ID | ❌ Placeholder | `api/aasa.ts:25` (`PLACEHOLDER_APPLE_TEAM_ID`) | **P0** |
| App Store Connect Products | ❌ Not Created | App Store Connect dashboard | **P0** |
| APNs Certificate | ❌ Not Configured | Apple Developer Portal | **P1** |
| RevenueCat Dashboard | ❌ Not Configured | RevenueCat dashboard | **P1** |
| Banking/Tax Info | ❌ Not Set | App Store Connect | **P1** |
| Company Address in Legal | ❌ Placeholder | Privacy Policy, Terms of Service | P2 |

---

## 3) BUCKET A: Implemented & Ready (EXPANDED)

All items from the previous audit PLUS these newly verified items:

### Security Improvements (NEW) ✅
- **CVE-2025-48757 Compliance**: All 11+ SECURITY DEFINER functions now have `search_path = public`
- **Rate Limiting**: Database-backed `rate_limits` table with `increment_rate_limit()` function
- **RLS Audit Helper**: `audit_rls_status()` function for compliance checking
- **Security Audit Log**: `security_audit_log` table tracking sensitive operations
- **Trip Invite Security**: Public enumeration prevented, admin-only create/update/delete
- **Organization Invite Security**: Users can only view their own pending invites
- **Profile Privacy**: `profiles_public` view with `security_invoker = true`, email/phone masked

### Data Management (NEW) ✅
- **Orphan Cleanup**: `cleanup_orphaned_join_requests()` returns count of deleted records
- **FK Cascades**: `trip_join_requests` now cascade deletes when users removed
- **Valid Pending Requests View**: Filters out orphaned requests automatically
- **Enhanced Join Request Handlers**: `approve_join_request()` and `reject_join_request()` validate user existence

### Privacy Hardening (NEW) ✅
- **Location Privacy**: User accommodations restricted to owner-only access
- **Coordinate Precision**: Rounded to ~1km at database layer on insert/update
- **Backfill Applied**: Existing rows updated to approximate precision

### Data Export (UPGRADED) ✅
- **PDF Export**: `export-trip` Edge Function with Puppeteer
- **Client Export**: `exportPdfClient.ts` with jsPDF
- **Sections**: Calendar, Payments, Polls, Tasks, Places, Roster, Broadcasts, Attachments
- **Features**: Image embedding, pagination, Unicode support

---

## 4) BUCKET B: AI-Implementable Items (REDUCED)

### Items Remaining: 2 Critical, 3 Low Priority

---

### 4.1 OAuth UI Buttons (P1 - STILL NEEDED)

**Current State**: Functions `signInWithGoogle()` and `signInWithApple()` exist in `useAuth.tsx` (lines 553-619) and are exported via context. However, **no UI buttons call these functions anywhere in the codebase**.

**Evidence**:
- `src/hooks/useAuth.tsx:553-585` - `signInWithGoogle()` implemented
- `src/hooks/useAuth.tsx:587-619` - `signInWithApple()` implemented
- `src/components/AuthModal.tsx` - **NO OAuth buttons rendered** (grep returns 0 matches)

**Files to Modify**:
- `src/components/AuthModal.tsx`

**Implementation**:
```tsx
// Add after the form, before closing the modal content div
// Around line 360, after the "Don't have an account?" section

{mode !== 'forgot' && (
  <>
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-white/20" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white/10 px-2 text-gray-400">Or continue with</span>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => signInWithApple()}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
        </svg>
        Apple
      </button>
      <button
        type="button"
        onClick={() => signInWithGoogle()}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Google
      </button>
    </div>
  </>
)}
```

**Note**: Must also destructure `signInWithGoogle` and `signInWithApple` from `useAuth()` at the top of the component.

**Effort**: **S** [1-2 hours]

---

### 4.2 Account Deletion RPC (P1 - STILL NEEDED)

**Current State**: UI in `ConsumerGeneralSettings.tsx` calls `supabase.rpc('request_account_deletion')` but the RPC function does not exist in any migration.

**Evidence**:
- `src/components/consumer/ConsumerGeneralSettings.tsx:50` - Calls RPC with graceful fallback
- `supabase/migrations/` - grep for `request_account_deletion` returns **0 results**

**Note**: The orphan cleanup migration (`20260104000000_fix_orphaned_join_requests.sql`) handles **join request cleanup**, NOT full account deletion. These are different functions.

**Files to Create**:
- `supabase/migrations/20260110000000_account_deletion_rpc.sql`

**Implementation**:
```sql
-- Account deletion request function
-- Marks account for deletion with 30-day grace period per App Store guidelines

-- First, add columns to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'deletion_requested_at') THEN
    ALTER TABLE public.profiles ADD COLUMN deletion_requested_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'deletion_scheduled_for') THEN
    ALTER TABLE public.profiles ADD COLUMN deletion_scheduled_for timestamptz;
  END IF;
END
$$;

-- Create the RPC function
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_scheduled_date timestamptz;
BEGIN
  -- Verify authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate deletion date (30 days from now)
  v_scheduled_date := now() + interval '30 days';

  -- Mark profile for deletion
  UPDATE public.profiles
  SET
    deletion_requested_at = now(),
    deletion_scheduled_for = v_scheduled_date
  WHERE user_id = v_user_id;

  -- Log to security audit
  INSERT INTO public.security_audit_log (event_type, user_id, details)
  VALUES (
    'account_deletion_requested',
    v_user_id,
    jsonb_build_object(
      'scheduled_for', v_scheduled_date,
      'requested_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account scheduled for deletion',
    'scheduled_for', v_scheduled_date
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

-- Create function to cancel deletion request
CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET
    deletion_requested_at = NULL,
    deletion_scheduled_for = NULL
  WHERE user_id = v_user_id
    AND deletion_scheduled_for > now(); -- Can only cancel if not yet deleted

  -- Log cancellation
  INSERT INTO public.security_audit_log (event_type, user_id, details)
  VALUES ('account_deletion_cancelled', v_user_id, '{}'::jsonb);

  RETURN jsonb_build_object('success', true, 'message', 'Deletion request cancelled');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;

COMMENT ON FUNCTION public.request_account_deletion() IS
'Marks user account for deletion with 30-day grace period. App Store Guideline 5.1.1 compliant.';
```

**Edge Cases**:
- User with active subscriptions → Should warn but not block (RevenueCat handles refunds)
- Trip owner → Consider transferring ownership or warning
- Re-login during grace period → Add UI to cancel deletion

**Effort**: **M** [2-3 hours]

---

### 4.3 Hardcoded Supabase Key (P2 - LOW PRIORITY)

**Current State**: Still has hardcoded fallback but with proper error handling.

**Assessment**: This is a **low-risk best practice issue**. The key is an `anon` (public) key, not a service role key. The current implementation has error handling for missing env vars. Recommend fixing but not blocking.

**Effort**: **S** [30 minutes]

---

### 4.4 ICS Import (P3 - NICE TO HAVE)

**Current State**: Export works, import not implemented.

**Assessment**: Not a blocker for App Store submission. Can be added post-launch.

**Effort**: **M** [4-6 hours]

---

### 4.5 Test Coverage Thresholds (P3 - NICE TO HAVE)

**Current State**: Thresholds commented out in `vitest.config.ts`.

**Assessment**: Not a blocker for App Store submission. Quality improvement for post-launch.

**Effort**: **S** [1 hour]

---

## 5) BUCKET C: Human-Only Requirements (UNCHANGED)

All items from the previous audit remain unchanged. Key items:

### Critical (P0) - Must Complete Before Submission

1. **Apple Developer Account** - Get Team ID
2. **App Store Connect** - Create app record
3. **IAP Products** - Create 4 subscription products
4. **RevenueCat Dashboard** - Configure entitlements and offerings
5. **Replace RevenueCat Test Key** - In `AppDelegate.swift` and `revenuecat.ts`
6. **Change aps-environment** - From `development` to `production` in `App.entitlements`
7. **Set APPLE_TEAM_ID** - Environment variable for AASA

### High Priority (P1)

8. **APNs Key** - Generate and upload `.p8` file
9. **Banking/Tax** - Complete in App Store Connect

### Medium Priority (P2)

10. **Company Address** - Add to Privacy Policy and Terms of Service

See previous audit for detailed checklists for each item.

---

## 6) REVISED "FIRST 48 HOURS" LAUNCH SPRINT PLAN

### Day 1 (Hours 1-8): Human Setup + AI Implementation (Parallel)

| Hour | Task | Owner | DoD |
|------|------|-------|-----|
| 1-2 | Apple Developer Account verification | Human | Team ID obtained |
| 1-2 | **Implement OAuth buttons in AuthModal** | **AI** | Buttons visible, functional |
| 2-3 | Create app in App Store Connect | Human | App record created |
| 2-3 | **Implement account deletion RPC** | **AI** | Migration created, RPC callable |
| 3-4 | Create all 4 IAP products | Human | Products ready |
| 4-5 | Configure RevenueCat dashboard | Human | Entitlements created |
| 5-6 | Generate APNs key | Human | `.p8` downloaded |
| 6-7 | Update environment variables | Human | Production keys in Vercel |
| 7-8 | Replace RevenueCat test key in code | AI/Human | Production key in place |

### Day 2 (Hours 9-16): Finalization & Testing

| Hour | Task | Owner | DoD |
|------|------|-------|-----|
| 9-10 | Change push entitlement to production | AI | `aps-environment` = `production` |
| 10-11 | Update AASA with Team ID | Human | Universal links test passing |
| 11-12 | Run full test suite | AI | All tests passing |
| 12-13 | Build iOS archive | Human | `.ipa` generated |
| 13-14 | Test sandbox purchases | Human | All 4 products purchasable |
| 14-15 | Test deep links & push | Human | Working correctly |
| 15-16 | Upload to App Store Connect | Human | Build visible in TestFlight |

### Day 2 Evening (Hours 17-20): Submit

| Hour | Task | Owner | DoD |
|------|------|-------|-----|
| 17-18 | Internal TestFlight testing | Human | Smoke test passed |
| 18-19 | Complete submission form | Human | All fields filled |
| 19-20 | Submit for review | Human | Status: "Waiting for Review" |

---

## 7) SUMMARY OF WHAT'S LEFT

### AI Can Fix Now (2 items, ~3-4 hours total):

| Item | Priority | Effort | Blocking? |
|------|----------|--------|-----------|
| OAuth UI Buttons | P1 | S (1-2h) | Yes - Users can't use social login |
| Account Deletion RPC | P1 | M (2-3h) | Yes - App Store Guideline 5.1.1 |

### Human Must Do (7 items):

| Item | Priority | Where |
|------|----------|-------|
| Get Apple Team ID | P0 | Apple Developer Portal |
| Create IAP Products | P0 | App Store Connect |
| Configure RevenueCat | P0 | RevenueCat Dashboard |
| Replace RevenueCat Test Key | P0 | Xcode / Code |
| Change aps-environment to production | P0 | Xcode |
| Generate APNs Key | P1 | Apple Developer Portal |
| Complete Banking/Tax | P1 | App Store Connect |

### Already Fixed Since Last Audit ✅:
- Security hardening (CVE-2025-48757)
- Rate limiting
- Security audit logging
- Orphan data cleanup
- Location privacy
- Data export (PDF)
- RLS policy fixes
- Profile privacy enforcement

---

## 8) RECOMMENDATION

**Proceed with implementation of the 2 remaining AI-implementable items:**

1. **OAuth UI Buttons** - Add Google/Apple sign-in buttons to AuthModal
2. **Account Deletion RPC** - Create the Supabase migration

Once those are complete, the app will be **ready for human configuration steps** in Apple Developer Portal and App Store Connect. The security posture is now solid, and all core features are production-ready.

**Estimated time to "code complete"**: 3-4 hours of AI implementation work.

**Estimated time to submission**: 2 days (assuming Apple account access and banking info ready).
