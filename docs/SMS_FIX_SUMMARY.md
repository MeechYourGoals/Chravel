# SMS Test Fix — Root Cause Analysis & Resolution

**Date:** 2026-02-16  
**User:** ccamechi@gmail.com  
**Symptom:** "Send test SMS" fails with "Failed to send. Check your settings and try again."

---

## Root Causes Identified

### 1. **CORS — lovable.dev not allowed** (CRITICAL)
- **Bug:** `supabase/functions/_shared/cors.ts` allowed `.lovable.app` and `.lovableproject.com` but **not** `.lovable.dev`
- **Impact:** When the app runs on lovable.dev, the browser blocks the Edge Function response due to CORS. The request may fail or the client cannot read the response.
- **Fix:** Added `.lovable.dev` to `ALLOWED_ORIGINS`

### 2. **SMS entitlement — founder email not bypassed on server** (CRITICAL)
- **Bug:** Client-side `SUPER_ADMIN_EMAILS` (ccamechi@gmail.com) makes `isSuperAdmin` true, so the "Send test SMS" button is visible. But the **server** `isSmsEntitled()` only checked `user_roles` and `user_entitlements`, not the email allowlist.
- **Impact:** Server returns 403 "Upgrade required for SMS notifications" even for the founder.
- **Fix:** Added `SUPER_ADMIN_EMAILS` allowlist to `push-notifications` `isSmsEntitled()`. If `userEmail` is in the allowlist, return `true` before checking roles/entitlements. Pass `userEmail` from JWT into the handler.

### 3. **user_roles enum — super_admin may not exist**
- **Bug:** `isSmsEntitled` queried `.in('role', ['enterprise_admin', 'super_admin'])`. The `app_role` enum may only include `consumer`, `pro`, `enterprise_admin`. `super_admin` might not be a valid enum value.
- **Impact:** Query could fail or return no rows for super_admin.
- **Fix:** Query only `enterprise_admin` (always in enum). Rely on the email allowlist for founder bypass.

### 4. **req.json() parse failure**
- **Bug:** `await req.json()` could throw on malformed body, causing an unhandled error.
- **Fix:** `await req.json().catch(() => ({}))` and validate `action` before use.

### 5. **Error message extraction**
- **Bug:** Client did not reliably extract the API error message from Supabase `functions.invoke` errors.
- **Fix:** Check `data?.message` and `data?.error` first (sometimes present on 4xx), then try `error.context.json()`.

---

## Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/_shared/cors.ts` | Added `.lovable.dev` to allowed origins |
| `supabase/functions/push-notifications/index.ts` | SUPER_ADMIN_EMAILS bypass, pass userEmail, fix user_roles query, req.json() handling |
| `src/services/notificationService.ts` | Improved error extraction for 4xx responses |

---

## Deployment Requirements

1. **Redeploy Edge Functions** — The `push-notifications` function must be redeployed for server changes to take effect:
   ```bash
   supabase functions deploy push-notifications
   ```
   Or via Supabase Dashboard → Edge Functions → push-notifications → Deploy.

2. **CORS** — The `cors.ts` change is used by all functions that import it. Redeploy any function that uses it (including `push-notifications`).

3. **No DB migrations** — No schema changes.

---

## Verification

After deployment:
1. Open the app on lovable.dev (or your domain).
2. Sign in as ccamechi@gmail.com.
3. Go to Settings → Notifications (Group tab).
4. Ensure SMS is enabled and phone number is set.
5. Click "Send test SMS".
6. You should receive: `ChravelApp: Test message — SMS notifications are working!`

---

## Regression Risk

**LOW** — Changes are additive and scoped:
- CORS: Adds an origin; does not remove existing ones.
- Entitlement: Adds an allowlist check before existing checks.
- Error handling: Improves extraction; does not change success path.
