# COUNCIL SUMMARY
The Twilio/Notifications council (comprising Twilio Expert, Backend Expert, and UX Expert) has completed a full audit of the current Chravel SMS implementation. We discovered that the foundation is remarkably solid—core templates, UI for phone number collection/E.164 normalization, and an asynchronous queue-based architecture (`notification_deliveries` processed by pg_cron) are already largely in place.

However, we uncovered several bugs in rate-limiting state persistence, incomplete Twilio environment variable integration (specifically around Messaging Service SIDs versus individual Sender IDs), and missing deep-link context in the templates. This spec serves as the blueprint to transition from the current "mock/partially implemented" state to a Day-1 Production Twilio implementation.

---

# AUDIT FINDINGS

## 1. Bugs & Incorrect Assumptions
- **Rate Limit Reset Bug:** The daily SMS limit (10 per day) check resets the counter in-memory when `last_sms_reset_date` is older than today, but previously failed to save this back to the database. (FIXED in a prior commit, but noted here for completeness).
- **Hardcoded Phone Number vs. Messaging Service:** The system assumes a single `TWILIO_PHONE_NUMBER` for all outbound messages. For global delivery (and US A2P 10DLC compliance), this will fail at scale. We must use a Twilio Messaging Service SID (`TWILIO_MESSAGING_SERVICE_SID`).
- **`sms_opt_in` Fallback:** The previous assumption was that if a user had an unverified row in `sms_opt_in`, SMS delivery should entirely abort. It has been patched to fall back to `notification_preferences.sms_phone_number` if unverified, but we need to eventually formalize a real Twilio Verify flow.

## 2. Missing Idempotency & Queue Resilience
- **Missing Delivery Lock/Idempotency:** When `dispatch-notification-deliveries` runs, it selects rows where `status = 'queued'`. Under heavy load (or if pg_cron fires concurrently due to a manual invoke + cron), two edge functions could pick up the same row.
  - **Fix:** Update the query to `SELECT ... FOR UPDATE SKIP LOCKED` or use a Supabase RPC to atomic-claim a batch of delivery IDs before passing them to the edge function.
- **Dead-letter Queue (DLQ):** Rows that fail Twilio API checks are marked `status = 'failed'`, but there is no exponential backoff or max-retry threshold.
  - **Fix:** Ensure `attempts` are incremented and a `next_attempt_at` is scheduled using exponential backoff up to a `max_attempts` (e.g., 3).

## 3. RLS and Permission Edge Cases
- **Archived/Deleted Trips:** The background dispatcher must join `trips` to ensure the trip is not archived or soft-deleted before sending. Currently, it just fetches the name.
  - **Fix:** Filter out notifications for trips where `status = 'archived'`.
- **Removed Members:** The system queues the notification at the time of the event. If a member is removed *between* the queue time and the cron run (e.g., due to quiet hours deferral), they shouldn't get the text.
  - **Fix:** The dispatcher needs a runtime `is_trip_member` validation step right before hitting the Twilio API.

---

# SMS TEMPLATE LIBRARY

All templates adhere to a strict character limit to avoid multi-segment billing where possible. The system defaults to US Eastern Time if no timezone preference is set. Deep links use `https://chravel.app/...` fallback logic.

| Type | Trigger | Template (Exact Copy) | Example | Recipient Rules |
|------|---------|-----------------------|---------|-----------------|
| **Broadcasts** | Organizer posts a new broadcast | `Chravel: Broadcast in {TripName} from {SenderName}: "{Preview}". View: {DeepLink}` | "Chravel: Broadcast in NYC 2026 from Alice: 'Meet in lobby at 7!'. View: chrv.link/b1" | All trip members with SMS enabled. |
| **Calendar (New/Edit)** | Event created or time updated | `Chravel: {EventName} in {TripName} is at {Time}. Details: {DeepLink}` | "Chravel: Dinner at Carbone in NYC 2026 is at 8:00 PM. Details: chrv.link/e3" | Event attendees / All members |
| **Polls (Created)** | Organizer creates a poll | `Chravel: New poll in {TripName}: "{PollQuestion}". Vote now: {DeepLink}` | "Chravel: New poll in NYC 2026: 'Where should we eat?'. Vote now: chrv.link/p2" | All trip members |
| **Tasks (Assigned)** | Task is explicitly assigned to user | `Chravel: You were assigned a task in {TripName}: "{TaskTitle}". View: {DeepLink}` | "Chravel: You were assigned a task in NYC 2026: 'Book flight'. View: chrv.link/t4" | Assignee only |
| **Base Camp (Update)** | Trip base camp location changes | `Chravel: Basecamp updated for {TripName}: {Location}. Directions: {DeepLink}` | "Chravel: Basecamp updated for NYC 2026: Marriott Marquis. Directions: chrv.link/bc" | All trip members |
| **Payments (Request)** | User requests split payment | `Chravel: {SenderName} requested {Currency}{Amount} for {TripName}. Pay: {DeepLink}` | "Chravel: Bob requested $45 for NYC 2026. Pay: chrv.link/pay" | Debtors only |
| **Join Request** | User requests to join private trip | `Chravel: {SenderName} requested to join {TripName}. Review: {DeepLink}` | "Chravel: Charlie requested to join NYC 2026. Review: chrv.link/req" | Trip Admins only |

*Note: Short links (`chrv.link`) are recommended for Twilio delivery to preserve character counts, but standard full URLs can be used for MVP.*

---

# TRIGGER MATRIX

*Determines whether an action is Explicit (Frontend invokes function directly) or Implicit (Database trigger).*

| Event | Ingestion Method (MVP) | Justification |
|-------|------------------------|---------------|
| Broadcast | Database Trigger | Creating a broadcast is a single row insert. Perfect for DB trigger to enqueue delivery. |
| Payments | Explicit Edge Function | Payments involve Stripe APIs, complex math, and multiple debtor rows. Better handled via explicit function. |
| Chat Mention | Explicit Edge Function | DB trigger on every chat message is too noisy. The chat edge function should parse mentions and explicitly queue. |
| Calendar Event | Database Trigger | Clean row insert/update on `trip_events`. |
| Task Assignment | Database Trigger | Clean row insert/update on `trip_tasks`. |

---

# DAY-ONE IMPLEMENTATION PLAN (MOCK → TWILIO LIVE)

### Step 1: Environment & Twilio Setup
1. Create a **Twilio Messaging Service** to pool phone numbers and handle automatic geographic routing/Sticky Sender.
2. Register an A2P 10DLC Campaign (US) to ensure messages aren't flagged as spam.
3. Update Supabase Edge Secrets:
   - Remove `TWILIO_PHONE_NUMBER`
   - Add `TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxx`
4. Refactor `sendSms` inside `dispatch-notification-deliveries/index.ts` to accept `MessagingServiceSid` instead of `From`.

### Step 2: Idempotency & Queue Resilience
1. Create a Supabase RPC `claim_notification_deliveries(batch_size int)` that does:
   ```sql
   UPDATE notification_deliveries
   SET status = 'processing', updated_at = NOW()
   WHERE id IN (
     SELECT id FROM notification_deliveries
     WHERE status = 'queued' AND next_attempt_at <= NOW()
     ORDER BY created_at ASC LIMIT batch_size
     FOR UPDATE SKIP LOCKED
   ) RETURNING *;
   ```
2. Update the `dispatch-notification-deliveries` edge function to call this RPC instead of a standard `SELECT`.

### Step 3: Deep Link Generation
1. Implement a lightweight URL shortener or rely on the UI routing. (MVP: append the UUID `https://chravel.app/trip/{tripId}/broadcasts/{broadcastId}`).
2. Update `supabase/functions/_shared/smsTemplates.ts` to generate and append the `{DeepLink}` based on the notification metadata payload.

### Step 4: Opt-outs (Compliance)
1. Twilio handles `STOP`, `UNSTOP`, `HELP` automatically via the Messaging Service.
2. Setup a Twilio Webhook pointing to a new edge function `twilio-webhook` that listens for `OptOutType`. If a user texts STOP, the webhook updates `notification_preferences.sms_enabled = false`.

---

# QA PLAN

**Staging / Testing Strategy:**
- Do not use real phone numbers in local dev. Twilio provides "Magic" test credentials (`TWILIO_TEST_ACCOUNT_SID` and `TWILIO_TEST_AUTH_TOKEN`) that return success without actually sending a network request or billing your account.
- **QA Step 1 (Unit):** Run the edge function locally using Deno test with mock Twilio responses to ensure formatting and rate-limits work.
- **QA Step 2 (Integration):** Set a test user in Staging to use your personal cell phone number. Trigger a broadcast.
- **QA Step 3 (Idempotency):** Force the `dispatch-notification-deliveries` cron job to run 5 times simultaneously. Verify via `notification_logs` that the user only received exactly ONE text message.
- **QA Step 4 (Quiet Hours):** Set the test user's quiet hours to the current time. Trigger an event. Verify `notification_deliveries` shows `status = 'queued'` and `next_attempt_at` is pushed to the future.
- **QA Step 5 (Opt-out):** Reply "STOP" to the received text. Verify the webhook fires and updates the database row.