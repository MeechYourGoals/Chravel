# Security Guide and Requirements

Last Updated: 2025-01-25

1. Goals
- Protect user data with strict RLS and auth on all mutations.
- Prevent key/secret leakage; ensure private media is not publicly accessible.
- Harden edge functions; validate inputs; enable CORS and JWT as appropriate.

2. Data Security
- RLS: Enforced on user-owned tables (receipts, saved_recommendations, secure_storage, trip_*). Public SELECT is allowed only for non-sensitive content (e.g., read-only trip artifacts when sharing). Revisit profiles SELECT for PII minimization at UI level.
- Storage: advertiser-assets bucket is public by design for ads; all user-generated media buckets must be private with signed URLs.
- **secure_storage Enhanced Security**: The `secure_storage` table requires additional security layers beyond basic RLS:
  - **Recent Authentication Required**: Users must have authenticated within the last 15 minutes OR have an active verification session to access secure_storage entries.
  - **MFA Verification**: If MFA is enabled for a user, they must have completed MFA verification within the last 15 minutes to access secure_storage.
  - **Verification Sessions**: After password/MFA verification, call `/verify-identity` edge function to create a verification session that grants access for 15 minutes (configurable).
  - **Implementation**: RLS policies use `has_recent_authentication()` and `has_mfa_verification()` functions to enforce these requirements.
  - **Session Management**: Verification sessions are tracked in `auth_verification_sessions` table and automatically expire after the configured duration.

3. Edge Functions
- JWT Verification: Enabled by default; only keep public where absolutely needed (e.g., google-maps-proxy). We enabled JWT for ai-features and image-upload in supabase/config.toml.
- CORS: Always include Access-Control-Allow-Origin: * and headers authorization, x-client-info, apikey, content-type. Handle OPTIONS.
- Supabase Client: Use supabase.from()/functions.invoke(); never raw SQL.
- AuthZ: For any mutation, verify user context (auth.getUser() or injected JWT) and enforce ownership/role checks in code in addition to RLS.

4. Input Validation
- Use src/utils/securityUtils.ts: sanitizeText, sanitizeSearchQuery, isValidUrl, sanitizeHtml in all user-facing forms and function payloads.
- Enforce server-side schema validation in edge functions (zod recommended, future).

5. Secrets Management
- Use Supabase Function Secrets for LOVABLE_API_KEY, GEMINI_API_KEY, Google Maps, etc.
- Never store secrets client-side. Avoid .env; this project uses integrated secrets.

6. Notifications and Messaging
- Prevent mass-broadcast abuse with rate limits (server-side counters, future) and role checks.
- Sanitize message content; strip scripts/URLs where not allowed.

7. Compliance
- Respect profile visibility flags (show_email/show_phone) in UI rendering.
- Prepare for GDPR/CCPA: implement data export/delete and audit logging (future phases).

8. Review Checklist
- [ ] All private buckets use signed URLs
- [ ] Edge functions handling uploads and AI require JWT
- [ ] No raw SQL in edge functions
- [ ] UI never renders sensitive profile fields unless allowed
- [ ] Invites enforce code, max_uses, expires_at, and is_active
- [ ] Push notifications scoped to trip membership
- [ ] AI provider keys (Lovable/Gemini) set via secrets
- [ ] secure_storage access requires recent authentication (within 15 minutes)
- [ ] secure_storage access requires MFA verification if MFA is enabled
- [ ] Verification sessions are created via `/verify-identity` edge function after authentication

9. Auth Rate Limiting Strategy

Current auth rate limiting relies on multiple layers:

### Supabase Built-in Rate Limits (Primary)
- **Login**: Supabase Auth enforces per-IP and per-email rate limits on `signInWithPassword` (default: 30 requests/hour per IP).
- **Signup**: Rate limited per email and IP (default: 3 signups/hour per email, 30/hour per IP).
- **Password Reset**: Rate limited per email (default: 3 requests/hour per email).
- **OTP**: Rate limited per phone number (Supabase default + Twilio rate limits).
- These are enforced server-side by Supabase Auth and cannot be bypassed from the client.

### Edge Function Rate Limiting (Custom)
- `supabase/functions/_shared/rateLimitGuard.ts` provides `applyRateLimit()` for custom per-user, per-action rate limits.
- Used in: `join-trip`, `export-user-data`, and other sensitive operations.
- Backed by the `increment_rate_limit` RPC function with sliding window counters.

### Client-Side Auth Operations (Awareness)
- Login, signup, and password reset from the client call Supabase Auth directly — they inherit Supabase's built-in rate limits without additional client-side enforcement.
- If abuse is detected (via `security_audit_log` telemetry from `log-auth-event` edge function), consider adding edge function wrappers that proxy auth operations with stricter per-IP limits.

### Telemetry & Detection
- All auth events (login success/failure, signup, password reset, account deletion) are logged to `security_audit_log` via the `log-auth-event` edge function.
- Query patterns to detect abuse:
  - `SELECT ip_address, COUNT(*) FROM security_audit_log WHERE event_type = 'login_failure' AND created_at > now() - interval '1 hour' GROUP BY ip_address HAVING COUNT(*) > 20`
  - `SELECT details->>'method', COUNT(*) FROM security_audit_log WHERE event_type = 'signup_failure' AND created_at > now() - interval '1 day' GROUP BY 1`

### Future Considerations
- If brute-force or credential-stuffing attacks are detected, add an `auth-proxy` edge function that wraps `signInWithPassword` with custom IP-based rate limiting via `applyRateLimit()`.
- Consider CAPTCHA integration for signup after N failed attempts from the same IP.

10. Incident Response
- Rotate Supabase anon key if leaked; revoke secrets; audit edge function logs; disable public policies if necessary; communicate to users.
