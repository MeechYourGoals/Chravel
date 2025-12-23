# Send Push Notification Edge Function

Sends push notifications to Chravel users via FCM (Android/Web) and APNs (iOS).

## Required Secrets

Configure these in the [Supabase Edge Functions settings](https://supabase.com/dashboard/project/jmjiyekmxwsxkfnqwyaa/settings/functions):

### Firebase Cloud Messaging (Android & Web)

| Secret | Description |
|--------|-------------|
| `FCM_SERVER_KEY` | Firebase Cloud Messaging server key |

**How to get:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Project Settings → Cloud Messaging
3. Copy the "Server key" under Cloud Messaging API (Legacy)

### Apple Push Notification service (iOS)

| Secret | Description |
|--------|-------------|
| `APNS_KEY_ID` | 10-character APNs Key ID |
| `APNS_TEAM_ID` | Apple Developer Team ID |
| `APNS_PRIVATE_KEY` | Contents of the .p8 file |
| `APNS_BUNDLE_ID` | iOS app bundle ID (optional, defaults to Capacitor app ID) |

**How to get:**
1. Go to [Apple Developer Portal → Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Create a key with "Apple Push Notifications service (APNs)" enabled
3. Download the `.p8` file (one-time download!)
4. Note the Key ID
5. Team ID is on the Membership page

### Web Push (PWA) - Optional

| Secret | Description |
|--------|-------------|
| `VAPID_PUBLIC_KEY` | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | VAPID private key for Web Push |

## API

### Request

```typescript
POST /functions/v1/send-push

{
  // Target (one of these is required):
  "userIds": ["uuid1", "uuid2"],  // Direct user targeting
  // OR
  "tripId": "trip-uuid",          // All trip members
  "excludeUserId": "sender-uuid", // Exclude from tripId targeting
  
  // Notification content (required):
  "notification": {
    "title": "New Message",
    "body": "John sent a message in Ski Trip",
    "data": {
      "type": "chat_message",
      "tripId": "trip-uuid",
      "threadId": "optional-thread-id",
      "messageId": "optional-message-id"
    }
  }
}
```

### Response

```typescript
{
  "success": true,
  "sent": 5,      // Successfully delivered
  "failed": 2,   // Failed to deliver
  "errors": []   // Error messages if any
}
```

## Payload Types

| Type | Description | Navigation Target |
|------|-------------|-------------------|
| `chat_message` | New chat message | Trip → Chat tab |
| `trip_update` | Trip details changed | Trip overview |
| `poll_update` | Poll created/closed | Trip → Polls tab |
| `task_update` | Task assigned/completed | Trip → Tasks tab |
| `calendar_event` | Event reminder | Trip → Calendar tab |
| `broadcast` | Broadcast message | Trip → Chat broadcasts |

## Testing

### Via cURL

```bash
curl -X POST 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/send-push' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "userIds": ["user-uuid"],
    "notification": {
      "title": "Test",
      "body": "This is a test notification"
    }
  }'
```

### Via Supabase Client

```typescript
const { data, error } = await supabase.functions.invoke('send-push', {
  body: {
    tripId: 'trip-uuid',
    excludeUserId: currentUser.id,
    notification: {
      title: 'New Message',
      body: 'John: Hey everyone!',
      data: {
        type: 'chat_message',
        tripId: 'trip-uuid'
      }
    }
  }
});
```

## Implementation Status

- [x] Edge function scaffold
- [x] Device token lookup
- [x] Platform routing (iOS/Android/Web)
- [ ] FCM integration (requires `FCM_SERVER_KEY`)
- [ ] APNs integration (requires APNs secrets)
- [ ] Web Push integration (requires VAPID keys)
- [ ] Invalid token cleanup (disable tokens that return 410)

## Logs

View logs in [Supabase Dashboard](https://supabase.com/dashboard/project/jmjiyekmxwsxkfnqwyaa/functions/send-push/logs).
