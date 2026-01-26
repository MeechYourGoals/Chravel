# Travel Planning Platform – Product Requirements Document (PRD)

Version: 1.0
Owner: Founding Engineer (TBD)
Last Updated: 2025-08-12

1. Mission and Vision
Our mission is to unify group and professional travel planning into a single, intelligent, collaborative platform. We eliminate planning chaos by combining itinerary building, permissions-based collaboration, real-time communication, budget tracking, AI concierge, and professional-grade logistics into one seamless experience. The product serves casual travelers (“My Trips”), professional teams (“Travel Pro”: sports, music tours, corporate retreats), and events (conferences, tournaments) with distinct workflows that share a common foundation.

Key Principles
- Single source of truth: Itinerary, files, chat, links, receipts, polls, and decisions all live in one place per trip.
- Real-time collaboration: Comments, mentions, polls, and broadcasts keep groups aligned.
- Contextual intelligence: AI concierge understands the trip context and the broader site knowledge base.
- Professional reliability: Role-based access, logistics modules, exports/reporting for pro use cases.
- Monetization via Travel Recs: A curated, queryable recommendation hub and ad surface.

2. User Segments and Modes
- Consumers (My Trips): Friends/family trips; focus on discovery, collaboration, simple budgets.
- Professionals (Travel Pro): Sports teams, music tours, corporate retreats; focus on logistics, role permissions, reporting.
- Events: Multi-session schedules, registration, exhibitor profiles, and attendee networking.

3. High-Level Architecture
- Frontend: React 18 + TypeScript, Vite, Tailwind design system, shadcn UI variants.
- State/Server State: TanStack Query; lightweight local state via hooks and Zustand.
- Backend: Supabase (Postgres, RLS, Auth, Storage, Edge Functions).
- AI: Perplexity (current) via edge function; OpenAI alternative via edge function; OpenAI Concierge service orchestrator.
- Realtime/Chat: Supabase Realtime with Postgres persistence.
- Notifications: Push (Capacitor + service worker), in-app notifications, scheduled/broadcast.
- Maps/Calendar: Google Maps, Google Calendar integrations via proxy/edge functions.

4. Core Modules and Requirements
4.1 Trip Data Model (Common)
- Trip Context (src/types/tripContext.ts):
  - participants, itinerary items, accommodation, files, photos, links, polls, chat history, receipts, preferences, spending patterns, group dynamics, visitedPlaces, weatherContext, basecamp, broadcasts, proData.
- Sharing: Joinable links (trip_invites, invite_links) with code, max_uses, expires_at, is_active; front-end flow to generate/copy and to join.
- Permissions: Roles per user (viewer, contributor, admin; pro roles by department).

4.2 My Trips
- Features: Itinerary builder (drag & drop), group chat with mentions, files/photos, links board, polls, budget/receipts, map view, calendar export, notifications, share/join links.
- Components: ItineraryBuilder, TripTabs, TripDetail, TripChat, FilesTab, PhotoAlbum, PlacesSection, BudgetTracker, AddLinkModal, CalendarEventModal, AddPlaceModal, InviteModal, ShareTripModal, TripPosterGenerator.
- Workflows:
  - Create trip; set preferences; invite collaborators.
  - Add events, attach files/photos/links; vote via polls; settle expenses.
  - Export to calendar; push/broadcast critical messages.

4.3 Travel Pro
- Categories: Sports Teams, Music Tours, Corporate Retreats, Education/Field Trips, Recruiting, Roadshows.
- Features: Role-based tabs (ProTabNavigation) with Team, Schedule, Equipment, Room Assignments, Broadcasts, Budget/Reports, Compliance Docs.
- Components: ProTripDetailHeader, ProTabContent, RoleSwitcher, TeamManagementTable, EquipmentManager, RoomAssignmentsModal, TourScheduleSection/GameSchedule, TourTeamSection, ProTripQuickActions.
- Logistics:
  - Multi-city routing, venue/arena requirements, rooming lists, credentialing, transport manifests, approval workflows.
  - Broadcast system for urgent/all-hands updates; segmented messages by department.

4.4 Events
- Features: EventSetupWizard, AgendaBuilder, SpeakerDirectory, ExhibitorsSponsorSection, RegistrationTab, TicketingBillingSection, LiveEngagement (Q&A, Polls), NetworkingHub with rules, HeatMapDashboard.
- Attendee Experience: Personalized agenda, calendar sync, notifications.

4.5 Travel Recommendations (Recs) + Advertising Hub
- Data: Recommendations by location and category (hotels, restaurants, activities, tours, transportation).
- UX: Search, filters, save to trip, create link cards; sponsored placements; affiliate links.
- Monetization: CPC/CPA for sponsored recs; inventory managed via saved_recommendations + external Ad server integration (future); dedicated public bucket for advertiser-assets (currently public by design).

4.6 AI Concierge
- Goals:
  - Answer trip-specific questions across all trip artifacts (files, photos tags, links, chats, receipts, itinerary, preferences).
  - Perform universal search across site knowledge and public travel sources.
- Current Implementation:
  - Edge functions: perplexity-chat (primary), openai-chat (alternate), enhanced-ai-parser/file-ai-parser/receipt-parser for extraction tasks.
  - UniversalConciergeService determines if message is a search query; uses Supabase function search or Perplexity.
  - TripContextService formats context for AI; OpenAIConciergeService composes system prompt.
- Output: content + optional citations; sentiment analysis basic scoring.
- Migration Path: Replace Perplexity with OpenAI
  - Keep the same edge function interface (request/response shape).
  - Swap model provider inside function; map fields: messages, temperature, max_tokens, citations off by default.
  - Maintain conversation storage in ai_conversations (or trip_chat_messages).

4.7 Notifications
- Types: mentions, broadcasts, calendar reminders, polls, files added, photos uploaded.
- Delivery: In-app (NotificationBell) and push (service worker), email/SMS (future).
- Sources: Triggers on new chat messages with @mentions, calendar event proximity, file/photo insert, new poll creation.
- Segmentation: Per-trip and role-based in Pro.

4.8 Files and Photos
- Upload flows: Edge functions image-upload, file-upload, photo-upload; store in storage and metadata in trip_files/trip_receipts; AI extractors for receipts/itinerary/events.
- Access: Signed URLs for private buckets; public only for advertiser-assets.

4.9 Calendar and Tasks
- Calendar: AddToCalendarButton, calendar-sync edge function, google-calendar-sync; calendar export utils; reminders via scheduled function (message-scheduler/daily-digest).
- Tasks: TripTasksTab, TaskCreateModal, TaskRow, CompletionDrawer; client-side store with path for Supabase persistence.

4.10 Chat and Broadcasts
- Chat: Supabase Realtime for trip chat and role channels; TripChat and TourChat components; reactions, inline replies.
- Broadcasts: broadcasts-create/fetch/react functions; BroadcastComposer, EmergencyBroadcast, SegmentedBroadcastsSection.

5. Data and Persistence
- Supabase Tables (subset shown in project context): profiles, trip_links, trip_files, trip_polls, trip_receipts, receipts, saved_recommendations, invite_links, trip_invites, trip_chat_messages, trip_preferences, user_preferences, secure_storage.
- RLS: Owner-only INSERT/UPDATE/DELETE for user-specific rows; public SELECT on some tables (trip_* read-only for viewing trips; profiles currently public read – see Security for tightening options).
- Storage: Buckets – advertiser-assets (public), others should be private with signed URLs.

6. External Integrations and Edge Functions
6.1 Edge Functions (existing folders)
- ai-features, broadcasts-create, broadcasts-fetch, broadcasts-react, calendar-sync, daily-digest, delete-stale-locations, enhanced-ai-parser, file-upload, google-calendar-sync, google-maps-proxy, image-upload, message-scheduler, perplexity-chat, photo-upload, populate-search-index, push-notifications, search, seed-mock-messages, update-location, venue-enricher, openai-chat, file-ai-parser, receipt-parser.
- All functions must include CORS headers and adhere to Supabase client usage (no raw SQL). JWT verification enabled by default unless explicitly disabled in config.

6.2 Third-Party APIs
- Supabase: Auth, Postgres, Storage, Functions, Realtime (RLS heavily used).
- Google Maps: Autocomplete, Map embeds, geocoding via google-maps-proxy.
- Google Calendar: OAuth + sync (edge); calendar export file generation.
- Perplexity: Chat Completions for online RAG; API key in Supabase secrets.
- OpenAI: Chat Completions + Vision for parsing files/receipts.
- Capacitor: Push notifications, status bar, camera, files, geolocation.

7. Security Requirements
7.1 RLS Policies
- Maintain RLS on all user-owned tables (receipts, saved_recommendations, secure_storage, trip_* inserts/updates).
- Public SELECT tables should be limited to non-sensitive content only. For profiles, prefer public fields only in UI; consider revising policy later to restrict rows to owner or explicitly public profiles if needed.
- Avoid recursive policies; use SECURITY DEFINER helpers where needed.

7.2 Edge Functions
- Enable JWT verification unless the route must be public (e.g., google-maps-proxy). Ensure request.auth exists when mutating user data; deny if absent.
- Include strict input validation (use securityUtils sanitize).
- Rate limiting: lightweight client-side guard exists; server-side quotas recommended (future).

7.3 Secrets and Keys
- Store in Supabase Function Secrets (OpenAI, PERPLEXITY_API_KEY, Google Maps, etc.). Never in frontend env files.
- Generate signed URLs for private files/photos; avoid public buckets for user content.

7.4 Compliance
- Honor show_email/show_phone flags in UI for profiles; don’t render sensitive data by default.
- GDPR/CCPA readiness: data export/delete flows (future), audit logging for Pro.

8. Costs (Rough Estimates)
- Supabase: $25–$200+/mo depending on scale (DB, storage, edge invocations).
- Google Maps: $200 monthly credit; $7–$17 per 1000 calls by API type.
- Google Calendar: Free; OAuth infra; negligible.
- Perplexity: $20–$50+/mo per seat or usage-based; chat completions $ TBD.
- OpenAI: $1–$5 per 1M input tokens; $5–$15 per 1M output tokens (model-dependent); vision higher.
- Storage egress: $0.09/GB typical (varies).
- Push (FCM/APNs): Free infra; dev time for reliability.

9. Mock Data Inventory and Migration to Real Data
- Mock Sources:
  - src/data/tripsData.ts (consumer trips), src/data/proTripMockData.ts and many subfiles (pro trips), src/data/eventsMockData.ts, src/data/recommendations/*.
  - Services using mocks: TripContextService (selects consumer vs pro), UniversalConciergeService fallback search.
  - UI “demo mode” toggles via useDemoMode/service.
- Migration Plan:
  - Replace TripContextService getters with Supabase queries per table (trips, itinerary, participants, files, photos, links, polls, receipts, preferences). Maintain the same TripContext shape.
  - For collaborators: create trip_members table (user_id, trip_id, role, permissions) with RLS (owner/admin can manage members; members can read/write as per role). Not yet present – to be added in DB migration.
  - Replace recommendations mock with server-backed search + sponsored placements (saved_recommendations + advertising inventory).
  - Keep formatContextForAI signature to avoid breaking AI functions.

10. Authentication and Sharing
- Supabase Auth; ensure Authentication > URL Configuration is set correctly (Site and Redirect URLs).
- Google sign-in (optional) per Supabase docs.
- Share Trip:
  - Create invite link (trip_invites/invite_links): set code, max_uses, expiration; present friendly share modal with deep links.
  - Join Trip:
    - Validates code, checks active/expiry/uses; increments usage; inserts into trip_members (when created).

11. AI Concierge Search Scope
- Trip scope: All artifacts in TripContext (files text, AI summaries, itinerary, links, chat history, receipts, preferences).
- Site scope: Global knowledge base via Perplexity/OpenAI browsing functions; internal search function (populate-search-index + search edge function) for on-site objects.
- UI: Show citations and badges (e.g., from files vs web); allow “Add to Trip” action on results where applicable.

12. Implementation Phases
- Phase 1 (Security Hardening): JWT enablement on sensitive edge functions, signed URLs for uploads, input sanitization in UI forms.
- Phase 2 (Data Model Wiring): Introduce trip_members table and wire TripContextService to Supabase; maintain UI parity.
- Phase 3 (Notifications): Hook DB triggers/edge functions to send push/in-app notifications on events (mentions, files/photos, polls, calendar).
- Phase 4 (Concierge Evolution): Migrate Perplexity to OpenAI; preserve API contract; add RAG from indexed trip files.
- Phase 5 (Recs Monetization): Sponsored placements and analytics dashboard.

13. OpenAI Migration Details
- Keep request shape: { message, tripContext, chatHistory, config, analysisType }.
- Map Perplexity → OpenAI:
  - Endpoint swap in edge function; transform params; remove Perplexity-specific fields (e.g., citations) or synthesize as needed.
  - Ensure same response shape: { success, content, usage, sentiment?, citations? }.
- Add OPENAI_API_KEY in Supabase secrets; do not expose publicly.

14. Risks and Mitigations
- Tightening profiles visibility may break consumer UI expecting public data → mitigate with UI checks and deferring policy change.
- Enabling JWT on functions requires authenticated calls → ensure client uses supabase.functions.invoke.
- Cost spikes with AI usage → add usage caps and fallbacks; consider caching.

15. Developer Checklist
- Confirm Supabase Auth URL config.
- Verify Edge Function logs after deployment.
- Validate RLS by testing with different users.
- Ensure private buckets use signed URLs.
- Run Lighthouse/CLS/SEO checks on major pages.
