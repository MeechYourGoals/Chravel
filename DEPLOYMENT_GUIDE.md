# Chravel Deployment Guide

> This document is governed by the No Regressions Policy.
> See: `ARCHITECTURE_DECISIONS.md` → Mobile Platform Strategy

---

## Overview

Chravel is a React/TypeScript web application deployed as a static site. This guide covers:

1. **Web Deployment** (Vercel and Render)
2. **Supabase Edge Functions** deployment
3. **Environment configuration**

**Important**: This repository contains the web application only. Mobile apps (iOS/Android) will be developed separately using Flutter and are not part of this deployment process.

---

## Prerequisites

### Required Tools

```bash
# Node.js 18+
node --version  # Should be v18.x or higher

# npm
npm --version

# Supabase CLI (for Edge Functions)
npm install -g supabase
supabase --version
```

### Required Accounts

| Service | Purpose | Sign Up |
|---------|---------|---------|
| Vercel | Primary web hosting | https://vercel.com |
| Supabase | Database & Edge Functions | https://supabase.com |
| GitHub | Version control | https://github.com |

---

## Web Deployment

### Option 1: Vercel (Primary)

Vercel is the primary deployment platform for Chravel web.

#### Initial Setup

1. **Connect Repository**
   - Go to https://vercel.com/new
   - Import `MeechYourGoals/Chravel`
   - Select the `main` branch

2. **Configure Build Settings**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set Environment Variables**

   In Vercel Dashboard → Settings → Environment Variables:

   ```
   VITE_SUPABASE_URL=https://jmjiyekmxwsxkfnqwyaa.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   VITE_GOOGLE_MAPS_API_KEY=<your-google-maps-key>
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically

#### Automatic Deployments

Once connected, Vercel automatically deploys:
- **Production**: On push to `main` branch
- **Preview**: On pull requests

#### Custom Domain

1. Go to Vercel Dashboard → Settings → Domains
2. Add `chravel.app` (or your domain)
3. Configure DNS as instructed

### Option 2: Render (Secondary)

Render provides an alternative deployment option.

#### Configuration

The repository includes `render.yaml` for automated setup:

```yaml
services:
  - type: web
    name: chravel
    runtime: static
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
```

#### Deployment Steps

1. Go to https://dashboard.render.com
2. Click "New" → "Blueprint"
3. Connect the GitHub repository
4. Render will use `render.yaml` configuration

---

## Supabase Edge Functions

### Available Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `create-trip` | Create new trips | API call |
| `join-trip` | Handle join requests | API call |
| `approve-join-request` | Process approvals | API call |
| `lovable-concierge` | AI concierge | API call |
| `google-maps-proxy` | Maps API proxy | API call |
| `unified-messaging` | Message management | API call |

### Deploying Functions

#### Option 1: Via GitHub Actions (Recommended)

1. **Set up GitHub Secret**
   - Go to Repository → Settings → Secrets
   - Add `SUPABASE_ACCESS_TOKEN`

   To get the token:
   - Go to https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Copy and save in GitHub Secrets

2. **Trigger Deployment**
   - Go to Actions → "Deploy Supabase Functions"
   - Click "Run workflow"
   - Select function to deploy (or "all")

3. **Automatic Deployment**
   - Functions auto-deploy on push to `main` when files in `supabase/functions/` change

#### Option 2: Via Supabase CLI

```bash
# Login to Supabase
supabase login

# Deploy a specific function
supabase functions deploy create-trip --project-ref jmjiyekmxwsxkfnqwyaa

# Deploy all functions
supabase functions deploy --project-ref jmjiyekmxwsxkfnqwyaa

# List deployed functions
supabase functions list --project-ref jmjiyekmxwsxkfnqwyaa
```

#### Option 3: Via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/jmjiyekmxwsxkfnqwyaa/functions
2. Click "Deploy function"
3. Select the function to deploy
4. Click "Deploy"

### Deployment Script

Use the provided script for convenience:

```bash
./deploy-functions.sh
```

---

## Environment Variables

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key | Google Cloud Console |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `VITE_BUILD_ID` | Build identifier (auto-set by CI) |
| `VITE_TRIP_PREVIEW_BASE_URL` | Base URL for trip previews |

### Setting Up

1. Copy the example file:
   ```bash
   cp .env.production.example .env.production
   ```

2. Fill in your values

3. For Vercel/Render, add these in their respective dashboards

See `ENVIRONMENT_SETUP_GUIDE.md` for detailed API key setup instructions.

---

## CI/CD Pipeline

### GitHub Actions Workflows

#### `.github/workflows/ci.yml`

Runs on all pushes and pull requests:

1. **Lint Check**: `npm run lint:check`
2. **Type Check**: `npm run typecheck`
3. **Unit Tests**: `npm run test -- --run --coverage`
4. **Build**: `npm run build`
5. **E2E Tests**: Playwright tests

#### `.github/workflows/deploy-functions.yml`

Deploys Supabase Edge Functions:

- **Automatic**: On push to `main` with changes in `supabase/functions/`
- **Manual**: Via workflow dispatch in GitHub Actions

---

## Build Process

### Local Build

```bash
# Install dependencies
npm install

# Run all checks
npm run lint && npm run typecheck

# Build for production
npm run build

# Preview the build
npm run preview
```

### Build Output

The build process creates:

```
dist/
├── index.html
├── assets/
│   ├── *.js       # JavaScript bundles
│   ├── *.css      # CSS files
│   └── *.woff2    # Fonts
└── ...            # Other static assets
```

### Build Optimization

The Vite configuration includes:
- Code splitting for vendor libraries
- Terser minification
- Asset hashing for cache busting
- Lazy loading for routes

---

## Verification

### After Web Deployment

1. **Check the site loads**: Visit your deployed URL
2. **Check authentication**: Sign in/sign out works
3. **Check API calls**: Trip creation, chat, etc.
4. **Check Console**: No JavaScript errors

### After Edge Functions Deployment

```bash
# List functions to verify deployment
supabase functions list --project-ref jmjiyekmxwsxkfnqwyaa
```

Test function endpoints:
- Create a trip in the app
- Join a trip
- Use AI Concierge

---

## Troubleshooting

### Build Failures

1. **Check the error message** - Line number and file
2. **Run locally**: `npm run build`
3. **Check TypeScript**: `npm run typecheck`
4. **Check ESLint**: `npm run lint`

### Common Issues

| Issue | Solution |
|-------|----------|
| "Module not found" | Check import paths, run `npm install` |
| TypeScript errors | Fix type issues, check `tsconfig.json` |
| Environment variable missing | Add to Vercel/Render dashboard |
| Edge Function 500 error | Check Supabase logs |

### Supabase Function Errors

1. Check logs in Supabase Dashboard → Functions → Logs
2. Verify environment variables are set
3. Check function code for errors
4. Re-deploy the function

---

## Mobile Deployment

### Current Status

**Mobile apps are NOT deployed from this repository.**

The architectural decision to use Flutter means:
- iOS and Android apps will be developed in a **separate repository**
- They will connect to the **same Supabase backend**
- Deployment will use native tooling (Xcode, Gradle)

See `ARCHITECTURE_DECISIONS.md` for details on this decision.

### What This Means

- This repository handles **web deployment only**
- No `npx cap sync` or Capacitor commands are used
- No iOS/Android build artifacts are produced here
- The PWA (Progressive Web App) remains active for mobile web users

---

## Security Checklist

Before production deployment:

- [ ] All secrets are in environment variables (not in code)
- [ ] `.env` files are in `.gitignore`
- [ ] Supabase RLS policies are enabled
- [ ] CORS is properly configured
- [ ] Content Security Policy headers are set
- [ ] HTTPS is enforced

---

## Rollback Procedure

### Vercel

1. Go to Vercel Dashboard → Deployments
2. Find the previous working deployment
3. Click "..." → "Promote to Production"

### Render

1. Go to Render Dashboard → Your Service → Deploys
2. Find the previous working deployment
3. Click "Manual Deploy" → "Deploy existing image"

### Supabase Functions

```bash
# Rollback is done by redeploying a previous version
git checkout <previous-commit>
supabase functions deploy <function-name> --project-ref jmjiyekmxwsxkfnqwyaa
```

---

## Support

### Documentation

- **Developer Setup**: `DEVELOPER_HANDBOOK.md`
- **Architecture**: `ARCHITECTURE_DECISIONS.md`
- **Environment**: `ENVIRONMENT_SETUP_GUIDE.md`
- **API Reference**: `docs/API_DOCUMENTATION.md`

### External Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Vite Docs**: https://vitejs.dev

---

**Last Updated:** December 2025
**Status:** Production Ready
