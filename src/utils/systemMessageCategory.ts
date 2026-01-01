// Category mapping for system messages
// Maps system_event_type to visibility category

export type SystemMessageCategory = 
  | 'member'
  | 'basecamp'
  | 'uploads'
  | 'polls'
  | 'calendar'
  | 'tasks'
  | 'payments';

export interface SystemMessageCategoryPrefs {
  member: boolean;
  basecamp: boolean;
  uploads: boolean;
  polls: boolean;
  calendar: boolean;
  tasks: boolean;
  payments: boolean;
}

export const DEFAULT_SYSTEM_MESSAGE_CATEGORIES: SystemMessageCategoryPrefs = {
  member: true,
  basecamp: true,
  uploads: true,
  polls: true,
  calendar: true,
  tasks: false,    // Hidden by default
  payments: false  // Hidden by default
};

/**
 * Maps a system_event_type to its visibility category
 */
export function getSystemMessageCategory(eventType: string): SystemMessageCategory | null {
  if (!eventType) return null;
  
  // Member events
  if (eventType.startsWith('member_')) {
    return 'member';
  }
  
  // Basecamp events
  if (eventType.includes('base_camp')) {
    return 'basecamp';
  }
  
  // Upload events
  if (eventType === 'photos_uploaded' || eventType === 'files_uploaded' || eventType === 'attachments_uploaded') {
    return 'uploads';
  }
  
  // Poll events
  if (eventType.startsWith('poll_')) {
    return 'polls';
  }
  
  // Calendar events
  if (eventType.startsWith('calendar_')) {
    return 'calendar';
  }
  
  // Task events
  if (eventType.startsWith('task_')) {
    return 'tasks';
  }
  
  // Payment events
  if (eventType.startsWith('payment_')) {
    return 'payments';
  }
  
  // Trip-level events are mapped to member (trip_created, trip_updated)
  if (eventType.startsWith('trip_')) {
    return 'member';
  }
  
  return null;
}

/**
 * Check if a system message should be visible based on user preferences
 */
export function shouldShowSystemMessage(
  showSystemMessages: boolean,
  categories: SystemMessageCategoryPrefs,
  eventType: string | undefined | null
): boolean {
  // If global toggle is off, hide all
  if (!showSystemMessages) {
    return false;
  }
  
  // If no event type, show by default (legacy messages)
  if (!eventType) {
    return true;
  }
  
  // Get category for this event type
  const category = getSystemMessageCategory(eventType);
  
  // If no category mapped, show by default
  if (!category) {
    return true;
  }
  
  // Check if this category is enabled
  return categories[category] ?? true;
}
