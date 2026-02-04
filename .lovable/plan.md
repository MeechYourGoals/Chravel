
# SMS Notification System: Complete Implementation Plan

## Executive Summary

Twilio is **already integrated** in your edge function (`push-notifications/index.ts`) but several critical gaps prevent end-to-end functionality. This plan addresses all gaps to make SMS notifications fully testable today.

---

## Part 1: Current State Audit

### What is Already Implemented

| Component | Status | Location |
|-----------|--------|----------|
| Twilio SMS sender function | Complete | `supabase/functions/push-notifications/index.ts:160-211` |
| Notification preference gating | Complete | `supabase/functions/_shared/notificationUtils.ts` |
| Create-notification edge function | Complete | `supabase/functions/create-notification/index.ts:406-419` |
| SMS-eligible categories defined | Complete | broadcasts, payments, basecamp_updates, calendar_events, join_requests |
| UI for SMS toggle + phone input | Complete | `src/components/consumer/ConsumerNotificationsSection.tsx` |
| Database triggers for notifications | Complete | Broadcasts, mentions, tasks, payments, invites |

### What is Missing (Blocking SMS)

| Gap | Impact | Priority |
|-----|--------|----------|
| `sms_phone_number` column not in DB | UI saves phone but DB rejects it | CRITICAL |
| `notification_logs` table missing | SMS delivery not tracked | HIGH |
| Twilio secrets not in Supabase | Edge function will fail | CRITICAL |
| SMS message templates are generic | Poor UX (just "title: message") | MEDIUM |
| No SMS rate limiting | Risk of accidental spam | MEDIUM |
| Phone sign-in `verifyOtp` missing | Cannot complete OTP flow | LOW (separate feature) |

---

## Part 2: Implementation Plan

### Phase 1: Database Schema (Critical Path)

**Migration 1: Add Missing Columns and Tables**

```text
Files to Create/Modify:
- supabase/migrations/[timestamp]_sms_infrastructure.sql
```

The migration will:
1. Add `sms_phone_number` column to `notification_preferences`
2. Create `notification_logs` table with columns:
   - id, user_id, type (push/email/sms), title, body, recipient
   - external_id (Twilio SID), status (queued/sent/failed), error_message
   - sent_at, created_at
3. Add rate limiting columns:
   - `sms_sent_today` counter
   - `last_sms_sent_at` timestamp
4. Create index for efficient rate limit checks

### Phase 2: Add Twilio Secrets to Supabase

Since the secrets are NOT currently in Supabase (verified via fetch_secrets), you need to add them:

**Required Secrets:**
| Secret Name | Value |
|-------------|-------|
| TWILIO_ACCOUNT_SID | AC3a70e1cbd04c29d2faae3b79804b3f14 |
| TWILIO_AUTH_TOKEN | 6e1f6005711f717f4f4435a9e98862ea |
| TWILIO_PHONE_NUMBER | +18336055072  |

**Action:** Use the Lovable secret management tool to add these to your Supabase project.

### Phase 3: Enhanced SMS Delivery with Templates and Rate Limiting

**File: `supabase/functions/push-notifications/index.ts`**

Update the `sendSMSNotification` function to:

1. **Rate Limiting**: Check if user has exceeded 10 SMS/day before sending
2. **Message Templates**: Format messages based on notification type
3. **Error Handling**: Log failures with detailed error messages
4. **Delivery Tracking**: Update `notification_logs` with Twilio SID

**SMS Message Templates (under 160 chars):**

| Scenario | Template |
|----------|----------|
| Basecamp Update | `[Chravel] 📍 Basecamp changed for {trip}: {location}. Tap to view: {link}` |
| Join Request | `[Chravel] 👤 {name} wants to join {trip}. Review: {link}` |
| Payment Request | `[Chravel] 💰 {name} requested ${amount} for {trip}. Pay: {link}` |
| Urgent Broadcast | `[Chravel] 🚨 {trip}: {preview} {link}` |
| Calendar Reminder | `[Chravel] 🗓️ {event} starts soon in {trip}. Details: {link}` |

### Phase 4: Wire Up Existing Triggers to SMS

The current database triggers (e.g., `notify_on_broadcast`, `notify_on_basecamp_update`) call `send_notification()` which creates in-app notifications. Update the `send_notification` function to also invoke SMS delivery when:
- `sms_enabled = true`
- `sms_phone_number` is set
- Notification category is SMS-eligible
- Rate limit not exceeded

### Phase 5: Phone Number Sign-In (Optional/Separate)

**Recommendation: Defer to Post-MVP**

Reasons:
1. Phone sign-in requires Supabase Auth Phone Provider configuration (dashboard setting, not code)
2. Requires Twilio Verify API (different from Messaging API)
3. Need to implement `verifyOtp()` function and OTP input UI
4. Additional security considerations (rate limiting, abuse prevention)

If you want to enable it:
1. Go to Supabase Dashboard > Authentication > Providers > Phone
2. Enter Twilio credentials
3. I'll add `verifyPhoneOtp()` to `useAuth.tsx` and OTP input UI

---

## Part 3: Testing Checklist (Runnable Today)

### Prerequisites

1. Migration applied (sms_phone_number column exists)
2. Twilio secrets added to Supabase
3. Edge functions redeployed

### Test Cases

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Enable SMS | Settings > Notifications > Toggle SMS ON | Phone input modal appears |
| Save Phone | Enter +1XXXXXXXXXX, submit | Toast: "SMS notifications enabled" |
| Trigger Broadcast | As trip admin, send urgent broadcast | SMS received on phone within 30s |
| Check Logs | Query `notification_logs` table | Row with type='sms', external_id=Twilio SID |
| Disable SMS | Toggle SMS OFF | No SMS on next trigger |
| Rate Limit | Send 11 broadcasts rapidly | 11th SMS blocked, logged as rate-limited |

### Verification Commands

```sql
-- Check if phone number saved
SELECT sms_enabled, sms_phone_number FROM notification_preferences WHERE user_id = 'YOUR_USER_ID';

-- Check SMS delivery logs
SELECT * FROM notification_logs WHERE type = 'sms' ORDER BY created_at DESC LIMIT 10;
```

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_sms_infrastructure.sql` | DB schema for SMS |

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/push-notifications/index.ts` | Add rate limiting, templates, logging |
| `supabase/functions/_shared/notificationUtils.ts` | Add SMS template generator function |
| `supabase/functions/create-notification/index.ts` | Enhance SMS error handling |

### Deep Link URL Pattern

For SMS links, use: `https://chravel.lovable.app/trip/{trip_id}/{tab}`

Examples:
- Broadcast: `/trip/abc123/chat`
- Payment: `/trip/abc123/payments`
- Calendar: `/trip/abc123/calendar`

---

## Security Considerations

1. **Secrets**: Twilio credentials stored in Supabase secrets (server-side only)
2. **Phone Validation**: E.164 format enforced via database constraint
3. **Rate Limiting**: 10 SMS/user/day to prevent abuse
4. **Audit Trail**: All SMS attempts logged with status and errors

---

## Estimated Implementation Time

| Phase | Time |
|-------|------|
| Database migration | 15 min |
| Add Twilio secrets | 5 min |
| Update edge functions | 45 min |
| Testing | 30 min |
| **Total** | ~1.5 hours |

---

## Next Steps After Approval

1. I will create the database migration for `sms_phone_number` and `notification_logs`
2. Prompt you to add Twilio secrets via the secret management tool
3. Update the edge functions with rate limiting and message templates
4. Provide step-by-step testing instructions
