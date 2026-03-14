# Debug Patterns — Security

Known security anti-patterns discovered during audits. Reference this before introducing similar code.

---

## 1. Capability Token Default Secret Fallback

**Symptom:** Any unauthenticated user can forge tool execution tokens.
**Risk:** CRITICAL — arbitrary trip data access and mutation via AI tool calls.
**Root Cause:** `const secret = env.get('KEY') || 'default_for_tests'` pattern makes tokens signable with a known value when env is missing.
**How to Confirm:** Check if `SUPABASE_JWT_SECRET` is set in the edge function environment. If not, tokens signed with `'default_secret_for_tests'` would be accepted.
**Smallest Safe Fix:** Throw on missing secret instead of falling back. The env is always set in Supabase hosted environments.
**Required Tests:** Unit test that `verifyCapabilityToken` throws when secret is missing.
**Regression Surfaces:** Any edge function using capability tokens.
**Fixed in:** `supabase/functions/_shared/security/capabilityTokens.ts` (March 2026 audit)

---

## 2. CORS Wildcard Subdomain Matching

**Symptom:** Cross-origin requests succeed from unauthorized domains (e.g., attacker-controlled *.vercel.app site).
**Risk:** HIGH — edge functions callable from any project on allowed hosting platforms.
**Root Cause:** `.vercel.app` suffix matcher allows `evil-site.vercel.app` to pass CORS validation.
**How to Confirm:** Deploy a test page to a random *.vercel.app URL and attempt `fetch()` to a Chravel edge function.
**Smallest Safe Fix:** Replace suffix matchers with exact production origins. Use `ADDITIONAL_ALLOWED_ORIGINS` env var for preview deployments.
**Required Tests:** Unit test that `isOriginAllowed('https://random.vercel.app')` returns false.
**Regression Surfaces:** Vercel preview deployments, Lovable preview deployments — configure ADDITIONAL_ALLOWED_ORIGINS.
**Fixed in:** `supabase/functions/_shared/cors.ts` (March 2026 audit)

---

## 3. Client-Side Super Admin Bypass (Misleading Dead Code)

**Symptom:** Code appears to grant admin access based on client-side email comparison, but RLS actually blocks the operation.
**Risk:** MEDIUM — creates false confidence that client-side checks enforce access control. A future refactor might trust this pattern.
**Root Cause:** `SUPER_ADMIN_EMAILS.includes(user.email)` check was used to skip membership validation, but the underlying Supabase query still enforces RLS.
**How to Confirm:** Trace the data flow — the Supabase client uses the anon key, so all queries respect RLS policies. The `is_super_admin()` SQL function (only allows `ccamechi@gmail.com`) is the actual enforcement.
**Smallest Safe Fix:** Remove client-side admin bypass code. Let RLS be the single source of truth.
**Required Tests:** Verify admin users can still access their data via RLS. Verify non-admin cannot bypass membership.
**Regression Surfaces:** Trip creation limits (super admin still bypasses trip count limit via client-side check — this is intentional for the founder).
**Fixed in:** `src/services/calendarService.ts`, `src/services/tripService.ts` (March 2026 audit)

---

## 4. CronGuard Fail-Open on Missing Secret

**Symptom:** Cron-only edge functions (event-reminders, payment-reminders, send-scheduled-broadcasts, delete-stale-locations) are publicly callable without authentication.
**Risk:** HIGH — unauthenticated users can trigger cron jobs, causing spam notifications, data mutations, or cost amplification.
**Root Cause:** `verifyCronAuth()` returned `authorized: true` when `CRON_SECRET` env var was not set, as a "graceful degradation" during rollout.
**How to Confirm:** Call any cron-protected edge function without headers. If it returns 200, the guard is failing open.
**Smallest Safe Fix:** Return `authorized: false` with 503 when `CRON_SECRET` is missing. Never fail-open for auth guards.
**Required Tests:** Verify that requests without valid cron secret or service role key are denied (401/503).
**Regression Surfaces:** All cron-invoked edge functions. Ensure `CRON_SECRET` is set in all environments.
**Fixed in:** `supabase/functions/_shared/cronGuard.ts` (March 2026 audit)

---

## General Anti-Patterns to Avoid

- **Never use `|| 'default'` for security-sensitive env vars** — fail loudly instead
- **Never use wildcard subdomain matching in CORS** — allows any tenant on shared platforms
- **Never rely on client-side email checks for authorization** — RLS is the enforcement layer
- **Never return raw error messages to clients** — log server-side, return generic messages
- **Never inject unsanitized user content into AI prompts** — use boundary markers and strip tags
- **Never fail-open on missing auth secrets** — deny with 503, not allow with a warning log
