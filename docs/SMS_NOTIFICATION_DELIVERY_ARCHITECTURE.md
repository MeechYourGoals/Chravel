# SMS Notification Delivery Architecture

Last updated: 2026-02-14

## Overview

Chravel notification delivery is now modeled as:

1. **Event creation** inserts a row into `notifications` (any source: SQL trigger, edge function, direct insert).
2. **DB trigger** (`trigger_queue_notification_deliveries`) creates per-channel rows in `notification_deliveries` (`push`, `email`, `sms`) as `queued`.
3. **Dispatcher** (`dispatch-notification-deliveries` edge function) evaluates each queued delivery against:
   - category toggle
   - channel toggle
   - quiet hours
   - SMS entitlement + opt-in + phone
4. Delivery rows transition to `sent`, `failed`, or `skipped`, with provider IDs/errors for debugability.

## Source of Truth

- `notifications`: canonical notification events.
- `notification_preferences`: per-user delivery/category toggles.
- `notification_deliveries`: per-channel delivery attempts and outcomes.
- `notification_logs`: debug/audit logs (provider errors, skips, sent records).
- `calendar_reminders`: one reminder per event per user (deduped with unique constraint).
- `sms_opt_in`: optional compliance layer (`verified` + `opted_in`).

## SMS Premium Gating

Server-side rule is enforced in DB + function layers:

- `public.is_user_sms_entitled(user_id)` allows SMS only for:
  - `frequent-chraveler`
  - `pro-starter`
  - `pro-growth`
  - `pro-enterprise`
  - admin bypass roles (`enterprise_admin`, `super_admin`)
- `notification_preferences` trigger auto-forces `sms_enabled = false` if user is not entitled.
- Dispatcher also enforces entitlement before sending, and auto-disables SMS if entitlement is missing.

## Message Templates

Implemented in `supabase/functions/_shared/smsTemplates.ts`:

- All messages start with `Chravel:`
- Categories:
  - broadcasts
  - calendar events reminders
  - payments
  - tasks
  - polls
  - join requests
  - basecamp updates
  - message notifications (privacy-safe)
- Shared helpers:
  - `truncate(text, maxLen)`
  - `formatTimeForTimezone(iso, timezone)`

## Calendar Reminder Policy

Implemented via `calendar_reminders` sync triggers + `event-reminders` dispatcher:

- if event start >= 3h away -> reminder at `start - 3h`
- else if >= 1h away -> reminder at `start - 1h`
- else -> reminder at `max(start - 15m, now)`
- one reminder max per event/user (`UNIQUE(event_id, recipient_user_id)`)

No SMS is sent on every create/update; updates only re-schedule unsent reminder rows.

## Quiet Hours

For SMS:

- If user is in quiet hours, SMS delivery remains `queued` with deferred `next_attempt_at`.
- Dispatcher retries after quiet hours end.

## Scheduled Jobs

Migration registers pg_cron jobs (when `pg_cron` + `net.http_post` exist):

- `chravel-event-reminders` every 5 minutes
- `chravel-dispatch-notification-deliveries` every minute

If extensions are unavailable, migration logs a notice and scheduling can be configured manually.

## Failure Behavior

- Provider failures mark delivery row `failed` with error details.
- Non-send conditions mark `skipped` (`sms_disabled`, `missing_email`, `sms_not_entitled`, etc).
- Each attempt writes to `notification_logs` for operational debugging.
