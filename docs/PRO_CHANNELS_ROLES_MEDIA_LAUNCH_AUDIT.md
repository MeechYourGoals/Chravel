# Pro Trips Channels/Roles/Media Launch Audit (Dogfood + Code Deep Dive)

_Date:_ 2026-02-27  
_Author:_ Codex

## 1) Dogfooding first (requested)

### Attempted Vercel dogfood skill
- I attempted to install/use the requested skill URL (`https://skills.sh/vercel-labs/agent-browser/dogfood`) but the environment cannot reach that host (HTTP tunnel 403) and also cannot fetch GitHub skill sources (403 via proxy tunnel).
- As fallback, I ran live dogfooding against the app in this repo using the browser automation tool and a local Vite server.

### Live dogfood run (fallback)
- Opened app home and Pro trip routes (`/tour/pro/1`, `/tour/pro-1`) on mobile viewport.
- Observed `Pro Trip Not Found` for unauthenticated Pro route and `404` on legacy hyphen route in this local context.
- Captured console/runtime signals during the session:
  - RevenueCat initialization error due invalid web billing key in local env.
  - Supabase network/API errors (`400`/`406`) while unauthenticated.

### Dogfood conclusion
- In this environment, full authenticated Pro flow validation is blocked by missing valid auth + billing env setup.
- Static/runtime code audit below focuses on launch-critical correctness and edge cases that can regress production even when auth/env are correct.

---

## 2) Scope audited

### Channels & Roles
- `src/hooks/useRoleChannels.ts`
- `src/services/channelService.ts`
- `src/components/pro/channels/ChannelChatView.tsx`
- `src/components/pro/channels/AdminRoleManager.tsx`
- `src/hooks/useRoleAssignments.ts`
- `src/hooks/useRolePermissions.ts`
- `src/hooks/useTripRoles.ts`
- `src/components/pro/RoleChannelManager.tsx` (dead/legacy risk)
- `src/features/chat/components/MessageFilters.tsx`

### Media
- `src/components/MediaSubTabs.tsx`
- `src/services/mediaService.ts`
- `src/hooks/useResolvedTripMediaUrl.ts`
- `src/services/tripMediaUrlResolver.ts`

---

## 3) High-confidence potential bugs / launch risks

## P0 / P1 (fix before launch)

1. **Role assignment UX conflicts with multi-role model (likely operational blocker).**
   - `AdminRoleManager` always assigns with `isPrimary: true`, while `channelService.assignUserToRole` blocks assigning a second primary role.
   - Result: admins can fail to assign multiple roles from this UI even though product copy and channel model assume multi-role membership.
   - Impact: users lose access to needed channels, channel access appears "broken".

2. **Permission resolution only considers primary role (under-permission + inconsistent behavior).**
   - `useRolePermissions` queries only `is_primary = true` assignment.
   - If a user has critical non-primary role grants, UI permission checks may deny actions despite channel access existing via `channel_role_access`.
   - Impact: confusing partial access (can view channel but cannot post/manage as expected).

3. **Demo trip detection is inconsistent across files, causing diverging behavior.**
   - `useRoleChannels` has broader `DEMO_TRIP_IDS` list (includes numeric and additional IDs).
   - `ChannelChatView` uses a shorter hardcoded list.
   - Impact: same trip may be treated as demo in one layer and live in another, causing missing messages/subscriptions and inconsistent UI states.

4. **Media upload can orphan storage objects on DB insert failure.**
   - In `MediaSubTabs`, file uploads write to Storage first, then insert DB row; on DB error it toasts and continues without removing uploaded object.
   - Impact: storage leak + unrecoverable "ghost" files not visible in UI but billed in storage.

5. **N+1 query pattern in channel member count calculation (scales poorly at Pro sizes).**
   - `channelService.getAccessibleChannels` loops channels and performs per-channel role/member queries.
   - Impact: slow channel list load for 30+ roles/channels/touring use cases; can feel like channels are broken under load.

## P2 (should fix soon)

6. **Leaving a channel is role-based and may remove broader access unintentionally.**
   - `ChannelChatView` leave action calls `leaveRole(channel.requiredRoleId)`.
   - In multi-channel/multi-role setups, leaving one channel can remove role assignment that unlocks other channels/features.

7. **Potential stale super-admin permission state.**
   - `useRolePermissions` checks `isSuperAdminEmail(user?.email)` but callback deps omit `user?.email`.
   - Impact: edge-case stale permission state after auth/profile mutation.

8. **Legacy/unused role-channel manager component appears unreferenced.**
   - `src/components/pro/RoleChannelManager.tsx` has substantial overlapping logic and hardcoded demo IDs but no in-repo usages.
   - Impact: maintenance drift + future accidental reuse with outdated logic.

---

## 4) Edge cases likely under-tested

1. **User with multiple roles, one primary + many secondary**
   - Verify: channel visibility, post permissions, and leave-channel behavior remain coherent.

2. **Role rename/delete with existing channel_role_access and message history**
   - Verify: no orphan channel access rows, no broken headers/slugs, predictable member counts.

3. **Trip creator/admin with zero explicit role assignments**
   - Verify: still sees all channels and accurate member counts; no hidden channels due role filters.

4. **Race: role assigned while channel screen open**
   - Verify: channel list and permission checks update without full reload; no stale lock state.

5. **Private bucket / signed URL expiry during long session**
   - Verify: media thumbnails/video playback auto-refresh signed URL and fail gracefully.

6. **Upload failure modes**
   - storage write succeeds + DB insert fails (or vice versa), network drop mid-batch, duplicate filenames, huge files, unsupported codecs.

7. **Cross-platform playback**
   - iOS Safari (`playsInline`, codec support), Android Chrome, and PWA offline/resume behavior for media tabs.

8. **Member count correctness with overlapping roles**
   - Verify distinct-user counting remains correct when users hold multiple granting roles.

---

## 5) MVP-safe, high-impact features to add (without overbuilding)

1. **Role/Channel integrity guardrail (small, high ROI)**
   - Add server-side invariant checks + UI validation for:
     - max roles per trip,
     - at least one access role per private channel,
     - no role deletion if it would strand active channels unless confirmed.

2. **Upload transaction safety for media (small patch, big reliability)**
   - On DB insert failure, immediately delete uploaded storage object.
   - Add a tiny "upload failed, retry" queue in-memory/localStorage for transient errors.

3. **Permission union for multi-role users (must-have for Pro credibility)**
   - Compute effective permissions as union across all user roles (or explicit precedence policy).
   - Keep primary role only for display/default semantics, not authorization decisions.

4. **Lightweight channel audit events (admin trust feature)**
   - Track who created/deleted channels and who changed role access.
   - Minimal event log in admin panel improves enterprise confidence and supportability.

5. **Media readiness indicators**
   - Show processing/upload state per file tile and explicit error chips (e.g., unsupported codec, expired URL).
   - Prevents "nothing happened" perception and cuts support volume.

---

## 6) Launch checklist (channels/roles/media)

- [ ] Multi-role assignment from admin UI works (primary + secondary) and is regression-tested.
- [ ] Effective permissions derived from all assigned roles.
- [ ] Demo/live trip detection centralized in one constant or helper.
- [ ] Media upload rollback path implemented for DB failure after storage success.
- [ ] Channel member counts benchmarked for 30+ person tours (latency target documented).
- [ ] Leave-channel UX clarified (leave channel vs leave role semantics).
- [ ] One e2e per critical flow: assign role → channel visible → post message → upload/play/delete media.

---

## 7) Practical recommendation

If launch is near, prioritize this order:
1) Multi-role assignment + effective permission union,  
2) Media upload rollback and error surfacing,  
3) Demo/live ID centralization,  
4) Query optimization for member counts.

That sequence gives the biggest reduction in production incidents for Pro teams while keeping the diff MVP-sized.
