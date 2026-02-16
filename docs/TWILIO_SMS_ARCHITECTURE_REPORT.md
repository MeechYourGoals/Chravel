# Twilio SMS Architecture — Deep Dive Report

**Generated:** 2026-02-16  
**Scope:** Full Twilio integration, notification preferences, SMS delivery pipeline

---

## Executive Summary

The Chravel Twilio SMS system is **architecturally sound** with a well-designed delivery pipeline, but has several **disconnections and bugs** that prevent end-to-end testing. With the fixes in this report, the system can be made fully functional for production.

| Component | Status | Notes |
|-----------|--------|-------|
| Twilio API integration | ✅ Working | Both `push-notifications` and `dispatch-notification-deliveries` call Twilio correctly |
| Notification preferences UI | ✅ Working | ConsumerNotificationsSection, phone number modal |
| Database schema | ✅ Working | notification_preferences, notification_deliveries, notification_logs |
| SMS entitlement gating | ✅ Working | user_entitlements, user_roles, is_user_sms_entitled |
| SMS templates | ✅ Working | smsTemplates.ts with category-specific messages |
| **Direct send_sms path** | ⚠️ Never invoked | notificationService.sendSMSNotification exists but no UI calls it |
| **Dispatch rate limit** | ❌ Bug | In-memory reset not persisted; DB never updated on new day |
| **Phone E.164 normalization** | ⚠️ Incomplete | US numbers may not get +1 prefix; DB constraint requires + |
| **Test SMS flow** | ❌ Missing | No way to trigger a test SMS from the app |
| **sms_opt_in blocking** | ⚠️ Edge case | When sms_opt_in row exists but unverified, blocks even with notification_preferences |

---

## 1. Architecture Overview

### 1.1 Two Delivery Paths

```
Path A: Direct send_sms (push-notifications edge function)
  └─ Called via: supabase.functions.invoke('push-notifications', { action: 'send_sms', userId, message })
  └─ Used by: notificationService.sendSMSNotification() — but NO caller in codebase
  └─ Auth: JWT required
  └─ Phone source: notification_preferences.sms_phone_number OR sms_opt_in.phone_e164

Path B: Queued delivery (dispatch-notification-deliveries)
  └─ Trigger: INSERT into notifications → trigger_queue_notification_deliveries
  └─ Creates: notification_deliveries rows (push, email, sms) per notification
  └─ Dispatcher: Cron (pg_cron) or manual POST to dispatch-notification-deliveries
  └─ Auth: x-notification-secret header (when NOTIFICATION_DISPATCH_SECRET set)
  └─ Phone source: Same as Path A
```

### 1.2 Data Flow (Path B — Primary)

1. **Notification creation**  
   - `create-notification` (trip organizers), `event-reminders` (calendar), `join-trip`, `stripe-webhook`, `approve-join-request`, etc.  
   - Inserts into `notifications`.

2. **Trigger**  
   - `trigger_queue_notification_deliveries` creates 3 rows in `notification_deliveries` (push, email, sms) with `status = 'queued'`.

3. **Dispatch**  
   - `dispatch-notification-deliveries` runs (cron every minute or invoked by create-notification).  
   - For each queued SMS delivery:
     - Category enabled?
     - sms_enabled?
     - SMS entitlement (plan or admin)?
     - sms_opt_in (if exists): opted_in + verified?
     - sms_phone_number or phone_e164?
     - Rate limit (10/day)?
     - Quiet hours?
   - Calls Twilio API, updates delivery row, logs to `notification_logs`.

### 1.3 Key Tables

| Table | Purpose |
|-------|---------|
| `notification_preferences` | sms_enabled, sms_phone_number, category toggles, quiet hours |
| `notification_deliveries` | Per-channel delivery queue (push/email/sms) |
| `notification_logs` | Audit trail (sent, failed, skipped) |
| `sms_opt_in` | Optional strict compliance (verified + opted_in) |
| `user_entitlements` | Plan (frequent-chraveler, pro-*) for SMS gating |
| `user_roles` | enterprise_admin, super_admin bypass |

---

## 2. Component-by-Component Analysis

### 2.1 Edge Functions

| Function | Role | Twilio | Status |
|----------|------|--------|--------|
| `push-notifications` | send_sms, send_push, send_email | ✅ | Implemented, never called for SMS |
| `dispatch-notification-deliveries` | Process queued deliveries | ✅ | Implemented, used by cron + create-notification |
| `event-reminders` | Create calendar notifications | N/A | Creates notifications → triggers dispatch |
| `create-notification` | Trip-wide notifications | N/A | Inserts notifications → invokes dispatch |

### 2.2 Frontend

| Component | Role | Status |
|-----------|------|--------|
| `ConsumerNotificationsSection` | SMS toggle, phone modal | ✅ Working |
| `NotificationPreferences` | Legacy/simple prefs | ✅ Working |
| `notificationService.sendSMSNotification` | Direct SMS call | ⚠️ Exists but unused |
| `useConsumerSubscription` | tier, isSuperAdmin for smsDeliveryEligible | ✅ Working |

### 2.3 Database

| Migration | Adds | Status |
|-----------|------|--------|
| `20260107000000_add_sms_phone_number` | sms_phone_number, validate_phone_number | ✅ |
| `20260204145210` | sms_sent_today, last_sms_reset_date, notification_logs, check_sms_rate_limit, increment_sms_counter | ✅ |
| `20260214103000_sms_delivery_architecture` | notification_deliveries, sms_opt_in, queue trigger, is_user_sms_entitled | ✅ |

### 2.4 SMS Entitlement

- **Plans:** frequent-chraveler, pro-starter, pro-growth, pro-enterprise  
- **Bypass:** enterprise_admin, super_admin in user_roles  
- **Fallback:** profiles.subscription_status = 'active' + subscription_product_id ILIKE '%frequent%' or '%pro%'

---

## 3. Issues Identified

### 3.1 Critical: SMS Rate Limit Reset Not Persisted (dispatch)

**Location:** `dispatch-notification-deliveries/index.ts` (lines ~816–827)

**Problem:** When `last_sms_reset_date < today`, the code updates `prefs.sms_sent_today` and `prefs.last_sms_reset_date` only in memory. The database is never updated. On the next cron run, the same stale values are loaded.

**Fix:** Use `check_sms_rate_limit` RPC (which persists the reset) or explicitly UPDATE `notification_preferences` when resetting.

### 3.2 Critical: No Test SMS Flow

**Problem:** There is no way for a user to trigger a test SMS. `sendSMSNotification` exists but is never called.

**Fix:** Add a "Send Test SMS" button in ConsumerNotificationsSection that calls `push-notifications` with `action: 'send_sms'`.

### 3.3 Important: Phone E.164 Normalization

**Problem:** DB constraints require E.164 (`^\+[1-9]\d{6,14}$`). The frontend saves `normalizedPhone = smsPhoneInput.replace(/[^\d+]/g, '')` — e.g. `5551234567` without `+1`, which can fail the stricter constraint.

**Fix:** Normalize US 10-digit numbers to `+1` + digits before saving.

### 3.4 Important: sms_opt_in Blocking

**Problem:** In `push-notifications`, if `sms_opt_in` has a row for the user and `opted_in` or `verified` is false, SMS is blocked even when `notification_preferences.sms_phone_number` is set. The doc says sms_opt_in is "optional" — it should not block when the row exists but is incomplete.

**Fix:** Only require sms_opt_in when it exists AND we want strict compliance. Otherwise, fall back to notification_preferences.sms_phone_number. Current logic: "if smsOptIn exists and (!opted_in or !verified) → block". Safer: "if smsOptIn exists and (opted_in and verified) → use phone_e164; else use prefs.sms_phone_number".

**Current logic is:** use smsOptIn.phone_e164 when opted_in AND verified; else if no smsOptIn, use prefs. But when smsOptIn exists with opted_in=false, we block. The doc says sms_opt_in is optional — so when it's not fully verified, we should fall back to prefs. Adjust logic accordingly.

### 3.5 Minor: Cron Hardcoded URL

**Location:** `20260214103000_sms_delivery_architecture.sql`  
**Problem:** Cron jobs use hardcoded `https://jmjiyekmxwsxkfnqwyaa.supabase.co`. Works for this project but not portable.

**Fix:** Use Supabase project URL from config or env when available.

---

## 4. Production Readiness Checklist

| Item | Status |
|------|--------|
| Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) | Must be set in Supabase secrets |
| NOTIFICATION_DISPATCH_SECRET | Required for cron → dispatch auth |
| pg_cron + pg_net | Required for automated dispatch; otherwise manual trigger |
| User has entitlement or admin role | Required for SMS |
| User has sms_enabled + sms_phone_number | Required |
| No sms_opt_in row, OR opted_in + verified | Required (or fix blocking logic) |
| Phone in E.164 format | Required |

---

## 5. Testing Instructions (After Fixes)

1. **Configure Twilio** in Supabase Dashboard → Project Settings → Edge Functions → Secrets:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER` (E.164, e.g. +15551234567)

2. **Grant entitlement** (choose one):
   - **Option A (admin bypass):** `INSERT INTO user_roles (user_id, role) VALUES ('your-user-uuid', 'super_admin');`
   - **Option B (plan):** Ensure `user_entitlements` has an active row with plan `frequent-chraveler` or `pro-*`.

3. **Set preferences:** In app → Settings → Notifications → enable SMS, enter phone number (e.g. 555-123-4567; auto-normalized to +15551234567).

4. **Send test SMS:** Click "Send test SMS" next to your phone number. You should receive: `ChravelApp: Test message — SMS notifications are working!`

5. **Or trigger via notification:** Create a broadcast in a trip; if you're a member with SMS enabled, the dispatch will send.

---

## 6. Fixes Applied (2026-02-16)

| Fix | File | Description |
|-----|------|--------------|
| Rate limit persistence | `dispatch-notification-deliveries/index.ts` | Use `check_sms_rate_limit` RPC instead of in-memory reset |
| sms_opt_in fallback | `push-notifications/index.ts`, `dispatch-notification-deliveries/index.ts` | When sms_opt_in exists but not verified, use notification_preferences.sms_phone_number |
| E.164 normalization | `ConsumerNotificationsSection.tsx` | Normalize US 10-digit numbers to +1 prefix before save |
| Send Test SMS button | `ConsumerNotificationsSection.tsx` | New button to trigger test SMS via push-notifications |
| Response handling | `notificationService.ts` | Check data?.success for robustness |

## 7. Recommendations

1. **Add monitoring** for `notification_logs` (failed/skipped) and Twilio delivery status.
2. **Document** Twilio setup in ENV_AND_APIS_REQUIRED.md.
3. **Consider** a dedicated `send-test-sms` edge function for admin/testing with optional bypass.
