# TODO

## Security hardening follow-up (invite edge functions)
- [x] Consolidate duplicated invite-security helpers into shared Edge function utilities.
- [x] Harden invite body parsing and method validation to return deterministic client-safe errors.
- [x] Re-run required gates (`npm run lint && npm run typecheck && npm run build`).
- [x] Commit, verify branch status, and publish PR update.

## Security + scale readiness hardening (invite surfaces)
- [x] Scope architecture and trust boundaries for auth/invite/AI/uploads/payments/realtime paths.
- [x] Audit externally reachable invite endpoints for abuse risks and choose lowest-regression controls.
- [x] Implement safe hardening for invite preview/join abuse resistance (rate limit + request validation + safer logs).
- [x] Run required gates (`npm run lint && npm run typecheck && npm run build`) and targeted checks.
- [x] Commit changes, verify branch tracking, and open PR.

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

## Pro trips Channels + Roles + Media launch-readiness audit
- [x] Scope Pro trip channel/role/media architecture and locate source-of-truth hooks/services.
- [x] Dogfood Pro trip flows in app-preview mode (chat/channels, team roles, media hub) and log runtime failures.
- [x] Produce a launch-readiness deep-dive with bugs, edge cases, and MVP-safe high-impact feature recommendations.
- [x] Run lint + typecheck + build gates before commit.
- [x] Commit audit deliverable + open PR.

## Pro channels/roles/media hardening implementation
- [x] Scope smallest high-impact fixes from prior audit (cache keys, demo gating, message author fallback).
- [x] Implement targeted code fixes in hooks/services only (no broad refactor).
- [x] Validate with lint + typecheck + build.
- [x] Commit changes and create PR.
## Tasks module launch-readiness deep dive
- [x] Attempt requested Vercel dogfood workflow and record blockers/workaround.
- [x] Audit Tasks UI/hooks/services/tests for launch-blocking bugs and edge cases.
- [x] Produce actionable launch-readiness report with high-impact MVP feature adds.
- [x] Run lint/typecheck/build gates before shipping findings.

## AI concierge rich card persistence + save-to-trip hardening
- [x] Scope concierge rich-card rendering + link-save path and identify root causes for disappearing flight cards / blocked links.
- [x] Implement targeted chat model + renderer updates so rich cards persist per-message and flight links open reliably via hardened anchors.
- [x] Add reusable concierge-card save mutation that writes simple link records to Places Explore with dedupe + saved state UX across rich cards.
- [x] Add/adjust automated tests for rich card persistence and save CTA behavior.
- [x] Run required quality gates (`npm run lint && npm run typecheck && npm run build`) and capture manual verification notes.

## AI concierge ElevenLabs voice deep-dive + hardening
- [x] Scope recently shipped voice/TTS integration across chat input, TTS hook, and edge function.
- [x] Fix confirmed bugs with minimal diffs (mobile long-press/tap reliability, auth/limit handling, and UX error messaging).
- [x] Add regression-focused unit coverage for the TTS hook behavior.
- [x] Run `npm run lint && npm run typecheck && npm run build` and focused tests for touched code.
- [x] Commit changes and open PR with rollback notes.

## AI concierge voice launch-mode rollout (all users)
- [x] Scope current voice gating across AIConciergeChat + elevenlabs-tts and confirm Pro/Consumer entry points.
- [x] Add explicit launch-mode switch so voice playback is enabled for all users now, with a future paid-gating toggle.
- [x] Add/update regression tests for launch-mode behavior.
- [x] Run `npm run lint && npm run typecheck && npm run build` + focused tests.
- [x] Commit changes and open PR with rollback guidance.

## PWA chunk error recovery buttons hardening
- [x] Scope current Failed to Load Page retry/clear actions across ErrorBoundary, LazyRoute, and safeReload utility.
- [x] Implement minimal PWA-safe reload behavior so Try Again and Clear Cache & Reload trigger distinct recovery paths.
- [x] Add regression-focused unit tests for updated reload semantics.
- [x] Run required build gates (`npm run lint && npm run typecheck && npm run build`) plus focused tests.
- [x] Commit changes, verify branch tracking/push status, and open PR.


## PWA enterprise organization settings mobile overflow containment fix
- [x] Scope overflow root cause for create-organization CTA and logo upload card in organization settings.
- [x] Implement minimal Tailwind class adjustments to keep text/actions contained on narrow widths.
- [x] Validate via required gates (`npm run lint && npm run typecheck && npm run build`) and capture mobile verification evidence.
- [x] Commit changes, verify branch tracking/push status, and open PR.

## ElevenLabs "Invalid API Key" deep-dive + TTS alternative recommendation
- [x] Trace ElevenLabs request path end-to-end (client hook → edge function → ElevenLabs API headers).
- [x] Audit repository for hardcoded ElevenLabs API keys and secret naming mismatches.
- [x] Document highest-probability failure modes and concrete Supabase verification commands.
- [x] Recommend a free non-robotic TTS replacement with a warm male voice profile.

## Replace ElevenLabs provider with Google Cloud TTS
- [x] Scope current TTS call path + identify smallest provider swap surface.
- [x] Implement edge function provider swap (Google Cloud TTS) while preserving existing client contract.
- [x] Update docs/env requirements for new secret + voice defaults.
- [x] Add/update tests for error mapping and audio response expectations.
- [x] Run lint, typecheck, build, and focused tests.

## AI concierge voice controls cleanup + dictation fix
- [x] Scope the waveform/dictation regression and confirm why click no longer starts speech-to-text into the composer.
- [x] Remove the autoplay voice toggle button from the chat composer UI and disable its autoplay path.
- [x] Restore expected waveform button click behavior (tap to dictate into input, editable before send).
- [x] Add/adjust focused regression tests for voice button interactions.
- [x] Run required gates (`npm run lint && npm run typecheck && npm run build`) plus targeted tests.

## AI concierge timeout deep-dive + stream resilience hardening
- [x] Scope timeout failure path across concierge stream client + edge function and confirm likely root cause for Google Flights requests.
- [x] Implement minimal keepalive/idle-timeout hardening to prevent false "Request timed out" failures during long-running tool loops.
- [x] Run required gates (`npm run lint && npm run typecheck && npm run build`) and a focused concierge test sweep.
- [x] Produce component-by-component reliability scoring (0-100) with concrete actions for any area below 90.

## AI concierge tool-calling audit (text + voice)
- [x] Scope concierge tool inventories across lovable-concierge, voice session config, and executors.
- [x] Compare declared tools vs implemented tools and identify parity gaps between text and voice paths.
- [x] Document trigger prompts, semantic-routing behavior, rich-card support, and latency simplification opportunities.
- [x] Run required gates (`npm run lint && npm run typecheck && npm run build`).
- [x] Commit audit deliverable + open PR.

## AI concierge tool parity implementation (text + voice)
- [x] Restore shared `functionExecutor` coverage so all declared text concierge tools execute server-side.
- [x] Align `gemini-voice-session` tool declarations to match text concierge tools one-for-one.
- [x] Route newly-added parity tools through `useVoiceToolHandler` bridge to `execute-concierge-tool`.
- [x] Run required gates (`npm run lint && npm run typecheck && npm run build`).
- [x] Commit implementation + verify branch tracking/push + open PR.
