# Push Notifications Setup (iOS & Android)

## Overview

Chravel uses Capacitor's `@capacitor/push-notifications` plugin for native push notifications on iOS and Android. Web continues to use the existing Web Push API via service workers.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Chravel App                          │
├─────────────────────────────────────────────────────────────┤
│  useNativePush (Hook)                                       │
│    ├── Register/Unregister                                  │
│    ├── Handle foreground (toast)                            │
│    └── Handle tap (navigate)                                │
├─────────────────────────────────────────────────────────────┤
│  src/native/push.ts (Wrapper)                               │
│    ├── requestPermissions()                                 │
│    ├── register() → returns token                           │
│    ├── onNotificationReceived()                             │
│    └── onNotificationActionPerformed()                      │
├─────────────────────────────────────────────────────────────┤
│  pushTokenService.ts                                        │
│    └── Stores tokens in Supabase `push_device_tokens`       │
├─────────────────────────────────────────────────────────────┤
│  pushRouting.ts                                             │
│    └── Builds routes from payload → navigate()              │
└─────────────────────────────────────────────────────────────┘
```

## Apple Developer Portal Prerequisites

### 1. Create an APNs Key (Recommended over Certificates)

1. Go to [Apple Developer Portal → Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Click **+** to create a new Key
3. Enter a name (e.g., "Chravel Push Key")
4. Enable **Apple Push Notifications service (APNs)**
5. Click **Continue** then **Register**
6. **IMPORTANT:** Download the `.p8` file immediately - you only get ONE download!
7. Note down:
   - **Key ID** (10-character alphanumeric)
   - **Team ID** (from Membership page)

### 2. Configure App ID

1. Go to [Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Select your App ID (`com.chravel.app` or your bundle ID)
3. Scroll to **Capabilities** section
4. Enable **Push Notifications**
5. Click **Save**

### 3. Xcode Entitlements

In your iOS project at `ios/App/App/App.entitlements`, ensure you have:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>aps-environment</key>
    <string>development</string>
    <!-- Change to "production" for App Store builds -->
</dict>
</plist>
```

### 4. Xcode Capabilities

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the **App** target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability** and add:
   - **Push Notifications**
   - **Background Modes** → Check **Remote notifications**

## Android Configuration

### 1. Firebase Cloud Messaging (FCM)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create or select your project
3. Add an Android app with your package name
4. Download `google-services.json`
5. Place it in `android/app/google-services.json`

### 2. Android Manifest

The Capacitor plugin automatically adds the necessary permissions and receivers.

## Database Schema

Device tokens are stored in the `push_device_tokens` table:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Authenticated user ID |
| token | TEXT | Device push token |
| platform | TEXT | 'ios', 'android', or 'web' |
| device_id | TEXT | Stable device identifier |
| last_seen_at | TIMESTAMPTZ | Last activity timestamp |
| created_at | TIMESTAMPTZ | Token creation time |
| updated_at | TIMESTAMPTZ | Last update time |

## Push Notification Payload Format

When sending push notifications from the backend, use this payload structure:

### iOS (APNs)

```json
{
  "aps": {
    "alert": {
      "title": "New Message",
      "body": "John sent a message in Ski Trip 2024"
    },
    "badge": 1,
    "sound": "default"
  },
  "type": "chat_message",
  "tripId": "uuid-of-trip",
  "threadId": "optional-thread-id",
  "messageId": "optional-message-id"
}
```

### Android (FCM)

```json
{
  "notification": {
    "title": "New Message",
    "body": "John sent a message in Ski Trip 2024"
  },
  "data": {
    "type": "chat_message",
    "tripId": "uuid-of-trip",
    "threadId": "optional-thread-id",
    "messageId": "optional-message-id"
  }
}
```

## Notification Types

| Type | Description | Route |
|------|-------------|-------|
| `chat_message` | New chat message | `/trip/{tripId}?tab=chat` |
| `trip_update` | Trip details changed | `/trip/{tripId}` |
| `poll_update` | Poll created/closed | `/trip/{tripId}?tab=polls` |
| `task_update` | Task assigned/completed | `/trip/{tripId}?tab=tasks` |
| `calendar_event` | Event reminder | `/trip/{tripId}?tab=calendar` |
| `broadcast` | Broadcast message | `/trip/{tripId}?tab=chat&view=broadcasts` |

## Usage in App

### Register After Login

```typescript
import { useNativePush } from '@/hooks/useNativePush';

function AfterLoginComponent() {
  const { registerForPush, permission, isNative } = useNativePush();
  
  useEffect(() => {
    if (isNative && permission === 'prompt') {
      // Show consent UI first, then:
      registerForPush();
    }
  }, [isNative, permission]);
}
```

### Unregister on Logout

```typescript
import { useNativePush } from '@/hooks/useNativePush';

function LogoutButton() {
  const { unregisterFromPush } = useNativePush();
  
  const handleLogout = async () => {
    await unregisterFromPush();
    // ... rest of logout logic
  };
}
```

## Testing

### On Physical Device

1. Build and run on a physical device (simulators don't support push)
2. Log in and grant notification permissions
3. Use a tool like [Pusher](https://github.com/noodlewerk/NWPusher) or your backend to send a test notification
4. Verify:
   - Foreground: Toast appears with "View" action
   - Background: Tap routes to correct trip/tab

### Unit Tests

Run the routing tests:

```bash
npm run test -- src/native/__tests__/pushRouting.test.ts
```

## Troubleshooting

### "registrationError" on iOS

- Verify APNs capability is enabled in Xcode
- Ensure entitlements file exists and has correct environment
- Check that bundle ID matches App ID in Apple Developer Portal

### Token not saving to database

- Check RLS policies on `push_device_tokens` table
- Verify user is authenticated before calling `registerForPush()`
- Check browser console for Supabase errors

### Notifications not appearing

- iOS: Check "Notifications" settings in device Settings app
- Android: Check "App notifications" in device Settings
- Verify token is saved in database with correct platform

## Backend Integration (Next Steps)

For Prompt 2B, you'll need to:

1. Create a Supabase Edge Function to send push notifications
2. Use APNs HTTP/2 API for iOS or FCM for Android
3. Store the APNs key/FCM credentials as secrets
4. Trigger notifications on relevant database events

Example Edge Function structure:

```typescript
// supabase/functions/send-push/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { userId, title, body, data } = await req.json()
  
  // Fetch user's device tokens
  // Send to APNs/FCM based on platform
  // Handle delivery failures and token cleanup
})
```
