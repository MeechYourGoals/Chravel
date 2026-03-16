# Secret Rotation Procedures

> **Purpose**: Step-by-step procedures for rotating secrets across all integrated providers.
> **Last Updated**: 2026-03-16
> **Status**: Active

---

## General Principles

1. **Never rotate in production during peak hours** — schedule during low-traffic windows
2. **Always verify after rotation** — use the provider's test endpoint or the health check
3. **Update all environments** — if staging exists, rotate there first
4. **Document the rotation** — note date, who rotated, and which environments were updated

---

## Provider Rotation Procedures

### Stripe (Secret Key + Webhook Secret)

**Where to rotate**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

**Steps**:
1. Generate new secret key in Stripe Dashboard > Developers > API Keys
2. Update `STRIPE_SECRET_KEY` in Supabase Dashboard > Edge Functions > Secrets
3. For webhook secret: Stripe Dashboard > Webhooks > Reveal signing secret
4. Update `STRIPE_WEBHOOK_SECRET` in Supabase Dashboard > Edge Functions > Secrets
5. Update `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel if publishable key also rotated
6. **Verify**: Trigger a test payment or webhook event

**Blast radius**: Payment processing disrupted during gap between old/new key. Webhook verification fails if secret is wrong.

**Key format**:
- Secret key: `sk_test_*` or `sk_live_*`
- Publishable key: `pk_test_*` or `pk_live_*`
- Webhook secret: `whsec_*`

---

### VAPID Keys (Web Push Notifications)

**Where to rotate**: Self-generated via `npx tsx scripts/generate-vapid-keys.ts`

**Steps**:
1. Run `npx tsx scripts/generate-vapid-keys.ts` to generate new key pair
2. Update `VAPID_PRIVATE_KEY` in Supabase Dashboard > Edge Functions > Secrets
3. Update `VAPID_PUBLIC_KEY` in Supabase Dashboard > Edge Functions > Secrets
4. Update `VITE_VAPID_PUBLIC_KEY` in Vercel environment variables
5. Redeploy frontend (Vercel) so new public key is embedded
6. **CRITICAL**: All existing push subscriptions will be invalidated
7. Users must re-subscribe to push notifications

**Blast radius**: HIGH — all existing push subscriptions break. Users see no notifications until they revisit the app and re-subscribe.

**Key format**:
- Public key: ~87 characters, base64url encoded
- Private key: ~43 characters, base64url encoded

---

### Google / Vertex AI (Gemini API, Maps, Vision)

**Where to rotate**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

**Steps**:
1. Create new API key or service account key in GCP Console
2. Restrict the new key to required APIs before deployment
3. Update relevant secrets in Supabase Dashboard:
   - `GEMINI_API_KEY` — for AI Concierge
   - `VERTEX_PROJECT_ID`, `VERTEX_SERVICE_ACCOUNT_KEY` — for Gemini Live voice
   - `GOOGLE_VISION_API_KEY` — for receipt OCR
4. Update `VITE_GOOGLE_MAPS_API_KEY` in Vercel if Maps key rotated
5. **Verify**: Test AI Concierge response, voice session, or receipt scan
6. Delete old key in GCP Console after verification

**Blast radius**: AI features, maps, and OCR disrupted during rotation gap.

---

### Resend (Email)

**Where to rotate**: [Resend Dashboard](https://resend.com/api-keys)

**Steps**:
1. Generate new API key in Resend Dashboard
2. Update `RESEND_API_KEY` in Supabase Dashboard > Edge Functions > Secrets
3. **Verify**: Trigger a test email (invite, notification, etc.)
4. Revoke old key in Resend Dashboard

**Blast radius**: Email delivery (invites, notifications, password resets) disrupted.

**Key format**: `re_*`

---

### Supabase (Anon Key, Service Role Key)

**Where to rotate**: [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api)

**Steps**:
1. Regenerate keys in Supabase Dashboard > Settings > API
2. Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel
3. Update `SUPABASE_SERVICE_ROLE_KEY` in any external services that use it
4. Redeploy frontend and all edge functions
5. **Verify**: Full auth flow (sign in, sign out, data fetch)

**Blast radius**: CRITICAL — entire application is down during rotation. Plan for maintenance window.

---

### AWS (Textract OCR)

**Where to rotate**: [AWS IAM Console](https://console.aws.amazon.com/iam/)

**Steps**:
1. Create new access key for the service IAM user
2. Update `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in Supabase Dashboard
3. **Verify**: Trigger a receipt OCR scan
4. Deactivate old access key in IAM Console
5. Delete old key after 24-hour verification period

**Blast radius**: Receipt OCR feature disrupted.

---

## Rotation Schedule (Recommended)

| Secret | Rotation Frequency | Urgency if Compromised |
|--------|-------------------|----------------------|
| Stripe keys | Every 90 days | Immediate |
| Supabase keys | Every 180 days | Immediate |
| VAPID keys | Only if compromised | High (breaks all subscriptions) |
| Google/Vertex keys | Every 90 days | High |
| Resend key | Every 90 days | Medium |
| AWS keys | Every 90 days | High |

---

## Emergency Rotation (Compromised Key)

1. **Immediately** generate new key at provider dashboard
2. **Update** Supabase secrets and Vercel env vars
3. **Redeploy** affected edge functions and frontend
4. **Revoke** old key at provider dashboard
5. **Audit** access logs at provider for unauthorized usage
6. **Notify** team via incident channel
7. **Document** in post-incident review
