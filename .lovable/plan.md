
Objective: Restore app boot across preview + published site by fixing the startup env regression with high-confidence, low-risk changes.

What I verified (deep-dive evidence):
1) Runtime failure is reproducible in preview right now.
- Console shows:
  - `[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set...`
  - `Error: supabaseUrl is required.`
  - Crash originates at `src/integrations/supabase/client.ts` when `createClient('', '')` runs.
2) `.env` is currently absent in the repo (`.env` file not found), and `.gitignore` excludes `.env`, so prior “restore” attempts would not persist in source.
3) This is not a chunk/load/network outage:
- Network requests in preview are 200s for app scripts.
- No chunk-load error signature (no 404 bundle/chunk failures).
4) Your production symptom is a blank screen (from your response), which matches the same boot-fail pattern.

Confidence assessment:
- 98% confidence root cause for preview: Supabase client hard-fails when env vars are missing at runtime/build time.
- 92% confidence production shares same root cause class (boot-time env resolution failure), given identical blank-screen behavior and this project’s current client initialization strategy.

Why this is happening:
- `src/integrations/supabase/client.ts` now requires env vars and has no resilient fallback.
- If env injection is unavailable/misaligned in either preview or publish pipeline, app crashes before React mounts.
- This is a startup config failure, not data deletion. Your DB/work is not gone.

Scope definition (surgical, minimal):
- Primary file: `src/integrations/supabase/client.ts`
- Verification files/routes: `src/pages/Healthz.tsx`, `src/main.tsx` (no risky refactor)
- No DB migrations, no RLS/policy changes, no schema risk.

Implementation plan (ordered, with confidence gates):
Phase A — Crash-proof boot path (high-priority, minimal risk)
1) Update Supabase client bootstrap to never call `createClient` with empty URL/key.
2) Add deterministic fallback chain:
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - final fallback to known project constants (project ref/key already known for this connected project).
3) Keep a clear console warning when fallback path is used (for visibility), but prevent boot crash.

Phase B — Environment hardening (prevent recurrence)
4) Align naming so both ANON and PUBLISHABLE key patterns are supported consistently.
5) Add explicit “env source diagnostics” in development (safe, non-secret) so we can see which source was used.
6) Ensure Healthz route reports env-status without requiring a failing Supabase init path.

Phase C — Verification matrix (must pass before closing)
7) Preview web:
   - Load `/` with no blank screen
   - Confirm no `supabaseUrl is required` in console
8) Published site:
   - Load root page and confirm non-blank first paint
9) Mobile web viewport checks (375x812 + 390x844):
   - Confirm app boots and routes render
10) Regression checks:
   - Auth screen loads
   - No new chunk errors
   - No changes to auth/RLS semantics

Risk and rollback:
- Regression risk: LOW (single-point bootstrap hardening).
- Rollback: revert `src/integrations/supabase/client.ts` to previous state if unexpected behavior appears.

Non-technical summary:
- The site is failing at startup because config values are missing where the app expects them.
- This does not mean your data is lost.
- We can fix this safely by making startup resilient so the app never crashes when env injection is flaky.

If you approve, I will execute exactly this surgical fix path first (Phase A), then run the verification matrix before any broader changes.
