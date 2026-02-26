
Objective: Restore rich invite/trip unfurl previews to production reliability by eliminating current infrastructure breakpoints and adding code-level fallback + regression guards.

What I found (root-cause evidence)
1) Primary outage is on the branded unfurl host (p.chravel.app), not the Google sign-in label change.
- Direct checks to both:
  - https://p.chravel.app/j/chravel3wtwrigg
  - https://p.chravel.app/t/1
  return Cloudflare error 1001 (“unable to resolve origin”) and intermittent TLS failures.
- This exactly matches the screenshot symptom: chat app falls back to plain domain card when OG HTML cannot be fetched.

2) The OG generator functions themselves are healthy right now.
- Direct calls to:
  - https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/generate-invite-preview?code=chravel3wtwrigg
  - https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/generate-trip-preview?tripId=1
  return full HTML with og:title/og:description/og:image.
- So metadata generation is working; delivery path is what’s failing.

3) Architectural single-point-of-failure exists.
- All shared links generated in app currently hardcode `https://p.chravel.app/...`:
  - `src/hooks/useInviteLink.ts`
  - `src/components/share/ShareTripModal.tsx`
- If p.chravel.app breaks, virality/share previews fail globally.

4) There is routing inconsistency in unfurl infrastructure.
- `unfurl/server.mjs` supports both `/t/:tripId` and `/j/:code`.
- `unfurl/worker.ts` supports only `/t/:tripId` (no invite `/j/:code` path).
- If the live p.chravel.app points to worker runtime, invite unfurls would fail even when DNS is fixed.

5) Minor metadata correctness issue in invite OG function.
- `generate-invite-preview` currently sets `og:url` to `https://chravel.app/join/:code` and ignores `canonicalUrl` query param.
- For stable cache/unfurl behavior, `og:url` should match the scraped URL (`https://p.chravel.app/j/:code`) when provided.

Not the cause
- Google sign-in branding text change is unrelated to OG unfurl behavior.

Surgical remediation plan (regression-safe)

Phase 0 — Immediate restore (infrastructure first, highest impact)
A) Recover p.chravel.app origin/DNS/TLS
- Validate DNS target for p.chravel.app points to active unfurl service.
- Confirm origin health endpoint:
  - `https://p.chravel.app/healthz` => 200 "ok"
- Ensure Cloudflare proxy + SSL mode are consistent with origin cert.
- Confirm no Cloudflare 1001 and no TLS handshake errors.

B) Ensure runtime behind p.chravel.app supports BOTH routes
- Required behavior:
  - `/t/:tripId` -> trip preview proxy
  - `/j/:code` -> invite preview proxy
- If currently on Worker, either:
  1) add `/j/:code` support in worker, or
  2) route p.chravel.app to Node unfurl service (`unfurl/server.mjs`) that already supports both.

Phase 1 — Code hardening (prevents full outage next time)
1) Add configurable unfurl base URL
- Introduce `VITE_UNFURL_BASE_URL` (default `https://p.chravel.app`).
- Update link generation to read from env (not hardcoded):
  - `src/hooks/useInviteLink.ts`
  - `src/components/share/ShareTripModal.tsx`
- Keeps runtime flexibility if infra moves domains.

2) Add graceful fallback URL strategy
- If configured unfurl base is missing/disabled, fallback to a controlled app-host URL (temporary rescue mode).
- This prevents total share outage while branded domain is being fixed.

3) Fix canonical handling in invite generator
- Update `supabase/functions/generate-invite-preview/index.ts`:
  - read `canonicalUrl` from query
  - set `<meta property="og:url">` to canonicalUrl when present
- Align with `generate-trip-preview` behavior for deterministic unfurl caching.

4) Keep preview source priority intact
- Preserve existing OG image priority behavior (cover photo first, branded fallback second).
- No changes to trip media selection logic.

Phase 2 — Regression-proof verification
A) Edge function verification
- Validate direct outputs for both functions include:
  - `og:title`
  - `og:description` with location + date
  - `og:image`
  - `og:url` matching canonical
- Test both demo and real invite/trip IDs.

B) Branded domain verification
- Validate:
  - `https://p.chravel.app/j/<real_code>` returns OG HTML
  - `https://p.chravel.app/t/<trip_id>` returns OG HTML
- Confirm no Cloudflare error page content.

C) End-to-end messaging app checks (critical)
- Send both link types in iMessage + WhatsApp.
- Confirm rich card renders:
  - cover image
  - trip title
  - location
  - dates
- Confirm card remains after cache warm/cold retry.

D) Automated guardrails
- Extend test coverage:
  - E2E spec for branded `/j/` and `/t/` unfurls (HTTP-level assertions on OG tags).
  - Smoke check script in CI/deploy verifying p.chravel.app health + route availability.
- Alerting:
  - trigger alert on non-200 `/healthz`
  - alert if response body contains Cloudflare 1001 markers.

Implementation scope (files/services likely touched)
- Infra/runtime:
  - `unfurl/worker.ts` (add `/j/:code` parity if worker is active runtime)
  - `unfurl/server.mjs` (only if needed for parity updates)
- Frontend share generation:
  - `src/hooks/useInviteLink.ts`
  - `src/components/share/ShareTripModal.tsx`
- Supabase function:
  - `supabase/functions/generate-invite-preview/index.ts` (canonicalUrl support)
- Optional docs/runbook:
  - deployment doc for unfurl DNS + health checks

Risk, sequencing, rollback
- Risk level: Medium (because infra + share paths touch virality-critical flow), Low code-risk if done in sequence.
- Sequence dependency:
  1) Restore p domain routing first
  2) then harden app/share config + canonical fix
  3) then run end-to-end checks
- Rollback:
  - Revert frontend link-base config change (single commit rollback)
  - Repoint p.chravel.app back to previous known-good origin if route parity change fails.

Success criteria (must all pass)
1) p.chravel.app `/j` and `/t` are globally reachable (no 1001/TLS issues).
2) Both routes return HTML containing OG tags for real links.
3) iMessage and WhatsApp show rich cards for invite and trip links.
4) Automated smoke checks detect future outages before users do.
