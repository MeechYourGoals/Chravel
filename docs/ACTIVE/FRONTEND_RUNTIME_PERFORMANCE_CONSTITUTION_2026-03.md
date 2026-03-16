## 1. Executive Summary
- **Runtime model verdict:** structurally **fragmented**. The app has good local optimizations (lazy routes, some virtualization) but no single runtime contract across bootstrap, route transitions, realtime fanout, and large-surface rendering.
- **Biggest rendering/rerender risks:**
  - `App.tsx` centralizes global effects and providers, so auth/lifecycle/cache logic runs at top-level and can amplify app-wide work.
  - `AIConciergeChat` + `ChatMessages` are heavy message trees without mandatory virtualization in AI surfaces.
  - `useUnreadCounts` recalculates unread counts against full message arrays and resubscribes on array reference changes.
- **Biggest bundle/startup risks:**
  - Bootstrap eagerly initializes telemetry, RevenueCat, global purchase listeners, native lifecycle, and service-worker cache/version checks on startup.
  - Main route shell (`App.tsx`) is large and contains many top-level effects, increasing startup parse/execute pressure.
  - Bundle measurement is currently weak; no enforced CI budgets.
- **Biggest memory/large-list risks:**
  - Media grid renders full visible page items (grid map) without windowing.
  - AI/chat histories can grow with rich cards, source lists, and widgets in-memory.
  - Query + local store + sessionStorage duplication increases retained state over long sessions.
- **Biggest mobile/weak-device risks:**
  - Resume invalidates all active queries (`invalidateQueries({ refetchType: 'active' })`) and can burst network/render work.
  - Polling + realtime + lifecycle listeners can stack interaction cost on low-end devices.
  - Main-thread operations (large list maps, markdown/cards/media rendering) can produce input delay/jank.
- **Salvageability:** yes, **salvageable with staged hardening**, but not yet event-scale-safe without stronger rendering boundaries, list policies, and runtime observability.

## 2. Full Frontend Runtime System Map
### Parallel Sub-Agent Delegation Outputs
#### Agent 1 — Component Tree + Render Path Audit
- **Findings:** monolithic app shell with global effects and broad provider envelope; heavy feature components (AI/chat/media) render rich trees.
- **Likely risks:** app-wide rerender fanout and high reconciliation cost on state changes.
- **Root causes:** top-level side effects + non-virtualized rich message/media surfaces.
- **Governing rules needed:** strict render boundaries; route-isolated providers; mandatory virtualization thresholds.
- **Recommended fixes:** split app shell orchestration from route rendering; isolate expensive surfaces behind memoized boundaries and event-local stores.
- **Confidence:** high.
- **Unknowns:** no production React Profiler traces attached.

#### Agent 2 — State / Cache / Realtime Update Audit
- **Findings:** TanStack Query + Zustand are present, but invalidation is often broad; realtime paths still trigger full query invalidation in several hooks.
- **Likely risks:** cache churn, unnecessary refetch loops, subscription fanout.
- **Root causes:** coarse query keys/invalidation patterns, mixed ownership between local state and query state.
- **Rules:** cache ownership matrix per surface; scoped invalidations only.
- **Fixes:** patch cache incrementally from realtime payloads before fallback invalidation.
- **Confidence:** high.
- **Unknowns:** production subscription cardinality by user/trip not instrumented.

#### Agent 3 — Bundle / Route / Asset Audit
- **Findings:** route lazy-loading exists; however startup still performs multiple imperative initializations and heavy app-shell logic.
- **Risks:** slower time-to-interactive, route transition stalls on low CPU.
- **Root causes:** eager init of optional systems (analytics/monetization/lifecycle bridges), insufficient budget enforcement.
- **Rules:** startup critical-path whitelist, deferred feature SDK boot.
- **Fixes:** split critical vs deferred init queue; add bundle budgets in CI.
- **Confidence:** medium-high.
- **Unknowns:** full production chunk stats unavailable in this run due long-running build in this environment.

#### Agent 4 — Lists / Virtualization / Large Dataset Audit
- **Findings:** chat virtualization exists in `VirtualizedMessageContainer`, but media grid and AI chat rich messages still map whole arrays.
- **Risks:** memory growth + scroll/input jank on long sessions.
- **Root causes:** inconsistent virtualization policy across surfaces.
- **Rules:** windowing mandatory above item thresholds.
- **Fixes:** virtualized media grids and rich-card list virtualization.
- **Confidence:** high.
- **Unknowns:** max observed production list sizes not documented.

#### Agent 5 — Mobile / Weak Device Runtime Audit
- **Findings:** mobile-specific lifecycle handling is robust functionally, but resume can trigger heavy refetch and render work.
- **Risks:** resume freeze, touch latency spikes.
- **Root causes:** global resume invalidation, heavy component trees.
- **Rules:** resume budget + staged rehydration.
- **Fixes:** prioritize visible-route data refresh first; defer non-critical refresh.
- **Confidence:** medium-high.
- **Unknowns:** device-class segmented telemetry absent.

#### Agent 6 — AI / Live / Media / Search Performance Audit
- **Findings:** AI concierge holds rich metadata/cards in message state; streaming/live paths can increase render frequency.
- **Risks:** AI surface can dominate runtime and degrade unrelated tabs if shared state invalidates broadly.
- **Root causes:** rich payload density + list rendering costs + broad cache invalidation patterns.
- **Rules:** AI/live must be isolated feature island with strict CPU/memory budget.
- **Fixes:** chunk message history, virtualize, cap retained rich-card payload in memory.
- **Confidence:** medium.
- **Unknowns:** live-session duration and average message payload in production not surfaced.

#### Agent 7 — UX / Interaction Latency Audit
- **Findings:** good loading skeleton usage; however no universal interaction latency guardrails per route/surface.
- **Risks:** perceived smoothness can mask slow tap-to-response under load.
- **Root causes:** missing hard latency SLOs and automatic regressions checks.
- **Rules:** enforce route-to-interactive and tap-to-response budgets in CI + staging canaries.
- **Fixes:** instrument INP-like app-level metrics and slow interaction traces.
- **Confidence:** medium-high.
- **Unknowns:** no persistent interaction timing dashboard tied to release versions.

#### Agent 8 — Observability / Testing / Rollout Audit
- **Findings:** telemetry and perf hooks exist, but mostly dev-console level; no CI perf budgets and no strong runtime regression gates.
- **Risks:** silent performance decay.
- **Root causes:** observability not wired as release-blocking.
- **Rules:** performance budgets as policy with rollback triggers.
- **Fixes:** add bundle-size, render-cost, and memory-growth test gates.
- **Confidence:** high.
- **Unknowns:** no memory trend baselines in staging/prod.

### Runtime topology (files/modules)
- **Bootstrap/hydration path:** `src/main.tsx` initializes service worker/version cache clears, native lifecycle, telemetry, RevenueCat, purchase listener before render.
- **Route-loading path:** `src/App.tsx` defines router + global providers + many lazy routes; `Index` is eager import.
- **State/store/query layers:** Zustand stores in `src/store/*`; TanStack Query in hooks (`useTripDetailData`, `useMediaManagement`, `useTrips`, etc.) with defaults in `App.tsx` + `src/lib/queryKeys.ts`.
- **Realtime update paths:** multiple Supabase channels in hooks (`useNotificationRealtime`, `useUserTripsRealtime`, `useMediaManagement`, unread/read receipt hooks, chat/channel services).
- **Rendering hotspots:** `AIConciergeChat`, `ChatMessages`, media grids, trip detail tab surfaces.
- **Bundle/asset loading paths:** Vite manual chunks in `vite.config.ts`, SW precache + runtime caches in `public/sw.js` and `scripts/build-sw.cjs`.
- **Large-list/media-heavy paths:** chat message histories, media hubs, search overlays, notifications.
- **Mobile risk areas:** native resume/refetch bridge, keyboard handlers, dense tab UIs, media-heavy lists.
- **Likely bottlenecks:** startup main-thread work, broad invalidation loops, non-virtualized rich lists, resume bursts.

## 3. Runtime Budget Constitution
- **Startup budget (launch-blocking):**
  - JS boot (initial route interactive): <= 2.5s p75 mobile mid-tier, <= 4.0s p95 low-tier.
  - Main thread long tasks (>50ms): <= 3 during startup.
- **Route transition budget (launch-blocking):** <= 350ms p75, <= 700ms p95 to first meaningful interactive state.
- **Interaction latency budget (launch-blocking):** tap/click to visible response <= 120ms p75, <= 220ms p95.
- **Realtime update budget (launch-blocking):** single event should trigger <= 1 list-item render path and <= 1 scoped cache mutation.
- **List rendering budget (launch-blocking for chat/media/search):** no full-list synchronous render above 100 items; mandatory windowing.
- **Memory growth budget (aspirational -> launch-blocking for pro/event):** < 120MB delta after 20-min heavy session on mid-tier mobile webview.
- **Weak-device/mobile budget (launch-blocking):** sustained 50+ FPS during scroll on primary feeds/chats; no >500ms resume freeze.
- **Operational definition of fast enough for Chravel:** remains responsive under concurrent realtime updates, large trip surfaces, and media-heavy usage on weak mobile hardware.

## 4. Rendering Constitution
- Define **render islands** per major surface (home, trip tab, chat, media, AI).
- Context/provider values must be stable and not carry fast-changing objects unless strictly local.
- Memoization is allowed only after state ownership is narrowed; no memo-as-bandage.
- Expensive derivations (filter/sort/group rich lists) must be memoized on stable minimal deps.
- Modals/overlays must mount lazily and avoid parent reflow triggers.
- Virtualization required for:
  - chat/thread/history > 100 rows,
  - media tiles > 80 items,
  - search results > 50 rows,
  - admin tables > 100 rows.
- Full-list rerender is unacceptable for single-message read receipt, reaction, badge, or metadata update.
- Realtime updates must patch one entity, not rebuild full arrays.

## 5. State + Cache Constitution
- **Global vs local:**
  - global: auth/session flags, notification counters, feature entitlements.
  - query-owned: trip/server entities.
  - local: UI ephemeral state (drawers, selected tabs, temporary form values).
- **Query/cache ownership:** every entity has one canonical key factory owner (`queryKeys.ts`).
- **Invalidation rules:**
  - prefer `setQueryData` patch from payload;
  - invalidate only impacted key branch;
  - global invalidate only on auth boundary changes.
- **Optimistic scope:** patch minimal affected nodes with rollback snapshot; never recompute whole feed.
- **Derived state:** no duplicated computed stores for data already derivable from query cache.
- **Realtime merge:** dedupe by stable IDs + monotonic timestamps; idempotent inserts required.
- **Stale cleanup:** cap retained history per surface; purge old inactive route caches more aggressively on low-memory devices.
- **Background/resume:** two-phase rehydrate (critical visible route first, then secondary surfaces).
- **Server truth precedence:** after reconnect conflicts, canonical server state wins with conflict annotations.

## 6. Bundle + Asset Constitution
- Startup loads only: auth/session, home shell, critical nav, minimal telemetry stub.
- All advanced features (AI live, PDF/export, charts, media editing, monetization SDKs) load on-demand.
- Route-level lazy load is mandatory for non-home routes.
- Third-party SDK rules:
  - initialize only when route/feature is entered,
  - require explicit budget justification,
  - monitor bundle contribution in CI.
- Image/media rules:
  - responsive srcset and dimensions,
  - lazy load offscreen media,
  - decode async where possible,
  - cap preloaded thumbnails.
- Font rules: subset + preload only one primary face.
- Service-worker strategy must avoid stale-heavy startup regressions; no broad cache clears unless version-gated and measured.
- Must not load on startup: AI concierge heavy modules, PDF stack, charting, admin tooling.

## 7. Large Surface Constitution
- **Chat history:** virtualized + chunked pagination + bounded in-memory rich metadata per session.
- **Channel list:** incremental updates by item ID; no full-sort on every event.
- **Feed/gallery:** strict windowing and image decode budget; intersection-based incremental fetch.
- **Media-heavy surfaces:** thumbnail-first, deferred full-res open, release object URLs on unmount.
- **Search results:** cap initial render, virtualize results, debounce query and result highlighting.
- **Admin/support tables:** server-side pagination or virtualization mandatory.
- **Event-scale degradation policy:** switch to compact mode (reduced previews/animations) at high cardinality.
- **Long-session memory safety:** periodic history compaction and cache eviction by last-interaction timestamp.

## 8. Performance + Scale Stage Plan
### Stage A: baseline launch performance
- **Bottlenecks:** startup eager init and broad app shell effects.
- **Rendering/state requirements:** isolate startup-critical providers; trim global effects.
- **Bundle requirements:** enforce initial bundle threshold + deferred SDK init.
- **Mobile requirements:** resume critical-first refresh.
- **Observability requirements:** route-to-interactive + INP telemetry baseline.
- **Unsafe without redesign:** continued eager init creep.

### Stage B: moderate growth with more realtime and media
- **Bottlenecks:** invalidation fanout and media list rendering.
- **Requirements:** patch cache from realtime payloads; virtualized media grid.
- **Bundle:** split AI/media heavy chunks further.
- **Mobile:** adaptive pagination based on device memory class.
- **Observability:** realtime event-to-render latency tracking.
- **Unsafe:** coarse invalidation remains.

### Stage C: heavier pro/event usage and larger data volumes
- **Bottlenecks:** large channel/activity/search surfaces.
- **Requirements:** strict list policies, server-driven cursors, compact rendering mode.
- **Bundle:** feature federation boundaries for pro/event tools.
- **Mobile:** low-end fallback UI profile.
- **Observability:** device-class dashboards + memory trend alarms.
- **Unsafe:** non-virtualized surfaces persist.

### Stage D: mature client runtime discipline under high activity and complex features
- **Bottlenecks:** cross-feature interference (AI/live/media notifications).
- **Requirements:** performance isolation contracts per feature island.
- **Bundle:** per-feature budgets + regression auto-block.
- **Mobile:** long-session stability SLOs.
- **Observability:** release health gates + automated rollback triggers.
- **Unsafe:** no hard policy enforcement in CI.

## 9. Dangerous Failure Modes
1. **Full-screen rerender from small state change**
   - Severity: high | Likelihood: medium | Blast radius: app-wide.
   - Root cause: broad provider/state coupling.
   - Fix: split render islands + selector-scoped subscriptions.
   - Timing: immediate.
2. **Chat/feed unusable with long history**
   - Severity: critical | Likelihood: medium-high | Blast radius: core collaboration.
   - Root: inconsistent virtualization.
   - Fix: enforce virtualization thresholds.
   - Timing: immediate.
3. **Route transition blocked by heavy bundle**
   - Severity: high | Likelihood: medium | Blast: all users on low-end hardware.
   - Root: eager boot + large route dependencies.
   - Fix: startup critical-path whitelist + route split budgets.
   - Timing: immediate.
4. **Mobile resume floods subscriptions/refetch and freezes UI**
   - Severity: high | Likelihood: medium-high | Blast: mobile-heavy users.
   - Root: broad active query invalidation on resume.
   - Fix: staged resume refresh + deduped subscription reconnect.
   - Timing: immediate.
5. **Media-heavy trip exhausts memory**
   - Severity: high | Likelihood: medium | Blast: media surfaces.
   - Root: large in-memory arrays + non-windowed grid.
   - Fix: virtualized grid + memory caps.
   - Timing: immediate.
6. **AI/live causes unrelated screen jank**
   - Severity: high | Likelihood: medium | Blast: multi-feature sessions.
   - Root: shared invalidation + dense streaming renders.
   - Fix: feature island isolation.
   - Timing: staged A/B.
7. **Search/activity/notification updates thrash state**
   - Severity: medium-high | Likelihood: medium | Blast: nav responsiveness.
   - Root: repeated full recomputations.
   - Fix: incremental counters/selectors.
   - Timing: immediate.
8. **Stale cache refetch loops**
   - Severity: medium | Likelihood: medium | Blast: network + battery.
   - Root: overbroad invalidation.
   - Fix: narrow key ownership + patch-first.
   - Timing: immediate.
9. **Weak-device latency feels broken**
   - Severity: critical | Likelihood: medium-high | Blast: growth funnel.
   - Root: no low-end profile + no budget gate.
   - Fix: low-end perf mode + CI device profile tests.
   - Timing: staged B.
10. **Event-scale channels overwhelm client runtime**
    - Severity: critical | Likelihood: medium (future) | Blast: pro/events monetization.
    - Root: architectural assumptions around small lists.
    - Fix: server cursors + virtualization + compaction.
    - Timing: staged C.
11. **Skeletons mask true slowness**
    - Severity: medium | Likelihood: high | Blast: UX trust.
    - Root: perceived perf not tied to interaction readiness.
    - Fix: readiness metrics + no-skeleton pass criteria.
    - Timing: immediate.

## 10. Recommended Immediate Fixes
1. Replace resume global invalidation with route-scoped critical refresh queue.
2. Enforce virtualization in AI message rendering and media grids.
3. Refactor unread-count logic to incremental updates (avoid full message-array receipt scan each change).
4. Move telemetry/RevenueCat initialization behind idle callback or feature entry where possible.
5. Add hard bundle budgets (initial JS, per-route chunks) and CI block on regressions.
6. Add memory guardrails: cap retained message/media data and dispose unused viewer objects.
7. Add performance telemetry for route-to-interactive, tap-to-response, resume-freeze duration.

## 11. Exact Code / Schema / Infra Changes
- **Files/modules to modify (priority order):**
  - `src/main.tsx`: split critical startup from deferred startup tasks.
  - `src/App.tsx`: reduce top-level effect density; scope resume refresh behavior.
  - `src/hooks/useUnreadCounts.ts`: convert full recalculation model to incremental/cache-backed model.
  - `src/components/media/MediaGrid.tsx`: introduce grid virtualization/windowing.
  - `src/components/AIConciergeChat.tsx` + `src/features/chat/components/ChatMessages.tsx`: virtualize/segment rich AI messages.
  - `src/hooks/useMediaManagement.ts`: avoid broad invalidations; patch paginated cache by ID.
  - `vite.config.ts`: codify startup chunk and route budget reporting plugin.
  - CI config (`.github/workflows/*`): add bundle + perf budget checks.
- **State/store/query changes:** canonical ownership doc + patch-first realtime merge.
- **Rendering boundary changes:** feature islands per trip tab and AI panel.
- **Virtualization/pagination changes:** media/search/admin/chat policies enforced by shared utilities.
- **Asset/media loading changes:** low-res placeholder pipeline and deferred decode.
- **Telemetry additions:** route interactive timing, interaction latency, resume freeze, memory delta.
- **Migration/deploy order:** observability first -> list hardening -> startup deferral -> realtime scope tightening.
- **Rollback plan:** feature flags for virtualization and deferred init paths; revert each independent rollout commit if regressions.

## 12. Verification Plan
- Route/startup timing tests (cold start on mid/low-tier profiles).
- Rerender regression tests (small state update should not rerender full screen).
- Large-list virtualization tests (chat/media/search/admin thresholds).
- Mobile simulations (CPU throttle, memory pressure, touch latency).
- Background/resume performance tests (time-to-recover + no duplicate subscriptions).
- Memory growth checks (20/40-min synthetic sessions).
- Bundle-size regression tests (initial + per-route chunks).
- Interaction latency checks (tap->visual feedback).
- Realtime stress tests (high-frequency update fanout, multi-tab).
- Local repro steps, staging stress scripts, and rollback triggers should be codified in CI + release checklist.

## 13. Post-Fix Scorecard
- runtime model coherence: **72**
- rendering discipline: **74**
- state/cache efficiency: **76**
- bundle/startup efficiency: **70**
- large-surface scalability: **69**
- mobile/weak-device resilience: **71**
- observability: **64**
- production readiness: **73**

Areas below 95 remain due to missing enforced budgets, inconsistent virtualization, incomplete perf telemetry, and broad invalidation patterns still present in architecture.
