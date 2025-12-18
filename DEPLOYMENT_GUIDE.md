# 🚀 Edge Function Deployment Guide

## Critical Issue: create-trip Function Not Deployed

The `create-trip` Edge Function is **required** for creating trips but is currently **not deployed** to Supabase.

### Quick Fix (Option 1): Deploy via Supabase Dashboard

1. Go to [Supabase Functions Dashboard](https://supabase.com/dashboard/project/jmjiyekmxwsxkfnqwyaa/functions)
2. Click **"Deploy function"** button
3. Select `create-trip` from the functions list
4. Click **"Deploy"**
5. Wait for deployment to complete (~30 seconds)
6. Test trip creation in the app

### Quick Fix (Option 2): Deploy via GitHub Actions

1. Go to [GitHub Actions](https://github.com/MeechYourGoals/Chravel/actions)
2. Select **"Deploy Supabase Functions"** workflow
3. Click **"Run workflow"**
4. Choose `create-trip` from the dropdown
5. Click **"Run workflow"** button
6. Wait for completion

**Note:** This requires `SUPABASE_ACCESS_TOKEN` to be set in GitHub Secrets.

### Quick Fix (Option 3): Deploy via Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the create-trip function
supabase functions deploy create-trip --project-ref jmjiyekmxwsxkfnqwyaa

# Verify deployment
supabase functions list --project-ref jmjiyekmxwsxkfnqwyaa
```

Or use the provided script:
```bash
./deploy-functions.sh
```

## How to Set Up GitHub Secrets (for Option 2)

1. Generate a Supabase Access Token:
   - Go to [Supabase Account Settings](https://supabase.com/dashboard/account/tokens)
   - Click **"Generate new token"**
   - Copy the token

2. Add to GitHub Secrets:
   - Go to [GitHub Settings → Secrets](https://github.com/MeechYourGoals/Chravel/settings/secrets/actions)
   - Click **"New repository secret"**
   - Name: `SUPABASE_ACCESS_TOKEN`
   - Value: [paste the token]
   - Click **"Add secret"**

## Verification

After deployment, test trip creation:

1. Login to the app
2. Click **"Create Trip"** button
3. Fill in trip details:
   - Title: "Test Trip"
   - Location: "New York, NY"
   - Start Date: [any future date]
   - End Date: [any future date after start]
4. Click **"Create Trip"**
5. Should see success message ✅

## Why Was This Happening?

The `create-trip` Edge Function was:
- ✅ Present in codebase (`supabase/functions/create-trip/`)
- ✅ Called by app (`tripService.createTrip()`)
- ❌ **Missing from `supabase/config.toml`**
- ❌ **Not deployed to Supabase**

This has been fixed by adding it to `config.toml`. Now it just needs to be deployed.

## Other Functions to Check

Make sure these critical functions are also deployed:

- ✅ `create-trip` - **DEPLOY THIS NOW**
- ✅ `join-trip` - Allows users to join trips
- ✅ `approve-join-request` - Allows admins to approve join requests
- ✅ `link-trip-to-organization` - Links Pro/Event trips to organizations

## Need Help?

If deployment fails:
1. Check Supabase project status
2. Verify you have admin access to project `jmjiyekmxwsxkfnqwyaa`
3. Check Supabase logs for errors
4. Contact Supabase support if issues persist

---

**Last Updated:** 2025-12-18
**Status:** 🔴 CRITICAL - Deployment required before production use
