# Weekly Performance Audit — 2026-03-18

## Scope

This audit covered the full repository with emphasis on:

- trip detail route loads and tab switching
- user-facing mutation confidence for tasks, polls, payments, calendar, base camp, and AI concierge write actions
- heavy operations such as PDF export, invite/share generation, media upload/import, and place search
- platform and infrastructure contributors across Supabase, Vercel, Google APIs, storage, and edge functions

The goal was to separate healthy surfaces from real bottlenecks, then implement only low-risk fixes with clear upside.

## Safe Improvements Implemented

### 1. Trip-detail prefetches now seed the cache keys the route actually consumes
- File: `src/hooks/usePrefetchTrip.ts`
- Change: aligned the hover/focus trip-detail prefetch with `useTripDetailData` by including the auth-scoped trip detail key and the canonical members query shape.
- Why it is safe: no data semantics changed; only the warmed cache entry and members fetcher were aligned to the existing route hook.
- Expected win: better cache-hit rate when opening trips from cards, especially on cold route transitions.

### 2. Startup no longer performs an extra auth validation round-trip just to tag error tracking
- File: `src/App.tsx`
- Change: replaced `supabase.auth.getUser()` at startup with an auth-context-driven `ErrorTrackingUserSync`.
- Why it is safe: the same user id comes from the app’s canonical auth provider; sign-in/sign-out now stay in sync without extra network work.
- Expected win: lighter startup/resume auth chatter and less redundant `/auth/v1/user` traffic.

### 3. Google Places response paths no longer wait on best-effort usage logging and cache writes
- File: `src/services/googlePlacesNew.ts`
- Change: converted `recordApiUsage()` and `setCachedPlace()` calls from awaited work to best-effort background work; also moved autocomplete’s client-side cache/quota checks ahead of the Maps SDK boot.
- Why it is safe: both helpers already swallow their own failures and are observability/cache concerns rather than correctness-critical logic.
- Expected win: lower perceived latency for autocomplete, text search, nearby search, place details, and resolve flows.

### 4. AI pending actions are now visibly actionable in the concierge UI
- File: `src/components/AIConciergeChat.tsx`
- Change: rendered `trip_pending_actions` inline using `PendingActionCard` so drafted tasks/polls/calendar items are clearly awaiting confirmation.
- Why it is safe: uses existing hook and card infrastructure already present in the codebase; no backend mutation semantics changed.
- Expected win: immediate confidence feedback for AI create flows that previously relied on a later assistant response without an obvious confirm/reject affordance.

## Validation

- Targeted tests:
  - `src/hooks/usePrefetchTrip.test.tsx`
  - `src/features/chat/components/PendingActionCard.test.tsx`
- Full gates:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`

## Code-Level Findings

### Healthy

#### Consumer trip detail loading path
- Evidence: `src/hooks/useTripDetailData.ts`, `src/pages/TripDetailDesktop.tsx`, `src/pages/MobileTripDetail.tsx`
- Why healthy: auth-aware gating, clear loading/not-found separation, and parallel trip/member fetches reduce both real latency and trust-damaging flashes.

#### Route and tab code splitting
- Evidence: `src/App.tsx`, `src/components/LazyRoute.tsx`, `src/components/TripTabs.tsx`, `src/components/mobile/MobileTripTabs.tsx`
- Why healthy: route-level lazy loading is already in place and major tab bundles are being preloaded.

#### Chat data path
- Evidence: `src/features/chat/hooks/useTripChat.ts`
- Why healthy: reconnect backfill, small initial fetches, offline cache fallback, and incremental realtime handling make this surface materially stronger than earlier audits.

#### Most non-payment mutations
- Evidence: `src/hooks/useTripTasks.ts`, `src/hooks/useTripPolls.ts`, `src/features/calendar/hooks/useCalendarEvents.ts`, `src/hooks/useTripBasecamp.ts`, `src/hooks/usePayments.ts`
- Why healthy: tasks, polls, calendar, base camp, and payment creation already lean on optimistic or quick local feedback patterns.

### Improvable

#### Hidden visited tabs stay mounted and can accumulate background work
- Evidence: `src/components/TripTabs.tsx`, `src/components/mobile/MobileTripTabs.tsx`
- User flow: longer sessions that hop across Chat, Tasks, Payments, Places, etc.
- Issue type: actual latency and scale risk
- Root cause: preserved mounts are good for instant switching, but they keep subscriptions/effects/query observers alive after users have visited many tabs.
- Scale outlook: likely to degrade with moderate growth, especially on mobile.
- Recommended next step: audit hidden-tab subscriptions and selectively pause lower-priority observers when tabs are inactive.

#### Payments tab still has the weakest confidence loop
- Evidence: `src/components/payments/PaymentsTab.tsx`, `src/components/payments/OutstandingPayments.tsx`, `src/components/payments/PaymentHistory.tsx`
- User flow: open Payments, settle or un-settle a split
- Issue type: both actual and perceived latency
- Root cause: extra enrichment fetches after the parent data load and limited per-row pending feedback on settlement.
- Scale outlook: okay at current scale, but increasingly annoying as trips accumulate more splits/history.
- Recommended next step: collapse enrichment into the parent data path and add row-level pending state for settle/unsettle actions.

#### PDF export still does too much client-side work
- Evidence: `src/utils/exportPdfClient.ts`, `src/services/tripExportDataService.ts`, `src/components/trip/TripExportModal.tsx`
- User flow: recap/export generation from trip and card surfaces
- Issue type: both actual and perceived latency
- Root cause: sequential section fetches, repeated font fetch/embedding, and main-thread PDF rendering on most surfaces.
- Scale outlook: likely to degrade with moderate growth and larger trips/events.
- Recommended next step: parallelize export section fetches, cache font payloads, and expand use of the existing server export path where it is already proven.

#### Invite/share code generation is round-trip heavy
- Evidence: `src/hooks/useInviteLink.ts`
- User flow: generate invite link/code
- Issue type: actual latency
- Root cause: multiple serial auth/check/permission/insert steps, including preflight collision checks.
- Scale outlook: okay at current scale, but wasteful under higher mobile latency or frequent invite creation.
- Recommended next step: replace check-first code generation with insert-first/retry-on-conflict and remove duplicate auth lookups in the same flow.

#### Place resolution uses mixed fast and slow stacks
- Evidence: `src/services/googlePlacesNew.ts`, `src/hooks/usePlaceResolution.ts`, `supabase/functions/venue-enricher/index.ts`
- User flow: add place, search places, resolve destination/address
- Issue type: both actual and perceived latency
- Root cause: some surfaces still use the slower `venue-enricher` chain instead of the newer cached Google Places client path.
- Scale outlook: likely to degrade with moderate growth and more user searches.
- Recommended next step: migrate add-place flows to the newer cached path or add caching/timeouts to `venue-enricher`.

### Critical

#### Pro/Event detail routes overfetch the full trip list before showing one trip
- Evidence: `src/pages/ProTripDetailDesktop.tsx`, `src/pages/MobileProTripDetail.tsx`, `src/pages/EventDetail.tsx`, `src/pages/MobileEventDetail.tsx`, `src/hooks/useTrips.ts`
- User flow: direct open of Pro/Event detail routes
- Issue type: actual latency with clear scale risk
- Root cause: routes use `useTrips()` and then local `find()` instead of a trip-id-scoped detail query.
- Scale outlook: likely to degrade badly as users and organizations accumulate more trips.
- Recommended next step: port these routes to the consumer detail pattern built around a single-trip query and progressive rendering.

#### Media upload/import confirmation is still delayed too far downstream
- Evidence: `src/hooks/useShareAsset.ts`, `src/components/mobile/MobileUnifiedMediaHub.tsx`, `src/features/smart-import/components/SmartImportReview.tsx`, `supabase/functions/artifact-ingest/index.ts`
- User flow: upload media, share documents, accept Smart Import items
- Issue type: perceived latency and scale risk
- Root cause: success feedback often waits on OCR/AI parsing or serialized file loops after upload/indexing already succeeded.
- Scale outlook: likely to degrade badly as batch sizes grow.
- Recommended next step: emit success immediately after upload + message/index persistence, background the parse/enrichment step, and add bounded concurrency for multi-file/import fanout.

## Platform / Infrastructure Findings

### Confirmed

#### Auth/session work is still overly chatty
- Impacted flow: startup, resume, visibility changes, mutation-heavy sessions
- Evidence: `src/lib/authCache.ts`, `src/hooks/useAuth.tsx`, `src/App.tsx`
- Why platform contributes: Supabase auth validation/refresh calls are still duplicated across startup and resume paths.
- Scale impact: high
- Fix type: code + observability

#### Upload quota checks scale with total historical media volume
- Impacted flow: media upload
- Evidence: `src/services/uploadService.ts`
- Why platform contributes: Supabase is asked for every media row size before each upload, making upload latency grow with account history.
- Scale impact: high
- Fix type: code + database/RPC

#### Media galleries/chat can fan out signed-URL generation one item at a time
- Impacted flow: media tab first paint, media-heavy chat threads
- Evidence: `src/services/tripMediaUrlResolver.ts`, `src/hooks/useResolvedTripMediaUrl.ts`, `src/components/MediaSubTabs.tsx`, `src/features/chat/components/MessageRenderer.tsx`
- Why platform contributes: Supabase Storage signing becomes a burst of per-item requests.
- Scale impact: high
- Fix type: code + storage strategy

#### AI concierge context building is large and only process-cached
- Impacted flow: text concierge response time, live voice bootstrap
- Evidence: `supabase/functions/_shared/contextBuilder.ts`, `supabase/functions/lovable-concierge/index.ts`, `supabase/functions/gemini-voice-session/index.ts`
- Why platform contributes: edge cold starts and unbounded context fetches compound latency; cache survives only within one warm process.
- Scale impact: high
- Fix type: code + observability + vendor/runtime setup

#### Recurring authenticated health checks generate steady edge traffic
- Impacted flow: authenticated app sessions
- Evidence: `src/components/app/AppInitializer.tsx`, `src/hooks/useApiHealth.tsx`, `src/services/apiHealthCheck.ts`
- Why platform contributes: every authenticated client periodically calls edge endpoints whether the user needs diagnostics or not.
- Scale impact: medium
- Fix type: code + observability

#### Share-preview proxy routes add an extra hop with no upstream timeout
- Impacted flow: invite/trip preview pages for bots and shared links
- Evidence: `api/trip-preview.ts`, `api/invite-preview.ts`
- Why platform contributes: Vercel edge proxies call Supabase preview functions without timeout protection or explicit region pinning.
- Scale impact: medium
- Fix type: infra/config + observability

### Strong Suspects

#### Duplicate Maps SDK boot paths
- Impacted flow: sessions using both place search and AI map widgets
- Evidence: `src/services/googlePlacesNew.ts`, `src/features/chat/components/GoogleMapsWidget.tsx`
- Why suspect: mixed loader patterns can duplicate script parse/load work and create inconsistent widget startup timing.
- Scale impact: medium
- Fix type: code

#### Resume/reconnect request herds
- Impacted flow: mobile foreground resume and weak-network recovery
- Evidence: `src/lib/queryClient.ts`, `src/App.tsx`, `src/hooks/useAuth.tsx`
- Why suspect: reconnect refetch, auth visibility refresh, and active-query invalidation can stack into a burst.
- Scale impact: medium-high
- Fix type: code + observability

### Possible But Unconfirmed

#### Edge runtime/version drift may be increasing cold-start variability
- Evidence: mixed Deno std and Supabase library versions across `supabase/functions/*`
- Scale impact: medium
- Fix type: codebase hygiene + observability

#### Region mismatch remains plausible for globally distributed traffic
- Evidence: no explicit Vercel `preferredRegion` on preview proxies; voice path targets Vertex `us-central1`
- Scale impact: medium now, high for broader geographic usage
- Fix type: infra/config + measurement

## External Optimization Recommendations

### Supabase
- Replace upload quota full-row scans with a server-side aggregate or cached usage total.
- Batch or avoid per-item signed URL creation for large media lists; use `createSignedUrls` or a public-bucket strategy where appropriate.
- Add timing instrumentation inside concierge context builder subqueries and cap/summarize low-value collections.
- Measure actual auth endpoint volume on startup and resume; consolidate on the canonical auth provider state where server validation is not required.

### Vercel / Hosting
- Add upstream `AbortSignal.timeout(...)` protection and timing headers to `api/invite-preview.ts` and `api/trip-preview.ts`.
- Confirm production Supabase region, then set `preferredRegion` for preview proxy handlers to the nearest practical region.

### Google Cloud / APIs
- Consolidate all Maps JS loading behind one shared loader.
- Measure first-autocomplete latency with cold SDK vs warm SDK.
- Review Vertex token minting frequency in `gemini-voice-session` and cache tokens for their valid lifetime when safe.

### Storage / Media
- Reduce signed-URL fanout on media-heavy views.
- Move upload success feedback ahead of OCR/AI enrichment.
- Bound concurrency in batch upload/import flows so users are not stuck in strictly serial loops or unconstrained fanout.

### PDF / Generation Pipeline
- Parallelize export section loading in `src/services/tripExportDataService.ts`.
- Cache font payloads for client exports.
- Expand use of server-side export where it is already proven instead of leaving most large exports on the main thread.

### Other Vendors
- Limit or sample always-on API health checks so they do not create avoidable edge traffic for every authenticated user.

## Manual Follow-Up Checklist

### 1. Pro/Event direct-load overfetch
- Where to check: `src/pages/ProTripDetailDesktop.tsx`, `src/pages/MobileProTripDetail.tsx`, `src/pages/EventDetail.tsx`, `src/pages/MobileEventDetail.tsx`
- Confirming signal: network trace shows trip-list fetches before a single detail page becomes usable.
- Next steps:
  1. Introduce trip-id-scoped detail hooks for Pro/Event routes.
  2. Reuse the consumer detail loading pattern with progressive member hydration.
  3. Add a regression test that fails if these routes reintroduce `useTrips()` overfetch.

### 2. Auth chatter on startup/resume
- Where to check: browser devtools network, Sentry/telemetry, Supabase logs, `src/hooks/useAuth.tsx`
- Confirming signal: repeated `/auth/v1/user` or token refresh requests on initial load, visibility change, and resume.
- Next steps:
  1. Count auth requests for cold load and one foreground resume.
  2. Remove non-essential direct `getUser()` call sites.
  3. Gate visibility-triggered refreshes when a fresh auth transform is already in flight.

### 3. Media signed-URL fanout
- Where to check: media tab load trace, storage logs, `src/services/tripMediaUrlResolver.ts`
- Confirming signal: one storage signing request per media tile/message on first paint.
- Next steps:
  1. Measure signing request count for a 100-item gallery.
  2. Batch with `createSignedUrls` or change bucket strategy.
  3. Lower initial media page size where full 200-item loads are unnecessary.

### 4. Upload/import confidence gap
- Where to check: `src/hooks/useShareAsset.ts`, `src/components/mobile/MobileUnifiedMediaHub.tsx`, `src/features/smart-import/components/SmartImportReview.tsx`
- Confirming signal: the first success confirmation appears only after OCR/AI parsing or long batch completion.
- Next steps:
  1. Move success UI to the moment upload + index/message persistence completes.
  2. Run parsing/import enrichment in the background.
  3. Add bounded concurrency for multi-file and multi-artifact processing.

### 5. Concierge context latency
- Where to check: Supabase edge logs for `lovable-concierge` and `gemini-voice-session`, `supabase/functions/_shared/contextBuilder.ts`
- Confirming signal: cold/warm p95 dominated by context builder subqueries or repeated token minting.
- Next steps:
  1. Log per-subquery durations.
  2. Cap long lists and summarize low-value collections before prompt assembly.
  3. Re-measure cold vs warm p95 after narrowing context size.

### 6. Preview proxy latency
- Where to check: `api/invite-preview.ts`, `api/trip-preview.ts`, Vercel function logs
- Confirming signal: bot/share-preview requests wait on long upstream calls or show wide p95 by region.
- Next steps:
  1. Add upstream timeouts and logging.
  2. Pin preferred region once Supabase region is confirmed.
  3. Compare latency from at least two geographies.

## Recommended Priority Order

1. Replace Pro/Event `useTrips()` direct-load overfetch.
2. Reduce media upload confirmation delay and signed-URL fanout.
3. Trim auth and resume request chatter.
4. Instrument and cap AI concierge context building.
5. Tighten preview proxy regioning and timeouts.
