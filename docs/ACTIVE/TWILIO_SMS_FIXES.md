# Twilio SMS Deep Dive & Implementation Plan

Based on a thorough review of the codebase, here is exactly what is needed for the Twilio SMS implementation, how the notifications will appear, what might be preventing your notifications from working, and a comprehensive fix plan.

## 1. Edge Secrets and Configuration You Must Have Set

Your Twilio notifications rely on Edge Functions (`push-notifications` and `dispatch-notification-deliveries`) which require specific environment variables (secrets) to communicate with Twilio.

You must set these in your **Supabase Dashboard** (under Project Settings -> Edge Functions -> Secrets):
* `TWILIO_ACCOUNT_SID`: Your Twilio Account SID.
* `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token.
* `TWILIO_PHONE_NUMBER`: Your Twilio sender phone number. **Crucially, this must be in strict E.164 format (e.g., `+15551234567`)**.

*Optional but recommended for the cron dispatcher:*
* `NOTIFICATION_DISPATCH_SECRET`: Used to authenticate the pg_cron job that triggers `dispatch-notification-deliveries` in the background. If this is not set properly, background SMS notifications (like trip broadcasts) won't send, even if the "Send Test SMS" button works.

## 2. How the Notifications Will Appear

All messages are prefixed with `ChravelApp:`. Here is exactly how each notification category will appear on a user's phone based on your `smsTemplates.ts`:

* **Broadcasts:** `ChravelApp: Broadcast in [Trip Name] from [Sender Name]: "[Message Preview]"`
* **Calendar Events:** `ChravelApp: Reminder - [Event Title] in [Trip Name] at [Time]. Tap to open.`
* **Payments:** `ChravelApp: Payment - [Sender Name] requested $[Amount] for [Trip Name].`
* **Tasks:** `ChravelApp: Task assigned - "[Task Title]" in [Trip Name].`
* **Polls:** `ChravelApp: New poll in [Trip Name]: "[Poll Question]"`
* **Join Requests:** `ChravelApp: Join request - [Sender Name] wants to join [Trip Name].`
* **Basecamp Updates:** `ChravelApp: Basecamp updated for [Trip Name]: [Location Name].`
* **Calendar Bulk Import:** `ChravelApp: [Count] calendar events added to [Trip Name] via Smart Import. Open the app to review.`
* **Default/Fallback:** `ChravelApp: New update in [Trip Name]. Open the app for details.`

*(Note: Text in brackets will be intelligently truncated to prevent multi-part SMS messages and save costs.)*

## 3. What Could Be Preventing Your Notifications from Working?

1. **Twilio Trial Account Restrictions:** If you are using a trial Twilio account, you **must** verify the destination phone number in the Twilio Console (under Phone Numbers -> Verified Caller IDs). Twilio will silently drop (or return error `21610`) any messages sent to unverified numbers on trial accounts.
2. **Missing `+` Prefix (E.164 Format) on the Sender:** Ensure `TWILIO_PHONE_NUMBER` in your Edge Secrets has a leading `+`.
3. **Daily Rate Limiting Bug:** Your codebase limits users to 10 SMS per day. However, I found a bug in `dispatch-notification-deliveries/index.ts` where the daily reset timestamp was not being saved back to the database. Once a user hit 10 messages, they would be permanently blocked from receiving more SMS via the background queue. **I have fixed this.**
4. **Subscription / Entitlement Gating:** Your backend code strictly checks if a user is entitled to receive SMS (`isSmsEntitled`). If a user's plan is not `frequent-chraveler`, `pro-starter`, `pro-growth`, or `pro-enterprise` (or they are not a `super_admin`), the backend will completely skip sending the SMS.
5. **Quiet Hours Enabled:** If the user has "Quiet Hours" toggled on in their Chravel settings, the background dispatcher will queue the message but defer delivery until quiet hours end.
6. **sms_opt_in strict checks:** If a user has a row in the `sms_opt_in` table that is NOT `verified=true`, SMS delivery might fail depending on the resolution path. The codebase was intended to fall back to `notification_preferences`, which mostly works but is strict about missing verifications in some areas.

## 4. Comprehensive Plan & Fix

I have investigated your codebase and completed the following fixes to implement a regression-free SMS setup:

1. **Fixed the Daily Rate Limit Bug:** In `supabase/functions/dispatch-notification-deliveries/index.ts`, when the code resets the `sms_sent_today` counter for a new day, it was failing to save `last_sms_reset_date = new Date()` back to the `notification_preferences` object in memory before persisting it. This meant the rate limit check would immediately fail again in the next cycle. I added the line `prefs.last_sms_reset_date = new Date().toISOString().split('T')[0];` to fix the permanent rate limiting block.
2. **Verified Existing Infrastructure:** I verified that the code correctly normalizes user input into E.164 (`+15551234567`) in both `ConsumerNotificationsSection` and `EventNotificationsSection`. I also verified that the edge functions correctly attempt to use `smsOptIn.phone_e164` if available and verified, falling back gracefully to `prefs.sms_phone_number`.

### Next Steps For You:
- Verify your Twilio secrets (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) in the Supabase Dashboard.
- If on a Twilio trial, verify your personal destination phone number in the Twilio Console.
- Ensure the user account you are testing with is granted `super_admin` status or has an active premium subscription plan so they pass the SMS entitlement checks.
- Test it using the "Send test SMS" button in the Notification Settings of the app!