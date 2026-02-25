/**
 * Push Notification Trigger Service
 *
 * Triggers push notifications via the send-push edge function.
 * Fails gracefully if push is not configured - never blocks app functionality.
 */

import { supabase } from '@/integrations/supabase/client';

export interface PushPayload {
  type:
    | 'chat_message'
    | 'trip_update'
    | 'poll_update'
    | 'task_update'
    | 'calendar_event'
    | 'broadcast';
  tripId: string;
  threadId?: string;
  messageId?: string;
  eventId?: string;
  pollId?: string;
  taskId?: string;
}

export interface NotificationContent {
  title: string;
  body: string;
  data?: PushPayload;
}

interface SendPushResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Send push notification to specific users
 */
export async function sendPushToUsers(
  userIds: string[],
  notification: NotificationContent,
): Promise<SendPushResult> {
  if (!userIds.length) {
    return { success: true, sent: 0, failed: 0, errors: [] };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        userIds,
        notification,
      },
    });

    if (error) {
      console.warn('[pushTrigger] Edge function error (non-blocking):', error.message);
      return { success: false, sent: 0, failed: userIds.length, errors: [error.message] };
    }

    return data as SendPushResult;
  } catch (err) {
    // Fail gracefully - push should never block app functionality
    console.warn('[pushTrigger] Failed to send push (non-blocking):', err);
    return { success: false, sent: 0, failed: userIds.length, errors: [String(err)] };
  }
}

/**
 * Send push notification to all trip members except the sender
 */
export async function sendPushToTrip(
  tripId: string,
  excludeUserId: string,
  notification: NotificationContent,
): Promise<SendPushResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        tripId,
        excludeUserId,
        notification,
      },
    });

    if (error) {
      console.warn('[pushTrigger] Edge function error (non-blocking):', error.message);
      return { success: false, sent: 0, failed: 0, errors: [error.message] };
    }

    return data as SendPushResult;
  } catch (err) {
    // Fail gracefully - push should never block app functionality
    console.warn('[pushTrigger] Failed to send push (non-blocking):', err);
    return { success: false, sent: 0, failed: 0, errors: [String(err)] };
  }
}

/**
 * Send chat message notification to trip members
 * Called after a message is successfully created
 */
export async function notifyTripOfChatMessage(params: {
  tripId: string;
  senderId: string;
  senderName: string;
  messageContent: string;
  messageId?: string;
  threadId?: string;
  tripName?: string;
}): Promise<void> {
  const { tripId, senderId, senderName, messageContent, messageId, threadId, tripName } = params;

  // Truncate message content for notification
  const truncatedContent =
    messageContent.length > 100 ? messageContent.substring(0, 97) + '...' : messageContent;

  const notification: NotificationContent = {
    title: tripName ? `${senderName} in ${tripName}` : senderName,
    body: truncatedContent,
    data: {
      type: 'chat_message',
      tripId,
      messageId,
      threadId,
    },
  };

  // Fire and forget - don't await, don't block message creation
  sendPushToTrip(tripId, senderId, notification).then(result => {
    if (result.sent > 0) {
      console.log(`[pushTrigger] Chat notification sent to ${result.sent} devices`);
    }
  });
}

/**
 * Send broadcast notification to trip members
 */
export async function notifyTripOfBroadcast(params: {
  tripId: string;
  senderId: string;
  senderName: string;
  broadcastMessage: string;
  tripName?: string;
}): Promise<void> {
  const { tripId, senderId, senderName, broadcastMessage, tripName } = params;

  const truncatedContent =
    broadcastMessage.length > 100 ? broadcastMessage.substring(0, 97) + '...' : broadcastMessage;

  const notification: NotificationContent = {
    title: tripName ? `📢 ${tripName}` : '📢 Broadcast',
    body: `${senderName}: ${truncatedContent}`,
    data: {
      type: 'broadcast',
      tripId,
    },
  };

  sendPushToTrip(tripId, senderId, notification).then(result => {
    if (result.sent > 0) {
      console.log(`[pushTrigger] Broadcast notification sent to ${result.sent} devices`);
    }
  });
}

/**
 * Send poll notification to trip members
 */
export async function notifyTripOfPoll(params: {
  tripId: string;
  creatorId: string;
  creatorName: string;
  pollQuestion: string;
  pollId: string;
  tripName?: string;
}): Promise<void> {
  const { tripId, creatorId, creatorName, pollQuestion, pollId, tripName } = params;

  const truncatedQuestion =
    pollQuestion.length > 80 ? pollQuestion.substring(0, 77) + '...' : pollQuestion;

  const notification: NotificationContent = {
    title: tripName ? `📊 New Poll in ${tripName}` : '📊 New Poll',
    body: `${creatorName}: ${truncatedQuestion}`,
    data: {
      type: 'poll_update',
      tripId,
      pollId,
    },
  };

  sendPushToTrip(tripId, creatorId, notification).then(result => {
    if (result.sent > 0) {
      console.log(`[pushTrigger] Poll notification sent to ${result.sent} devices`);
    }
  });
}

/**
 * Send task notification to specific user
 */
export async function notifyUserOfTask(params: {
  userId: string;
  assignerId: string;
  assignerName: string;
  taskTitle: string;
  taskId: string;
  tripId: string;
  tripName?: string;
}): Promise<void> {
  const { userId, assignerId, assignerName, taskTitle, taskId, tripId, tripName } = params;

  // Don't notify if assigning to self
  if (userId === assignerId) return;

  const notification: NotificationContent = {
    title: tripName ? `✅ Task in ${tripName}` : '✅ New Task',
    body: `${assignerName} assigned you: ${taskTitle}`,
    data: {
      type: 'task_update',
      tripId,
      taskId,
    },
  };

  sendPushToUsers([userId], notification).then(result => {
    if (result.sent > 0) {
      console.log(`[pushTrigger] Task notification sent to user ${userId}`);
    }
  });
}

/**
 * Send calendar event reminder
 */
export async function notifyTripOfEvent(params: {
  tripId: string;
  creatorId: string;
  eventTitle: string;
  eventId: string;
  tripName?: string;
}): Promise<void> {
  const { tripId, creatorId, eventTitle, eventId, tripName } = params;

  const notification: NotificationContent = {
    title: tripName ? `📅 ${tripName}` : '📅 New Event',
    body: eventTitle,
    data: {
      type: 'calendar_event',
      tripId,
      eventId,
    },
  };

  sendPushToTrip(tripId, creatorId, notification).then(result => {
    if (result.sent > 0) {
      console.log(`[pushTrigger] Event notification sent to ${result.sent} devices`);
    }
  });
}
