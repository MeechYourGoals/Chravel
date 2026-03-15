# Chravel Recommendations Page — Deep Audit & Productionization Plan

---

## 1. CURRENT STATE AUDIT

### Audit Summary Table

| Surface / Component | Current Behavior | Data Source | Real or Mock? | Reusable As-Is? | Needs Refactor? | Notes |
|---|---|---|---|---|---|---|
| `ChravelRecsPage.tsx` | Renders featured places grid + saved recs | Hardcoded TS arrays | **MOCK** | Yes (layout/UX) | Data layer swap needed | Good responsive layout, premium feel |
| `RecommendationCard.tsx` | Image carousel, badges, CTA, save | Props from mock data | **MOCK data, REAL component** | Yes | Minor: add impression tracking | Sponsored badge, promo overlay already built |
| `SavedRecommendations.tsx` | Lists user saves, add-to-trip flow | Supabase `saved_recommendations` | **REAL** | Yes | No | Auth-gated, works with real DB |
| `savedRecommendationsService.ts` | CRUD for saves, add-to-trip via `trip_links` | Supabase | **REAL** | Yes | No | Handles unique constraints properly |
| `useRecommendations.ts` | Returns filtered hardcoded recs | `src/data/recommendations/` | **MOCK** | No | Replace with API fetch | Pure memoization, no loading/error states |
| `useLocationFilteredRecommendations.ts` | Filters hardcoded recs by city + type | `src/data/recommendations/` | **MOCK** | No | Replace with API fetch | Only shows `isSponsored` items |
| `useSavedRecommendations.ts` | Fetches/toggles saves from Supabase | Supabase | **REAL** | Yes | No | Proper auth gating |
| `src/data/recommendations/*.ts` | 21 hardcoded items (hotels, restaurants, activities, tours, experiences, transport) | Static TS files with imported PNGs | **MOCK** | No (demo only) | Delete or move to seed/demo | All `isSponsored: true`, all Miami-centric |
| `Recommendation` type (`types.ts`) | Interface with type, rating, price, sponsor fields | TypeScript | **REAL design** | Partially | Extend for production fields | Missing: source_id, campaign_id, organic flag |
| `AdvertiserDashboard.tsx` | Campaign CRUD, analytics, settings | Supabase (real tables) + mock data in demo | **HYBRID** | Yes | No | Real tables exist: `advertisers`, `campaigns`, `campaign_targeting`, `campaign_analytics` |
| `AdvertiserService.ts` | Full CRUD for advertisers + campaigns + analytics tracking | Supabase | **REAL** | Yes | Minor extensions | `getActiveCampaigns()` with targeting filter already exists |
| `campaigns_public` view | Strips sensitive fields for public display | Supabase view | **REAL** | Yes | No | Already designed for safe public consumption |
| Category tabs / filters | 7 tabs: All, Hotels, Dining, Activities, Tours, Experiences, Transport | Client-side state | **REAL component** | Yes | No | Responsive, scroll on mobile |
| City search | Text search filtering by city/location | Client-side filter | **REAL component** | Yes | Connect to backend query | Should become trip-aware |
| Mobile nav (`/recs` tab) | Gated behind `comingSoon: !isAppPreview` | Demo mode store | **DEMO GATE** | Yes | Remove gate when ready | Compass icon, proper nav position |
| Telemetry system | PostHog + console providers, auth/trip/place events | `src/telemetry/` | **REAL** | Yes | Add recommendation events | Zero recommendation events defined today |
| Recommendation analytics | None on user-facing side | N/A | **MISSING** | N/A | Build | Campaign analytics exist on advertiser side only |

### What Already Exists in Supabase (Real Tables)

| Table | Purpose | Status |
|---|---|---|
| `advertisers` | Advertiser profiles | Real, functional |
| `campaigns` | Campaign definitions with images, tags, destination, budget, status | Real, functional |
| `campaign_targeting` | Age, gender, interest, location, trip_type targeting per campaign | Real, functional |
| `campaign_analytics` | Impression/click/conversion events | Real, functional |
| `saved_recommendations` | User-saved recs with full data JSON blob | Real, functional |
| `trip_links` | Links added to trips (recs go here via `category='recommendation'`) | Real, functional |
| `campaigns_public` | View stripping sensitive campaign data | Real, functional |

### What Does NOT Exist Yet

- **No `recommendation_items` table** — no inventory of organic recommendations
- **No recommendation ranking/scoring service** — everything is hardcoded order
- **No impression/click tracking for recommendations** — only campaign_analytics exists
- **No trip-context enrichment** — the page doesn't know which trip you're planning
- **No organic vs sponsored distinction in practice** — all 21 mock items are `isSponsored: true`
- **No recommendation telemetry events** defined
- **No admin CMS for managing recommendation inventory**
- **No connection between campaigns and the recs page** — advertiser campaigns and the recs page are completely disconnected systems
- **No moderation queue**
- **No frequency caps or fatigue controls**

### Trip Context Signals Available (from `trips` table)

These fields already exist and can power trip-aware targeting:
- `destination` (string) — e.g., "Miami, FL"
- `basecamp_name`, `basecamp_address`, `basecamp_latitude`, `basecamp_longitude` — precise location
- `trip_type` (string) — e.g., "birthday", "bachelor", "family", "business"
- `start_date`, `end_date` — travel window
- `capacity` — group size proxy
- `categories` (JSON) — trip categories

---

## 2. PRODUCT RECOMMENDATION

### What This Page Should Be

**A trip-aware discovery surface that blends curated organic recommendations with contextually relevant sponsored placements.**

It is NOT a generic ad wall. It is a **utility-first travel companion** that helps users discover genuinely useful places, experiences, and services for their specific trip — with monetization layered in as relevant, high-quality sponsored content that feels native.

### Who It Serves

1. **Trip planners** — users actively planning or on a trip who need dining, activity, transport, and lodging suggestions
2. **Trip groups** — members who want to browse and save/share options with their travel party
3. **Casual browsers** — users exploring a destination before committing to a trip

### What Problems It Solves

- "I'm going to Miami — what should I do/eat/book?"
- "We need a restaurant for 8 people near our hotel"
- "What's the best way to get from the airport?"
- "Are there any deals or promos for our destination?"

### Recommended Monetization Model

**Phase 1 (MVP):** Curated recommendations + affiliate links (Viator, Booking.com, OpenTable, etc.) — revenue on bookings/clicks

**Phase 2:** Manually-sold sponsored placements — flat-fee or CPC deals with local businesses/partners. Chravel team manages campaigns via existing AdvertiserDashboard.

**Phase 3:** Lightweight self-serve campaign creation (already partially built) + CPC billing + reporting

**Phase 4 (only if justified by engagement data):** Programmatic optimization, advanced targeting, A/B ranking

### How to Avoid Ruining UX

- **Quality threshold**: Only show recommendations above a minimum rating (4.0+) or editorially vetted
- **Relevance gate**: Sponsored content must match destination + category context or it doesn't appear
- **Clear labeling**: "Sponsored" badge (already built) must always be visible — never deceptive
- **Density cap**: Max 1 sponsored card per 3 organic cards in any view
- **User feedback**: "Not interested" / hide controls to train relevance
- **Fallback inventory**: If no good sponsored content exists for a destination, show organic only — never fill with irrelevant ads

---

## 3. SYSTEM ARCHITECTURE

### A. Data Model — New Tables Needed

```
recommendation_items (organic inventory)
├── id (uuid, PK)
├── type ('hotel' | 'restaurant' | 'activity' | 'tour' | 'experience' | 'transportation')
├── title (text)
├── description (text)
├── location (text)
├── city (text)
├── country (text)
├── coordinates (point or lat/lng columns)
├── rating (numeric)
├── price_level (1-4)
├── images (jsonb[])
├── tags (text[])
├── external_link (text) — booking/affiliate URL
├── affiliate_provider (text, nullable) — 'viator', 'opentable', etc.
├── affiliate_id (text, nullable) — partner's item ID
├── source ('curated' | 'api' | 'partner_feed' | 'user_submitted')
├── is_active (boolean)
├── metadata (jsonb) — flexible extension field
├── created_at, updated_at
└── created_by (uuid, FK to profiles) — admin who added it
```

```
recommendation_impressions
├── id (uuid, PK)
├── item_id (uuid, FK → recommendation_items OR campaign_id)
├── item_type ('organic' | 'sponsored')
├── user_id (uuid, nullable)
├── trip_id (uuid, nullable)
├── surface ('recs_page' | 'trip_detail' | 'concierge' | 'home')
├── position (int) — rank position shown
├── created_at
```

```
recommendation_clicks
├── id (uuid, PK)
├── impression_id (uuid, FK → recommendation_impressions)
├── action ('view' | 'save' | 'book' | 'external_link' | 'add_to_trip' | 'hide')
├── created_at
```

```
recommendation_feedback
├── id (uuid, PK)
├── user_id (uuid)
├── item_id (uuid)
├── item_type ('organic' | 'sponsored')
├── feedback_type ('not_interested' | 'hide' | 'report' | 'save' | 'love')
├── created_at
```

### Existing Tables to Reuse (No Changes Needed)

- `campaigns` — sponsored inventory (already has images, tags, destination_info, status, dates, budget)
- `campaign_targeting` — targeting rules (already has locations, trip_types, interests)
- `campaign_analytics` — event tracking for campaigns
- `advertisers` — advertiser profiles
- `saved_recommendations` — user saves (extend `rec_id` to support UUID for organic items)
- `trip_links` — add-to-trip flow
- `campaigns_public` — safe public view

### B. Core Services / Functions

| Service | Purpose | Location |
|---|---|---|
| `recommendationService.ts` | Fetch organic + sponsored recs, blended and ranked | `src/services/` |
| `useRecommendations.ts` (refactored) | React hook wrapping service, with loading/error states | `src/hooks/` |
| `recommendation-feed` Edge Function | Server-side blending of organic + sponsored inventory with targeting | Supabase Edge Functions |
| `track-recommendation-event` Edge Function | Log impressions/clicks server-side (prevents client manipulation) | Supabase Edge Functions |
| `increment_campaign_stat` RPC | Already exists — increment impression/click/conversion counters | Supabase RPC |

### C. Admin Tooling Needs

- **Recommendation CMS page** — admin UI to add/edit/deactivate organic recommendations (CRUD on `recommendation_items`)
- **Bulk import** — CSV/JSON upload for batch adding recommendations per city
- **Moderation queue** — review user-submitted or API-imported items before publishing
- **Can reuse**: Existing AdvertiserDashboard patterns for campaign management

### D. Advertiser Tooling (Already Partially Built)

The existing `AdvertiserDashboard` + `AdvertiserService` already supports:
- Advertiser onboarding
- Campaign CRUD with images, tags, targeting
- Campaign status management (draft → active → paused → ended)
- Analytics tracking (impressions, clicks, conversions)
- Image upload to Supabase storage

**Gaps to fill:**
- No billing/invoicing system
- No budget enforcement (daily/total caps exist in schema but aren't enforced)
- No approval/moderation before campaigns go live (auto-active today)
- No connection between campaigns and the recs page display

### E. Recommendation Ranking Logic

**MVP (Rule-Based):**
1. Filter by destination match (campaign `destination_info.location` matches trip `destination`)
2. Filter by category match (campaign `tags` match selected tab)
3. Filter by date validity (`start_date` ≤ now ≤ `end_date`)
4. Filter by status (`active` only)
5. Score: `base_score = rating * 0.4 + recency * 0.2 + saves_count * 0.2 + click_rate * 0.2`
6. Blend: Interleave 1 sponsored per 3 organic, sorted by score within each pool
7. Deduplicate: Never show the same recommendation twice

**Future (ML-Enhanced):**
- User embedding from save/click history
- Collaborative filtering ("users who saved X also saved Y")
- Contextual bandit for sponsored slot optimization
- Trip-graph features (group composition, trip stage, itinerary gaps)

### F. Analytics / Attribution

**Events to add to telemetry system:**
- `recommendation_page_viewed` — surface, trip_context
- `recommendation_viewed` — item_id, item_type, position, surface
- `recommendation_clicked` — item_id, action (save/book/external/add_to_trip)
- `recommendation_hidden` — item_id, reason
- `recommendation_filter_applied` — filter_type, value
- `recommendation_search` — query, results_count

**Attribution:**
- Last-click attribution for conversions
- 7-day click window for affiliate attribution
- Server-side impression logging (Edge Function) to prevent gaming

### G. Privacy / Compliance / Consent

**Safe signals (no consent needed beyond ToS):**
- Trip destination, dates, type, group size — user explicitly provided these
- In-app behavior (saves, clicks, filter usage) — first-party product behavior
- Basecamp location — explicitly set by user

**Signals to AVOID:**
- Device location tracking without explicit opt-in
- Cross-app behavioral targeting
- Age/gender inference for targeting
- Sensitive category targeting (health, religion, politics)
- Re-identification from aggregated trip data
- Sharing trip data with advertisers (only aggregate reporting)

**Requirements:**
- Sponsored content must be clearly labeled (already built)
- Users must be able to hide/dismiss any recommendation
- No user PII shared with advertisers — only aggregate campaign metrics
- Affiliate links should have proper disclosure
- GDPR/CCPA: user data deletion must cascade to `recommendation_feedback`, `recommendation_impressions`, etc.

### H. Operational Workflows

1. **Content curation**: Admin adds organic recs per destination via CMS → reviewed → published
2. **Campaign activation**: Advertiser creates campaign → (future: moderation review) → goes live → appears in relevant feeds
3. **Performance review**: Weekly report on engagement, CTR, save rates per destination
4. **Stale content**: Cron job flags items with expired dates or consistently low engagement for review

---

## 4. TARGETING + RANKING STRATEGY

### MVP Targeting Logic

```
For a user viewing the Recs page:
1. If user has an active/upcoming trip:
   a. Get trip.destination, trip.trip_type, trip.start_date, trip.end_date
   b. Filter organic recs WHERE city ILIKE trip.destination
   c. Filter campaigns WHERE destination_info->>'location' ILIKE trip.destination
      AND status = 'active'
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW())
      AND (trip_types IS NULL OR trip.trip_type = ANY(trip_types))
   d. Score and rank within each pool
   e. Interleave: [organic, organic, organic, sponsored, organic, organic, organic, sponsored, ...]

2. If no active trip (cold start):
   a. Show editorially curated "trending destinations" organic content
   b. Show only globally-targeted campaigns (no destination restriction)
   c. Prompt user to create/select a trip for personalized recs
```

### Trip-Aware Targeting (How It Works)

The key insight: **Chravel already has rich trip context that most travel apps don't.** The user has told you where they're going, when, with how many people, and what kind of trip it is. This is the best possible targeting signal — it's explicit, first-party, and high-intent.

| Signal | Source | How to Use |
|---|---|---|
| Destination city | `trips.destination` | Filter recs to matching city |
| Basecamp coordinates | `trips.basecamp_latitude/longitude` | Sort by proximity |
| Trip dates | `trips.start_date/end_date` | Filter seasonal/time-sensitive offers |
| Trip type | `trips.trip_type` | Boost relevant categories (bachelor → nightlife, family → activities) |
| Group size | `trips.capacity` | Filter group-friendly venues |
| Saved places | `saved_recommendations` | "More like this" / deduplication |

### Organic vs Sponsored Blending Rules

1. Organic recs always fill first — sponsored content supplements, never replaces
2. Max 1 sponsored card per 3 organic cards (25% cap)
3. If < 3 organic recs exist for a destination, show 0 sponsored (avoid "all ads" experience)
4. Sponsored cards must pass relevance gate: destination match + category match + active + date valid
5. Within sponsored pool, rank by: relevance score > recency > budget remaining (future)

### Frequency Caps

- Max 3 impressions of same sponsored campaign per user per day
- Max 10 impressions of same campaign per user per week
- If user hides a campaign → never show again

### Cold Start / Empty States

- **No trip**: Show curated trending destinations + "Create a trip for personalized recommendations"
- **Trip with unknown destination**: Show "Set your destination to get local recommendations"
- **Destination with no inventory**: Show "We're adding recommendations for [city] soon! Try the AI Concierge for instant suggestions."
- **No sponsored inventory**: Show organic only — never show a worse experience because ads are missing

### User Feedback Loops

- Save → boost similar items
- Click external link → signal of intent/quality
- Hide / "Not interested" → suppress item + down-weight similar
- Add to trip → strongest positive signal

---

## 5. ADVERTISER / PARTNER OPERATING MODEL

### Initial Model: Managed Service (Phase 1-2)

- Chravel team manually creates campaigns on behalf of partners
- Partners provide: images, description, offer details, target destinations, external URL
- Chravel team sets targeting, manages activation/deactivation
- Reporting: Chravel sends monthly performance summary (impressions, clicks, saves)
- Billing: Flat monthly fee or CPC invoiced manually

### Assets Partners Provide

- 1-5 high-quality images (already supported)
- Title + description + discount/offer details (already supported)
- Target destination(s) and categories (already supported via `campaign_targeting`)
- External booking/reservation URL
- Campaign duration preference

### Approval Workflow (Phase 2+)

1. Campaign submitted → status: `draft`
2. Admin reviews images, copy, targeting → approves or requests changes
3. Approved → status: `active` → appears in feeds
4. Underperforming → admin pauses or suggests optimization
5. Ended → status: `ended` → archived

### Quality Guardrails

- Minimum image resolution requirements
- No misleading discount claims
- Destination must be a real, served market
- All external links must resolve (automated check)
- CTR < 0.1% after 1000 impressions → auto-flag for review
- User hide rate > 5% → auto-pause for review

---

## 6. MVP BUILD RECOMMENDATION

### What to Build Now (Phase 1 — "Curated Real")

1. **`recommendation_items` table** in Supabase — organic inventory
2. **Simple admin CMS** — CRUD page for adding/editing recommendations (super admin only)
3. **Seed initial inventory** — Convert the 21 mock items into real DB records, add 20-30 more for 2-3 cities
4. **Refactor `useRecommendations`** — Fetch from Supabase instead of hardcoded data
5. **Trip-aware filtering** — If user has an active trip, auto-filter to trip destination
6. **Add recommendation telemetry events** — page_viewed, item_viewed, item_clicked, item_saved
7. **Remove demo gate** on mobile nav — make `/recs` accessible to all authenticated users
8. **Connect campaigns to recs page** — Use `AdvertiserService.getActiveCampaigns()` to fetch sponsored content and blend into feed

### What to Fake Manually at First

- Organic recommendation inventory — manually curated by team for top 5-10 destinations
- Sponsored campaigns — created by Chravel team on behalf of partners via existing AdvertiserDashboard
- Analytics reporting — manual queries / dashboard, not self-serve

### What NOT to Build Yet

- Self-serve advertiser onboarding for external partners
- Budget enforcement / billing / invoicing
- ML-based ranking or personalization
- Recommendation API for third-party consumption
- Push notifications for new recommendations
- User-submitted recommendations
- Real-time pricing integration
- A/B testing framework for ranking
- Collaborative filtering
- Programmatic ad exchange integration

### Data Sources for Phase 1

- Internal curation (admin CMS) — primary
- Affiliate link generation (Viator, Booking.com partner programs) — secondary
- Google Places API — for enrichment (ratings, photos, hours) but not primary inventory

### How to Test User Engagement

1. Track: page visits, filter usage, save rate, external link click rate, add-to-trip rate
2. Success metrics:
   - **Adoption**: >15% of active trip users visit recs page at least once
   - **Engagement**: >5% save rate (saves / impressions)
   - **Utility**: >2% add-to-trip rate
   - **Quality**: <3% hide rate on organic content
3. If engagement is strong → proceed to Phase 2 (sponsored placements)
4. If engagement is weak → improve inventory quality and trip-context integration before monetizing

---

## 7. IMPLEMENTATION PLAN

### Phase A: Database & Data Layer (Week 1)

**Supabase changes:**
- Create `recommendation_items` table with RLS (read: authenticated, write: super admin only)
- Create `recommendation_impressions` table with RLS (insert: authenticated, read: admin only)
- Create `recommendation_clicks` table with RLS (insert: authenticated, read: admin only)
- Create `recommendation_feedback` table with RLS (user owns their feedback)
- Extend `saved_recommendations.rec_id` to support both int (legacy mock) and UUID (new items) — or migrate to UUID
- Create `recommendation_items_public` view (strips admin-only fields)

**Migration script:**
- Convert 21 mock items from `src/data/recommendations/` into `recommendation_items` INSERT statements
- Seed additional inventory for 2-3 more cities

**Edge Functions:**
- `get-recommendations`: Fetch blended organic + sponsored feed with trip context
- `track-recommendation-event`: Log impression/click server-side

**No secrets needed for Phase A.**

### Phase B: Service & Hook Refactor (Week 1-2)

**Code changes:**
- `src/services/recommendationService.ts` — New service: fetch from Supabase, blend with campaigns
- `src/hooks/useRecommendations.ts` — Refactor: use TanStack Query, add loading/error states
- `src/hooks/useLocationFilteredRecommendations.ts` — Refactor: trip-aware, fetch from backend
- `src/data/recommendations/types.ts` — Extend `Recommendation` type for production fields (source, affiliate, organic flag)

**Files to modify:**
- `src/pages/ChravelRecsPage.tsx` — Wire to new hooks, add trip selector/context, loading states
- `src/components/RecommendationCard.tsx` — Add impression tracking on mount, click tracking on CTA

### Phase C: Admin CMS (Week 2)

**New page:** `src/pages/RecommendationAdmin.tsx`
- Table view of all recommendation items
- Create/edit form (reuse patterns from CampaignCreator)
- Image upload (reuse `AdvertiserService.uploadCampaignImage` pattern)
- City/category filters
- Active/inactive toggle
- Super admin gated

**Route:** `/admin/recommendations` (protected, super admin only)

### Phase D: Campaign → Recs Page Connection (Week 2-3)

**Code changes:**
- Call `AdvertiserService.getActiveCampaigns({ location: tripDestination })` in recommendation feed
- Map `CampaignWithTargeting` to `Recommendation` display format
- Apply blending rules (1 sponsored per 3 organic)
- Add impression/click tracking for sponsored items (use existing `AdvertiserService.trackEvent`)

### Phase E: Telemetry (Week 2)

**Code changes:**
- Add recommendation event types to `src/telemetry/types.ts`
- Add event helpers to `src/telemetry/events.ts`
- Instrument `ChravelRecsPage`, `RecommendationCard`, `SavedRecommendations`

**Events:**
- `recommendation_page_viewed`
- `recommendation_item_viewed` (with position)
- `recommendation_item_clicked` (with action type)
- `recommendation_item_saved`
- `recommendation_item_hidden`
- `recommendation_filter_applied`
- `recommendation_search`

### Phase F: Remove Demo Gate (Week 3)

**Code changes:**
- `src/components/mobile/MobileBottomNav.tsx` — Remove `comingSoon: !isAppPreview` gate
- `src/data/recommendations/` — Archive or delete hardcoded data files (keep as demo fallback if needed)
- Clean up `useLocationFilteredRecommendations.ts` usage in home page `TripGrid`

### Phase G: Privacy & Cleanup (Week 3)

- Ensure `recommendation_impressions` RLS prevents users from reading others' data
- Ensure no PII leaks in recommendation_impressions (no email, no name)
- Add cascade delete for user account deletion (GDPR)
- Add "Not interested" / hide action to RecommendationCard
- Add disclosure text for affiliate links

**No third-party services required for MVP beyond what already exists (Supabase, PostHog).**

---

## 8. RISKS / TRADEOFFS

### Product Risks
- **Low inventory quality** → users don't trust recommendations → feature becomes unused
  - Mitigation: Start with manually curated high-quality inventory for top cities only
- **Cold start for new destinations** → empty states frustrate users
  - Mitigation: Clear empty state messaging + AI Concierge fallback
- **Monetization too early** → ads degrade trust before organic value is established
  - Mitigation: Phase 1 is organic-only; sponsored content only after engagement metrics prove user value

### Engineering Risks
- **Saved recommendations migration** — current `rec_id` is `number` (from mock data IDs), production items will use UUID
  - Mitigation: Add UUID `item_id` column, keep `rec_id` for backward compat during transition
- **Two disconnected recommendation systems** (hardcoded recs + campaigns) need unification
  - Mitigation: Single `recommendationService` that abstracts both sources behind one interface
- **Edge Function cold starts** for recommendation feed
  - Mitigation: Keep client-side fallback; use Edge Function for server-side blending only when needed

### Monetization Risks
- **Affiliate revenue may be small** at Chravel's current scale
  - Mitigation: Affiliate is a bonus, not the business model — the real value is direct sponsored placements
- **No billing system** means manual invoicing for partners
  - Mitigation: Acceptable for Phase 1-2 with < 10 partners
- **Budget enforcement not built** — campaigns could overspend
  - Mitigation: Manual monitoring; build enforcement in Phase 3

### Operational Risks
- **Content curation is manual labor** — team must maintain inventory per city
  - Mitigation: Start small (5-10 cities), measure engagement before expanding
- **Campaign moderation** — bad actors could submit low-quality campaigns
  - Mitigation: Phase 1-2 is managed service (Chravel creates campaigns), no self-serve risk

### What to Defer
- ML ranking and personalization
- Self-serve advertiser portal for external partners
- Real-time pricing / availability checks
- Push notification campaigns
- A/B testing framework
- Programmatic ad exchange
- International compliance (GDPR DPA with ad partners) — not needed until external advertisers

---

## 9. UX / TRUST CRITIQUE

### What Looks Great (Preserve)
- **Premium card design** — image carousel, gold accents, sponsored badges look native and high-quality
- **Category tabs** — clean, responsive, familiar pattern
- **Save + Add to Trip flow** — real Supabase integration, works well
- **City search** — simple and functional
- **Sponsored badge styling** — clear but not ugly, doesn't scream "AD"

### What's Misleading (Demo Honesty Gaps)
- **All 21 items are `isSponsored: true`** — the page looks like a pure ad surface. In production, organic content must dominate (75%+ of feed)
- **"Featured Places" header** — implies editorial curation, but it's all hardcoded. Fine as a concept, but needs real inventory to back it up
- **Rating and "X people recommend" data** — completely fabricated. Must come from real source (Google Places, or actual user saves count)
- **External links** go to real sites (Uber, Hotels.com) — but there's no affiliate attribution. These are free ads right now
- **Price levels** ($-$$$$) are made up — should come from real data or be removed
- **Distance ("0.5 mi from your hotel")** — fake, no real proximity calculation

### Improvements Needed
- **Trip context integration** — the page should know which trip you're planning and auto-contextualize
- **Empty state for "no trip"** — guide users to create a trip or search a destination
- **"Why am I seeing this?"** — light explainability for sponsored content builds trust
- **User feedback controls** — "Not interested" / hide should exist on every card
- **Organic content must exist** — can't launch with 100% sponsored-looking cards

---

## 10. MERGED RECOMMENDATION — PHASED ROADMAP

### Phase 0 (Now): Audit Complete
- This document

### Phase 1 (Weeks 1-3): Curated Real
- `recommendation_items` table + admin CMS
- Seed 50+ real items across 5 cities
- Refactor hooks to fetch from DB
- Add telemetry events
- Trip-aware filtering
- Remove demo gate
- **Monetization: affiliate links only**

### Phase 2 (Weeks 4-6): Sponsored Placements
- Connect `campaigns` to recs page feed
- Implement blending rules (1:3 sponsored:organic ratio)
- Impression + click tracking for campaigns
- Monthly reporting for partners (manual)
- **Monetization: manually-sold sponsorships (flat fee or CPC)**

### Phase 3 (Months 2-3): Campaign Operations
- Budget enforcement (daily/total caps)
- Frequency caps per user
- Campaign approval workflow (draft → review → active)
- Basic self-serve campaign editing for existing partners
- User feedback (hide/not interested) affecting feed
- **Monetization: CPC with budget caps**

### Phase 4 (Months 4+, only if engagement justifies):
- External advertiser self-serve onboarding
- Billing/invoicing system
- Advanced targeting (trip stage, group composition)
- ML ranking optimization
- AI Concierge integration (recommend from inventory)
- A/B testing for ranking algorithms

---

## KEY FILES REFERENCE

| File | Role | Action |
|---|---|---|
| `src/pages/ChravelRecsPage.tsx` | Main page | Refactor data layer |
| `src/components/RecommendationCard.tsx` | Card component | Add tracking, keep design |
| `src/components/SavedRecommendations.tsx` | Saved recs | Keep as-is |
| `src/hooks/useRecommendations.ts` | Data hook | Full refactor to Supabase |
| `src/hooks/useSavedRecommendations.ts` | Save hook | Keep as-is |
| `src/hooks/useLocationFilteredRecommendations.ts` | Filter hook | Refactor to trip-aware |
| `src/services/savedRecommendationsService.ts` | Save service | Minor: UUID support |
| `src/services/advertiserService.ts` | Campaign service | Reuse `getActiveCampaigns` |
| `src/data/recommendations/` | Mock data | Archive after migration |
| `src/types/advertiser.ts` | Campaign types | Reuse as-is |
| `src/telemetry/types.ts` | Event types | Add recommendation events |
| `src/telemetry/events.ts` | Event helpers | Add recommendation helpers |
| `src/components/mobile/MobileBottomNav.tsx` | Nav | Remove demo gate |
| `src/pages/AdvertiserDashboard.tsx` | Advertiser UI | Reuse patterns for admin CMS |
| `src/store/demoModeStore.ts` | Demo mode | Reference only |

---

## VERIFICATION PLAN

1. **After Phase 1**: Visit `/recs` → see items from `recommendation_items` table, not hardcoded data. Filter by category → correct results. Search by city → correct results. Save a recommendation → persists in Supabase. Check PostHog → recommendation events flowing.

2. **After Phase 2**: Create a campaign in AdvertiserDashboard with destination "Miami" → visit `/recs` with a Miami trip → see campaign card blended into organic feed with "Sponsored" badge. Click it → impression + click logged in `campaign_analytics`.

3. **Build gate**: `npm run lint && npm run typecheck && npm run build` must pass at every phase.
