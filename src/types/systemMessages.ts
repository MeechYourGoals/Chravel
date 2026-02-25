// System message types for consumer trip timeline

export type SystemEventType =
  | 'member_joined'
  | 'member_left'
  | 'member_join_requested'
  | 'member_join_approved'
  | 'member_join_denied'
  | 'trip_base_camp_updated'
  | 'personal_base_camp_updated'
  | 'poll_created'
  | 'poll_closed'
  | 'task_created'
  | 'task_completed'
  | 'calendar_item_added'
  | 'calendar_item_updated'
  | 'payment_recorded'
  | 'payment_settled'
  | 'photos_uploaded'
  | 'files_uploaded'
  | 'trip_created'
  | 'trip_updated';

export interface SystemMessagePayload {
  // Member events
  memberId?: string;
  memberName?: string;

  // Base camp events
  previousAddress?: string;
  newAddress?: string;
  previousName?: string;
  newName?: string;

  // Poll events
  pollId?: string;
  pollQuestion?: string;
  winningOption?: string;

  // Task events
  taskId?: string;
  taskTitle?: string;

  // Calendar events
  eventId?: string;
  eventTitle?: string;
  eventDate?: string;

  // Payment events
  paymentId?: string;
  amount?: number;
  currency?: string;
  description?: string;

  // Media events
  mediaCount?: number;
  mediaType?: 'photo' | 'file';

  // Generic
  actorName?: string;
  actorId?: string;
}

export interface SystemMessage {
  id: string;
  tripId: string;
  body: string;
  eventType: SystemEventType;
  payload?: SystemMessagePayload;
  createdAt: string;
}

// Demo system messages for consumer trips (IDs 1-12)
export interface DemoSystemMessage {
  tripId: string;
  body: string;
  eventType: SystemEventType;
  payload?: SystemMessagePayload;
  timestampOffsetDays: number;
}
