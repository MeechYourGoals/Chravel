# Permissions & Privacy (iOS / Capacitor)

Chravel is **web-first** and only requests sensitive permissions **just-in-time** when a user explicitly uses a feature that needs it.

This doc covers:
- Which permissions exist in-app
- What triggers the OS prompt (just-in-time prompting)
- The required iOS `Info.plist` privacy strings (exact keys + current copy)
- How the in-app **Permissions Center** works

## In-app “Permissions Center”

Location: **Settings → Permissions**

What it does:
- Shows **current status** when available (no prompting on load)
- Explains **why** a permission is needed
- Provides a just-in-time **Enable** action (where possible)
- If denied on iOS native, offers **Open Settings** (deep link)

Implementation:
- `src/native/permissions.ts`
- `src/components/consumer/ConsumerPermissionsSection.tsx`

## Just-in-time prompting (what triggers prompts)

### Notifications (iOS native only)
- **Prompt trigger**: User enables “Push Notifications” in Settings → Notifications, or taps “Enable” in Permissions Center.
- **No prompt trigger**: App startup, browsing, or web usage.

Notes:
- iOS push permissions are handled via `@capacitor/push-notifications` (`src/native/push.ts`).
- Enabling push in-app triggers registration and token save only on native iOS.

### Photos / Files
- **Prompt trigger**: User selects “Photo / Video / File” upload in chat/media, or taps “Choose a file” in Permissions Center.
- **No prompt trigger**: App startup, browsing.

Notes:
- Web + iOS WKWebView do not expose a reliable “Photos/Files permission status” preflight.
- We intentionally **don’t** pre-request; we rely on the OS picker flow.

### Location (only while in use)
- **Prompt trigger**: User turns on location sharing / uses a location feature that calls `navigator.geolocation.getCurrentPosition`.
- **No prompt trigger**: Loading maps, opening settings, etc.

Notes:
- We avoid prompting on the Permissions Center load. If status is unknown, iOS may only reveal it after the first request.

### Microphone (only if used)
- **Current state**: Not used by Chravel today (no audio recording / voice chat).
- **Prompt trigger**: N/A until a microphone feature ships.

## iOS `Info.plist` privacy usage descriptions (exact keys)

File: `ios/App/App/Info.plist`

These strings are required for App Store review when the corresponding capabilities can be used.

### Camera
- **Key**: `NSCameraUsageDescription`
- **Current string**:
  - `Chravel uses the camera to capture photos and videos you choose to share with your trips.`

### Photo Library
- **Key**: `NSPhotoLibraryUsageDescription`
- **Current string**:
  - `Chravel needs access to your photo library so you can upload photos and videos to trip chats and shared albums.`

### Location (When In Use)
- **Key**: `NSLocationWhenInUseUsageDescription`
- **Current string**:
  - `Chravel uses your location (only while you’re using the app) for optional location sharing and to help coordinate meetups during a trip.`

### Not included (because not used today)
- **Microphone**: `NSMicrophoneUsageDescription` (add only when we ship audio features)
- **Location Always**: `NSLocationAlwaysAndWhenInUseUsageDescription` (avoid unless background location is truly required)

## Deep linking to iOS Settings

When a permission is denied on iOS native, the Permissions Center can open Settings via the `app-settings:` URL scheme (best-effort).

Code: `openAppSettings()` in `src/native/permissions.ts`

## Testing checklist (iOS)

- **Notifications**
  - Fresh install → enable push in Settings → Notifications → iOS prompt appears
  - Deny → Permissions Center shows “Denied” and offers “Open Settings”
  - Allow → Permissions Center shows “Granted”

- **Photos / Files**
  - Tap “Choose a file” (Permissions Center) or upload in chat → iOS picker opens
  - Verify upload flows still work (no changes to web upload logic)

- **Location**
  - Trigger location sharing → iOS prompt appears
  - Deny → location sharing fails gracefully; Permissions Center offers Settings (iOS native)

