# Environment Variables Setup

This document explains how to configure environment variables for Chravel in different environments.

## Quick Start (Local Development)

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your values in `.env`:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
   VITE_STREAM_API_KEY=your-stream-key
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

## Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `VITE_SUPABASE_URL` | Supabase project URL | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (public) | Same as above |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `VITE_STREAM_API_KEY` | Stream Chat API key | [Stream Dashboard](https://getstream.io/dashboard/) |

## Capacitor / Mobile Builds

For iOS/Android builds, environment variables are **baked in at build time**:

```bash
# 1. Ensure .env is configured
# 2. Build the web app
npm run build

# 3. Sync to native platforms
npx cap sync

# 4. Build native app
npx cap run ios   # or android
```

**Important**: If you change env vars, you must rebuild (`npm run build && npx cap sync`).

## CI/CD Configuration

### Vercel
Set variables in Project Settings → Environment Variables.

### Render
Set in render.yaml or Dashboard → Environment.

### GitHub Actions
Add secrets in Repository Settings → Secrets and Variables.

Example workflow:
```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
  VITE_GOOGLE_MAPS_API_KEY: ${{ secrets.VITE_GOOGLE_MAPS_API_KEY }}
```

## Runtime Validation

The app validates environment variables at startup. Missing required variables will:
- **Development**: Log detailed errors and warnings
- **Production**: Throw an error preventing app start

You can manually validate:
```typescript
import { validateEnv, assertEnv } from '@/config/env';

// Check without throwing
const result = validateEnv();
console.log(result.isValid, result.missing);

// Throw if invalid
assertEnv();
```

## Security Notes

1. **Never commit `.env`** - It's in `.gitignore` for a reason
2. **Anon key is public** - It's designed to be exposed in client code
3. **Service role key is SECRET** - Only use in Edge Functions, never client-side
4. **Use `sync: false` in render.yaml** - Forces manual configuration

## Troubleshooting

### "Missing Supabase configuration" error
- Ensure `.env` exists with correct values
- Restart the dev server after changes
- Check for typos in variable names

### Variables not updating in mobile app
- Rebuild: `npm run build && npx cap sync`
- Clear app data on device/simulator

### Variables work locally but not in production
- Check CI/CD environment variable configuration
- Ensure variables are prefixed with `VITE_` for Vite to expose them
