# SMS Test Troubleshooting

When "Send test SMS" fails, the toast now shows the **exact error message** from the API. Use this guide to fix each error.

## Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| **Upgrade required for SMS notifications** | User is not SMS-entitled | Add `super_admin` role or `user_entitlements` with plan (see below) |
| **SMS notifications are disabled for this user** | `notification_preferences.sms_enabled` is false | Enable SMS toggle in Settings → Notifications |
| **No verified SMS phone number found** | No `sms_phone_number` in `notification_preferences` | Enter phone number in the SMS modal and click Enable SMS |
| **Twilio credentials not configured** | Edge function secrets missing | Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in Supabase |
| **Daily SMS limit reached** | Rate limit (10/day) exceeded | Wait until midnight or run reset SQL below |
| **Request failed** / **Unauthorized** | Auth/session issue | Ensure you're logged in; try refreshing the page |
| **The 'To' number is not verified** (21610) | Twilio trial account | Verify destination number in Twilio Console → Phone Numbers → Verified Caller IDs |
| **Twilio did not return a message SID** | Twilio API returned unexpected response | Check Twilio status page; verify credentials and from number |

## Verify Your Setup (SQL)

Run in Supabase SQL Editor (replace `YOUR_USER_ID` with your `auth.users.id`):

```sql
-- 1. Check if you have notification_preferences
SELECT user_id, sms_enabled, sms_phone_number
FROM notification_preferences
WHERE user_id = 'YOUR_USER_ID';

-- 2. Check entitlement (admin bypass)
SELECT user_id, role FROM user_roles
WHERE user_id = 'YOUR_USER_ID' AND role::text IN ('super_admin', 'enterprise_admin');

-- 3. Check entitlement (plan)
SELECT user_id, plan, status, current_period_end
FROM user_entitlements
WHERE user_id = 'YOUR_USER_ID'
ORDER BY updated_at DESC LIMIT 1;
```

## Grant Entitlement (SQL)

**Option A — Admin role (easiest for testing):**
```sql
-- Use enterprise_admin (always in enum); super_admin may require enum migration
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'enterprise_admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

**Option B — Frequent Chraveler plan:**
```sql
INSERT INTO user_entitlements (user_id, plan, status, source)
VALUES ('YOUR_USER_ID', 'frequent-chraveler', 'active', 'admin')
ON CONFLICT (user_id) DO UPDATE SET
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  source = EXCLUDED.source,
  updated_at = NOW();
```

## Ensure SMS Preferences (SQL)

If you don't have a row or need to fix it:
```sql
INSERT INTO notification_preferences (user_id, sms_enabled, sms_phone_number, updated_at)
VALUES ('YOUR_USER_ID', true, '+15551234567', NOW())
ON CONFLICT (user_id) DO UPDATE SET
  sms_enabled = EXCLUDED.sms_enabled,
  sms_phone_number = EXCLUDED.sms_phone_number,
  updated_at = NOW();
```

(Replace `+15551234567` with your E.164 phone number.)

## Reset Rate Limit (if needed)

```sql
UPDATE notification_preferences
SET sms_sent_today = 0, last_sms_reset_date = CURRENT_DATE
WHERE user_id = 'YOUR_USER_ID';
```

## Checklist Before Testing

1. [ ] Twilio secrets set in Supabase (Edge Functions → Secrets)
2. [ ] **Trial accounts:** Verify destination phone in Twilio Console → Phone Numbers → Verified Caller IDs
3. [ ] User has `super_admin` role OR active `user_entitlements` with `frequent-chraveler` / `pro-*`
4. [ ] `notification_preferences` has `sms_enabled = true` and `sms_phone_number` in E.164 (e.g. +15551234567)
5. [ ] You're logged in and on Settings → Notifications (Consumer settings)
6. [ ] "Send test SMS" button is visible (means you're eligible)

## Twilio Console Settings to Verify

- **From number:** Twilio Console → Phone Numbers → your number must be SMS-capable
- **Geo permissions:** Twilio Console → Messaging → Geo Permissions — ensure destination country is allowed
- **Trial accounts:** Phone Numbers → Verified Caller IDs — add and verify your test number
- **A2P/10DLC (US):** For production US SMS, complete 10DLC registration
