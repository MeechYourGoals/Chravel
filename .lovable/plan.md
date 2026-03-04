

# Enterprise Notifications Parity + Settings Tab Rename

## Problem

1. **Enterprise notifications section** only shows "Trip Invitations" — missing all 7 app notification categories (Broadcasts, Calendar Events, Payments, Tasks, Polls, Join Requests, Basecamp Updates), delivery methods (Push, Email, SMS), and quiet hours that the Consumer (Group) section has.

2. **Settings header tabs** say "Group / Enterprise / Events" but should say "My Trips / Pro / Events" to match the home screen menu bar toggles.

## Changes

### 1. `src/components/enterprise/EnterpriseNotificationsSection.tsx` — Full rewrite

Replace the current minimal component (only Trip Invitations) with the same full notification UI that `ConsumerNotificationsSection.tsx` has:

- **App Notifications**: All 7 categories (Broadcasts, Calendar Events, Payments, Tasks, Polls, Join Requests, Basecamp Updates) + Trip Invitations — same icons, labels, descriptions
- **Delivery Methods**: Push, Email, SMS (with same SMS premium-gating, phone number modal, test SMS flow)
- **Quiet Hours**: Enable toggle + start/end time pickers + timezone

**Implementation approach**: Extract the shared notification categories array and the toggle/delivery/quiet-hours rendering logic from `ConsumerNotificationsSection.tsx` so both sections reuse the same data and UI patterns. The simplest path: directly replicate the Consumer section's structure into Enterprise, using the same `userPreferencesService` calls (they share the same `notification_preferences` DB table).

### 2. `src/components/SettingsMenu.tsx` — Rename tab labels

Three label changes (lines 146, 156, 166):
- `"Group"` → `"My Trips"`
- `"Enterprise"` → `"Pro"`
- `"Events"` stays `"Events"`

Also update the sidebar headers in each settings panel:
- `ConsumerSettings.tsx`: "Personal Settings" label (keep as-is, it's correct)
- `EnterpriseSettings.tsx`: "Enterprise Settings" → "Pro Settings"

### 3. `src/components/EnterpriseSettings.tsx` — Update sidebar label

Change the sidebar heading from "Enterprise Settings" to "Pro Settings" for consistency.

### 4. Test updates

Update `src/components/__tests__/SettingsMenu.test.tsx` to reference "My Trips" and "Pro" instead of "Group" and "Enterprise".

## Files

| File | Action |
|------|--------|
| `src/components/enterprise/EnterpriseNotificationsSection.tsx` | Rewrite — full parity with Consumer notifications |
| `src/components/SettingsMenu.tsx` | Rename tabs: Group→My Trips, Enterprise→Pro |
| `src/components/EnterpriseSettings.tsx` | Rename sidebar header to "Pro Settings" |
| `src/components/__tests__/SettingsMenu.test.tsx` | Update tab label assertions |

