export interface TripAdmin {
  id: string;
  tripId: string;
  userId: string;
  grantedBy: string | null;
  grantedAt: string;
}

export interface TripRole {
  id: string;
  tripId: string;
  roleName: string;
  description?: string;
  memberCount?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoleAssignment {
  id: string;
  tripId: string;
  userId: string;
  roleId: string;
  roleName?: string;
  assignedBy: string | null;
  assignedAt: string;
}

export interface TripChannel {
  id: string;
  tripId: string;
  channelName: string;
  channelSlug: string;
  description?: string;
  requiredRoleId: string;
  requiredRoleName?: string;
  isPrivate: boolean;
  isArchived: boolean;
  memberCount?: number;
  unreadCount?: number;
  lastMessage?: ChannelMessage;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  messageType: 'text' | 'file' | 'system';
  metadata?: Record<string, any>;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  joinedAt: string;
  lastReadAt?: string;
  isMuted: boolean;
}

export interface CreateRoleRequest {
  tripId: string;
  roleName: string;
  description?: string;
}

export interface AssignRoleRequest {
  tripId: string;
  userId: string;
  roleId: string;
}

export interface CreateChannelRequest {
  tripId: string;
  channelName: string;
  channelSlug: string;
  description?: string;
  requiredRoleId: string;
  isPrivate?: boolean;
}

export interface SendMessageRequest {
  channelId: string;
  content: string;
  messageType?: 'text' | 'file' | 'system' | 'regular' | 'broadcast';
  metadata?: Record<string, any>;
  broadcastCategory?: 'chill' | 'logistics' | 'urgent';
}
