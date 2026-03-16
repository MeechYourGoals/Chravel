# System Map

> Subsystem topology, dependencies, failure modes, and sources of truth.
> For detailed file/directory reference, see `docs/ACTIVE/CODEBASE_MAP.md`.
> Updated: 2026-03-16

---

## Critical Path

```
Auth → Trips → Chat → Payments → AI Concierge → Calendar → Permissions → Notifications
```

Every downstream system depends on Auth resolving first. Trip context gates most features. Chat, Payments, and Calendar are the highest-traffic subsystems after trip loading.

---

## Subsystems

### 1. Authentication & Session
- **Purpose:** Session hydration, user identity, role resolution
- **Entry points:** `src/hooks/useAuth.tsx`, `src/integrations/supabase/client.ts`
- **Source of truth:** Supabase Auth (`auth.users`), session JWT
- **External deps:** Supabase Auth
- **Failure modes:** Session hydration race (data fetches before auth resolves → Trip Not Found flash); token refresh failure; demo/auth mode crossover
- **Status:** Stable — zero-tolerance path, heavily guarded

### 2. Trip Management & Membership
- **Purpose:** Trip CRUD, member management, invite flows, archival
- **Entry points:** `src/hooks/useTrips.ts`, `src/hooks/useTripMembers.ts`, `src/services/tripService.ts`
- **Source of truth:** `trips` + `trip_members` tables (RLS-enforced)
- **External deps:** None (Supabase only)
- **Failure modes:** Trip access without membership; status calculation drift; archive/delete cascading failures; invite link expiry handling
- **Status:** Stable — core product flow

### 3. Unified Messaging (Chat / Channels / Broadcasts)
- **Purpose:** Trip chat, role-based channels, broadcasts, threads, reactions, read receipts
- **Entry points:** `src/features/chat/`, `src/services/chatService.ts`, `src/services/unifiedMessagingService.ts`, `src/services/channelService.ts`
- **Source of truth:** `trip_chat_messages` + `trip_channels` + `trip_broadcasts` tables; Supabase Realtime
- **External deps:** Supabase Realtime (WebSocket)
- **Failure modes:** Message loss on WebSocket reconnect (no replay); read receipt write amplification; reaction refetch storm; offline queue conflicts; broadcast duplicate notifications
- **Status:** Stable — high-traffic, known reconnect edge cases documented in DEBUG_PATTERNS.md

### 4. AI Concierge (Text + Voice)
- **Purpose:** Gemini-powered travel assistant with text chat and voice (Gemini Live)
- **Entry points:** `src/components/AIConciergeChat.tsx`, `src/hooks/useGeminiLive.ts`, `src/hooks/useVoiceToolHandler.ts`, `src/services/conciergeGateway.ts`
- **Source of truth:** `ai_queries` table; Gemini API (external)
- **External deps:** Google Gemini / Vertex AI, Google Text-to-Speech
- **Failure modes:** Prompt injection; tool call hallucination writing to shared state; timeout on long responses; WebSocket drop during voice session; audio state stuck after session end
- **Status:** Evolving — voice features actively developed, text concierge stable

### 5. Calendar & Events
- **Purpose:** Google Calendar bi-directional sync, event CRUD, RSVP, reminders
- **Entry points:** `src/features/calendar/`, `src/services/calendarService.ts`, `supabase/functions/calendar-sync/`
- **Source of truth:** `calendar_events` table; Google Calendar API (external sync)
- **External deps:** Google Calendar API
- **Failure modes:** Sync token expiry; conflict on bi-directional sync; duplicate events from replay; timezone handling; recurring event edge cases
- **Status:** Stable — sync requires careful idempotency

### 6. Payments & Subscriptions
- **Purpose:** Consumer/Pro subscriptions, expense splitting, payment requests, balance tracking
- **Entry points:** `src/hooks/usePayments.ts`, `src/hooks/useConsumerSubscription.tsx`, `src/integrations/revenuecat/revenuecatClient.ts`, `src/services/paymentService.ts`
- **Source of truth:** `user_subscriptions` table (populated by webhooks from RevenueCat/Stripe)
- **External deps:** RevenueCat (iOS billing), Stripe (web checkout + webhooks)
- **Failure modes:** Webhook delivery failure; RevenueCat/Stripe SDK mismatch per platform; subscription state cache drift; billing bypass via client manipulation
- **Status:** Stable — critical path for monetization

### 7. Smart Import (Gmail / PDF / Artifacts)
- **Purpose:** AI-powered import of trip data from emails, PDFs, links, and other sources
- **Entry points:** `src/features/smart-import/`, `supabase/functions/gmail-import-worker/`, `supabase/functions/artifact-ingest/`
- **Source of truth:** `artifacts` + `import_runs` tables
- **External deps:** Gmail API (OAuth), Google Gemini (AI parsing)
- **Failure modes:** OAuth token refresh failure; parser ambiguity creating duplicate records; partial import with no rollback; import state not surfaced in UX
- **Status:** Evolving — state machine architecture recommended but not fully implemented

### 8. Media Gallery & Storage
- **Purpose:** Photo/video upload, compression, AI tagging, lightbox viewing
- **Entry points:** `src/services/mediaService.ts`, `src/services/mediaAITagging.ts`, `supabase/functions/image-upload/`
- **Source of truth:** `media_attachments` table; Supabase Storage buckets
- **External deps:** Supabase Storage, Google Gemini (AI tagging)
- **Failure modes:** Upload timeout; storage quota exceeded; compression failures on large files; AI tagging errors silently ignored
- **Status:** Stable

### 9. Maps & Places
- **Purpose:** Google Maps display, place search, autocomplete, location sharing
- **Entry points:** `src/services/googleMapsService.ts`, `src/services/googlePlacesNew.ts`, `src/services/googlePlacesCache.ts`
- **Source of truth:** Google Maps/Places API (external); `trip_places` table (saved)
- **External deps:** Google Maps JavaScript API
- **Failure modes:** Multiple map instances (violates single-instance rule); API key rate limiting; stale places cache; event listener leak on unmount
- **Status:** Stable — single-instance constraint enforced in CLAUDE.md

### 10. Notifications & Realtime
- **Purpose:** Push notifications, email, in-app alerts, read receipts, badge counts
- **Entry points:** `src/services/notificationService.ts`, `src/hooks/useNotificationRealtime.ts`, `src/native/push.ts`
- **Source of truth:** `notifications` table; Zustand store (`notificationRealtimeStore`) for client cache
- **External deps:** Supabase Realtime, APNS (iOS push), Resend (email), Twilio (SMS)
- **Failure modes:** Dual-path duplicate generation (DB triggers + edge functions); badge count drift on reconnect; multi-device read desync; quiet hours bypass
- **Status:** Stable — dual-path dedup fixed for broadcasts, pattern applies to new features

### 11. Organizations & Teams (B2B)
- **Purpose:** B2B seat-based billing, team management, org admin dashboard
- **Entry points:** `src/pages/OrganizationDashboard.tsx`, org-related hooks and services
- **Source of truth:** `organizations` + `organization_members` tables
- **External deps:** Stripe (seat billing)
- **Failure modes:** Seat count billing desync; role inheritance across org/trip boundaries; invite flow separate from trip invites
- **Status:** Evolving — feature-complete but lower usage than consumer flows

### 12. Permissions & Roles
- **Purpose:** Role-based access control across consumer, pro, and event trip types
- **Entry points:** `src/hooks/useMutationPermissions.ts`, `src/hooks/useRolePermissions.ts`, `src/hooks/useEventPermissions.ts`
- **Source of truth:** Supabase RLS policies (DB-level authority); client hooks for UX gating
- **External deps:** None
- **Failure modes:** Client-side permission checks diverging from RLS; role escalation via direct API calls; trip type not checked before granting mutation access
- **Status:** Stable — hardened in March 2026 shared mutation audit

---

## External Dependency Map

| Dependency | Used By | Failure Impact | Fallback |
|-----------|---------|---------------|----------|
| Supabase (Postgres/Auth/Realtime/Storage) | Everything | Total outage | None (core infra) |
| Google Gemini / Vertex AI | AI Concierge, Smart Import, Media AI Tagging | Concierge/import unavailable | Feature flag disable |
| Google Maps JS API | Maps, Places | Map/search non-functional | Graceful empty state |
| Google Calendar API | Calendar sync | Sync pauses, local-only events | Graceful degradation |
| RevenueCat | iOS subscriptions | iOS billing unavailable | Stripe web still works |
| Stripe | Web payments, org billing | Web checkout unavailable | RevenueCat iOS still works |
| Gmail API | Smart Import | Email import unavailable | Manual entry |
| Sentry | Error tracking | Silent (monitoring loss) | Console errors only |
| PostHog | Analytics | Silent (analytics loss) | None needed |
| Resend | Email notifications | Email delivery fails | Push/in-app fallback |
| Twilio | SMS notifications | SMS delivery fails | Email/push fallback |

---

## State Management Layers

1. **Auth state** — `useAuth()` hook (Supabase session)
2. **Server state** — TanStack Query with cache key factory (`src/lib/queryKeys.ts`)
3. **Realtime** — Supabase Realtime subscriptions (messages, notifications, locations)
4. **Client state** — Zustand stores (`entitlementsStore`, `demoModeStore`, `conciergeSessionStore`, `notificationRealtimeStore`)
5. **Feature flags** — `public.feature_flags` table, 60s client cache via `useFeatureFlag()`
