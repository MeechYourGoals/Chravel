// Unified Messaging Types

// Simple Message interface for backward compatibility
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  trip_id: string;
  created_at: string;
  updated_at?: string;
  author_name?: string;
  user_id?: string;
  reply_to_id?: string;
  thread_id?: string;
  is_edited?: boolean;
  edited_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  attachments?: Array<{
    type: 'image' | 'video' | 'file';
    url: string;
    name?: string;
  }>;
  media_type?: string;
  media_url?: string;
  link_preview?: any;
  privacy_mode?: string;
  privacy_encrypted?: boolean;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'video' | 'file' | 'link';
  url: string;
  filename?: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageReaction {
  type: string;
  count: number;
  userReacted: boolean;
  users?: string[];
}

export interface MessageMention {
  userId: string;
  userName: string;
  offset: number;
  length: number;
}

export interface UnifiedMessage {
  id: string;
  tripId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  edited?: boolean;
  editedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  
  // Message types
  type: 'text' | 'broadcast' | 'payment' | 'system';
  
  // Attachments & media
  attachments?: MessageAttachment[];
  
  // Interactions
  reactions?: Record<string, MessageReaction>;
  mentions?: MessageMention[];
  
  // Reply context
  replyTo?: {
    messageId: string;
    content: string;
    senderName: string;
  };
  
  // Broadcast specific
  priority?: 'fyi' | 'urgent';
  broadcastId?: string;
  
  // Payment specific
  paymentId?: string;
  paymentData?: {
    amount: number;
    currency: string;
    description: string;
    splitCount: number;
    settled?: boolean;
  };
  
  // System message specific
  systemAction?: string;
  systemData?: Record<string, unknown>;
  
  // Metadata
  metadata?: Record<string, unknown>;
}

export interface MessageFilter {
  type?: 'all' | 'broadcast' | 'payments' | 'system';
  senderId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasAttachments?: boolean;
  unreadOnly?: boolean;
}

export interface MessageDraft {
  tripId: string;
  content: string;
  attachments?: MessageAttachment[];
  replyTo?: string;
  mentions?: MessageMention[];
  savedAt: string;
}

export interface MessageNotification {
  messageId: string;
  tripId: string;
  tripName: string;
  senderName: string;
  preview: string;
  timestamp: string;
  read: boolean;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  timestamp: string;
}

export interface MessageReadReceipt {
  messageId: string;
  userId: string;
  readAt: string;
}
