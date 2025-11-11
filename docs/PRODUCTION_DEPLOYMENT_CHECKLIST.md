# Production Deployment Checklist

## Overview

This checklist ensures all environment variables, secrets, API keys, and configurations are properly set before deploying Chravel to production.

---

## Pre-Deployment Requirements

### ✅ Code Quality
- [ ] All tests pass: `npm run test`
- [ ] Linting passes: `npm run lint`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] No console errors in browser DevTools
- [ ] No TypeScript errors

### ✅ Security Audit
- [ ] No hardcoded secrets in code
- [ ] All API keys use environment variables
- [ ] RLS policies reviewed and tested
- [ ] CORS configured correctly
- [ ] Rate limiting enabled on edge functions
- [ ] Input validation on all user inputs

---

## Environment Variables

### Supabase Configuration

**Required in Supabase Dashboard → Settings → API:**

| Variable | Description | Where Used | Example |
|----------|-------------|------------|---------|
| `SUPABASE_URL` | Project URL | Frontend, Edge Functions | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anon key | Frontend | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (secret!) | Edge Functions only | `eyJhbGc...` |

**✅ Checklist:**
- [ ] `SUPABASE_URL` set in Vercel environment variables
- [ ] `SUPABASE_ANON_KEY` set in Vercel environment variables
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Supabase Edge Functions secrets (NOT in frontend)
- [ ] RLS policies enabled on all tables
- [ ] Database backups configured

---

### Google APIs

**Required in Google Cloud Console:**

| Variable | Description | Where Used | API Key Location |
|----------|-------------|------------|------------------|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API | Frontend | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_MAPS_API_KEY` | Google Maps API (server-side) | Edge Functions | Supabase Edge Functions secrets |
| `GOOGLE_PLACES_API_KEY` | Places API | Edge Functions | Same as Maps API key (can reuse) |

**✅ Checklist:**
- [ ] Google Cloud Project created
- [ ] Maps JavaScript API enabled
- [ ] Places API enabled
- [ ] Geocoding API enabled
- [ ] Directions API enabled
- [ ] Distance Matrix API enabled
- [ ] API key created with restrictions:
  - [ ] HTTP referrer restrictions (for web)
  - [ ] Android package name restrictions (for Android)
  - [ ] iOS bundle ID restrictions (for iOS)
- [ ] API key added to Vercel: `VITE_GOOGLE_MAPS_API_KEY`
- [ ] API key added to Supabase Edge Functions secrets: `GOOGLE_MAPS_API_KEY`
- [ ] Billing enabled (required for Maps API)
- [ ] Quota limits set (to prevent unexpected costs)

---

### AI/ML APIs

**Lovable/Gemini API:**

| Variable | Description | Where Used |
|----------|-------------|------------|
| `LOVABLE_API_KEY` | Lovable AI API key | Edge Functions: `lovable-concierge` |
| `GEMINI_API_KEY` | Google Gemini API key | Edge Functions: `gemini-chat` |

**✅ Checklist:**
- [ ] Lovable API account created
- [ ] `LOVABLE_API_KEY` added to Supabase Edge Functions secrets
- [ ] Gemini API enabled in Google Cloud Console
- [ ] `GEMINI_API_KEY` added to Supabase Edge Functions secrets
- [ ] Rate limits configured
- [ ] Usage monitoring enabled

---

### Stripe (Payments)

**Required in Stripe Dashboard:**

| Variable | Description | Where Used |
|----------|-------------|------------|
| `STRIPE_SECRET_KEY` | Stripe secret key | Edge Functions: `create-checkout` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Frontend (if direct integration) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Edge Functions: webhook handler |

**✅ Checklist:**
- [ ] Stripe account created (use test mode first)
- [ ] Products created in Stripe Dashboard:
  - [ ] Chravel Plus subscription
  - [ ] Chravel Pro subscription
  - [ ] One-time payment products (if any)
- [ ] `STRIPE_SECRET_KEY` added to Supabase Edge Functions secrets
- [ ] `STRIPE_PUBLISHABLE_KEY` added to Vercel (if needed)
- [ ] Webhook endpoint configured:
  - [ ] URL: `https://<project>.supabase.co/functions/v1/stripe-webhook`
  - [ ] Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] `STRIPE_WEBHOOK_SECRET` added to Supabase Edge Functions secrets
- [ ] Test mode verified before switching to live mode

---

### Push Notifications

**Firebase (Android + Web):**

| Variable | Description | Where Used |
|----------|-------------|------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | Edge Functions: `push-notifications` |
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON | Edge Functions: `push-notifications` |

**Apple Push Notification Service (iOS):**

| Variable | Description | Where Used |
|----------|-------------|------------|
| `APNS_KEY_ID` | APNs key ID | Edge Functions: `push-notifications` |
| `APNS_TEAM_ID` | Apple Developer Team ID | Edge Functions: `push-notifications` |
| `APNS_KEY` | APNs private key (P8 file content) | Edge Functions: `push-notifications` |
| `APNS_BUNDLE_ID` | iOS bundle ID | Edge Functions: `push-notifications` |

**✅ Checklist:**
- [ ] Firebase project created
- [ ] Android app added to Firebase (package: `com.chravel.app`)
- [ ] iOS app added to Firebase (bundle: `com.chravel.app`)
- [ ] `google-services.json` downloaded (Android)
- [ ] `GoogleService-Info.plist` downloaded (iOS)
- [ ] Firebase service account key generated
- [ ] `FIREBASE_SERVICE_ACCOUNT` added to Supabase Edge Functions secrets (as JSON string)
- [ ] APNs key created in Apple Developer Portal
- [ ] `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY`, `APNS_BUNDLE_ID` added to Supabase Edge Functions secrets
- [ ] Push notification edge function tested

---

### Email Service

**SendGrid/SMTP:**

| Variable | Description | Where Used |
|----------|-------------|------------|
| `SENDGRID_API_KEY` | SendGrid API key | Edge Functions: `send-email-with-retry` |
| `EMAIL_FROM_ADDRESS` | Sender email address | Edge Functions: `send-email-with-retry` |

**✅ Checklist:**
- [ ] SendGrid account created (or SMTP server configured)
- [ ] `SENDGRID_API_KEY` added to Supabase Edge Functions secrets
- [ ] `EMAIL_FROM_ADDRESS` added to Supabase Edge Functions secrets
- [ ] Domain verified (for production emails)
- [ ] Test email sent successfully

---

### Storage (Supabase)

**Supabase Storage Buckets:**

| Bucket | Purpose | Public? |
|--------|---------|---------|
| `avatars` | User profile pictures | Yes |
| `trip-media` | Trip photos/videos | No (RLS) |
| `receipts` | Expense receipts | No (RLS) |
| `documents` | Trip documents | No (RLS) |

**✅ Checklist:**
- [ ] All buckets created in Supabase Dashboard → Storage
- [ ] RLS policies configured for private buckets
- [ ] CORS configured for public buckets
- [ ] File size limits set (e.g., 10MB for images, 25MB for documents)
- [ ] Storage quotas configured

---

## Vercel Deployment

### Environment Variables in Vercel

**Go to:** Project Settings → Environment Variables

**Production Variables:**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

**✅ Checklist:**
- [ ] All `VITE_*` variables set in Vercel
- [ ] Production, Preview, and Development environments configured
- [ ] Domain configured (e.g., `app.chravel.com`)
- [ ] SSL certificate active
- [ ] Custom domain verified

### Build Configuration

**`vercel.json` (if exists):**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

**✅ Checklist:**
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Node version: 18.x (in Vercel settings)
- [ ] Install command: `npm ci` (for faster installs)

---

## Supabase Edge Functions Secrets

**Go to:** Supabase Dashboard → Edge Functions → Secrets

**Required Secrets:**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
GOOGLE_MAPS_API_KEY=AIza...
LOVABLE_API_KEY=xxx
GEMINI_API_KEY=xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
APNS_KEY_ID=ABC123XYZ
APNS_TEAM_ID=DEF456UVW
APNS_KEY=-----BEGIN PRIVATE KEY-----...
APNS_BUNDLE_ID=com.chravel.app
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM_ADDRESS=noreply@chravel.app
```

**✅ Checklist:**
- [ ] All secrets added to Supabase Edge Functions
- [ ] Secrets are NOT committed to git
- [ ] Test edge functions invoke successfully
- [ ] Error logging configured (Supabase Dashboard → Logs)

---

## Database Configuration

### RLS Policies

**✅ Checklist:**
- [ ] RLS enabled on all tables
- [ ] Policies tested for:
  - [ ] Users can only read their own data
  - [ ] Trip members can read trip data
  - [ ] Only creators/admins can modify trips
  - [ ] Media/files are private to trip members
- [ ] Service role key NOT used in frontend

### Indexes

**✅ Checklist:**
- [ ] Indexes created on frequently queried columns:
  - [ ] `trips.created_by`
  - [ ] `trip_members.trip_id`, `trip_members.user_id`
  - [ ] `messages.channel_id`, `messages.created_at`
  - [ ] `media.trip_id`
  - [ ] Full-text search indexes on `messages.content`
- [ ] Query performance tested

### Migrations

**✅ Checklist:**
- [ ] All migrations applied to production database
- [ ] Migration rollback plan documented
- [ ] Database backups enabled (daily)
- [ ] Point-in-time recovery enabled (if available)

---

## Mobile App Configuration

### iOS (App Store)

**✅ Checklist:**
- [ ] Bundle ID: `com.chravel.app`
- [ ] App Store Connect app created
- [ ] Provisioning profiles configured
- [ ] Push notification certificates uploaded
- [ ] Universal Links domain associated
- [ ] Associated Domains configured: `applinks:chravel.app`
- [ ] App Store listing completed:
  - [ ] Screenshots uploaded
  - [ ] Description written
  - [ ] Privacy policy URL
  - [ ] Support URL

### Android (Google Play)

**✅ Checklist:**
- [ ] Package name: `com.chravel.app`
- [ ] Google Play Console app created
- [ ] Firebase `google-services.json` added to project
- [ ] Signing key generated and secured
- [ ] Play Store listing completed:
  - [ ] Screenshots uploaded
  - [ ] Description written
  - [ ] Privacy policy URL
  - [ ] Content rating completed

---

## Monitoring & Analytics

### Error Tracking

**✅ Checklist:**
- [ ] Sentry (or similar) configured:
  - [ ] DSN added to environment variables
  - [ ] Source maps uploaded
  - [ ] Error alerts configured
- [ ] Supabase error logs monitored

### Analytics

**✅ Checklist:**
- [ ] Google Analytics (or similar) configured:
  - [ ] Tracking ID added
  - [ ] Events tracked (signups, trips created, etc.)
- [ ] Privacy policy updated to mention analytics

### Performance Monitoring

**✅ Checklist:**
- [ ] Vercel Analytics enabled
- [ ] Core Web Vitals monitored
- [ ] Database query performance monitored
- [ ] Edge function execution time monitored

---

## Security Checklist

**✅ Checklist:**
- [ ] HTTPS enforced (no HTTP)
- [ ] CORS configured correctly (no wildcards in production)
- [ ] Content Security Policy (CSP) headers set
- [ ] Rate limiting enabled on all public endpoints
- [ ] Input sanitization on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React escapes by default, but verify)
- [ ] CSRF protection (Supabase handles this)
- [ ] Secrets rotated regularly (every 90 days)
- [ ] Two-factor authentication enabled on:
  - [ ] Supabase account
  - [ ] Vercel account
  - [ ] Google Cloud account
  - [ ] Stripe account
  - [ ] Firebase account

---

## Pre-Launch Testing

**✅ Checklist:**
- [ ] End-to-end user flows tested:
  - [ ] Sign up / Sign in
  - [ ] Create trip
  - [ ] Invite members
  - [ ] Send messages
  - [ ] Upload media
  - [ ] Add expenses
  - [ ] Create tasks
  - [ ] Use AI concierge
- [ ] Mobile testing (iOS + Android):
  - [ ] App installs successfully
  - [ ] Push notifications work
  - [ ] Camera/photo picker works
  - [ ] Location services work
  - [ ] Offline mode works
- [ ] Performance testing:
  - [ ] Page load times < 3s
  - [ ] API response times < 500ms
  - [ ] No memory leaks
- [ ] Browser compatibility:
  - [ ] Chrome (latest)
  - [ ] Safari (latest)
  - [ ] Firefox (latest)
  - [ ] Edge (latest)
  - [ ] Mobile Safari (iOS)
  - [ ] Chrome Mobile (Android)

---

## Post-Deployment

**✅ Checklist:**
- [ ] Monitor error logs for first 24 hours
- [ ] Check analytics for unexpected spikes/drops
- [ ] Verify all environment variables are accessible
- [ ] Test critical user flows in production
- [ ] Set up alerts for:
  - [ ] High error rates
  - [ ] API quota limits
  - [ ] Database connection issues
  - [ ] Payment failures

---

## Rollback Plan

**If deployment fails:**

1. **Vercel:** Revert to previous deployment (Dashboard → Deployments → Promote)
2. **Database:** Restore from backup (Supabase Dashboard → Database → Backups)
3. **Edge Functions:** Revert function code (Git revert + redeploy)
4. **Mobile Apps:** Halt new releases in App Store/Play Console

**Documentation:**
- [ ] Rollback procedures documented
- [ ] Backup locations known
- [ ] Contact information for critical services

---

## Quick Reference

### Environment Variables Summary

**Frontend (Vercel):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`

**Backend (Supabase Edge Functions):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_MAPS_API_KEY`
- `LOVABLE_API_KEY`
- `GEMINI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FIREBASE_SERVICE_ACCOUNT`
- `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY`, `APNS_BUNDLE_ID`
- `SENDGRID_API_KEY`
- `EMAIL_FROM_ADDRESS`

---

**Last Updated:** 2025-01-31  
**Maintained By:** Engineering Team
