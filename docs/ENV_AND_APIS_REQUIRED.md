# Chravel — Environment Variables & API Requirements

> Last updated: 2026-02-05 (automated audit)

## Quick Start

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at minimum
# The app ships with hardcoded Supabase defaults for dev (see src/integrations/supabase/client.ts:37-38)
```

## Validation

```bash
npm run validate-env          # Web build
npm run validate-env -- --ios # iOS Capacitor build
```

---

## Frontend Variables (VITE_*)

| Feature | Provider | Env Var | Where Used (file:line) | Setup Steps | Can Stub for TestFlight? | Stub Method |
|---------|----------|---------|------------------------|-------------|--------------------------|-------------|
| **Supabase** | Supabase | `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts:41` | Supabase Dashboard > Settings > API | N — core infra | N/A (hardcoded default exists for dev) |
| **Supabase** | Supabase | `VITE_SUPABASE_ANON_KEY` | `src/integrations/supabase/client.ts:45` | Same as above | N — core infra | N/A (hardcoded default exists for dev) |
| **Google Maps** | Google Cloud | `VITE_GOOGLE_MAPS_API_KEY` | `src/config/maps.ts:20`, `src/services/googlePlacesNew.ts:227` | GCP Console > APIs > Maps JS + Places API | Y | Set empty string; Places tab shows graceful fallback |
| **Stripe** | Stripe | `VITE_STRIPE_PUBLISHABLE_KEY` | `src/services/paymentProcessors/stripeProcessor.ts:19` | Stripe Dashboard > API Keys | Y | Set `pk_test_stub`; payments tab hidden via feature flag |
| **Web Push** | Self-generated | `VITE_VAPID_PUBLIC_KEY` | `src/services/notificationService.ts:4`, `src/hooks/useWebPush.ts:17` | Run `npx tsx scripts/generate-vapid-keys.ts` | Y | Leave empty; push subscription silently skipped |
| **RevenueCat** | RevenueCat | `VITE_REVENUECAT_ENABLED` | `src/constants/revenuecat.ts:13` | RevenueCat Dashboard | Y | Set `false` |
| **RevenueCat iOS** | RevenueCat | `VITE_REVENUECAT_IOS_API_KEY` | `src/constants/revenuecat.ts:17` | RevenueCat Dashboard > iOS App | Y | Leave empty; init safely no-ops |
| **Venmo** | PayPal/Venmo | `VITE_VENMO_CLIENT_ID` | `src/services/paymentProcessors/venmoProcessor.ts:16` | Venmo Developer Portal | Y | Leave empty; Venmo option hidden |
| **PostHog** | PostHog | `VITE_POSTHOG_API_KEY` | `src/telemetry/service.ts:36` | PostHog Dashboard | Y | Leave empty; telemetry disabled |
| **Sentry** | Sentry | `VITE_SENTRY_DSN` | `src/telemetry/service.ts:42` | Sentry Dashboard | Y | Leave empty; error tracking disabled |
| **GA** | Google | `VITE_GA_MEASUREMENT_ID` | `.env.production.example:67` | Google Analytics Dashboard | Y | Leave empty |
| **Mixpanel** | Mixpanel | `VITE_MIXPANEL_TOKEN` | `.env.production.example:70` | Mixpanel Dashboard | Y | Leave empty |

### Feature Flags

| Flag | Default | Effect when `false` |
|------|---------|---------------------|
| `VITE_ENABLE_DEMO_MODE` | `false` | Demo mode disabled (production default) |
| `VITE_ENABLE_AI_CONCIERGE` | `true` | AI Concierge tab hidden |
| `VITE_ENABLE_STRIPE_PAYMENTS` | `true` | Payments tab hidden |
| `VITE_ENABLE_PUSH_NOTIFICATIONS` | `true` | Push notification registration skipped |

---

## Server-Side Variables (Supabase Edge Functions)

These are set as Supabase project secrets (`supabase secrets set KEY=value`).

| Feature | Provider | Env Var | Key Functions Using It | Setup Steps | Can Stub for TestFlight? |
|---------|----------|---------|------------------------|-------------|--------------------------|
| **Supabase Admin** | Supabase | `SUPABASE_SERVICE_ROLE_KEY` | All admin edge functions | Auto-provided by Supabase | N — core infra |
| **Stripe Payments** | Stripe | `STRIPE_SECRET_KEY` | `create-checkout`, `stripe-webhook`, `check-subscription` | Stripe Dashboard > API Keys | Y — disable via feature flag |
| **Stripe Webhook** | Stripe | `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Stripe Dashboard > Webhooks | Y — disable via feature flag |
| **Stripe Prices** | Stripe | `STRIPE_PLUS_PRICE_ID`, `STRIPE_PRO_PRICE_ID` | `create-checkout` | Stripe Dashboard > Products | Y |
| **AI / LLM** | Lovable | `LOVABLE_API_KEY` | `ai-answer`, `ai-search`, `ai-ingest`, `daily-digest`, `document-processor`, `file-ai-parser` | Lovable.dev dashboard | Y — disable via `VITE_ENABLE_AI_CONCIERGE=false` |
| **Email** | Resend | `RESEND_API_KEY` | `send-email-with-retry` | Resend.com dashboard | Y — invites work without email (link-only) |
| **Email From** | Resend | `RESEND_FROM_EMAIL` | `send-email-with-retry` | Set to `noreply@chravel.app` | Y |
| **Web Push Private** | Self-generated | `VAPID_PRIVATE_KEY` | `push-notifications`, `web-push-send` | `npx tsx scripts/generate-vapid-keys.ts` | Y — disable via feature flag |
| **APNS (iOS Push)** | Apple | `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` | `push-notifications` | Apple Developer Portal > Keys | Y — push disabled in TestFlight initially |
| **APNS Config** | Apple | `APNS_BUNDLE_ID`, `APNS_ENVIRONMENT` | `push-notifications` | Match bundle ID; set to `development` for TestFlight | Y |
| **FCM (Android)** | Firebase | `FCM_SERVER_KEY` | `push-notifications` | Firebase Console | Y — not needed for iOS |
| **Twilio SMS** | Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS functions | Twilio Console | Y — SMS not required for core |
| **Google Maps Server** | Google | `GOOGLE_MAPS_API_KEY` | `google-maps-proxy` | GCP Console | Y — proxy optional |
| **Google Vision** | Google | `GOOGLE_VISION_API_KEY` | `process-receipt-ocr` | GCP Console | Y — OCR optional |

---

## Mobile / Build Variables

| Env Var | Default | Where Used | Notes |
|---------|---------|-----------|-------|
| `IOS_BUNDLE_ID` | `com.chravel.app` | `capacitor.config.ts:12` | Must match Apple Developer Portal |
| `IOS_APP_NAME` | `Chravel` | `capacitor.config.ts:13` | Display name on iOS |
| `APPLE_TEAM_ID` | (none) | `api/aasa.ts:25` | Apple App Site Association file |
| `ANDROID_PACKAGE_NAME` | `com.chravel.app` | `api/assetlinks.ts:24` | Android deep links |

---

## Minimum Viable .env for TestFlight Build

```env
# These are the ONLY vars needed for a working TestFlight build.
# The app has hardcoded Supabase defaults for dev.
VITE_SUPABASE_URL=https://jmjiyekmxwsxkfnqwyaa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptaml5ZWtteHdzeGtmbnF3eWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjEwMDgsImV4cCI6MjA2OTQ5NzAwOH0.SAas0HWvteb9TbYNJFDf8Itt8mIsDtKOK6QwBcwINhI
VITE_ENABLE_DEMO_MODE=false
VITE_ENABLE_AI_CONCIERGE=false
VITE_ENABLE_STRIPE_PAYMENTS=false
VITE_ENABLE_PUSH_NOTIFICATIONS=false
VITE_REVENUECAT_ENABLED=false
```

> **Note**: Google Maps requires a valid API key for the Places tab. Without it, the Places tab will load but search/autocomplete won't work. All other features are functional without Maps.
