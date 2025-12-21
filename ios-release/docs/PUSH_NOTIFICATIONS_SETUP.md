# Push Notifications Setup Guide

**App Name:** Chravel
**Platform:** iOS (APNs via Firebase Cloud Messaging)
**Last Updated:** December 2025

---

## Overview

Chravel uses Firebase Cloud Messaging (FCM) to handle push notifications on iOS. FCM wraps Apple Push Notification service (APNs) and provides a unified API for both iOS and Android.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Supabase Edge  │────▶│  Firebase FCM   │────▶│   Apple APNs    │
│    Function     │     │     Server      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   iOS Device    │
                                               │   (Chravel)     │
                                               └─────────────────┘
```

---

## Setup Checklist

### 1. Apple Developer Account Setup

- [ ] Apple Developer Program membership active
- [ ] App ID created with Push Notification capability
- [ ] APNs Authentication Key generated (.p8 file)
- [ ] Key ID recorded
- [ ] Team ID recorded

### 2. Firebase Project Setup

- [ ] Firebase project created
- [ ] iOS app added to Firebase project
- [ ] `GoogleService-Info.plist` downloaded
- [ ] APNs key uploaded to Firebase Console

### 3. Xcode Project Configuration

- [ ] Push Notification capability enabled
- [ ] Background Modes → Remote notifications enabled
- [ ] `GoogleService-Info.plist` added to project
- [ ] Firebase SDK integrated

### 4. Backend Configuration

- [ ] Firebase Admin SDK initialized
- [ ] `push_tokens` table in Supabase
- [ ] Edge function for sending notifications

---

## Step-by-Step Setup

### Step 1: Generate APNs Authentication Key

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Keys** → **Create a Key**
4. Name: "Chravel APNs Key"
5. Enable **Apple Push Notifications service (APNs)**
6. Click **Continue** → **Register**
7. Download the `.p8` file (save it securely - you can only download once)
8. Note the **Key ID** displayed

### Step 2: Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create new)
3. Navigate to **Project Settings** → **Cloud Messaging**
4. Under **Apple app configuration**, click **Upload** next to APNs Authentication Key
5. Upload your `.p8` file
6. Enter your **Key ID** and **Team ID**

### Step 3: Download Firebase Config

1. In Firebase Console → **Project Settings** → **General**
2. Under **Your apps**, select the iOS app
3. Download `GoogleService-Info.plist`
4. Add to Xcode project root (ensure "Copy items if needed" is checked)

### Step 4: Xcode Capabilities

1. Open project in Xcode
2. Select the target → **Signing & Capabilities**
3. Click **+ Capability**
4. Add **Push Notifications**
5. Add **Background Modes** → Check **Remote notifications**

### Step 5: Configure Entitlements

Create/update `App.entitlements`:

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

---

## iOS Implementation

### AppDelegate Configuration

For Capacitor/Ionic apps, update `ios/App/App/AppDelegate.swift`:

```swift
import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Initialize Firebase
        FirebaseApp.configure()

        // Set delegates
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self

        // Request notification permission
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            print("Notification permission granted: \(granted)")
        }

        // Register for remote notifications
        application.registerForRemoteNotifications()

        return true
    }

    // MARK: - APNs Token Registration

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Pass to Firebase
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register for remote notifications: \(error.localizedDescription)")
    }

    // MARK: - Firebase Messaging Delegate

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("FCM Token: \(token)")

        // Send token to your server
        NotificationCenter.default.post(
            name: Notification.Name("FCMToken"),
            object: nil,
            userInfo: ["token": token]
        )
    }

    // MARK: - UNUserNotificationCenterDelegate

    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .badge, .sound])
    }

    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo

        // Handle deep link from notification
        if let tripId = userInfo["trip_id"] as? String {
            // Navigate to trip
            NotificationCenter.default.post(
                name: Notification.Name("OpenTrip"),
                object: nil,
                userInfo: ["tripId": tripId]
            )
        }

        completionHandler()
    }
}
```

---

## Backend Implementation

### Supabase Tables

Create the `push_tokens` table:

```sql
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('ios', 'android', 'web')) DEFAULT 'ios',
    device_info JSONB,
    active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, token)
);

-- Index for fast lookups
CREATE INDEX idx_push_tokens_user_active ON push_tokens(user_id, active) WHERE active = true;

-- RLS policy
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tokens" ON push_tokens
    FOR ALL USING (user_id = auth.uid());
```

### Edge Function: Send Notification

Create `supabase/functions/push-notification/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Firebase Admin
import { initializeApp, cert } from 'npm:firebase-admin/app';
import { getMessaging } from 'npm:firebase-admin/messaging';

const firebaseConfig = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}');
const app = initializeApp({
  credential: cert(firebaseConfig),
});

interface NotificationPayload {
  user_ids: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_ids, title, body, data }: NotificationPayload = await req.json();

    // Fetch active tokens for users
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .in('user_id', user_ids)
      .eq('active', true);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No active tokens' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messaging = getMessaging(app);

    // Build FCM message
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens: tokens.map(t => t.token),
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
    };

    // Send multicast
    const response = await messaging.sendEachForMulticast(message);

    // Handle failed tokens (deactivate them)
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        supabase
          .from('push_tokens')
          .update({ active: false })
          .eq('token', tokens[idx].token)
          .then(() => console.log('Deactivated stale token'));
      }
    });

    return new Response(
      JSON.stringify({
        sent: response.successCount,
        failed: response.failureCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Notification Types

### Broadcast Notifications
```typescript
// When a broadcast is created
await sendNotification({
  user_ids: tripMemberIds,
  title: `📢 ${tripName}`,
  body: broadcastMessage,
  data: {
    type: 'broadcast',
    trip_id: tripId,
  },
});
```

### @Mention Notifications
```typescript
// When a user is @mentioned
await sendNotification({
  user_ids: [mentionedUserId],
  title: `${senderName} mentioned you`,
  body: messagePreview,
  data: {
    type: 'mention',
    trip_id: tripId,
    message_id: messageId,
  },
});
```

### Payment Request Notifications
```typescript
// When a payment split is created
await sendNotification({
  user_ids: participantIds,
  title: '💰 Payment Request',
  body: `${requesterName} requested $${amount} for "${description}"`,
  data: {
    type: 'payment',
    trip_id: tripId,
    payment_id: paymentId,
  },
});
```

### Task Assignment Notifications
```typescript
// When a task is assigned
await sendNotification({
  user_ids: [assigneeId],
  title: `📋 New Task`,
  body: `${assigner} assigned you: "${taskTitle}"`,
  data: {
    type: 'task',
    trip_id: tripId,
    task_id: taskId,
  },
});
```

---

## Testing

### Local Testing with Simulator
Note: Push notifications do NOT work on iOS Simulator. Use a physical device.

### Testing Checklist
- [ ] Permission request appears on first launch
- [ ] Token is generated and sent to server
- [ ] Background notification received
- [ ] Foreground notification displayed
- [ ] Notification tap opens correct screen
- [ ] Badge count updates
- [ ] Sound plays

### Testing Tools
1. **Firebase Console:** Send test messages directly
2. **Pusher:** macOS app for APNs testing
3. **curl:** Direct FCM API testing

```bash
# Test via Firebase Console
# Go to Firebase Console → Cloud Messaging → Send your first message
# Enter device token and test
```

---

## Troubleshooting

### "Failed to register for remote notifications"
- Ensure Push Notification capability is enabled
- Check provisioning profile includes push entitlement
- Verify bundle ID matches Apple Developer portal

### "Token not received"
- Check Firebase is configured before `registerForRemoteNotifications()`
- Verify `GoogleService-Info.plist` is in the project
- Check internet connectivity

### "Notifications not appearing"
- Check notification permissions in Settings
- Verify `aps-environment` matches build type
- Check Do Not Disturb / Focus mode

### "Token becomes invalid"
- APNs tokens can expire or become invalid
- Handle token refresh in `didReceiveRegistrationToken`
- Implement token deactivation for failed sends

---

## Security Considerations

1. **Never** expose Firebase Server Key in client code
2. Store FCM tokens securely with user authentication
3. Validate user permissions before sending notifications
4. Implement rate limiting on notification endpoints
5. Use RLS to protect token table

---

## Environment Variables

Required in Supabase Edge Functions:

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

Required in Xcode/Info.plist:

```xml
<key>FirebaseAppDelegateProxyEnabled</key>
<false/>
```

---

## Next Steps

1. [x] Complete this setup guide
2. [ ] Generate APNs key from Apple Developer Portal
3. [ ] Configure Firebase project
4. [ ] Implement token registration in app
5. [ ] Deploy push notification edge function
6. [ ] Test on physical device
7. [ ] Add notification handling for deep links
