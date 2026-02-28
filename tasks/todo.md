# TODO

## Settings profile persistence fix (real name + display name)
- [x] Scope bug by tracing consumer settings save path and auth rehydration path.
- [x] Implement targeted persistence hardening for name fields.
- [x] Add/adjust automated coverage for the regression-prone path.
- [x] Run focused validation (tests/typecheck for touched code).
- [x] Document review notes + risks.

## Event recap export parity fix
- [x] Scope event header export regression and identify affected entry points.
- [x] Implement event-internal recap trigger parity with trip/pro-trip flows.
- [x] Rename collaborator action copy from "PDF Recap" to "Event Recap" for events.
- [x] Run focused validation (tests/lint/typecheck where feasible).
- [x] Document review notes + risks.

## Event recap regression-proof e2e coverage
- [x] Scope existing Playwright setup and locate stable selectors for desktop + mobile event recap flows.
- [x] Add focused Playwright spec covering desktop and mobile event recap modal opening.
- [x] Run focused e2e test(s) plus type/lint checks for touched files.
- [x] Document verification results and residual risks.

## AI concierge prompt-injection hardening guidance docs
- [x] Scope the request and map existing security + AI concierge documentation.
- [x] Add a production-ready security checklist for prompt injection, tool gating, and data exfil prevention.
- [x] Run lint, typecheck, and build gates required before commit.
- [x] Commit docs changes and open PR with implementation notes.

## Design system consistency audit + standardization proposal
- [x] Scope current design-system implementation and identify canonical styling sources.
- [x] Audit button variants, typography scale, spacing rhythm, and color-token adoption with codebase-wide evidence.
- [x] Identify reusable component opportunities with highest consistency ROI.
- [x] Publish a standardized design-system proposal with phased migration guidance.
- [x] Run lint, typecheck, and build gates required before commit.

## Review
- Root cause: auth fallback hydration could re-seed `profiles.display_name` from stale auth metadata and fallback profile selects dropped `real_name`, which made settings appear non-persistent after app relaunch/resume.
- Fix: changed profile self-heal upsert to ignore duplicates (insert-only behavior), expanded fallback profile select to include `real_name`/`name_preference`/`phone`, and synchronized auth metadata after profile name updates.
- Added test coverage in `useAuth.test.tsx` to ensure `updateProfile` now syncs `display_name` + `full_name` metadata.
- Validation: targeted auth hook test file and project typecheck both pass.


### Event recap export parity fix
- Root cause: desktop `EventDetail` rendered the collaborator export button without passing `onShowExport`, so clicking recap in-event did nothing.
- Fix: wired desktop event header to open `TripExportModal`, added event export handler parity with mobile flow, and passed `tripType="event"` so event copy/sections are used.
- UX copy: collaborator action now reads `Event Recap` for event trips while trip/pro-trip labels remain unchanged.
- Validation: `npm run typecheck` and targeted eslint on touched files (warnings only from pre-existing issues).


### Event recap regression-proof e2e coverage
- Added `e2e/specs/events/event-recap-export.spec.ts` with desktop + mobile event recap modal-open assertions.
- Validation: `npx eslint e2e/specs/events/event-recap-export.spec.ts` and `npm run typecheck` pass.
- Playwright run attempted (`npx playwright test ... --project=chromium`) but browser binary is unavailable in container; install attempt failed due CDN 403, so runtime execution remains blocked by environment.
- Risk: selector stability depends on current `aria-label`/button labels (`Create Event Recap`, `View event details`); changes to copy should update this spec intentionally.
