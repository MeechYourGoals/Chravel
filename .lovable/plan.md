
Objective: Fix the two requested issues without regressions by (1) renaming “Consumer Settings” to “Personal Settings” and (2) resolving profile photo upload failures across authenticated and demo scenarios, while also clearing current build blockers introduced in the recent Concierge search changes.

What I investigated and confirmed

1) “Consumer Settings” label source
- Found in `src/components/ConsumerSettings.tsx` line ~94:
  - `title="Consumer Settings"`
- This is the sidebar section title shown in your screenshot.

2) Exact root cause of “Upload failed” for profile photo
- Upload code path is in `src/components/consumer/ConsumerProfileSection.tsx`:
  - Uses `supabase.storage.from('avatars').upload(...)` (lines ~135–139)
  - Generic error toast on catch (lines ~161–164), which hides the real backend cause.
- Database/storage inspection confirms the real failure:
  - `storage.buckets` currently has `advertiser-assets` and `trip-media`, but NOT `avatars`.
  - No `storage.objects` RLS policies exist for `avatars`.
- Evidence from read queries:
  - `select id,name,public from storage.buckets where id in ('avatars','trip-media','advertiser-assets')`
    - returned only `advertiser-assets`, `trip-media`
  - `pg_policies` query for avatars-related policies returned empty.
- Why this happens despite code existing:
  - There is a migration file `supabase/migrations/20250131000002_create_avatars_storage_bucket.sql`, but it is not applied in the current DB migration history.
- Result:
  - Every authenticated avatar upload to bucket `avatars` fails at storage layer and surfaces only the generic toast.

3) Current build blockers that must be fixed alongside this work
- `AIConciergeChat.tsx`:
  - `onTabChange` referenced but not destructured from props.
  - `el` used outside scope in `onNavigate`.
- `universalSearchService.ts`:
  - Demo import uses nonexistent `.trips` export from `tripsData.ts` (actual export is `tripsData`).
  - Uses nonexistent table `trip_messages` (typed DB has `trip_chat_messages`).
  - Query shape around chat search causes type explosion (`TS2589`) due invalid/over-complex typed chain.

Implementation plan (small, surgical, no regressions)

Phase 1 — Unblock build first (required to ship)
1. Fix `AIConciergeChat.tsx` compile errors
- File: `src/components/AIConciergeChat.tsx`
- Changes:
  - Include `onTabChange` in component prop destructuring.
  - Correct `onNavigate` callback block so `el` is only used in the concierge branch.
  - Remove duplicate/out-of-scope `el?.scrollIntoView(...)`.
- Scope: minimal line edits around search modal callback only.

2. Fix universal search compile errors introduced by recent search modal integration
- File: `src/services/universalSearchService.ts`
- Changes:
  - Replace demo import usage:
    - from `(await import('@/data/tripsData')).trips`
    - to `(await import('@/data/tripsData')).tripsData`
  - Replace `trip_messages` query with `trip_chat_messages`.
  - Simplify message search query typing to avoid deep-instantiation:
    - select only fields guaranteed on `trip_chat_messages` (`id, content, created_at, trip_id, author_name`)
    - do not use typed relational select that causes recursive inference.
- Optional tiny hardening (if needed by TS):
  - narrow message query result mapping with explicit local interface type.
- Goal: typecheck/build pass without broad refactor.

Phase 2 — Fix the requested UX copy
3. Rename “Consumer Settings” -> “Personal Settings”
- File: `src/components/ConsumerSettings.tsx`
- Change:
  - `title="Consumer Settings"` -> `title="Personal Settings"`
- Scope: 1-line UI copy change.

Phase 3 — Fix avatar upload root cause in backend + frontend resilience
4. Add idempotent migration to create avatars bucket and policies in current environment
- New migration file (timestamped, current series):
  - Create bucket `avatars` if missing (public = true).
  - Add/ensure INSERT/UPDATE/DELETE policies scoped to folder prefix `[auth.uid()]`.
  - Add SELECT policy for public read (matching existing URL usage).
- This is the primary fix for authenticated upload failures.

5. Harden frontend upload flow and demo/auth behavior
- File: `src/components/consumer/ConsumerProfileSection.tsx`
- Changes:
  - Keep demo no-write behavior for true demo-only sessions, but prevent false positives for authenticated sessions.
  - Use auth/session-aware branching (authenticated users should use real upload path).
  - Improve error reporting:
    - capture storage error message/code and map to actionable user toast (e.g., bucket missing, RLS denied, file too large).
  - Keep existing success path (`updateProfile({ avatar_url })`) unchanged to avoid regressions.
- Important: preserve existing text profile save flow; do not alter `updateProfile` semantics in `useAuth`.

6. (Optional but low-risk) Add backend preflight for better diagnostics
- In upload handler section, optionally check bucket availability once and return clearer toast message if bucket missing.
- Keep this minimal and local to profile upload; no global changes.

Phase 4 — Tests + proof artifacts (non-negotiable)

Automated tests to add/update
1. `src/services/universalSearchService` tests (or update existing search tests)
- Covers:
  - demo trip search uses `tripsData` export correctly.
  - message search uses `trip_chat_messages` and returns mapped results.

2. `ConsumerProfileSection` upload tests
- Mock `supabase.storage.from('avatars').upload` + `getPublicUrl` + `updateProfile`.
- Cases:
  - authenticated success path updates avatar + success toast.
  - authenticated failure path shows descriptive error toast.
  - demo/no-session path bypasses remote upload and still gives non-error UX.
- Ensure no regression to profile save text fields.

3. Build validation checks
- `npm run typecheck`
- `npm run build`
- (and lint if in your standard gate)

Manual QA checklist (with evidence capture)
A. Settings label
- Open settings modal/page.
- Verify left header now reads “Personal Settings.”
- Capture screenshot.

B. Authenticated profile photo upload
- Logged-in user:
  - Upload valid JPG/PNG/GIF (<5MB).
  - Verify success toast.
  - Verify avatar updates immediately.
  - Refresh page; verify persisted avatar remains.
- Capture:
  - browser Network request for storage upload + profile update,
  - success UI screenshot.

C. Failure/edge handling
- Upload invalid type and >5MB file:
  - verify correct validation toast.
- Simulate bucket/policy failure in dev/mock:
  - verify descriptive error toast (not generic “upload failed” only).
- Capture console/network errors for proof.

D. Demo-mode behavior
- In demo-only session:
  - verify no backend failure toast.
  - verify expected UX behavior (demo success behavior without persistence).
- In authenticated + non-demo normal mode:
  - verify real upload path used.
- Capture screenshots + console/network summary.

E. Regression checks
- Text profile updates still save.
- No change to non-profile settings sections.
- Concierge UI still renders (post compile fix).
- `typecheck` and `build` logs attached.

Files planned for change
- `src/components/ConsumerSettings.tsx` (copy rename)
- `src/components/consumer/ConsumerProfileSection.tsx` (upload flow resilience + better errors)
- `src/components/AIConciergeChat.tsx` (fix `onTabChange`/`el` compile errors)
- `src/services/universalSearchService.ts` (fix exports/table/typechain compile errors)
- `supabase/migrations/<new_timestamp>_ensure_avatars_bucket_and_policies.sql` (root-cause backend fix)
- tests:
  - `src/components/consumer/__tests__/ConsumerProfileSection.test.tsx` (new)
  - search service test file (new or updated existing)

Risk controls / rollback
- Changes are localized and reversible.
- Migration is idempotent and bucket/policy scoped to `avatars` only.
- If upload regresses, rollback path is:
  1) revert frontend upload handling changes,
  2) keep migration (safe; additive and correct),
  3) re-run tests and typecheck/build.

Definition of done
- “Personal Settings” label visible.
- Authenticated profile photo upload succeeds end-to-end.
- Demo mode no longer surfaces broken upload UX.
- Build errors listed are resolved.
- Proof bundle provided: typecheck/build outputs + UI screenshots + network/log evidence.
