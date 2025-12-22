# Chravel Vercel Auto-Deploy Guide

## Overview
This guide sets up automatic deployment to Vercel on every `git push` to main branch.

## Prerequisites
- Vercel account (free tier works)
- GitHub repository connected
- Supabase project credentials

## Setup Steps

### 1. Initial Vercel Setup (One-Time - 15 minutes)

#### 1.1 Connect Repository

1. Visit https://vercel.com/new
2. Import your GitHub repository
3. Select framework: **Vite**

#### 1.2 Configure Environment Variables

In Vercel project settings, add these environment variables:

```
VITE_SUPABASE_URL = https://jmjiyekmxwsxkfnqwyaa.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptaml5ZWtteHdzeGtmbnF3eWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjEwMDgsImV4cCI6MjA2OTQ5NzAwOH0.SAas0HWvteb9TbYNJFDf8Itt8mIsDtKOK6QwBcwINhI
VITE_BUILD_ID = $VERCEL_GIT_COMMIT_SHA
```

#### 1.3 Deploy Settings

- **Production Branch:** `main`
- **Install Command:** `npm ci`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node Version:** 18.x

#### 1.4 Get Vercel Tokens

1. Go to **Account Settings** → **Tokens** → **Create Token**
2. Copy the **VERCEL_TOKEN**
3. Go to **Project Settings** → **General**
4. Copy **Project ID** and **Org ID**

#### 1.5 Add GitHub Secrets

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Add three secrets:
   - `VERCEL_TOKEN` - From step 1.4
   - `VERCEL_ORG_ID` - From step 1.4
   - `VERCEL_PROJECT_ID` - From step 1.4

### 2. Workflow After Setup

**Every git push to main:**
1. GitHub Actions runs tests (lint, typecheck, build)
2. If tests pass → Automatic deployment to Vercel
3. Vercel builds and deploys
4. Production URL updated automatically
5. Build badge shows new version

**Preview Deployments:**
- Every PR gets a unique preview URL
- Test changes before merging

### 3. Monitoring

#### Check Deployment Status

- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Actions:** Repository → Actions tab
- **Build Badge:** Bottom-right of app (shows current build ID)
- **Health Endpoint:** `https://your-domain.vercel.app/healthz`

#### Deployment Logs

- **Vercel Dashboard** → Deployments → Click deployment → View logs
- **GitHub Actions** → Click workflow run → View steps

### 4. Rollback Process

#### If deployment breaks:

**Quick Rollback (Vercel Dashboard):**
1. Go to **Deployments**
2. Find previous working deployment
3. Click **"..."** → **Promote to Production**

**Git Rollback:**
```bash
git revert HEAD
git push origin main
# Auto-deploys previous version
```

### 5. Cache Invalidation

**Built-in via vercel.json:**
- Aggressive caching for `/assets/*` (immutable)
- No caching for HTML files
- Build ID in every deployment

**Manual cache clear (if needed):**
- Vercel Dashboard → Project → Settings → Caching → Purge Cache

### 6. Cost Estimation

**Vercel Free Tier Includes:**
- 100 GB bandwidth/month
- 100 GB-hours serverless function execution
- Unlimited deployments
- Preview deployments
- Custom domains

**Upgrade triggers:**
- >1M page views/month
- Need team collaboration features
- Advanced analytics required

## Troubleshooting

### Build Fails

1. Check GitHub Actions logs
2. Run `npm run build` locally to reproduce
3. Verify environment variables in Vercel
4. Check Node version (should be 18.x)
5. Review `vercel.json` configuration

### Deployment Succeeds But App Broken

1. Visit `/healthz` endpoint to check build info
2. Check build badge version matches git commit
3. Review Vercel deployment logs
4. Verify all environment variables are set correctly
5. Check browser console for errors

### Edge Functions Not Working

1. Supabase edge functions deploy separately (not through Vercel)
2. Check Supabase function logs for errors
3. Verify `supabase/config.toml` is correct
4. Redeploy edge functions if needed

### Cache Issues

1. Try incognito/private browsing
2. Check service worker is not caching old content
3. Purge Vercel cache manually
4. Verify build ID changes between deployments

## Next Steps After Setup

1. ✅ Test automatic deployment (push small change to main)
2. ✅ Verify build badge shows correct version
3. ✅ Check `/healthz` endpoint returns correct data
4. ✅ Create a test PR to verify preview deployments
5. ✅ Set up custom domain (optional)
6. ✅ Configure Vercel analytics (optional)

## Files Created/Modified

- ✅ `vercel.json` - Vercel configuration
- ✅ `.github/workflows/ci.yml` - GitHub Actions with Vercel deployment
- ✅ `supabase/functions/_shared/validation.ts` - Fixed Zod schema
- ✅ `LOVABLE_DEPLOYMENT_ANALYSIS.md` - This documentation

## Key Features Enabled

- ✅ Automatic deployments on push to main
- ✅ Preview deployments for PRs
- ✅ Build version tracking with commit SHA
- ✅ Security headers configured
- ✅ Optimized caching strategy
- ✅ Health endpoint for monitoring
- ✅ Easy rollback process

## References

- [Vercel Documentation](https://vercel.com/docs)
- [Vite on Vercel](https://vercel.com/docs/frameworks/vite)
- [GitHub Actions](https://docs.github.com/actions)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Support

If you encounter issues:
1. Check this documentation first
2. Review Vercel and GitHub Actions logs
3. Consult `DEPLOYMENT_FIX_SUMMARY.md` for previous deployment fixes
4. Contact Lovable support if needed
