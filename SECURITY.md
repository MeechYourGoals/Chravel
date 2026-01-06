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
- Use Supabase Function Secrets for OPENAI_API_KEY, PERPLEXITY_API_KEY, Google Maps, GetStream, etc.
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
- [ ] OpenAI/Perplexity keys set via secrets
- [ ] secure_storage access requires recent authentication (within 15 minutes)
- [ ] secure_storage access requires MFA verification if MFA is enabled
- [ ] Verification sessions are created via `/verify-identity` edge function after authentication

9. Incident Response
- Rotate Supabase anon key if leaked; revoke secrets; audit edge function logs; disable public policies if necessary; communicate to users.
