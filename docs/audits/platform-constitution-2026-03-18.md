## 1. Executive Summary

Chravel is already a real multi-surface platform, but its production behavior is still governed by a mix of strong newer guardrails and older fallback paths. The strongest current foundations are:

- one canonical root aggregate in `trips`,
- substantial RLS and RPC hardening across many shared objects,
- comparatively mature main-trip chat send dedupe,
- approval-gated join flow for trip membership,
- and existing audit/logging primitives such as `security_audit_log`, `admin_audit_logs`, `trip_activity_log`, and payment audit logs.

The biggest platform-wide structural risks are:

| Risk | Why It Matters | Where It Shows Up |
|---|---|---|
| Canonical-truth fragmentation | Membership, admin authority, roles, channels, and trip variants are not governed by one clean model | `trip_members`, `trip_admins`, `trip_roles`, `user_trip_roles`, `trip_members.permissions`, `trip_channels`, `channel_members`, `channel_role_access`, `src/utils/tripConverter.ts` |
| Shared-write inconsistency | Hardened RPCs exist, but reachable raw-write paths still bypass them | `src/hooks/useTripTasks.ts`, `src/services/calendarService.ts`, `src/services/basecampService.ts`, `src/services/paymentService.ts`, `supabase/functions/_shared/functionExecutor.ts` |
| Public/share trust-boundary leakage | Public preview/share behavior is weaker than authenticated trip access, and invite accounting is inconsistent | `supabase/functions/get-trip-preview/index.ts`, `supabase/functions/share-preview/index.ts`, `src/pages/TripPreview.tsx`, `src/hooks/useInviteLink.ts`, `supabase/functions/join-trip/index.ts` |
| Realtime fragmentation | Main trip chat has replay logic, but channels, reactions, read receipts, member sync, and unread state do not follow one platform rule | `src/features/chat/hooks/useTripChat.ts`, `src/services/channelService.ts`, `src/hooks/useUnreadCounts.ts`, `src/services/readReceiptService.ts` |
| Media/storage incoherence | Buckets, URL patterns, DB metadata, privacy posture, and cleanup strategy are inconsistent | `src/services/uploadService.ts`, `src/services/mediaService.ts`, `src/services/tripMediaService.ts`, `src/hooks/useShareAsset.ts`, `supabase/functions/file-upload/index.ts`, `supabase/functions/process-account-deletions/index.ts` |
| AI mutation safety gaps | The product declares safe pending confirmation and idempotency, but active paths still treat queued writes like completed writes and bypass manual invariants | `src/hooks/useVoiceToolHandler.ts`, `src/hooks/usePendingActions.ts`, `src/components/AIConciergeChat.tsx`, `supabase/functions/_shared/functionExecutor.ts`, `supabase/functions/execute-concierge-tool/index.ts` |
| Plan/QoS weakness | Expensive paths are not consistently plan-aware, and free traffic can still contend with premium/event/pro traffic | `supabase/functions/lovable-concierge/index.ts`, `supabase/functions/execute-concierge-tool/index.ts`, `supabase/functions/gemini-voice-session/index.ts`, `supabase/functions/dispatch-notification-deliveries/index.ts` |
| Observability and rollback readiness | Quality gates are stronger than operational gates; feature flags and health checks exist, but canary, load, and restore proof are incomplete | `package.json`, `.github/workflows/ci.yml`, `src/lib/featureFlags.ts`, `supabase/functions/_shared/featureFlags.ts`, `docs/audits/reliability-resilience-constitution-2026-03-16.md` |

Where the current platform is coherent:

- `trips` is the root aggregate, and trip variants are at least consistently discriminated by `trip_type`.
- Main trip chat has the best current command-id/dedupe model through `client_message_id`.
- The join boundary is approval-gated rather than “invite link equals membership.”
- Several sensitive shared writes already have the right shape: versioned RPCs, locked settlement, admin audit logging, and member-only RLS.

Where the current platform is fragmented:

- consumer vs pro vs event semantics are partly canonical and partly invented in UI adapters,
- membership truth and authority truth are spread across too many tables and hooks,
- channel topology still carries legacy models,
- trip-private vs user-private vs channel-shared state is not consistently encoded,
- feature flags exist but are not yet a reliable runtime rollback or canary mechanism.

Safest surfaces today, relatively speaking:

- main trip chat send path,
- notification singleton subscription path,
- join-request moderation via RPCs,
- some manual shared writes that already route through versioned or locked SQL functions.

Most dangerous surfaces under scale, concurrency, or abuse:

- AI Concierge cross-surface mutation,
- media uploads and storage lifecycle,
- public preview/share/invite/join funnel,
- event-scale channel/chat fanout,
- payments and settlement state,
- feature-flag/QoS/degraded-mode controls.

Bottom line: the architecture is salvageable with staged hardening. Chravel does not need a full replatform, but it does need constitutional consolidation in six areas before the next order-of-magnitude growth tier:

1. membership/role/admin authority,
2. shared mutation gateway and idempotency,
3. public-share and join trust boundaries,
4. realtime hub and scoped side-table model,
5. media asset/storage model,
6. QoS and rollback/observability posture.

Certain areas do require deeper redesign rather than incremental cleanup:

- channel topology consolidation,
- media asset/storage unification,
- AI mutation orchestration,
- and plan-aware service-class isolation.

## 2. Full Platform System Map

### Core root aggregate

| Layer | Canonical Tables / Modules | Notes |
|---|---|---|
| Root entity | `trips` | One supertype aggregate for consumer, pro, and event trip surfaces |
| Variant discriminator | `trips.trip_type` | Active routes in `src/App.tsx` map the same root into `/trip`, `/tour/pro`, and `/event` |
| Main app services | `src/services/tripService.ts`, `src/utils/tripConverter.ts`, `src/pages/TripDetail.tsx`, `src/pages/ProTripDetailDesktop.tsx`, `src/pages/EventDetail.tsx` | Pro/Event view models are still partly adapter-derived rather than fully normalized |

### Ownership and authority model, current reality

| Concern | Current Tables / Modules | Current Problem |
|---|---|---|
| Membership lifecycle | `trip_members`, `trip_join_requests` | Close to canonical, but creator auto-repair logic reintroduces removed membership |
| Origin ownership | `trips.created_by` | Treated both as creator record and latent access override |
| Trip admin governance | `trip_admins` | Real capability layer, but coexists with string roles in `trip_members.role` |
| Feature RBAC | `trip_roles`, `user_trip_roles`, `channel_role_access` | Stronger for Pro/Event, but not cleanly separated from admin/member governance |
| Emergent member permissions | `trip_members.permissions` | Schema exists but current clients do not use it as the governing layer |
| Internal platform admin | `is_super_admin()`, `get_trip_admin_permissions()`, `src/hooks/useSuperAdmin.ts`, `src/components/InternalAdminRoute.tsx` | Server-side truth exists, but client/email allowlist drift remains |

### Shared state families

| Scope | Canonical or Candidate Tables | Primary Writers / Readers |
|---|---|---|
| User-private durable | `profiles`, `private_profiles`, `user_preferences`, `user_payment_methods`, `user_accommodations`, `trip_personal_basecamps`, `ai_queries`, `smart_import_candidates`, `shared_inbound_items` | `src/hooks/useAuth.tsx`, settings/profile components, smart-import review flows |
| Trip-shared durable | `trips`, `trip_tasks`, `trip_polls`, `trip_events`, `trip_links`, `trip_artifacts`, `broadcasts`, `trip_payment_messages`, `payment_splits`, `trip_activity_log`, `trip_invites` | trip pages, hooks, edge functions, AI executor, join/invite flows |
| Channel-scoped durable | `trip_channels`, `channel_members`, `channel_messages`, `channel_role_access` | `src/services/channelService.ts`, `src/hooks/useRoleChannels.ts`, `src/components/pro/channels/ChannelChatView.tsx` |
| Event-wide durable | `event_agenda_items`, `event_tasks`, `event_lineup_members`, `event_rsvps`, `event_qa_questions`, `event_qa_upvotes` | event pages/admin tabs and import flows |
| Admin-only or moderator-only | `trip_admins`, `admin_audit_logs`, role assignment/admin RPCs | admin panels and RPCs |
| Ephemeral sync state | `trip_presence`, read receipts, reactions, typing indicators, notification singleton state, offline queues | chat hooks, notification hooks, offline sync services |

### Data-flow boundaries

| Boundary | Current Control |
|---|---|
| Browser -> Supabase client | RLS-backed queries and direct table writes for many surfaces |
| Browser -> Edge Function | JWT-authenticated function invocation for trip detail, AI, imports, share preview, join, etc. |
| Edge Function -> DB with service role | Common for preview/share/join, many AI flows, notification dispatch, import workers |
| Offline client -> IndexedDB queue -> online replay | `src/services/offlineMessageQueue.ts`, `src/services/offlineSyncService.ts`, `src/services/globalSyncProcessor.ts` |
| AI tool call -> pending action / direct write | Mixed: some writes queue to `trip_pending_actions`, others still write directly |
| Public link -> preview service | `get-trip-preview`, `share-preview`, `generate-trip-preview`, unfurl routes |

### Trust boundaries

| Trust Boundary | Current State |
|---|---|
| Auth/session lifecycle | Stronger than before; `src/hooks/useAuth.tsx` is careful about hydration, token validation, and teardown |
| Shared trip membership | Mostly server-owned, but creator read-time “self-heal” paths break finality |
| Public preview/share | Weakest boundary; raw `tripId` currently acts like a public metadata capability |
| AI write boundary | Weak; voice/text paths do not always enforce the same semantic checks as manual flows |
| Media access boundary | Inconsistent; some buckets are effectively private in code, but raw public URLs still leak through |
| Notification dispatch | Mixed; queue exists, but dispatcher auth and priority model are incomplete |

### Invite/share access paths

| Surface | Files / Functions |
|---|---|
| Trip invite creation | `src/hooks/useInviteLink.ts` |
| Trip public preview page | `src/pages/TripPreview.tsx` |
| Invite preview | `supabase/functions/get-invite-preview/index.ts` |
| Join-trip action | `supabase/functions/join-trip/index.ts` |
| Raw trip preview | `supabase/functions/get-trip-preview/index.ts`, `supabase/functions/share-preview/index.ts`, `supabase/functions/generate-trip-preview/index.ts` |
| Organization invite | `src/pages/AcceptOrganizationInvite.tsx`, `supabase/functions/invite-organization-member/index.ts`, `supabase/functions/accept-organization-invite/index.ts` |

### Realtime boundaries

| Surface | Files / Modules |
|---|---|
| Main trip chat | `src/features/chat/hooks/useTripChat.ts` |
| Channel chat | `src/components/pro/channels/ChannelChatView.tsx`, `src/services/channelService.ts` |
| Notifications | `src/hooks/useNotificationRealtime.ts` |
| Unread counts | `src/hooks/useUnreadCounts.ts` |
| Read receipts | `src/services/readReceiptService.ts` |
| Reactions | `src/services/chatService.ts` realtime subscription helpers |
| Member sync | Hooks probe a missing hub in `window.__tripRealtimeHubs`; no complete in-repo hub implementation |

### AI mutation boundaries

| Layer | Files |
|---|---|
| Voice tool client | `src/hooks/useVoiceToolHandler.ts` |
| Voice server bridge | `supabase/functions/execute-concierge-tool/index.ts` |
| Text concierge entry | `supabase/functions/lovable-concierge/index.ts` |
| Shared tool executor | `supabase/functions/_shared/functionExecutor.ts` |
| Pending buffer | `trip_pending_actions`, `src/hooks/usePendingActions.ts`, `src/features/chat/components/PendingActionCard.tsx` |
| Adjacent AI write flows | `supabase/functions/confirm-reservation-draft/index.ts`, `supabase/functions/artifact-ingest/index.ts`, `supabase/functions/file-ai-parser/index.ts`, `supabase/functions/gmail-import-worker/index.ts` |

### Likely scale bottlenecks

- `trip_chat_messages` plus side-table fanout from read receipts and reactions
- `channel_messages` without replay/backfill or pagination
- `notifications` and `notification_deliveries`
- `trip_media_index`, `trip_files`, private/public bucket inconsistencies
- `trip_invites`/`trip_join_requests` during growth spikes
- AI parser/import/voice endpoints that hit Gemini/Vertex directly
- `payment_splits` / `trip_payment_messages` without uniform idempotent mutation policy

## 3. Platform Invariants

These are the platform-wide non-negotiable rules all future features must obey.

### Ownership

1. `trips` is the only root aggregate for consumer, pro, and event journeys.
2. `trip_members` is the sole truth for active membership lifecycle. Read paths must never auto-create or auto-repair membership rows.
3. `trip_admins` is the sole trip-governance capability layer. `trip_roles` and `user_trip_roles` are feature/channel RBAC, not membership truth.
4. Every persisted object must declare one scope class: `user_private`, `trip_shared`, `channel_shared`, `event_shared`, `admin_only`, or `ephemeral`.

### Authorization

5. Client hooks may optimize UX, but all shared writes must be authorized server-side by RLS or a secure RPC/edge boundary using the same canonical capability model.
6. Public links must never use raw object IDs as capabilities. Public preview, public share, and join request are separate access rights with separate tokens.
7. A user who has left or been removed from a trip must remain out until an explicit, auditable rejoin/regrant path restores access.

### Shared vs private writes

8. User-private AI data, planning data, and imports stay private unless explicitly promoted to trip-shared scope.
9. Any promotion from private to shared scope must record both the proposer and confirmer, plus the source surface.

### Actor attribution

10. Every shared mutation must carry:
    - authenticated actor,
    - source surface (`web`, `mobile`, `voice_concierge`, `text_concierge`, `import_worker`, etc.),
    - command or mutation ID,
    - affected trip/channel/object IDs.
11. For staged writes, proposer and confirmer must both be recorded when they differ.

### Idempotency and duplicate prevention

12. Every shared create mutation must accept a stable idempotency key or mutation ID and return success on duplicate replay rather than creating a second object.
13. Every shared delete or destructive mutation must also carry a mutation ID for retry safety and audit stitching.

### Retry safety

14. Multi-step writes must be either:
    - one server transaction, or
    - one durable command with compensating cleanup.
15. “Upload first, metadata later” or “pending confirm later” patterns are not acceptable without a compensating or atomic finalize step.

### Optimistic UI reconciliation

16. Optimistic UI is allowed only when the command ID is the canonical reconciliation key.
17. UI must distinguish `pending`, `committed`, `rejected`, and `failed` states. A queued write is never rendered as a completed write.

### Conflict resolution

18. Last-write-wins is allowed only for explicitly low-risk surfaces:
    - local user preferences,
    - device tokens,
    - non-governing ephemeral presence data.
19. The following must never rely on last-write-wins:
    - membership,
    - invite use or approval,
    - tasks,
    - polls,
    - calendar events,
    - basecamp,
    - payments/settlement,
    - channel definitions,
    - role assignments,
    - AI confirmation queues.

### Background/foreground reconnection

20. Any realtime surface must define:
    - replay key or watermark,
    - reconnect behavior,
    - background/foreground behavior,
    - multi-device reconciliation behavior.
21. If a table cannot be server-filtered by trip/channel/user, it may not be used as a direct hot-path realtime subscription table.

### Membership truth

22. `trip_join_requests` is the sole truth for pending access; `trip_members` is the sole truth for admitted access.
23. Approval/rejection/dismissal must be canonicalized through one path only.

### Invite acceptance truth

24. `trip_invites.current_uses` must count exactly one thing, updated in exactly one path.
25. A join request is not a membership and must never consume the same counters as an approved admission unless the model explicitly uses reservations with release semantics.

### Deletion semantics

26. Shared content may be anonymized or orphaned, but must do so through explicit lifecycle policy, not ad hoc nulling by executor code.
27. Storage deletion must be driven by canonical bucket/path metadata, not guessed folder conventions.

### Auditability

28. All privileged mutations and all cross-surface AI writes must emit append-only audit records.
29. Audit logs must never be deleted as part of routine domain deletes.

## 4. Object Scope Constitution

| Object Class | Owner | Viewers | Editors | Mutation Rules | Concurrency Rules | Audit Requirements | Deletion / Archive Rules |
|---|---|---|---|---|---|---|---|
| User-private durable | user | user only, or explicit self-service admin surfaces | user | Never implicitly promoted to shared scope | LWW acceptable only for profile/prefs; command-id for imports and AI scratchpad writes | audit account/security-sensitive changes | delete/anonymize on account deletion |
| User-private ephemeral | user/session | user only | user/client | temp imports, drafts, scratch buffers, local queues | idempotent enqueue/dequeue; no shared writes | only if it affects billing/security | TTL cleanup |
| Trip-shared durable | trip membership | active members or narrower capability group | role/capability holders | must use canonical server mutation gateway | CAS/locked RPC or idempotent append-only, depending on object family | all governance and destructive writes audited; important shared edits activity-logged | archive with trip; anonymize/orphan by policy |
| Channel-scoped durable | trip + channel definition | members with channel access | posters/moderators/admins | channel rules inherit from trip membership plus channel mode | append-only + replay for messages; locked/CAS for channel config | moderation and membership changes audited | archive with channel/trip |
| Event-wide durable | event trip | event members or attendees based on policy | organizers/moderators or granted roles | stricter than consumer by default | CAS for schedules/tasks/polls; append-only for Q&A/reactions | moderator/admin actions audited | archive with event |
| Admin-only durable | trip admin / platform admin | admins, support, auditors | admins only | server-only RPC or service-role boundary with canonical auth helper | serialized or append-only | always audited | retained longer than general content |
| Ephemeral sync state | system/user session | scoped participants only | system/user | never a source of business truth | monotonic update or TTL upsert only | sample/aggregate logs only | TTL expire |

### Object family mapping

| Family | Scope Class | Notes |
|---|---|---|
| `profiles`, `private_profiles`, `user_preferences`, `user_accommodations`, `trip_personal_basecamps`, `ai_queries`, `smart_import_candidates` | user-private durable | never trip-visible by default |
| `trips`, `trip_tasks`, `trip_polls`, `trip_events`, `trip_links`, `broadcasts`, `trip_payment_messages`, `payment_splits` | trip-shared durable | govern through trip membership + capability model |
| `trip_artifacts` | trip-shared durable or user-private durable | must carry explicit privacy/scope; no implicit defaults |
| `trip_channels`, `channel_members`, `channel_messages`, `channel_role_access` | channel-scoped durable | channel access derived from active trip membership |
| `event_agenda_items`, `event_tasks`, `event_lineup_members`, `event_rsvps`, `event_qa_questions` | event-wide durable | event governance rules override consumer defaults |
| `trip_admins`, admin/moderation RPCs, `admin_audit_logs` | admin-only durable | never client-authoritative |
| `trip_presence`, typing, reconnect caches, read receipts, some delivery queues | ephemeral sync state | must not drive platform truth |
| `trip_pending_actions` | reclassify to admin-only durable or user-private durable | current implementation is ambiguous; must choose one model |

## 5. Permission Model Constitution

### Core role model

#### Consumer trips

| Role | Purpose |
|---|---|
| `owner` | trip creator or transferred owner; governs membership and invite policy |
| `collaborator` | full participant in shared planning objects |
| `viewer` | read-only member for itinerary, media view, and chat read access if enabled |
| `pending` | join-request state only; not a member |

Consumer trips may default to collaborative behavior, but that must be a declared policy, not an accidental result of “all members can do everything.”

#### Pro trips

| Role | Purpose |
|---|---|
| `owner` | top-level trip governance |
| `admin` | delegated governance through `trip_admins` |
| `role-holder` | feature/channel access through `trip_roles` and `user_trip_roles` |
| `member` | standard participant |
| `viewer` | read-only or limited participation |

`trip_admins` governs membership, roles, channels, moderation, and critical settings. `trip_roles` grants narrower feature/channel capabilities.

#### Event trips

| Role | Purpose |
|---|---|
| `owner` | primary event controller |
| `organizer` | operational governance |
| `moderator` | content/channel moderation without full governance |
| `attendee` | normal participant |
| `viewer` | read-only spectator mode |

Event label roles like speaker, vendor, performer, press, exhibitor, etc. may exist, but they are secondary functional roles unless explicitly granted governance or posting capabilities.

### Read-only vs full-participation mode

1. Every trip type must support an explicit read-only member mode.
2. Event trips must default to stricter mutation posture than consumer trips.
3. Read-only means:
   - can view trip-shared state,
   - can receive realtime updates,
   - cannot mutate shared planning objects,
   - cannot create invites,
   - cannot approve membership,
   - cannot upload media unless explicitly granted.

### Channel constitution

Channels must be one of:

| Channel Type | Creator | Membership | Posting |
|---|---|---|---|
| Main trip chat | system | inherited from trip membership | governed by `chat_mode` and event scale rules |
| Announcement channel | admin/system | inherited or broad-read | admin/organizer/moderator only |
| Role-scoped channel | admin by default | derived from `channel_role_access` plus explicit member grants | role members or moderators |
| Optional user-created channel | only if policy allows | explicit plus inherited scope | policy-driven; off by default for events |

Rules:

1. Channel membership is never broader than trip membership.
2. Channel posting permissions are explicit and server-enforced.
3. Large event channels default to announcement or moderated mode; open-posting must be an explicit exception.
4. Channel creation is admin-only by default for Pro and Event.

### Who can mutate shared resources

| Resource | Consumer | Pro | Event |
|---|---|---|---|
| Tasks, polls, calendar, basecamp | collaborator or owner; viewer cannot | role/capability-based | organizer/moderator or granted role; attendee read-only by default |
| Main chat post | policy-driven; collaborators default yes | role/capability + trip chat mode | scale-aware; often admin/moderator only for large events |
| Media upload | policy-driven | role/capability + `media_upload_mode` | scale-aware and organizer-moderated by default |
| Invite others | owner by default; optional collaborator grant | admin or invite-granted role | admin/organizer only |
| Share links | owner by default; optional collaborator grant | admin only by default | admin/organizer only |
| Membership approvals | owner or explicit approver group | admin/organizer only | admin/organizer only |
| Role/channel governance | n/a or owner only | admin | admin/organizer |

### What requires explicit confirmation

- AI-generated shared writes
- destructive deletes of shared objects
- membership approvals/rejections
- role assignment/removal
- channel access changes
- payment settlement or reversal
- any bulk import that promotes private data into shared scope

### What can be auto-applied

- user-private preference changes
- device token registration
- read-watermark updates
- low-risk append-only reactions
- queued notifications created by already-authorized system jobs

### Server-side enforcement expectations

1. RLS or RPC must make the final decision for every shared mutation.
2. Service-role functions must call the same canonical auth helper/RPC as normal flows.
3. Client-side role hooks are not allowed to be the only protection.

## 6. Concurrency + Mutation Constitution

### Global rules

1. Every shared mutation gets:
   - `mutation_id` or `idempotency_key`,
   - actor ID,
   - trip ID,
   - optional channel ID,
   - source surface,
   - timestamp.
2. Retries must be safe by construction. A retry must not create a second object or flip state twice.
3. Shared writes use one of three policies only:
   - `append_only_idempotent`,
   - `compare_and_swap`,
   - `serialized_locked`.

### Policy by object family

| Object Family | Policy | Notes |
|---|---|---|
| Trip chat messages | `append_only_idempotent` | `client_message_id` is the canonical command key |
| Channel messages | `append_only_idempotent` | must gain the same replay/dedupe discipline as trip chat |
| Reactions, read receipts | `append_only_idempotent` or idempotent upsert | must be scoped by trip/channel or aggregated |
| Tasks | `compare_and_swap` for edits; serialized for assignment changes | no raw table update fallbacks |
| Polls | `serialized_locked` for vote/close; `compare_and_swap` for config edits | options freeze after first vote |
| Calendar events | `compare_and_swap` | create also needs idempotency |
| Basecamp | `compare_and_swap` or serialized singleton update | no direct raw trip update bypasses |
| Membership, roles, invites, approvals | `serialized_locked` | canonical RPC only |
| Payments and settlements | `serialized_locked` | one authoritative transaction boundary |
| Broadcast creation | `append_only_idempotent` plus anti-spam limits | no duplicate fanout on retry |
| Media asset creation/finalization | idempotent command + compensating cleanup | object and metadata finalize together |
| Presence/typing/device tokens/preferences | limited LWW or monotonic upsert | only for non-governing state |

### Mutation IDs and idempotency keys

Rules:

1. User-generated create commands must carry client-generated UUIDs.
2. AI-generated commands must carry tool-call IDs plus idempotency keys.
3. Offline queue replay must preserve the original command key.
4. Edge functions must treat duplicate command keys as successful replays.

### Retry rules

1. Retries on append-only writes return the same logical success record.
2. Retries on locked/CAS writes must either:
   - re-read and retry with the new version, or
   - return conflict with enough context for the UI to reconcile.
3. Multi-row side effects must not be retried by repeating raw inserts blindly.

### Conflict resolution

| Surface | Conflict Handling |
|---|---|
| Task/event/basecamp edit | reject with version conflict; client refetches and reapplies intent |
| Poll votes | locked or atomic RPC; no local merge guesses |
| Invite approval / member removal | serialized server decision only |
| Payment settlement/unsettle | locked and audited; no client-side merge |
| Link votes/order | move to atomic vote rows / stable order column; never read-modify-write in client |

### AI-triggered vs user-triggered handling

1. AI may propose, never silently finalize shared writes.
2. AI-confirmed writes must reuse the same canonical shared mutation primitives as manual writes.
3. AI proposer and human confirmer must both be recorded when applicable.
4. Pending confirmation must claim the pending row before the side effect happens.

## 7. Access Funnel Constitution

### Canonical truth model

| Thing | Canonical Truth |
|---|---|
| Public preview capability | opaque preview/share token, not raw `tripId` |
| Invite existence and policy | invite/share token row with expiration, revocation, target object, policy |
| Pending access | `trip_join_requests` |
| Admitted access | `trip_members` |
| Invite acceptance outcome | RPC/edge response driven by the canonical membership + invite model |

### Rules

1. Public preview, invite, and membership are separate rights.
2. Public preview may expose limited metadata only, and only through revocable opaque tokens.
3. Join flow always resolves through the server, which determines:
   - target object,
   - trip type,
   - allowed next action,
   - route to open after success.
4. Account creation during invite acceptance must persist exactly one pending target token in one storage mechanism or one signed server-side resume token.
5. Duplicate join attempts must return one of:
   - already member,
   - request pending,
   - previously rejected with cooldown,
   - invite invalid/expired/revoked.
6. There is exactly one canonical approval path for turning a join request into a membership.
7. `current_uses` must count only one semantic:
   - recommended: accepted memberships,
   - with separate `request_count` if needed.
8. Wrong-trip or wrong-event routing is forbidden. The server resolves the correct route target, not the client via stale assumptions.
9. Revoked or expired links must not leave older alternate active invite rows unless the product explicitly supports multi-link management.
10. Abuse controls must include:
    - preview-by-IP limits,
    - join-by-user and join-by-trip limits,
    - invite-create limits,
    - optional captcha or challenge for public join spikes.

## 8. Realtime + Sync Constitution

### Which surfaces truly need realtime

| Surface | Required Consistency |
|---|---|
| Main trip chat | realtime with replay |
| Channel chat | realtime with replay |
| Notifications inbox/unread | realtime or short-latency eventual |
| Join requests for admins | realtime or short-latency eventual |
| Presence/typing | only low-scale or explicitly degraded |
| Tasks/polls/calendar/basecamp | eventual with fast invalidation is acceptable at current scale, but replay-safe mutation feedback is required |
| Media gallery | eventual with batching is acceptable |
| Analytics/activity feed | eventual |

### Realtime rules

1. No hot-path subscription on unscoped tables. If `trip_id` or `channel_id` is missing, add it or subscribe to an aggregate instead.
2. Every realtime surface must maintain a replay watermark and fetch gaps on reconnect.
3. Background/foreground or native resume must trigger reconnect plus replay for active realtime surfaces.
4. Unread counts must be based on server-side watermarks or aggregates, not loaded-window message scans.
5. A missing shared hub abstraction may not be referenced by production hooks. If the hub exists, it must be in-repo and complete.

### Hot room / hot event rules

1. Typing indicators and presence are disabled above a configurable threshold.
2. Large event main chat defaults to moderated or announcement mode.
3. Read-receipt fanout must degrade to aggregate or sampled behavior at high scale.
4. Reaction fanout must be scoped or aggregated, never delivered globally then filtered client-side.
5. Channel pagination and replay are mandatory for Pro/Event channel chat.

### Multi-device consistency

1. The server is the authority. Local optimistic state is provisional until server confirmation.
2. Every device must be able to catch up from server state after disconnect without relying on missed websocket replay from the provider.

## 9. Scale-Tier Architecture Plan

### Stage A: 100–1,000 active users

| Dimension | Plan |
|---|---|
| Primary bottlenecks | legacy fallback paths, invite/public preview leakage, AI direct writes, media asset drift, client-only rate limiting |
| Required infra changes | mandatory secrets for internal dispatchers; blocking post-deploy health checks |
| Required integrity changes | unify membership truth; stop creator auto-repair; AI pending-action claim-before-side-effect; fix task version path; remove raw payment/basecamp/event AI updates |
| Required rate limiting / QoS | server-side chat/channel send limits; invite-create server path; voice entitlement enforcement |
| Required observability | trip/channel/user/plan/mutation IDs in logs; queue age; AI tool usage; invite funnel metrics |
| First risky surfaces | AI writes, invites/share/join, media uploads |
| Acceptable now but fails later | query invalidation for tasks/polls/calendar; no canary; no load testing |

### Stage B: 1,000–10,000

| Dimension | Plan |
|---|---|
| Primary bottlenecks | read receipts/reactions global subscriptions, channel chat missing replay, notification FIFO backlog, media bucket sprawl |
| Required infra changes | trip-scoped realtime hub; queue priority lanes; canonical media asset registry |
| Required integrity changes | scoped side tables for receipts/reactions; payment idempotency; invite usage invariant cleanup; one active invite policy |
| Required rate limiting / QoS | plan-aware AI budgets; paid/event reserved notification slices; upload concurrency per plan |
| Required observability | SLI dashboards for login, trip open, join, chat send/receive, AI tool failures |
| First risky surfaces | hot chat/channels, notifications, Gmail/AI parsers |
| Acceptable now but fails later | client-scanned unread counts; raw public preview by token bridge hacks; mixed media URL models |

### Stage C: 10,000–100,000

| Dimension | Plan |
|---|---|
| Primary bottlenecks | hot-event messaging fanout, notification throughput, large media catalogs, import/parser backlog |
| Required infra changes | queue-based or stream-based fanout for notifications and possibly chat side-state; partition/archive policy for audit/media/notifications |
| Required integrity changes | full dual-write retirement for legacy channel/media models; server unread watermarks; event-grade moderation queues |
| Required rate limiting / QoS | stricter service classes for free vs paid vs pro/event; AI/image generation queues |
| Required observability | synthetic regional probes; load/chaos suites; restore drill evidence integrated into readiness |
| First risky surfaces | event trips, channels, media search/gallery, import workers |
| Acceptable now but fails later | Supabase-only side-table fanout for reactions/receipts; manual queue FIFO; no service-class isolation |

### Stage D: 100,000–1,000,000+

| Dimension | Plan |
|---|---|
| Primary bottlenecks | control-plane concentration, global hot-room fanout, storage/search/AI cost concentration, audit/query bloat |
| Required infra changes | dedicated hot-path messaging architecture or heavily optimized scoped aggregates; partitioned historical tables; secondary control-plane / multi-region continuity strategy where needed |
| Required integrity changes | full command gateway everywhere; immutable audit/event stream for governance surfaces |
| Required rate limiting / QoS | hard reserved paid/event capacity, separate worker pools, adaptive degraded modes |
| Required observability | full SLO/error-budget governance, automated rollback/containment triggers, audited DR certification |
| First risky surfaces | very large events, notification delivery, AI/image generation, exports/imports |
| Acceptable now but fails later | production auto-deploy without canary, forward-only migrations without compatibility window testing |

## 10. Free vs Paid QoS Constitution

### Service classes

| Class | Examples |
|---|---|
| `free_consumer` | free trips, free preview/join, free chat, free media |
| `paid_consumer` | paid consumer concierge/voice/export/storage features |
| `pro_event` | pro trips, event organizers, paid team operations |
| `internal_ops` | admin tools, support, system jobs |

### Rules

1. Free usage must never consume the same priority lane as event/pro operational traffic for:
   - notifications,
   - AI/voice,
   - large media/import jobs,
   - event-scale moderation.
2. Plan tier must be part of backend rate-limit keys for all expensive endpoints.
3. Organizers/admins get higher protected budgets than attendees on event days.
4. Free heavy features degrade first:
   - voice,
   - image generation,
   - OCR/import,
   - large export jobs,
   - non-critical notifications.

### Recommended initial limits

| Surface | Free | Paid Consumer | Pro/Event |
|---|---:|---:|---:|
| Text AI requests | low daily/hourly budget | higher | reserved pool plus trip budget |
| Voice session starts | off or tiny trial budget | moderate | reserved pool |
| AI tool executions | low | moderate | higher with organizer reserve |
| Invite create | low hourly | moderate | higher for admins/organizers |
| Join requests per user per target trip | low with cooldown | same | same |
| Chat send | server-throttled per user/trip | higher | role-aware higher budgets |
| Media upload concurrency | 2 | 4 | 8 or policy-based |
| Scheduled/broadcast creation | low | moderate | higher but admin-gated |

### Queueing and degraded behavior

| Condition | Behavior |
|---|---|
| AI provider saturation | queue or reject free first, preserve paid/event |
| Notification backlog | reserve dispatch slices for transactional and pro/event reminders |
| Storage/import saturation | pause free bulk imports first |
| Event hot room | preserve organizer/admin posting, degrade attendee extras |

### Abuse containment

- challenge-based public preview/join surge control,
- server-side invite creation throttling,
- notification fanout rate caps per trip and per actor,
- weighted AI cost budgets,
- service-role internal endpoints fail closed on missing secrets.

## 11. Dangerous Surface Ranking

| Rank | Surface | Severity | Failure Shape | Blast Radius | Why Risky | Governing Rule |
|---:|---|---|---|---|---|---|
| 1 | AI Concierge cross-surface mutations | Critical | duplicate or unsafe writes, mismatched provenance, bypassed invariants | trip-wide and potentially platform-wide | direct executor paths bypass versioned/locked manual flows | AI may propose, never silently finalize; all AI writes use canonical mutation gateway |
| 2 | Media uploads / storage / attachment lifecycle | Critical | orphaned objects, raw URL leaks, failed cleanup, inconsistent auth | trip-wide, storage-cost, privacy | multiple bucket models and URL contracts coexist | all media uses canonical asset registry and private-by-default buckets |
| 3 | Invite / share / join / public preview | Critical | metadata leakage, invite exhaustion, wrong routing, join spam | cross-trip and growth funnel | raw-ID preview, inconsistent invite accounting, invite sprawl | public preview uses opaque tokens and one canonical access funnel |
| 4 | Payments / expense splits | Critical | state drift, double settlement, audit loss | financial trust and support burden | locked RPC exists but alternative weak mutation paths remain | payment state mutations are serialized and audited only via canonical RPCs |
| 5 | Event trips at scale | Critical | hot-room saturation, moderation collapse, unread drift | many users at once | event-specific guardrails are partial, not systemic | event mode has explicit scale thresholds and degraded behaviors |
| 6 | Channels | High | missed messages, stale access, missing replay | trip/team-wide | current channel path lacks backfill/pagination/edit sync | channel chat follows same replay and access invariants as main chat |
| 7 | Main trip chat + receipts/reactions | High | silent drift or global fanout overload | many active trips | main chat strong, side tables weak | no unscoped hot-path realtime tables |
| 8 | Shared planning objects: tasks, polls, calendar, basecamp | High | last-write-wins corruption, conflicting edits | trip-wide | some strong RPCs exist, but not all writers use them | these objects require CAS or locked RPCs only |
| 9 | Account lifecycle and deletion | High | incomplete cleanup, privacy misses, ghost artifacts | cross-platform data lifecycle | user-scoped storage cleanup assumptions are wrong for trip-scoped files | deletion must be driven by canonical asset/object metadata |
| 10 | Feature flags / degraded mode / rollback controls | High | failed containment, false canary confidence | platform-wide | fail-open helpers and low adoption | kill switches must fail closed and be actually wired |

## 12. Recommended Immediate Platform Changes

1. **Consolidate platform authority.**  
   Ratify `trip_members` as membership truth, `trip_admins` as governance truth, `trip_roles` as feature/channel RBAC, and remove read-time membership self-healing.

2. **Harden the access funnel.**  
   Replace raw `tripId` public preview with opaque share tokens; make join preview and join creation server-owned; fix invite `current_uses` semantics; enforce single canonical approval path.

3. **Standardize shared mutations behind one gateway.**  
   Manual UI, AI, voice, offline replay, and edge functions must all route through the same idempotent, version-aware primitives for tasks, polls, calendar, basecamp, payments, broadcast creation, and membership changes.

4. **Make AI pending actions real.**  
   Wire pending cards into the active chat UI, carry `tool_call_id` everywhere, and confirm by atomically claiming the pending row before the live insert happens.

5. **Build the missing realtime constitution in code.**  
   Ship an in-repo trip-scoped realtime hub or remove the dead abstraction; add scoped replay-safe handling for channels, reactions, read receipts, and member/channel topology.

6. **Introduce a canonical media asset model.**  
   Stop storing public URLs as canonical media identity; move to bucket/path/asset-row references with one resolver and one cleanup path.

7. **Move QoS and freemium enforcement to the backend.**  
   Enforce voice, AI, invite creation, upload limits, and chat flood control server-side with plan-aware keys and service classes.

8. **Make feature flags usable as kill switches.**  
   Fail closed for critical flags, add per-user rollout hashing, add audited mutation paths, and wire them into high-cost/high-risk endpoints.

9. **Raise operational readiness from documentary to exercised.**  
   Add blocking post-deploy checks, synthetic Tier-0 probes, load/chaos test automation, and restore-drill evidence.

## 13. Exact Platform Changes

### Code areas to modify

| Area | Files / Modules |
|---|---|
| Membership and creator finality | `src/hooks/useAuth.tsx`, `src/hooks/useTripMembers.ts`, `src/services/calendarService.ts`, `supabase/functions/get-trip-detail/index.ts`, leave/rejoin/member-removal RPC paths |
| Invite/share/join | `src/hooks/useInviteLink.ts`, `src/pages/TripPreview.tsx`, `src/pages/JoinTrip.tsx`, `supabase/functions/get-trip-preview/index.ts`, `supabase/functions/share-preview/index.ts`, `supabase/functions/generate-trip-preview/index.ts`, `supabase/functions/get-invite-preview/index.ts`, `supabase/functions/join-trip/index.ts`, join approval RPCs |
| AI mutation gateway | `src/components/AIConciergeChat.tsx`, `src/hooks/useVoiceToolHandler.ts`, `src/hooks/usePendingActions.ts`, `src/features/chat/components/ChatMessages.tsx`, `src/features/chat/components/PendingActionCard.tsx`, `supabase/functions/execute-concierge-tool/index.ts`, `supabase/functions/_shared/functionExecutor.ts`, `supabase/functions/confirm-reservation-draft/index.ts` |
| Shared object mutation hardening | `src/hooks/useTripTasks.ts`, `src/hooks/useTripPolls.ts`, `src/services/calendarService.ts`, `src/services/basecampService.ts`, `src/services/paymentService.ts`, related RPC callers |
| Realtime and unread | `src/features/chat/hooks/useTripChat.ts`, `src/services/channelService.ts`, `src/components/pro/channels/ChannelChatView.tsx`, `src/hooks/useUnreadCounts.ts`, `src/services/readReceiptService.ts`, `src/services/chatService.ts`, introduce `src/hooks/useTripRealtimeHub.ts` or equivalent |
| Media/storage | `src/services/uploadService.ts`, `src/services/mediaService.ts`, `src/services/tripMediaService.ts`, `src/services/tripMediaUrlResolver.ts`, `src/hooks/useShareAsset.ts`, `src/hooks/useEventAgendaFiles.ts`, `src/hooks/useEventLineupFiles.ts`, `src/hooks/useTripCoverPhoto.ts`, `supabase/functions/file-upload/index.ts`, `supabase/functions/image-upload/index.ts`, `supabase/functions/process-account-deletions/index.ts`, `src/services/archiveService.ts` |
| QoS / feature flags / internal dispatch | `src/lib/featureFlags.ts`, `supabase/functions/_shared/featureFlags.ts`, `src/config/voiceFeatureFlags.ts`, `supabase/functions/_shared/security.ts`, `supabase/functions/_shared/rateLimitGuard.ts`, `supabase/functions/lovable-concierge/index.ts`, `supabase/functions/gemini-voice-session/index.ts`, `supabase/functions/gemini-voice-proxy/index.ts`, `supabase/functions/dispatch-notification-deliveries/index.ts`, `supabase/functions/push-notifications/index.ts`, `supabase/functions/invite-organization-member/index.ts` |

### Schema / index / policy changes

1. Add `trip_public_shares` or equivalent opaque preview/share token table.
2. Add trip/channel scoping to read receipts and reactions, or replace with scoped aggregate tables.
3. Add missing idempotency columns or command tables where not yet present:
   - payment create/update/settle,
   - notifications/broadcast fanout command tracking,
   - media finalize commands.
4. Reclassify and tighten `trip_pending_actions`:
   - explicit scope model,
   - claim state (`pending`, `claiming`, `confirmed`, `rejected`, `expired`),
   - proposer/confirmer attribution.
5. Introduce canonical `media_assets` table or evolve `trip_media_index` to include:
   - bucket,
   - object_path,
   - source_surface,
   - uploader,
   - privacy scope,
   - lifecycle state.
6. Add queue/service class fields such as `priority`, `service_class`, and maybe `cost_class` to `notification_deliveries` and AI/import job tables.
7. Fix legacy/duplicate channel schema usage and choose one canonical membership table.

### Env / secret / infra changes

- `NOTIFICATION_DISPATCH_SECRET` required and fail-closed
- `VOICE_TTS_FREE_FOR_ALL=false` unless an explicit trial policy exists
- no provider-key fallback from server to client env keys
- provider budgets and service classes exposed to backend QoS helper
- production health/smoke checks enforced after deploy

### Service boundaries to introduce or clean up

| Boundary | Action |
|---|---|
| Shared mutation gateway | introduce one service/RPC layer for all shared writes |
| Trip access gateway | unify preview/share/join resolution server-side |
| Realtime hub | centralize scoped subscriptions and replay |
| Media asset service | unify upload/finalize/resolve/delete/reconcile |
| QoS policy resolver | resolve plan tier, service class, budget, and degraded mode |

### Migration order

1. Additive schema only:
   - share token table,
   - media asset metadata,
   - scoped receipt/reaction support,
   - queue priority fields,
   - pending-action claim fields.
2. Dual-write phase:
   - app and edge functions write old and new metadata paths.
3. Backfill and reconcile:
   - media assets,
   - share tokens,
   - scoped side-table data if needed.
4. Read switch:
   - public preview/share,
   - media resolvers,
   - realtime side-state.
5. Legacy removal:
   - unused edge approval path,
   - dead channel models,
   - raw URL assumptions,
   - direct weak AI writers.

### Deployment order

1. ship additive schema,
2. ship backend QoS/auth/AI changes behind runtime flags,
3. ship client consumers of pending actions / new preview flow / media resolver,
4. run backfills and reconciliation,
5. switch reads,
6. remove legacy writers.

### Rollback plan

- Keep additive migrations only until read switch is proven.
- Use runtime flags to disable new preview/share/AI/media paths if needed.
- Roll back app reads before removing legacy tables or endpoints.
- For schema-coupled failures, prefer forward-fix with dual-write intact rather than destructive rollback.

## 14. Verification + Load Plan

### Contract tests

- canonical mutation gateway returns `mutation_id`, actor, source, final status
- public preview endpoint never accepts raw object IDs
- AI pending actions return `pending` and not `created`
- canonical payment settlement updates both split and parent state

### Permission tests

- role-based create/update/delete for consumer, pro, and event
- read-only mode enforcement
- channel posting restrictions
- admin-only operations
- private vs shared scope isolation for AI history, accommodations, artifacts, and media

### Concurrency tests

- duplicate chat send replay with same `client_message_id`
- task edit conflict with two users
- task assignment concurrent edits
- calendar create retry with identical idempotency key
- basecamp simultaneous writes from UI and AI
- AI pending-action double-confirm race
- duplicate invite creation and duplicate join attempts
- payment settlement double-submit and settle/unsettle race

### Realtime tests

- main chat disconnect/reconnect gap backfill
- channel chat disconnect/reconnect gap backfill
- reactions/read-receipts scoped subscription correctness
- background/foreground on mobile/PWA
- multi-device sync for task/poll/calendar invalidation
- subscription cleanup when leaving trip/channel

### Funnel + access tests

- public preview -> signup -> join request -> approval
- invalid/expired/revoked invite handling
- duplicate request cooldown
- single active invite rotation
- wrong-trip route prevention
- organization invite correct-account/wrong-account flows

### Media tests

- concurrent upload stress by trip type
- object upload succeeds / DB metadata fails compensation
- DB metadata succeeds / downstream link fails compensation
- orphan reconciliation detects and removes stray objects
- signed URL resolution for all private buckets
- event agenda/lineup file lifecycle

### Account lifecycle tests

- signup and login spike resilience
- password reset/change
- account deletion with:
  - shared content anonymization/orphaning,
  - storage cleanup using canonical asset rows,
  - membership cleanup,
  - audit preservation

### Hot-event tests

- 1,000 viewers, 50 posters in event main chat
- announcement-only channel under burst
- notification priority behavior under event reminder fanout
- attendee vs organizer QoS under saturation

### Free vs paid QoS tests

- free AI flood does not starve paid voice/text
- free broadcast/notification backlog does not delay event reminders
- invite preview/join surge does not degrade authenticated pro/event reads

### Local reproducibility steps

1. Run app and Playwright multi-user harness locally.
2. Use mocked network interruption to test reconnect.
3. Use dev-only flags to simulate feature disablement and provider failure.
4. Use local test accounts across free, paid, pro/event roles.

### Staging reproducibility steps

1. Run authenticated synthetic journeys against deployed staging-like environment.
2. Execute queue backlog and reconnect drills.
3. Run storage reconciliation in dry-run mode.
4. Replay duplicate AI tool calls and verify exactly-once outcomes.

### Synthetic load plan

- chat send/load burst
- join preview/join surge
- notification backlog fill and drain
- media upload burst
- AI parser/image generation burst

### Success metrics before / after

| Metric | Target |
|---|---|
| duplicate AI-confirmed shared objects | zero in concurrency suite |
| raw public preview by `tripId` | zero |
| global hot-path read-receipt / reaction subscriptions | zero |
| payment settle/unsettle drift incidents in test | zero |
| orphaned media objects after failure-injection | zero tolerated after reconciliation |
| feature-flag fail-open on critical kill switches | zero |
| blocking post-deploy Tier-0 verification | required |

### Rollout guardrails

- no legacy path removal until new path metrics are green,
- no schema contraction until reconciliation passes,
- no high-risk rollout without runtime kill switch,
- no release if Tier-0 health gate or restore evidence is stale.

## 15. Platform Scorecard

| Domain | Score | Rating | What Blocks 95+ |
|---|---:|---|---|
| domain model coherence | 72 | fragile | one root aggregate exists, but Pro/Event/channel semantics still live partly in adapters, docs, and legacy structures |
| scope / ownership clarity | 64 | unsafe | private vs trip-shared vs channel-shared vs admin-only is not encoded consistently |
| authorization model | 74 | fragile | RLS is substantial, but authority is split across membership, admins, roles, creator fallbacks, and public preview exceptions |
| shared-write safety | 62 | unsafe | strong RPCs exist, but many reachable raw-write bypasses remain |
| idempotency / deduplication | 58 | unsafe | chat is good; many other create/update paths still ignore command keys |
| realtime architecture | 60 | unsafe | main trip chat has replay, but channels and side-state are fragmented and globally scoped in places |
| invite / share / join safety | 55 | unsafe | approval boundary is good, but public preview, invite sprawl, and counter semantics are not |
| media / storage robustness | 48 | unsafe | bucket posture, URL models, cleanup, and schema drift are all unresolved |
| AI cross-surface mutation safety | 46 | unsafe | pending model is not fully wired, and AI bypasses hardened manual mutation primitives |
| plan-aware traffic shaping | 44 | unsafe | rate-limit primitive exists, but service-class isolation and paid capacity protection are not applied consistently |
| observability | 57 | unsafe | telemetry and tests exist, but kill switches, SLOs, synthetic checks, and exercised drills are incomplete |
| rollback readiness | 52 | unsafe | honest docs, but no real canary and limited blocking post-deploy verification |
| production readiness | 58 | unsafe | good foundation, but not yet constitutionally governed for growth-stage concurrency and event-scale operations |

## 16. Follow-Up Prompt Sequence

Recommended follow-up implementation sequence:

1. **Permission and membership consolidation**  
   Remove creator auto-repair, unify membership/admin/role authority, and fix invite approval path.

2. **Invite/share/public preview hardening**  
   Replace raw trip preview with opaque share tokens and fix invite-use semantics.

3. **AI mutation gateway hardening**  
   Make `trip_pending_actions` real, atomic, idempotent, and UI-visible.

4. **Shared mutation primitive consolidation**  
   Route tasks, polls, calendar, basecamp, payments, and broadcasts through one canonical write layer.

5. **Realtime hub plus scoped side tables**  
   Build in-repo hub, add scoped replay-safe reactions/read receipts/unread state, fix channels.

6. **Media/storage asset unification**  
   Canonical asset registry, private buckets, cleanup/reconcile worker, cover-photo/storage cleanup.

7. **QoS and service-class isolation**  
   Plan-aware rate limiting, notification priority, voice/AI gating, server-side chat flood control.

8. **Observability, rollout, and restore hardening**  
   Feature-flag repair, health gates, synthetic Tier-0 probes, load/chaos/restore automation.
