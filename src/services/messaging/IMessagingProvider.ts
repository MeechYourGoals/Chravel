// Unified messaging interface for all trip types
export interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'video' | 'file' | 'link';
  url: string;
  name?: string;
  size?: number;
}

export interface SendMessageOptions {
  content: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
}

export interface MessagingConfig {
  tripId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
}

// Core messaging provider interface
export interface IMessagingProvider {
  // Initialize connection
  connect(config: MessagingConfig): Promise<void>;

  // Disconnect and cleanup
  disconnect(): Promise<void>;

  // Send a message
  sendMessage(options: SendMessageOptions): Promise<Message>;

  // Subscribe to new messages
  onMessage(callback: (message: Message) => void): () => void;

  // Get message history
  getMessages(limit?: number, before?: Date): Promise<Message[]>;

  // Get unread count
  getUnreadCount(): Promise<number>;

  // Mark messages as read
  markAsRead(messageIds: string[]): Promise<void>;

  // Delete a message
  deleteMessage(messageId: string): Promise<void>;

  // Check if provider is connected
  isConnected(): boolean;
}
