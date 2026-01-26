# Chravel Environment Setup Guide

This guide walks you through obtaining and configuring all required API keys and services for Chravel.

## Prerequisites

- Domain name (e.g., chravel.app)
- Credit card for service subscriptions
- Apple Developer Account ($99/year) for iOS
- Google Play Developer Account ($25 one-time) for Android

## Required Services Setup

### 1. Supabase (Backend & Database)

**Cost:** Free tier available, $25/month for Pro

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → API
4. Copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

**Required Configuration:**
- Enable Email Auth
- Enable Row Level Security (RLS) on all tables
- Run all migrations in `/supabase/migrations/`

### 2. Google Maps (Location Services)

**Cost:** $200/month free credit, then usage-based

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials → API Key
5. Restrict key to your domains
6. Copy API Key → `VITE_GOOGLE_MAPS_API_KEY`

### 3. OpenAI (AI Concierge)

**Cost:** Pay-as-you-go, ~$0.03 per query

1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Go to API Keys
3. Create new secret key
4. Copy → `OPENAI_API_KEY` (server-side only)

**Model:** Uses GPT-4 for best results

### 4. Stripe (Payments)

**Cost:** 2.9% + $0.30 per transaction

1. Create account at [stripe.com](https://stripe.com)
2. Go to Developers → API Keys
3. Copy:
   - Publishable key → `VITE_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY` (server-side)

**Product Setup:**
1. Create Products:
   - Chravel Plus ($9.99/month)
   - Chravel Pro ($29.99/month)
2. Copy Price IDs to env file

**Webhook Setup:**
1. Go to Webhooks → Add endpoint
2. URL: `https://your-supabase-project.supabase.co/functions/v1/stripe-webhook`
3. Events: `checkout.session.completed`, `customer.subscription.*`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

### 5. Resend (Email Service)

**Cost:** Free for 3000/month, $20/month for 50K

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain
3. Go to API Keys
4. Create API Key → `RESEND_API_KEY`
5. Set `RESEND_FROM_EMAIL` (e.g., noreply@chravel.app)

## Mobile-Specific Configuration

### iOS Setup

1. **Apple Developer Account**
   - Enroll at [developer.apple.com](https://developer.apple.com)
   - Create App ID: `com.chravel.app`
   - Create provisioning profiles

2. **Push Notification Certificate**
   - Create in Apple Developer Portal
   - Upload .p8 file to Supabase

### Android Setup

1. **Google Play Console**
   - Create developer account
   - Create app with package name: `com.chravel.app`

2. **Firebase Cloud Messaging**
   - Create Firebase project
   - Add Android app
   - Download `google-services.json`
   - Place in `android/app/`

## Environment File Setup

1. Copy `.env.production.example` to `.env.production`
2. Fill in all required values
3. Never commit `.env.production` to git

## Supabase Edge Functions Setup

Deploy all edge functions with your secrets:

```bash
# Set secrets in Supabase
supabase secrets set OPENAI_API_KEY=your-key
supabase secrets set STRIPE_SECRET_KEY=your-key
supabase secrets set RESEND_API_KEY=your-key
supabase secrets set APP_URL=https://chravel.app

# Deploy functions
supabase functions deploy chat-with-concierge
supabase functions deploy create-checkout
supabase functions deploy send-organization-invite
```

## Verification Checklist

- [ ] Supabase project created and URL/keys added
- [ ] Google Maps APIs enabled and key added
- [ ] OpenAI API key created
- [ ] Stripe products created and webhook configured
- [ ] Resend domain verified and API key added
- [ ] All edge functions deployed with secrets
- [ ] Environment file created (not committed)
- [ ] Test user can sign up and log in
- [ ] Chat messages send successfully
- [ ] Maps load properly
- [ ] AI Concierge responds
- [ ] Stripe checkout works (test mode first)
- [ ] Invitation emails send

## Security Best Practices

1. **API Key Restrictions**
   - Restrict Google Maps key to your domains
   - Use separate keys for dev/staging/prod
   - Rotate keys every 90 days

2. **Environment Variables**
   - Never commit `.env` files
   - Use secret management in CI/CD
   - Different keys per environment

3. **Monitoring**
   - Set up usage alerts for all services
   - Monitor API costs weekly
   - Track error rates

## Cost Estimation (Monthly)

**Minimum (< 1000 users):**
- Supabase: $0 (free tier)
- Google Maps: $0 (within credit)
- OpenAI: ~$30
- Stripe: Transaction fees only
- Resend: $0 (free tier)
- **Total: ~$30 + transaction fees**

**Growth (10K users):**
- Supabase: $25
- Google Maps: ~$200
- OpenAI: ~$300
- Stripe: Transaction fees
- Resend: $20
- **Total: ~$545 + transaction fees**

## Troubleshooting

**"Invalid API Key" errors:**
- Check for typos in env file
- Ensure no extra spaces
- Verify key restrictions

**"CORS errors" in browser:**
- Add your domain to Supabase allowed origins
- Check proxy and third-party API CORS settings

**"Rate limit exceeded":**
- Implement client-side rate limiting
- Upgrade service tier if needed

## Support Resources

- Supabase Discord: [discord.supabase.com](https://discord.supabase.com)
- Stripe Support: [support.stripe.com](https://support.stripe.com)
- Google Maps: [developers.google.com/maps/support](https://developers.google.com/maps/support)