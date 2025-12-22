# Build ID Setup Guide

## Purpose

The `VITE_BUILD_ID` environment variable displays the current deployed version in production, helping you immediately identify which build is live. This prevents the "it worked, then reverted" confusion caused by stale caches or incorrect deployments.

## Setup Instructions

### For Vercel

1. Go to your project settings → Environment Variables
2. Add: `VITE_BUILD_ID` = `$VERCEL_GIT_COMMIT_SHA-$VERCEL_DEPLOY_TIMESTAMP`
3. Or use this template in your `vercel.json`:

```json
{
  "build": {
    "env": {
      "VITE_BUILD_ID": "$VERCEL_GIT_COMMIT_SHA"
    }
  }
}
```

### For Render

1. Add to your `render.yaml` in the `envVars` section:

```yaml
envVars:
  - key: VITE_BUILD_ID
    value: $RENDER_GIT_COMMIT
```

2. Render automatically populates `$RENDER_GIT_COMMIT` with the Git commit SHA

### For Lovable / Other Platforms

Add this to your deployment environment variables:

```bash
VITE_BUILD_ID=$(date +%Y-%m-%dT%H:%M:%SZ)-$(git rev-parse --short HEAD)
```

Or manually set:
```bash
VITE_BUILD_ID=2025-10-29T19:30Z-abc1234
```

## Build Script Enhancement (Optional)

You can automate this in your `package.json` build script:

```json
{
  "scripts": {
    "build": "VITE_BUILD_ID=$(date +%Y%m%d%H%M)-$(git rev-parse --short HEAD 2>/dev/null || echo dev) vite build"
  }
}
```

## Verification

After deployment:

1. Open your app in production
2. Look at the bottom-right corner - you should see the build badge: `vXXXXX · production`
3. Visit `/healthz` to see full diagnostic info including buildId

## Where It's Used

- **Build Badge**: Bottom-right corner of every page
- **Health Endpoint**: `/healthz` shows full build metadata
- **Console Logs**: Helpful for debugging cache issues

## Example Values

- Local dev: `vdev · development`
- Production: `v2025-10-29T19:30Z-abc1234 · production`
- Staging: `vstaging-20251029 · staging`

## Troubleshooting

If you see `vdev · production`:
- The environment variable wasn't set during build
- Add `VITE_BUILD_ID` to your deployment platform's env vars
- Trigger a new deployment after adding the variable

If the badge doesn't appear:
- Clear your browser cache
- Check console for errors
- Verify `BuildBadge` component is mounted in `App.tsx`
