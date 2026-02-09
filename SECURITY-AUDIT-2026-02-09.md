# Chravel Security Audit Report

**Date:** 2026-02-09
**Methodology:** White-box source code analysis following Shannon AI / OWASP Top 10 methodology
**Scope:** Full codebase -- frontend (React/TypeScript), backend (Supabase Edge Functions), database (SQL migrations/RLS), configuration, and dependencies
**Auditor:** Claude Code (Opus 4.6)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Fixed by Claude Code (This Session)](#section-a-fixed-by-claude-code)
3. [Requires Human Developer -- CRITICAL](#section-b-critical-human-required)
4. [Requires Human Developer -- HIGH](#section-c-high-human-required)
5. [Requires Human Developer -- MEDIUM](#section-d-medium-human-required)
6. [Requires Human Developer -- LOW](#section-e-low-human-required)
7. [Dependency Vulnerabilities](#dependency-vulnerabilities)
8. [Positive Security Findings](#positive-findings)
9. [Remediation Priority Matrix](#remediation-priority)

---

## Executive Summary <a name="executive-summary"></a>

This audit identified **67 security findings** across the Chravel codebase:

| Severity | Total Found | Fixed by Claude Code | Remaining for Humans |
|----------|------------|---------------------|---------------------|
| CRITICAL | 9 | 0 | 9 |
| HIGH | 18 | 5 | 13 |
| MEDIUM | 24 | 5 | 19 |
| LOW | 16 | 2 | 14 |
| **TOTAL** | **67** | **12** | **55** |

### Key Risk Areas
1. **RLS Policy Gaps** -- Real-time GPS locations readable by anyone; profiles privacy reverted
2. **Edge Function Authorization** -- push-notifications, file-upload, send-push lack authorization checks
3. **Client-Side Privilege Escalation** -- `switchRole()` allows any user to grant themselves admin permissions
4. **Demo Mode Auth Bypass** -- Any user can activate demo mode via localStorage, bypassing all auth
5. **No Route-Level Auth Guards** -- All routes accessible without authentication wrapper

### What Was Fixed (This Session)
- Hardened XSS sanitization with additional bypass prevention
- Removed production debug mode activation (query param + global window object)
- Fixed wildcard CORS in security headers fallback
- Fixed error detail/stack trace leakage in edge functions
- Fixed file size limit inconsistency in image-upload
- Added missing auth header null check in image-upload
- Strengthened JWT validation (require `exp` claim)
- Improved `.gitignore` to cover `.env.*` patterns
- Upgraded ESLint `no-explicit-any` from `off` to `warn`
- Migrated verify-identity function from wildcard to validated CORS

---

## SECTION A: Fixed by Claude Code (This Session) <a name="section-a-fixed-by-claude-code"></a>

These issues have been resolved in this commit. No further action needed.

### A1. Production Auth Debug Activation via Query Parameter
- **File:** `src/utils/authDebug.ts`
- **Was:** Any user could enable auth debug logging in production by adding `?authDebug=1` to any URL, or via `chravelAuthDebug.enable()` in console
- **Risk:** Information leakage of auth flow internals, session state, error patterns
- **Fix:** Restricted debug mode and global window helpers to `import.meta.env.DEV` only

### A2. Incomplete XSS Sanitization in `InputValidator.sanitizeText()`
- **File:** `src/utils/securityUtils.ts`
- **Was:** Simple regex easily bypassed via HTML entity encoding (`&#60;`), URL encoding (`%3C`), whitespace tricks (`java\nscript:`), backtick injection
- **Fix:** Added filters for HTML entities (`&#`), URL-encoded brackets (`%3C`, `%3E`), `vbscript:`, `data:` protocols, whitespace-tolerant patterns, and backtick characters

### A3. Weak Trip ID Validation
- **File:** `src/utils/securityUtils.ts`
- **Was:** Accepted any alphanumeric string up to 50 chars; too permissive for UUID-based IDs
- **Fix:** Added explicit UUID regex validation while maintaining backward compatibility for legacy short IDs

### A4. CSS Injection via Incomplete Value Sanitization
- **File:** `src/utils/securityUtils.ts`
- **Was:** Did not block `expression()`, `-moz-binding`, or `url()` CSS values
- **Fix:** Added blocks for `expression(`, `-moz-binding`, and `url(` patterns

### A5. Missing `exp` Claim Treated as Valid Token
- **File:** `src/utils/tokenValidation.ts`
- **Was:** Tokens without `exp` claim passed validation, enabling never-expiring crafted tokens
- **Fix:** Missing `exp` now returns `{ valid: false, reason: 'MISSING_EXP_CLAIM' }`

### A6. `.gitignore` Missing Coverage for `.env.*` Files
- **File:** `.gitignore`
- **Was:** Only ignored `.env` (exact match). `.env.production`, `.env.staging`, `.env.development` could be committed with real secrets
- **Fix:** Added `.env.*` with exceptions for `.env.example` and `.env.production.example`

### A7. ESLint `no-explicit-any` Disabled
- **File:** `eslint.config.js`
- **Was:** `"off"` -- allowed unrestricted `any` usage contrary to CLAUDE.md guidelines
- **Fix:** Changed to `"warn"` to flag new `any` usage without breaking the build

### A8. Wildcard CORS in Security Headers Fallback
- **File:** `supabase/functions/_shared/securityHeaders.ts`
- **Was:** Static `securityHeaders` and `createOptionsResponse()` spread wildcard `corsHeaders` when no `req` was passed
- **Fix:** Defaults to `https://chravel.app` instead of `*` when request is unavailable

### A9. Error Detail Leakage in verify-identity
- **File:** `supabase/functions/verify-identity/index.ts`
- **Was:** `sessionError.message` and raw error messages returned to client; wildcard CORS used
- **Fix:** Generic error messages; migrated from `corsHeaders` to `getCorsHeaders(req)`

### A10. Stack Trace Leakage in export-user-data
- **File:** `supabase/functions/export-user-data/index.ts`
- **Was:** Full `error.stack` returned in response body, exposing file paths, library versions
- **Fix:** Generic "Data export failed" message only

### A11. Image Upload Auth Header Non-Null Assertion
- **File:** `supabase/functions/image-upload/index.ts`
- **Was:** `req.headers.get('Authorization')!` -- crashes with generic error if header missing
- **Fix:** Explicit null check with proper 401 response

### A12. Image Upload File Size Limit Inconsistency
- **File:** `supabase/functions/image-upload/index.ts`
- **Was:** Runtime check enforced 10MB but error message said 5MB; Zod schema enforced 5MB
- **Fix:** Aligned runtime limit to 5MB to match error message and Zod schema

---

## SECTION B: CRITICAL -- Requires Human Developer <a name="section-b-critical-human-required"></a>

### B1. Real-Time GPS Locations Readable by Anyone
- **File:** `supabase/migrations/20250708000001_realtime_locations.sql:34-35`
- **Table:** `realtime_locations`
- **Policy:** `USING (true)` -- "For demo purposes, allow all reads"
- **Impact:** Any authenticated user can read the real-time GPS coordinates, heading, and accuracy of every user in the system
- **Why Claude Code can't fix:** Changing RLS policies requires a new SQL migration. Incorrect migration could lock users out of legitimate location sharing. Requires understanding of which trip members should see which locations.
- **Recommended fix:** Create new migration:
```sql
DROP POLICY IF EXISTS "Trip participants can view locations" ON public.realtime_locations;
CREATE POLICY "Trip members can view locations"
ON public.realtime_locations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = realtime_locations.trip_id
    AND tm.user_id = auth.uid()
    AND tm.status = 'active'
  )
);
```

### B2. User Locations (Find My Friends) Readable by Anyone
- **File:** `supabase/migrations/20250723000001_production_ready_tables.sql:124-127`
- **Table:** `user_locations`
- **Policy:** `USING (true)`
- **Impact:** Any user can track any other user's physical location, battery level, and movement state
- **Why Claude Code can't fix:** Same as B1 -- requires new SQL migration with careful membership scoping
- **Recommended fix:** Same pattern as B1, replace with trip membership check

### B3. Profiles Privacy Reverted to Open Access
- **File:** `supabase/migrations/20251022000000_fix_auth_flow.sql:101-105`
- **Impact:** Previous privacy controls (`show_email`, `show_phone` flags) were overridden by `USING (true)` for all authenticated users. All profile data (name, email, phone, avatar) visible to everyone.
- **Why Claude Code can't fix:** Requires understanding which privacy policy version is correct and testing that trip member lookups still work. May need coordination with the frontend profile display logic.
- **Recommended fix:** Drop the `"Authenticated users can view other profiles"` policy and restore the trip co-member scoped policy from migration `20251017211617`

### B4. SECURITY DEFINER Functions Accept Unchecked User IDs
- **Functions affected:** `create_payment_with_splits()`, `toggle_task_status()`, `vote_on_poll()`, `create_event_with_conflict_check()`, `remove_trip_member_safe()`, `increment_campaign_stat()`, `log_basecamp_change()`, `get_trip_conversation_history()`
- **Impact:** These functions bypass RLS and accept client-supplied `p_user_id` without verifying `auth.uid()`. Enables privilege escalation: any user can create payments as another user, remove trip members, forge audit logs, or read AI conversations for any trip.
- **Why Claude Code can't fix:** Each function needs individual `IF auth.uid() != p_user_id THEN RAISE EXCEPTION` guards plus trip membership checks. Incorrect implementation could break legitimate functionality.
- **Recommended fix:** Add `auth.uid()` validation to each SECURITY DEFINER function:
```sql
-- Example for remove_trip_member_safe:
IF auth.uid() != p_removing_user_id THEN
  RAISE EXCEPTION 'Unauthorized: user ID mismatch';
END IF;
```

### B5. push-notifications Edge Function -- No Authorization
- **File:** `supabase/functions/push-notifications/index.ts`
- **Impact:** Any authenticated user can send push notifications, emails (via SendGrid), and SMS (via Twilio) to ANY user with arbitrary content. Enables phishing, spam, and denial of service. Can also save/remove push tokens for other users.
- **Why Claude Code can't fix:** The function has complex routing logic (`send_push`, `send_email`, `send_sms`, `save_token`, `remove_token`) and each handler needs different authorization logic. Incorrect changes could break legitimate notification delivery.
- **Recommended fix:** Extract user ID from JWT via `supabase.auth.getUser(token)` in each handler; verify the caller matches `userId` or has trip membership for trip-scoped notifications.

### B6. send-push Edge Function -- No Authorization
- **File:** `supabase/functions/send-push/index.ts`
- **Impact:** Any authenticated user can send push notifications with arbitrary content to any user or all members of any trip. Uses service role key, bypassing RLS.
- **Why Claude Code can't fix:** Same concern as B5 -- needs careful authorization without breaking notification flow
- **Recommended fix:** Verify calling user is a member (or admin) of the target trip before sending

### B7. file-upload Edge Function -- Client-Supplied userId Trusted
- **File:** `supabase/functions/file-upload/index.ts:33`
- **Impact:** `userId` is taken from `formData.get('userId')` instead of the JWT. Any authenticated user can upload files attributed to any other user, bypassing RLS via service role key.
- **Why Claude Code can't fix:** Need to verify the function signature is consistent across all callers (frontend components that invoke this function). Changing from form data to JWT extraction could break existing upload flows if callers depend on the current behavior.
- **Recommended fix:** Replace `formData.get('userId')` with JWT extraction: `const { data: { user } } = await supabase.auth.getUser(token)`

### B8. update-location Edge Function -- No Trip Membership Verification
- **File:** `supabase/functions/update-location/index.ts:41`
- **Impact:** Authenticates user but does NOT verify trip membership. Any authenticated user can insert location data into any trip's realtime tracking.
- **Why Claude Code can't fix:** The `verifyTripMembership` utility exists in `_shared/validation.ts` but adding it requires understanding the function's callers and error handling flow.
- **Recommended fix:** Add trip membership check before the upsert using the existing `verifyTripMembership` utility

### B9. Client-Side Role Switching Without Server Validation
- **File:** `src/hooks/useAuth.tsx:989-1013`
- **Impact:** `switchRole()` function grants arbitrary permissions (`admin`, `finance`, `compliance`) purely in client-side state. Any user can escalate privileges via React DevTools or console. If any UI or API call trusts `user.permissions`, this is a complete privilege escalation.
- **Why Claude Code can't fix:** The `switchRole` function is used by enterprise/organization features. Removing it could break role-based UI for legitimate users. The fix requires a server-side role validation endpoint that doesn't exist yet.
- **Recommended fix:**
  1. Create a server-side endpoint to validate role assignments
  2. Modify `switchRole` to call the server endpoint and re-fetch the user's actual roles
  3. Never trust client-side `permissions` for security decisions

---

## SECTION C: HIGH -- Requires Human Developer <a name="section-c-high-human-required"></a>

### C1. Demo Mode Bypasses All Auth Requirements
- **File:** `src/utils/authGate.ts:10-11`
- **Impact:** When `demoView === 'app-preview'`, authentication is never required. Any user can activate this by setting `localStorage.setItem('TRIPS_DEMO_VIEW', 'app-preview')` in the browser console.
- **Why not auto-fixed:** Demo mode is actively used for investor demos and onboarding. Removing it would break the demo flow. Needs a server-side gating mechanism.
- **Recommended fix:** Gate demo mode behind a server-verified token or authenticated admin action instead of localStorage

### C2. Demo User Has Admin Role and Write Permissions
- **File:** `src/hooks/useAuth.tsx:113-141`
- **Impact:** Demo user created with `isPro: true`, `proRole: 'admin'`, `permissions: ['read', 'write']`. Combined with C1, any visitor gets admin-level UI access.
- **Why not auto-fixed:** Reducing demo user permissions could break the demo experience that the product team relies on
- **Recommended fix:** Set demo user to viewer/member role; create separate demo data that doesn't require admin access to display

### C3. Super Admin Determined by Client-Side Email Check
- **Files:** `src/hooks/useAuth.tsx:330-341`, `src/constants/admins.ts`, `supabase/functions/create-trip/index.ts:72-78`
- **Impact:** `SUPER_ADMIN_EMAILS = ['ccamechi@gmail.com']` hardcoded in source. Admin status granted client-side by email match. Email exposed in committed source code.
- **Why not auto-fixed:** Moving to server-side admin check requires a database column or custom claims, plus migration. The email is already in git history.
- **Recommended fix:**
  1. Add `is_super_admin` boolean column to `profiles` table
  2. Check server-side in edge functions and RLS policies
  3. Remove hardcoded email from source code
  4. Consider rotating any admin credentials

### C4. No Route-Level Authentication Guards
- **File:** `src/App.tsx:528-729`
- **Impact:** No `ProtectedRoute` wrapper exists. Routes like `/profile`, `/settings`, `/admin/scheduled-messages`, `/organizations` are all accessible without auth checks. Each page must independently implement auth gating.
- **Why not auto-fixed:** Creating a `ProtectedRoute` component and wrapping all routes requires understanding which routes should be public vs. protected. Incorrect classification could lock users out of public features (trip previews, join flows, event pages).
- **Recommended fix:** Create a `ProtectedRoute` wrapper:
```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" />;
  return <>{children}</>;
}
```
Then wrap all authenticated routes.

### C5. Admin Route Has No Role-Based Access Control
- **File:** `src/App.tsx:681-688`
- **Impact:** `/admin/scheduled-messages` accessible to any visitor. If `AdminDashboard` doesn't implement its own server-verified role check, it exposes admin functionality.
- **Why not auto-fixed:** Needs the `ProtectedRoute` infrastructure from C4 plus a role check component
- **Recommended fix:** Add role-based route guard that verifies admin status server-side

### C6. Legacy Wildcard CORS in Multiple Edge Functions
- **Files:** `create-trip/index.ts`, `image-upload/index.ts`, `file-upload/index.ts`, `push-notifications/index.ts`, `send-push/index.ts`, `update-location/index.ts`, `seed-demo-data/index.ts`, `generate-trip-preview/index.ts`
- **Impact:** `Access-Control-Allow-Origin: '*'` allows any website to make cross-origin requests
- **Why not auto-fixed:** Each function needs to be individually migrated from `corsHeaders` to `getCorsHeaders(req)`. Some functions use the cors headers in multiple response paths. Incorrect migration could break legitimate cross-origin requests from the mobile app or preview domains.
- **Recommended fix:** Replace each `corsHeaders` import with `getCorsHeaders(req)` calls. Test from all client origins (web, mobile, preview).

### C7. generate-trip-preview Exposes Trip Data Without Auth
- **File:** `supabase/functions/generate-trip-preview/index.ts`
- **Impact:** `verify_jwt = false` + service role key = any unauthenticated request with a trip UUID gets trip name, description, destination, dates, cover image, member count
- **Why not auto-fixed:** This is intentionally public for OG meta tag generation (social media unfurling). Restricting it would break link previews.
- **Recommended fix:** Add `is_public` flag to trips table; only serve previews for public/shared trips. Minimize returned data.

### C8. join-trip Race Condition on Invite Usage Counter
- **File:** `supabase/functions/join-trip/index.ts:437-449`
- **Impact:** Non-atomic read-then-write on `current_uses` allows more users than `max_uses` if they join simultaneously
- **Why not auto-fixed:** Requires creating a Postgres RPC function with atomic increment, which is a database migration
- **Recommended fix:** Create RPC with `current_uses = current_uses + 1 RETURNING current_uses` and check against `max_uses` atomically

### C9. Tables Missing RLS Entirely
- **Tables:** `scheduled_messages`, `daily_digests`, `message_templates` (from `002_scheduled_messages.sql`, `003_messages_enhancement.sql`), `email_bounces` (from `20251026_address_known_issues.sql`)
- **Impact:** All data in these tables is readable and writable by any user through the Supabase API
- **Why not auto-fixed:** Requires new SQL migration; incorrect RLS could break scheduled message delivery and email processing
- **Recommended fix:** New migration to enable RLS and add appropriate policies

### C10. trip_chat_messages -- Overly Permissive INSERT Policy
- **File:** `supabase/migrations/20250807200405_ed1ba20a.sql:140-143`
- **Impact:** `WITH CHECK (auth.uid() IS NOT NULL)` lets any authenticated user insert messages into ANY trip's chat. Later migration added a trip-member-scoped policy, but Postgres RLS uses OR logic -- the permissive policy still applies.
- **Why not auto-fixed:** Requires a migration to DROP the old policy by name. Incorrect policy drop could break chat entirely.
- **Recommended fix:**
```sql
DROP POLICY IF EXISTS "Authenticated can insert trip_chat_messages" ON public.trip_chat_messages;
```

### C11. trip_embeddings -- Any User Can Manipulate AI Data
- **File:** `supabase/migrations/20251031214519_f794d8db.sql:73-76`
- **Impact:** `FOR ALL USING (auth.uid() IS NOT NULL)` lets any authenticated user insert, update, or delete embeddings for any trip. Could poison AI responses.
- **Why not auto-fixed:** Requires migration; need to understand if embeddings are written by edge functions (service role) or by users directly
- **Recommended fix:** Restrict to service_role only or add trip membership check

### C12. calendar_connections Stores OAuth Tokens in Plaintext
- **File:** `supabase/migrations/20250723000001_production_ready_tables.sql:66-78`
- **Impact:** Google, Outlook, Apple calendar OAuth tokens stored as plaintext TEXT columns. Database leak exposes all users' calendar access.
- **Why not auto-fixed:** Requires application-layer encryption (encrypt before INSERT, decrypt after SELECT). Cannot be done purely in SQL.
- **Recommended fix:** Implement `pgcrypto` encryption or application-level encryption for `access_token` and `refresh_token` columns

### C13. Hardcoded Supabase Anon Key in Page Component (Direct Fetch)
- **File:** `src/pages/ProTripDetailDesktop.tsx:388`
- **Impact:** Supabase anon key hardcoded in a raw `fetch()` call bypassing the centralized client. Violates CLAUDE.md rules. Makes key rotation harder.
- **Why not auto-fixed:** The `ProTripDetailDesktop.tsx` page has complex logic and the raw fetch may have specific reasons (e.g., avoiding client middleware). Needs manual review of why the centralized client wasn't used.
- **Recommended fix:** Replace raw fetch with `supabase.functions.invoke()` call

---

## SECTION D: MEDIUM -- Requires Human Developer <a name="section-d-medium-human-required"></a>

### D1. Client-Side Rate Limiting Only
- **File:** `src/utils/securityUtils.ts:55-76`
- **Impact:** Rate limiter stores counts in browser memory Map -- trivially bypassed by new tab, page refresh, or direct API calls
- **Recommended fix:** Implement server-side rate limiting in `_shared/security.ts` for edge functions; use Redis or Supabase RPC-based approach

### D2. Rate Limit Fails Open on Database Error
- **File:** `supabase/functions/_shared/security.ts:74-78`
- **Impact:** If rate limit RPC fails, request is allowed through (`return { allowed: true }`)
- **Recommended fix:** Consider fail-closed with a short circuit breaker to prevent availability issues

### D3. create-checkout -- Client-Controlled Origin in Stripe Redirects
- **File:** `supabase/functions/create-checkout/index.ts:100`
- **Impact:** `origin` header used for Stripe's `success_url` and `cancel_url`. Attacker could redirect post-checkout to phishing page.
- **Recommended fix:** Validate origin against allowlist or hardcode the production domain

### D4. push-notifications -- Placeholder Sender Email
- **File:** `supabase/functions/push-notifications/index.ts:122-128`
- **Impact:** Sender email is `noreply@yourdomain.com` -- placeholder never updated. Emails will fail SPF/DKIM. `template` parameter allows arbitrary HTML injection.
- **Recommended fix:** Update sender email; use server-side templates only; remove raw `template` parameter

### D5. Profiles Table -- SELECT Policies Need Reconciliation
- **Multiple migration files**
- **Impact:** Privacy flags (`show_email`, `show_phone`) exist in the profiles table but the latest RLS policy ignores them. Privacy settings in the UI give users false confidence.
- **Recommended fix:** Align SELECT policy with privacy flags

### D6. trip_invites Visible to All When Active
- **File:** `supabase/migrations/20250806230539_f0cad314.sql:56-59`
- **Impact:** Any authenticated user can enumerate all active invite tokens and join uninvited trips
- **Recommended fix:** Restrict SELECT to trip members or exact token lookup

### D7. organization_invites Pending Invites Enumerable
- **File:** `supabase/migrations/20251005161642_d5eac87e.sql:168-170`
- **Impact:** Any user can enumerate pending org invites including email addresses, org IDs, and tokens
- **Recommended fix:** Require matching invite email or exact token for SELECT

### D8. Any Trip Member Can UPDATE Trip Details
- **File:** `supabase/migrations/20251017211617_8c132923.sql`
- **Impact:** No role check in UPDATE policy -- regular members can change trip name, destination, dates
- **Recommended fix:** Add `AND role IN ('admin', 'owner')` to the membership check

### D9. security_audit_log Allows Unrestricted Inserts
- **File:** `supabase/migrations/20251017211617_8c132923.sql`
- **Impact:** `WITH CHECK (true)` lets anyone insert fake audit log entries
- **Recommended fix:** Restrict to service_role only or require `user_id = auth.uid()`

### D10. campaign_analytics INSERT is `WITH CHECK (true)`
- **File:** `supabase/migrations/20251020224444_2f2e93d7.sql:134-136`
- **Impact:** Any user can insert fake analytics events for any campaign
- **Recommended fix:** Require `auth.uid() IS NOT NULL AND user_id = auth.uid()`

### D11. broadcast_views May Not Have RLS Enabled
- **File:** `supabase/migrations/20250115000000_broadcast_enhancements.sql`
- **Impact:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` may target `broadcasts` but not `broadcast_views`
- **Recommended fix:** Verify and add `ALTER TABLE public.broadcast_views ENABLE ROW LEVEL SECURITY;`

### D12. basecamp_change_history Uses Wrong Membership Table
- **File:** `supabase/migrations/20250102000000_add_basecamp_history.sql:51-56`
- **Impact:** Checks `trip_personal_basecamps` instead of `trip_members`, so trip members without basecamps can't see history
- **Recommended fix:** Replace with `trip_members` check

### D13. google-maps-proxy Logs User Data
- **File:** `supabase/functions/google-maps-proxy/index.ts`
- **Impact:** Multiple `console.log` statements log search queries, location data, and addresses in production
- **Recommended fix:** Remove or redact sensitive data from log statements

### D14. create-checkout Logs User Email
- **File:** `supabase/functions/create-checkout/index.ts:59`
- **Impact:** PII (email) in application logs, potential GDPR/CCPA violation
- **Recommended fix:** Remove `email` from logged object

### D15. Hardcoded RevenueCat API Key
- **Files:** `src/config/revenuecat.ts:3`, `src/constants/revenuecat.ts:17`
- **Impact:** Test API key hardcoded in two locations, committed to version control
- **Recommended fix:** Remove hardcoded fallback; require environment variable

### D16. Hardcoded Google Maps API Key Fallback
- **File:** `src/config/maps.ts:13`
- **Impact:** API key hardcoded as fallback, discoverable in bundles. Risk of quota theft if domain restrictions misconfigured.
- **Recommended fix:** Remove fallback; require `VITE_GOOGLE_MAPS_API_KEY` env var

### D17. Hardcoded Stripe Test Key in Comment
- **File:** `src/constants/stripe.ts:9`
- **Impact:** Test publishable key and account email (`christian@chravelapp.com`) in committed source
- **Recommended fix:** Move to env var; remove account email from comments

### D18. CSP Allows `unsafe-inline` and `unsafe-eval`
- **File:** `index.html:21`
- **Impact:** Effectively disables script injection protection. Likely required by Google Maps SDK.
- **Recommended fix:** Investigate nonce-based CSP for inline scripts. May need to accept `unsafe-eval` for Google Maps but should try to remove `unsafe-inline`.

### D19. Missing Foreign Key Constraints on 12+ Tables
- **Tables:** `trip_invites`, `trip_members`, `realtime_locations`, `user_locations`, `trip_payment_messages`, `payment_splits`, `trip_chat_messages`, `trip_files`, `trip_links`, `trip_polls`
- **Impact:** Records can reference non-existent trips or users, potentially bypassing RLS JOIN conditions
- **Recommended fix:** Add FK constraints after cleaning up orphaned records

---

## SECTION E: LOW -- Requires Human Developer <a name="section-e-low-human-required"></a>

### E1. TypeScript `strictNullChecks: false`
- **File:** `tsconfig.json:17`
- **Impact:** Compiler won't catch null dereferences. Security implications when accessing `.id` on null user objects.
- **Recommended fix:** Enable incrementally per-module using `// @ts-strict` comments

### E2. Dev Route Accessible in Production
- **File:** `src/App.tsx:713-720` (`/dev/device-matrix`)
- **Recommended fix:** Gate behind `import.meta.env.DEV`

### E3. Trip Recovery Debug Utils Exposed Globally
- **File:** `src/App.tsx:38`
- **Recommended fix:** Gate `import '@/utils/tripRecovery'` behind `import.meta.env.DEV`

### E4. User Email Sent to Error Tracking Without Consent
- **File:** `src/App.tsx:249-258`
- **Recommended fix:** Gate behind consent mechanism or anonymize

### E5. Loading Timeout Could Bypass Auth Gate
- **File:** `src/hooks/useAuth.tsx:430-435`
- **Impact:** 10s safety timeout forces `isLoading=false` even if auth unresolved. Protected routes may briefly show to unauthenticated users.
- **Recommended fix:** When timeout fires, redirect to auth page instead of clearing loading flag

### E6. Unguarded Console Logging in Production
- **Files:** `src/config/revenuecat.ts:52`, `src/services/tripService.ts:153`, `src/services/basecampService.ts:685`, `src/components/AuthModal.tsx:90`, others
- **Impact:** Leaks user IDs, admin emails, auth state in production console
- **Recommended fix:** Wrap in `import.meta.env.DEV` guards or use structured logger

### E7. Iframes Missing Sandbox Attribute
- **Files:** `src/components/places/DirectionsEmbed.tsx:91`, `src/components/events/AgendaModal.tsx:493`
- **Recommended fix:** Add `sandbox` attribute with minimal permissions

### E8. DeviceTestMatrix User-Controlled iframe src
- **File:** `src/pages/DeviceTestMatrix.tsx:59,193`
- **Recommended fix:** Validate `testPath` starts with `/`

### E9. `user-scalable=no` Blocks Zoom
- **File:** `index.html:8`
- **Impact:** WCAG 1.4.4 accessibility violation
- **Recommended fix:** Remove `maximum-scale=1.0, user-scalable=no`

### E10. Inconsistent Deno/Supabase Library Versions Across Edge Functions
- **Impact:** Subtle behavioral differences across functions
- **Recommended fix:** Standardize all imports using import map

### E11. Many Functions Missing Explicit `verify_jwt` in config.toml
- **Impact:** Relies on Supabase default `verify_jwt = true` which is fragile
- **Recommended fix:** Add explicit setting for every function

### E12. No X-Frame-Options / frame-ancestors HTTP Header
- **Impact:** App can be embedded in malicious iframe for clickjacking
- **Recommended fix:** Add `frame-ancestors 'self'` via Vercel headers or `vercel.json`

### E13. SECURITY.md Checklist Unchecked
- **Impact:** Indicates security review process incomplete
- **Recommended fix:** Complete the checklist items and maintain it

### E14. Capacitor Missing `allowNavigation` Config
- **File:** `capacitor.config.ts`
- **Recommended fix:** Add `server.allowNavigation` list

---

## Dependency Vulnerabilities <a name="dependency-vulnerabilities"></a>

From `npm audit` (15 total: 2 critical, 6 high, 7 moderate):

| Package | Severity | Issue | Fix Available? |
|---------|----------|-------|---------------|
| `jspdf` (<=4.0.0) | **CRITICAL** | Path Traversal + PDF Injection (5 CVEs) | Yes -- upgrade to `^4.1.0` |
| `jspdf-autotable` | **CRITICAL** | Transitive from jspdf | Yes -- upgrade jspdf |
| `react-router-dom` | **HIGH** | XSS via Open Redirects (GHSA-2w69) | Yes -- upgrade |
| `xlsx` (SheetJS) | **HIGH** | Prototype Pollution + ReDoS | **NO FIX** -- consider alternative library |
| `tar` (via `@capacitor/cli`) | **HIGH** | Path Traversal + Symlink Poisoning | Yes -- upgrade `@capacitor/cli` |
| `lodash` | MODERATE | Prototype Pollution in `_.unset`/`_.omit` | Yes |
| `esbuild` (via `vite`) | MODERATE | Dev server request forgery | Yes -- upgrade vite to v7 |
| `vitest` suite | MODERATE | Transitive from vite/esbuild | Yes -- upgrade vitest to v4 |

### Priority Actions:
1. `npm audit fix` for non-breaking upgrades
2. `jspdf` major upgrade to `^4.1.0` (test PDF generation)
3. Evaluate replacing `xlsx` with `exceljs` or `SheetJS Pro` (no fix available)

---

## Positive Security Findings <a name="positive-findings"></a>

The codebase demonstrates strong security fundamentals in several areas:

1. **No `dangerouslySetInnerHTML` or `innerHTML`** -- React's default escaping is consistently used
2. **No `eval()` or `new Function()`** -- no dynamic code execution
3. **All `target="_blank"` links include `rel="noopener noreferrer"`**
4. **JWT bearer auth (not cookies)** -- inherent CSRF protection
5. **Open redirect protection** in auth flow (`getSafeReturnTo()`)
6. **RLS enabled on 30+ core tables** with trip membership scoping
7. **JWT verification on 60+ edge functions** via `config.toml`
8. **Stripe webhook signature verification** -- not just JWT
9. **Secure storage verification sessions** with MFA support and audit trail
10. **Pre-commit hooks** enforce linting and type checking
11. **Build drops `console.log`** in production via `drop_console: true`
12. **Validated CORS** helper exists in `_shared/cors.ts` (just needs wider adoption)

---

## Remediation Priority Matrix <a name="remediation-priority"></a>

### Immediate (This Week)
| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| B1 | Fix realtime_locations RLS | 1 migration | Prevents GPS tracking of all users |
| B2 | Fix user_locations RLS | 1 migration | Prevents location/battery tracking |
| B3 | Restore profiles privacy | 1 migration | Restores PII protection |
| B5 | Fix push-notifications auth | 1 function | Prevents phishing via app |
| B7 | Fix file-upload userId | 1 function | Prevents file attribution spoofing |
| C9 | Enable RLS on 4 tables | 1 migration | Prevents data leakage |

### This Sprint
| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| B4 | Fix SECURITY DEFINER functions | 8 functions | Prevents privilege escalation |
| B6 | Fix send-push auth | 1 function | Prevents notification abuse |
| B8 | Fix update-location membership | 1 function | Prevents location pollution |
| C1 | Server-gate demo mode | Auth refactor | Prevents auth bypass |
| C4 | Add ProtectedRoute wrappers | Frontend refactor | Prevents route access |
| C6 | Migrate to getCorsHeaders | 8 functions | Removes wildcard CORS |
| Deps | Upgrade jspdf, react-router-dom | Dependency update | Fixes critical CVEs |

### Next Sprint
| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| B9 | Server-side role validation | New endpoint + refactor | Prevents privilege escalation |
| C3 | Move admin check server-side | DB migration + refactor | Removes hardcoded admin email |
| C8 | Atomic invite counter | DB migration | Prevents invite overuse |
| C10 | Drop permissive chat INSERT | 1 migration | Prevents cross-trip messaging |
| C12 | Encrypt calendar tokens | App-layer encryption | Protects OAuth tokens |
| D1 | Server-side rate limiting | New middleware | Prevents API abuse |

### Backlog
| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| D18 | CSP hardening | Build pipeline | Reduces XSS surface |
| D19 | Add FK constraints | Data cleanup + migration | Data integrity |
| E1 | Enable strictNullChecks | Large incremental effort | Runtime safety |
| E6 | Console log cleanup | Codebase sweep | Reduce info leakage |

---

## Appendix: Files Changed in This Audit

| File | Change |
|------|--------|
| `.gitignore` | Added `.env.*` coverage |
| `src/utils/authDebug.ts` | Restricted debug to DEV mode only |
| `src/utils/securityUtils.ts` | Hardened XSS sanitization, trip ID validation, CSS value checking |
| `src/utils/tokenValidation.ts` | Required `exp` claim for token validity |
| `eslint.config.js` | `no-explicit-any` changed to `warn` |
| `supabase/functions/_shared/securityHeaders.ts` | Replaced wildcard CORS with production domain default |
| `supabase/functions/verify-identity/index.ts` | Migrated to `getCorsHeaders(req)`, removed error details from responses |
| `supabase/functions/export-user-data/index.ts` | Removed stack trace from error response |
| `supabase/functions/image-upload/index.ts` | Added auth header null check, aligned file size limit to 5MB |

---

*This report was generated using white-box source code analysis following the Shannon AI / OWASP Top 10 methodology. Dynamic testing (black-box exploitation) was not performed. All findings should be validated in a staging environment before applying fixes to production.*
