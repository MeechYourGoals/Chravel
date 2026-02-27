# Domain Canon Map

This document defines the **Single Canonical Source of Truth** for every core domain concept in Chravel.
Any deviation from this map is considered technical debt or a bug.

**Legend:**
- 🟢 **Canonical**: The one true source.
- 🟡 **Cached/Derived**: Allowed for performance, but must invalidate on canonical change.
- 🔴 **Forbidden**: Ad-hoc local state or duplicate parallel storage.

---

## 1. Trip Core

| Concept | Canonical Storage | Canonical Computation (Read) | Write Path | Realtime |
|---|---|---|---|---|
| **Metadata** (Name, Dates, Dest) | DB: `trips` table | `TDAL.trip.getById(id)` | `TDAL.trip.update(id, data)` | Postgres `UPDATE` on `trips` |
| **Active State** (Archived/Hidden) | DB: `trips.is_archived`, `trips.is_hidden` | `TDAL.trip.getById(id)` | `TDAL.trip.archive(id)` | Postgres `UPDATE` |
| **Features** (Enabled Modules) | DB: `trips.enabled_features` (Array) | `TDAL.trip.getFeatures(id)` | `TDAL.trip.toggleFeature(id)` | Postgres `UPDATE` |

**Drift Risks:**
- `useTripDetail` vs `tripService.getTripById` sometimes return slightly different shapes.
- Demo mode mixing: `tripsData.ts` (local mock) vs DB. **Invariant:** Demo mode is a separate "universe" accessed via the same TDAL interface, never mixed.

---

## 2. Membership & Roles

| Concept | Canonical Storage | Canonical Computation (Read) | Write Path | Realtime |
|---|---|---|---|---|
| **Membership** (Who is in?) | DB: `trip_members` table | `TDAL.members.getMembers(id)` | `RPC: join_trip` or `invite_user` | Postgres `INSERT/DELETE` on `trip_members` |
| **Permissions** (What can they do?) | DB: `trip_roles` + `user_trip_roles` | `TDAL.permissions.can(user, action)` | `TDAL.permissions.assignRole` | Postgres `INSERT/UPDATE` on `user_trip_roles` |
| **Profile** (Name, Avatar) | DB: `profiles_public` | `TDAL.members.getMembers` (joined) | `ProfileService.update` | Postgres `UPDATE` on `profiles` |

**Drift Risks:**
- `trip_members` vs `trip_chat_messages` authors (chat participants != trip members). **Invariant:** Chat authors must be resolved against current `trip_members` for latest avatar/name.
- Local derived "isOrganizer" flags in UI components. **Invariant:** Always check `trip.created_by` or `trip_roles`.

---

## 3. Financials (Payments)

| Concept | Canonical Storage | Canonical Computation (Read) | Write Path | Realtime |
|---|---|---|---|---|
| **Expenses** | DB: `trip_payment_messages` | `TDAL.payments.getExpenses(id)` | `TDAL.payments.createExpense` | Postgres `INSERT` |
| **Splits** (Who owes what) | DB: `payment_splits` | `TDAL.payments.getSplits(id)` | `TDAL.payments.createExpense` (atomic) | Postgres `INSERT` |
| **Settlements** (Paid off?) | DB: `payment_splits.is_settled` | `TDAL.payments.getBalances(id)` | `TDAL.payments.settle(splitId)` | Postgres `UPDATE` |

**Drift Risks:**
- "Effective Travelers" for splitting: currently inferred ad-hoc in UI. **Refactor Target:** `getEffectiveMembersForPayments(tripId)`.
- Currency conversion rates: currently loose. **Invariant:** Stored in Base Currency (USD/EUR), converted at display time if needed.

---

## 4. Coordination (Calendar, Tasks, Polls)

| Concept | Canonical Storage | Canonical Computation (Read) | Write Path | Realtime |
|---|---|---|---|---|
| **Events** | DB: `trip_events` | `TDAL.calendar.getEvents(id)` | `TDAL.calendar.upsert` | Postgres `INSERT/UPDATE` |
| **Tasks** | DB: `trip_tasks` | `TDAL.tasks.getTasks(id)` | `TDAL.tasks.create` | Postgres `INSERT/UPDATE` |
| **Task Status** | DB: `task_status` | `TDAL.tasks.getTasks` (joined) | `TDAL.tasks.toggleComplete` | Postgres `INSERT/UPDATE` |
| **Polls** | DB: `trip_polls` | `TDAL.polls.getPolls(id)` | `TDAL.polls.create` | Postgres `INSERT/UPDATE` |
| **Votes** | DB: `trip_polls.options` (json) or separate table? | `TDAL.polls.getPolls` | `RPC: vote_on_poll` | Postgres `UPDATE` |

**Drift Risks:**
- "Winning Option" logic duplicated in UI. **Refactor Target:** Centralize "winner" derivation in TDAL.
- Task assignment: `task_assignments` table vs `assigned_to` columns. **Invariant:** Use `task_assignments` for multi-user assignment.

---

## 5. Places & Content

| Concept | Canonical Storage | Canonical Computation (Read) | Write Path | Realtime |
|---|---|---|---|---|
| **Saved Places** | DB: `trip_link_index` (parsed metadata) | `TDAL.places.getPlaces(id)` | `TDAL.places.saveFromChat` | Postgres `INSERT` |
| **Links** | DB: `trip_links` (Basecamp links) | `TDAL.links.getLinks(id)` | `TDAL.links.add` | Postgres `INSERT` |

**Drift Risks:**
- `trip_link_index` stores `og_description` which is parsed ad-hoc. **Refactor Target:** Structured columns for `lat`, `lng`, `google_place_id` to avoid regex parsing at runtime.

---

## 6. Settings & Preferences

| Concept | Canonical Storage | Canonical Computation (Read) | Write Path | Realtime |
|---|---|---|---|---|
| **Trip Settings** | DB: `trips` columns | `TDAL.settings.getTripSettings` | `TDAL.settings.update` | Postgres `UPDATE` |
| **User Prefs** | DB: `trip_member_preferences` | `TDAL.settings.getUserPrefs` | `TDAL.settings.updateUserPrefs` | Postgres `UPDATE` |
| **Notifications** | DB: `notification_preferences` | `TDAL.settings.getNotifPrefs` | `TDAL.settings.updateNotifPrefs` | Postgres `UPDATE` |

---

## 7. AI Concierge

| Concept | Canonical Storage | Canonical Computation (Read) | Write Path | Realtime |
|---|---|---|---|---|
| **Context** | **Computed Ephemeral** | `TDAL.concierge.buildContext(id)` | N/A (Read-only) | N/A |
| **Rate Limits** | DB: `concierge_usage` | `RateLimitService.check` | `RateLimitService.increment` | N/A |

**Drift Risks:**
- Concierge reading raw tables directly. **Invariant:** Concierge MUST use `TDAL.*` read methods to ensure it sees exactly what the user sees (respecting permissions/toggles).

---

## 8. Notifications

| Concept | Canonical Storage | Canonical Computation (Read) | Write Path | Realtime |
|---|---|---|---|---|
| **Queue** | DB: `notifications` | `TDAL.notifications.list` | `TDAL.notifications.enqueue` | Postgres `INSERT` |
| **Audience** | **Computed Ephemeral** | `resolveNotificationAudience(...)` | N/A | N/A |

**Invariant:**
- No "blast all members" calls in UI. Always pass through `resolveNotificationAudience` to respect "Quiet Hours" and "Muted" settings.
