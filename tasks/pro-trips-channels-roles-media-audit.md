# Pro Trips Channels + Roles + Media Launch Audit (Dogfood + Code Deep Dive)

Date: 2026-02-27
Scope: Pro trip flows with emphasis on role-based channels, role management, and media reliability before launch.

## Dogfood summary (local app-preview)

Environment tested:
- `npm run dev -- --host 0.0.0.0 --port 4173`
- Opened `http://localhost:4173/tour/pro/lakers-road-trip` with `localStorage.TRIPS_DEMO_VIEW = app-preview`

Observed:
1. Pro trip loaded and exposed Chat, Team, and Media tabs.
2. Chat tab showed channels UI but no obvious send affordance in automated dogfood pass.
3. Team tab showed role management entry points.
4. Media tab rendered storage + links sections and empty state.
5. Repeated runtime errors from RevenueCat initialization and edge function CORS/406 surfaced during normal load.

## High-confidence bug candidates

### 1) Query key fragmentation for channels/media can cause stale UI
- `useChannels` uses hardcoded key `['channels', tripId]` and custom stale time.
- Project guidance says all keys should be from `tripKeys.*` with cache configs.
- `useMediaManagement` partially follows key discipline (`tripKeys.media`) but links still use raw `['tripLinks', tripId, isDemoMode]` and realtime invalidation omits `isDemoMode` suffix.

Impact:
- Inconsistent invalidation; channel/links state can drift after role assignment/channel edits.
- Higher chance of “works after refresh only” defects.

### 2) Role access model split across legacy + new fields risks auth drift
- Channel access currently merges `required_role_id` (legacy) and `channel_role_access` (new junction).
- Channel creation paths write different shapes (`eventChannelService` writes `channel_type` + `role_filter`; `channelService` writes `required_role_id` + optionally junction rows).

Impact:
- Easy to create channels that appear in one UI path but not another.
- Edge cases when roles are deleted/renamed leave orphaned access rows.

### 3) Membership counts are expensive and can race under scale
- `channelService.getAccessibleChannels` computes `memberCount` with per-channel follow-up queries.
- Admin path and non-admin path each perform iterative role/member expansion queries.

Impact:
- Latency and Supabase rate pressure with many channels/roles.
- Temporary incorrect counts during rapid role churn.

### 4) Demo trip detection can leak into non-demo behavior
- `useRoleChannels` has a hardcoded `DEMO_TRIP_IDS` list and treats those IDs as demo even outside demo mode.

Impact:
- Production trip ID collision with listed values can accidentally route to mock channels/messages.
- Launch risk for seeded IDs (`13`-`16`) and future migrations.

### 5) Role assignment UX supports only one primary role by default
- `assignUserToRole` blocks second primary role and UI assignment path always sends `isPrimary: true`.

Impact:
- Real touring teams commonly require multi-role access (e.g., medic + logistics).
- Users see assignment failures with weak recovery guidance.

### 6) Message author identity fallback is weak in channel views
- Channel message fetch uses placeholder `authorName: 'User'` in `eventChannelService.getChannelMessages`.
- Role channel realtime insert path also falls back to unknown sender names.

Impact:
- Poor trust/readability in high-volume operations channels.
- Harder moderation and incident forensics.

### 7) Runtime dependency misconfiguration already visible in dogfood
- RevenueCat client init fails noisily on load when web billing key is invalid.
- Subscription edge function requests show CORS / 406 errors.

Impact:
- Repeated console errors reduce signal and can hide real defects.
- Potential user-facing capability degradation in billing-gated media features.

## Edge cases worth explicitly testing before launch

1. Role removed while user is actively viewing a private channel (message composer + channel list should update deterministically).
2. User with multiple roles where one role is revoked and another remains (channel visibility must be monotonic and not flicker).
3. Channel slug collision (`General`, `general`, whitespace variants).
4. Concurrent channel creation by two admins in same trip.
5. Deleting a role that is the only access grant for a private channel.
6. Trip with 100+ members, 30+ roles, 50+ channels (load latency + member counts).
7. Media upload with same filename and mixed mime sniffing (HEIC, MOV, PDF, zero-byte files).
8. Media delete race (delete from one client while another loads next page).
9. Auth hydration boundary: ensure no temporary “trip not found” for valid member.
10. Entitlement downgrade while media tab open (upload controls should lock without corrupting in-progress upload).

## MVP-safe high-impact additions (without overbuilding)

1. **Channel access diagnostics panel (admin only):** show why a member can/can’t see a channel (role IDs + explicit membership).
   - High impact: fastest support/debug win; low UI surface.

2. **Soft guardrails for destructive role actions:** when deleting role, show affected channels/member counts and force confirmation.
   - High impact: prevents accidental lockouts.

3. **Channel slug + name uniqueness validation at creation time:** client-side precheck + DB constraint surfaced cleanly.
   - High impact: avoids ambiguous routing and duplicate channel confusion.

4. **Media ingest observability counters:** lightweight telemetry events for upload start/success/fail/delete by mime type and size bucket.
   - High impact: launch-week reliability visibility without product complexity.

5. **Graceful dependency degradation banner:** if billing/edge checks fail, show non-blocking status and fall back to safe defaults.
   - High impact: reduces silent failure and support load.

## Recommended launch sequence (72-hour hardening)

1. Add focused regression tests for role-channel visibility + multi-role assignment + role deletion impact.
2. Normalize query key usage to `tripKeys` + `QUERY_CACHE_CONFIG` for channels and links.
3. Remove `DEMO_TRIP_IDS` hardcoding; gate demo strictly via demo mode state.
4. Add DB-level uniqueness constraints and conflict handling for channel slugs per trip.
5. Patch billing/edge error handling to avoid noisy repeated failures.

## Regression risk assessment

- Current risk level (for channels/roles/media): **MEDIUM-HIGH** at launch scale.
- Primary risk drivers: mixed access models, cache key inconsistency, and dependency initialization noise.
- Rollback strategy for hardening patches: keep changes behind additive checks + no schema-destructive migrations during launch window.
