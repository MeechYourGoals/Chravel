

## Fix Build Errors + Confirm Gmail Secrets Are Working

### Secrets Status
Your `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` are **already set** in Supabase (confirmed from your screenshot). Edge functions access them via `Deno.env.get()` — no migration or additional setup needed. The previous analysis was wrong because it used Lovable's `fetch_secrets` tool which only sees secrets managed through Lovable, not ones added manually in the Supabase dashboard. **No action needed on the secrets front.**

### Build Error Fixes (4 errors in 3 files)

**1. `supabase/functions/concierge-tts/index.ts` line 342**
- `Uint8Array` not assignable to `BodyInit` — Deno type mismatch
- Fix: Cast `audioBytes` → `audioBytes as unknown as BodyInit`

**2. `supabase/functions/execute-concierge-tool/index.ts` line 117**
- `tripId` is typed `unknown`, needs to be `string` for `generateCapabilityToken`
- Fix: Cast `tripId` → `tripId as string`

**3. `supabase/functions/lovable-concierge/index.ts` lines 2364 and 2544**
- `userId` variable doesn't exist in scope (only `user` exists, declared at line 783)
- Fix: Replace `user?.id || userId` → `user?.id` in both locations

