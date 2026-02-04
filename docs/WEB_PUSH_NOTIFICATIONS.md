# Web Push Notifications for Chravel

This document describes the Web Push notification system for Chravel, including setup, API usage, and example payloads.

## Overview

Chravel uses the Web Push Protocol (RFC 8291) with VAPID authentication (RFC 8292) to send push notifications to users' browsers. This works on:

- Chrome (Desktop & Android)
- Firefox (Desktop & Android)
- Edge (Desktop)
- Safari (macOS 13+ and iOS 16.4+)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React App      │────▶│  Service Worker │────▶│  Browser        │
│  (useWebPush)   │     │  (sw.js)        │     │  Notification   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               ▲
         ▼                                               │
┌─────────────────┐     ┌─────────────────┐     ┌───────┴─────────┐
│  Supabase DB    │────▶│  Edge Function  │────▶│  Push Service   │
│  (subscriptions)│     │  (web-push-send)│     │  (FCM/Mozilla)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Setup

### 1. Generate VAPID Keys

```bash
# Run the key generation script
npx ts-node scripts/generate-vapid-keys.ts
# or
bun run scripts/generate-vapid-keys.ts
```

This outputs:
- `VITE_VAPID_PUBLIC_KEY` - Add to `.env` for frontend
- `VAPID_PRIVATE_KEY` - Add to Supabase secrets (never expose publicly)

### 2. Configure Environment Variables

**Frontend (.env):**
```env
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69y...
```

**Supabase Secrets (Dashboard > Edge Functions > Secrets):**
```
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69y...
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_SUBJECT=mailto:notifications@chravel.app
```

### 3. Run Database Migration

```bash
# Apply the migration
supabase migration up
# or
supabase db push
```

This creates:
- `web_push_subscriptions` - Stores browser push subscriptions
- `notification_queue` - Queue for scheduled notifications

### 4. Deploy Edge Function

```bash
supabase functions deploy web-push-send
```

## Frontend Usage

### Request Permission on First Trip

```tsx
import { useWebPushOnFirstTrip } from '@/hooks/useWebPush';

function CreateTripButton() {
  const { requestOnFirstTrip, shouldPrompt } = useWebPushOnFirstTrip();

  const handleCreateTrip = async () => {
    await createTrip(tripData);
    
    // Request push permission after first trip
    await requestOnFirstTrip();
  };

  return (
    <button onClick={handleCreateTrip}>
      Create Trip
    </button>
  );
}
```

### Manual Subscription Management

```tsx
import { useWebPush } from '@/hooks/useWebPush';

function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = useWebPush();

  if (!isSupported) {
    return <p>Push notifications are not supported in this browser.</p>;
  }

  return (
    <div>
      <p>Permission: {permission}</p>
      <p>Subscribed: {isSubscribed ? 'Yes' : 'No'}</p>
      
      {permission === 'denied' && (
        <p className="text-red-500">
          Notifications are blocked. Please enable them in browser settings.
        </p>
      )}
      
      {permission !== 'denied' && (
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : isSubscribed ? 'Unsubscribe' : 'Subscribe'}
        </button>
      )}
      
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

## Sending Notifications

### From Frontend (via Service)

```typescript
import { notificationService } from '@/services/notificationService';

// New chat message
await notificationService.notifyNewMessage(
  tripId,
  'John Doe',
  'Hey everyone, what time should we meet?',
  messageId,
  currentUserId // exclude sender
);

// Itinerary update
await notificationService.notifyItineraryUpdate(
  tripId,
  'Beach Vacation',
  'Jane Smith',
  eventId,
  currentUserId
);

// Payment request
await notificationService.notifyPaymentRequest(
  tripId,
  'Mike Johnson',
  '$45.00',
  'Dinner at Olive Garden',
  paymentId,
  participantIds
);

// Trip reminder (24 hours before)
await notificationService.notifyTripReminder(
  tripId,
  'Beach Vacation',
  'Miami, FL',
  memberIds
);
```

### Direct Edge Function Call

```typescript
const { data, error } = await supabase.functions.invoke('web-push-send', {
  body: {
    tripId: 'uuid-here',
    excludeUserId: 'sender-uuid',
    type: 'chat_message',
    title: 'John Doe',
    body: 'Hey everyone!',
    data: {
      tripId: 'uuid-here',
      messageId: 'message-uuid',
    },
    actions: [
      { action: 'reply', title: 'Reply' },
      { action: 'view', title: 'View Trip' },
    ],
  },
});
```

## Example Notification Payloads

### Chat Message

```json
{
  "type": "chat_message",
  "title": "John Doe",
  "body": "Hey everyone, what time should we meet at the airport?",
  "icon": "/chravel-logo.png",
  "badge": "/chravel-badge.png",
  "tag": "chravel-chat-123456789",
  "data": {
    "type": "chat_message",
    "tripId": "550e8400-e29b-41d4-a716-446655440000",
    "messageId": "660e8400-e29b-41d4-a716-446655440001",
    "timestamp": 1707091200000
  },
  "actions": [
    { "action": "reply", "title": "Reply", "icon": "/icons/reply.png" },
    { "action": "view", "title": "View Trip", "icon": "/icons/view.png" }
  ],
  "requireInteraction": false
}
```

### Itinerary Update

```json
{
  "type": "itinerary_update",
  "title": "Beach Vacation - Itinerary Updated",
  "body": "Jane Smith added 'Snorkeling Tour' on March 15",
  "icon": "/chravel-logo.png",
  "badge": "/chravel-badge.png",
  "tag": "chravel-itinerary-123456789",
  "data": {
    "type": "itinerary_update",
    "tripId": "550e8400-e29b-41d4-a716-446655440000",
    "eventId": "770e8400-e29b-41d4-a716-446655440002",
    "timestamp": 1707091200000
  },
  "actions": [
    { "action": "view", "title": "View Changes", "icon": "/icons/calendar.png" }
  ],
  "requireInteraction": false
}
```

### Payment Request

```json
{
  "type": "payment_request",
  "title": "💰 Payment Request",
  "body": "Mike Johnson requested $45.00 for \"Dinner at Olive Garden\"",
  "icon": "/chravel-logo.png",
  "badge": "/chravel-badge.png",
  "tag": "chravel-payment-123456789",
  "data": {
    "type": "payment_request",
    "tripId": "550e8400-e29b-41d4-a716-446655440000",
    "paymentId": "880e8400-e29b-41d4-a716-446655440003",
    "amount": 45.00,
    "currency": "USD",
    "timestamp": 1707091200000
  },
  "actions": [
    { "action": "pay", "title": "Pay Now", "icon": "/icons/payment.png" },
    { "action": "view", "title": "View Details", "icon": "/icons/view.png" }
  ],
  "requireInteraction": true
}
```

### Payment Split

```json
{
  "type": "payment_split",
  "title": "💳 Expense Split",
  "body": "Sarah added a $120.00 expense for \"Hotel Room\". Your share: $40.00",
  "icon": "/chravel-logo.png",
  "badge": "/chravel-badge.png",
  "tag": "chravel-split-123456789",
  "data": {
    "type": "payment_split",
    "tripId": "550e8400-e29b-41d4-a716-446655440000",
    "paymentId": "990e8400-e29b-41d4-a716-446655440004",
    "totalAmount": 120.00,
    "userShare": 40.00,
    "currency": "USD",
    "timestamp": 1707091200000
  },
  "actions": [
    { "action": "pay", "title": "Settle Up", "icon": "/icons/payment.png" },
    { "action": "view", "title": "View Split", "icon": "/icons/view.png" }
  ],
  "requireInteraction": false
}
```

### 24-Hour Trip Reminder

```json
{
  "type": "trip_reminder",
  "title": "🧳 Beach Vacation starts tomorrow!",
  "body": "Your trip to Miami, FL begins in 24 hours. Make sure you're ready!",
  "icon": "/chravel-logo.png",
  "badge": "/chravel-badge.png",
  "image": "/trip-images/miami-cover.jpg",
  "tag": "chravel-reminder-550e8400",
  "data": {
    "type": "trip_reminder",
    "tripId": "550e8400-e29b-41d4-a716-446655440000",
    "tripName": "Beach Vacation",
    "destination": "Miami, FL",
    "startDate": "2024-03-15T10:00:00Z",
    "timestamp": 1707091200000
  },
  "actions": [
    { "action": "view", "title": "View Trip", "icon": "/icons/trip.png" },
    { "action": "dismiss", "title": "Dismiss", "icon": "/icons/close.png" }
  ],
  "requireInteraction": true
}
```

### Trip Invite

```json
{
  "type": "trip_invite",
  "title": "You're invited! 🎉",
  "body": "Sarah invited you to join \"Beach Vacation\" in Miami, FL",
  "icon": "/chravel-logo.png",
  "badge": "/chravel-badge.png",
  "tag": "chravel-invite-123456789",
  "data": {
    "type": "trip_invite",
    "tripId": "550e8400-e29b-41d4-a716-446655440000",
    "inviteId": "aa0e8400-e29b-41d4-a716-446655440005",
    "inviterName": "Sarah",
    "tripName": "Beach Vacation",
    "timestamp": 1707091200000
  },
  "actions": [
    { "action": "accept", "title": "Accept", "icon": "/icons/check.png" },
    { "action": "view", "title": "View Trip", "icon": "/icons/view.png" }
  ],
  "requireInteraction": true
}
```

### Poll Vote Request

```json
{
  "type": "poll_vote",
  "title": "📊 New Poll: Restaurant Choice",
  "body": "Vote on where to have dinner tonight! 3 options available.",
  "icon": "/chravel-logo.png",
  "badge": "/chravel-badge.png",
  "tag": "chravel-poll-123456789",
  "data": {
    "type": "poll_vote",
    "tripId": "550e8400-e29b-41d4-a716-446655440000",
    "pollId": "bb0e8400-e29b-41d4-a716-446655440006",
    "pollTitle": "Restaurant Choice",
    "timestamp": 1707091200000
  },
  "actions": [
    { "action": "vote", "title": "Vote Now", "icon": "/icons/poll.png" },
    { "action": "view", "title": "View Poll", "icon": "/icons/view.png" }
  ],
  "requireInteraction": false
}
```

### Task Assignment

```json
{
  "type": "task_assigned",
  "title": "📋 New Task Assigned",
  "body": "John assigned you: \"Book airport shuttle\"",
  "icon": "/chravel-logo.png",
  "badge": "/chravel-badge.png",
  "tag": "chravel-task-123456789",
  "data": {
    "type": "task_assigned",
    "tripId": "550e8400-e29b-41d4-a716-446655440000",
    "taskId": "cc0e8400-e29b-41d4-a716-446655440007",
    "taskTitle": "Book airport shuttle",
    "dueDate": "2024-03-14T18:00:00Z",
    "timestamp": 1707091200000
  },
  "actions": [
    { "action": "complete", "title": "Mark Complete", "icon": "/icons/check.png" },
    { "action": "view", "title": "View Task", "icon": "/icons/task.png" }
  ],
  "requireInteraction": false
}
```

### Broadcast/Announcement

```json
{
  "type": "broadcast",
  "title": "📢 Beach Vacation Announcement",
  "body": "Important: Meet in the hotel lobby at 9 AM tomorrow for the excursion!",
  "icon": "/chravel-logo.png",
  "badge": "/chravel-badge.png",
  "tag": "chravel-broadcast-123456789",
  "data": {
    "type": "broadcast",
    "tripId": "550e8400-e29b-41d4-a716-446655440000",
    "broadcastId": "dd0e8400-e29b-41d4-a716-446655440008",
    "senderName": "Trip Organizer",
    "timestamp": 1707091200000
  },
  "actions": [
    { "action": "view", "title": "View", "icon": "/icons/broadcast.png" }
  ],
  "requireInteraction": true
}
```

### @Mention

```json
{
  "type": "mention",
  "title": "Sarah mentioned you",
  "body": "@John can you bring the sunscreen? ☀️",
  "icon": "/chravel-logo.png",
  "badge": "/chravel-badge.png",
  "tag": "chravel-mention-123456789",
  "data": {
    "type": "mention",
    "tripId": "550e8400-e29b-41d4-a716-446655440000",
    "messageId": "ee0e8400-e29b-41d4-a716-446655440009",
    "mentionerName": "Sarah",
    "timestamp": 1707091200000
  },
  "actions": [
    { "action": "reply", "title": "Reply", "icon": "/icons/reply.png" },
    { "action": "view", "title": "View Trip", "icon": "/icons/view.png" }
  ],
  "requireInteraction": false
}
```

## Database Schema

### web_push_subscriptions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| endpoint | TEXT | Push service URL |
| p256dh_key | TEXT | ECDH public key (base64url) |
| auth_key | TEXT | Auth secret (base64url) |
| user_agent | TEXT | Browser info |
| device_name | TEXT | Friendly device name |
| is_active | BOOLEAN | Whether subscription is active |
| failed_count | INTEGER | Consecutive delivery failures |
| last_used_at | TIMESTAMPTZ | Last successful delivery |
| created_at | TIMESTAMPTZ | Created timestamp |
| updated_at | TIMESTAMPTZ | Updated timestamp |

### notification_queue

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Target user |
| type | notification_type | Type of notification |
| title | TEXT | Notification title |
| body | TEXT | Notification body |
| data | JSONB | Custom data payload |
| actions | JSONB | Action buttons |
| scheduled_for | TIMESTAMPTZ | When to send |
| status | TEXT | pending/sent/failed/cancelled |
| trip_id | UUID | Associated trip (optional) |

## Troubleshooting

### "Permission denied"
- User explicitly blocked notifications
- Check browser settings: Settings > Privacy > Notifications

### "Service worker not available"
- Ensure SW is registered (`/sw.js`)
- Check for HTTPS (required for push)
- Verify no SW registration errors in console

### "VAPID keys not configured"
- Set `VITE_VAPID_PUBLIC_KEY` in `.env`
- Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Supabase secrets

### "Subscription expired"
- Push subscriptions can expire
- Re-subscribe when app loads
- Handle 410 responses from push service

### Notifications not showing
- Check Do Not Disturb / Focus mode
- Verify notification preferences in OS settings
- Check quiet hours in app settings

## Security Considerations

1. **Never expose VAPID private key** - Only use in Edge Functions
2. **Use HTTPS** - Required for service workers and push
3. **Validate user ownership** - Only allow users to manage their own subscriptions
4. **Rate limiting** - Implement rate limits on notification sends
5. **Respect user preferences** - Check quiet hours and notification settings
6. **Handle failures gracefully** - Deactivate invalid subscriptions after failures

## Best Practices

1. **Request permission contextually** - Ask after meaningful action (e.g., first trip)
2. **Provide clear value** - Explain what notifications they'll receive
3. **Allow granular control** - Let users choose notification types
4. **Don't spam** - Batch notifications when possible
5. **Handle offline gracefully** - Queue notifications for retry
6. **Test on multiple browsers** - Safari, Chrome, Firefox behave differently
7. **Monitor delivery rates** - Track successful/failed deliveries
