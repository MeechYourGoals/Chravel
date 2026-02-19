

# CRITICAL: Fix Gemini API Key Exposure + Prevent Future Leaks

## Immediate Actions (You Must Do in Google Cloud Console)

Before any code changes, do these RIGHT NOW:

1. Go to Google Cloud Console -> APIs and Credentials
2. DELETE the compromised key `AIzaSyAz3raJADWR86fJEV5Hx1_6V_Pgyj3ozw4` (hardcoded in your source code)
3. Create a NEW Maps-only key with:
   - Application restriction: HTTP referrers only
   - Allowed referrers: `chravel.lovable.app/*`, `*.lovable.app/*`, `localhost:*`
   - API restriction: Maps JavaScript API, Places API, Directions API ONLY (NOT Generative Language API)
4. Rotate your `GEMINI_API_KEY` in Supabase secrets (create a new one in Google AI Studio, update the secret)
5. Set billing alerts and per-API quota limits
6. Submit the appeal to Google explaining the key has been rotated and the exposure fixed

## Code Changes

### File 1: `src/config/maps.ts` -- Remove hardcoded key

Remove the `FALLBACK_PUBLIC_KEY` constant entirely. If `VITE_GOOGLE_MAPS_API_KEY` is not set, return empty string and show a warning. No hardcoded keys in source code, ever.

```
Before: const FALLBACK_PUBLIC_KEY = 'AIzaSyAz3raJADWR86fJEV5Hx1_6V_Pgyj3ozw4';
After:  (removed -- function returns '' if env var is missing)
```

### File 2: `src/hooks/useGeminiLive.ts` -- Remove raw apiKey fallback path

The client currently accepts either `accessToken` (ephemeral, correct) or `apiKey` (raw, dangerous) from the voice session edge function. Remove the `apiKey` fallback entirely. If no ephemeral token is returned, fail with a clear error.

```
Before (line 376):
  const apiKey = typeof sessionData?.apiKey === 'string' ? sessionData.apiKey : null;
  ...
  if (sessionError || (!accessToken && !apiKey)) { throw ... }
  ...
  const wsUrl = accessToken
    ? `${websocketUrl}?access_token=${encodeURIComponent(accessToken)}`
    : `${websocketUrl}?key=${encodeURIComponent(apiKey as string)}`;

After:
  // apiKey fallback REMOVED -- never send raw keys to browser WebSocket
  if (sessionError || !accessToken) { throw ... }
  const wsUrl = `${websocketUrl}?access_token=${encodeURIComponent(accessToken)}`;
```

### File 3: `supabase/functions/gemini-voice-session/index.ts` -- Verify no apiKey in response

Already correct -- returns `accessToken` (ephemeral token), not raw key. No changes needed but will add a comment to prevent future regression.

## What Does NOT Change

- `VITE_GOOGLE_MAPS_API_KEY` as a Lovable secret is fine for Google Maps JS SDK (it is a publishable key by design, but MUST be domain-restricted in GCP Console)
- All edge functions already use server-side secrets correctly
- `image-proxy` already proxies photos without exposing keys
- `lovable-concierge` and `functionExecutor.ts` already keep `GOOGLE_MAPS_API_KEY` server-side

## Summary of Root Cause

The hardcoded key `AIzaSyAz3raJADWR86fJEV5Hx1_6V_Pgyj3ozw4` in `src/config/maps.ts` was shipped in every client bundle. If this key's GCP project had the Generative Language API enabled (which it did -- project `gen-lang-client-0351134281`), then anyone who extracted the key from your JS bundle could call Gemini for free on your billing account. Bots found it, hammered it, and Google flagged it as hijacking.

## Post-Fix Verification

1. Build the app and search the output JS bundle for `AIzaSy` -- should find zero matches
2. Open DevTools -> Network on the live app and confirm no requests to `generativelanguage.googleapis.com` from the browser (except ephemeral-token WebSocket which uses `access_token=`, not `key=`)
3. Confirm voice concierge still works (uses ephemeral tokens only)
4. Confirm Maps/Places tab still works (uses the new restricted key from `VITE_GOOGLE_MAPS_API_KEY`)

