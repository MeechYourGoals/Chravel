import { RichLinkPreview } from './chatAttachment';

export interface TripChannel {
  id: string;
  trip_id: string;
  name: string;
  slug: string;
  description?: string;
  channel_type: 'role' | 'custom';
  role_filter?: {
    role?: string;
    department?: string;
  } | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role?: string;
  joined_at: string;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  trip_id: string;
  user_id: string;
  content: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  is_edited?: boolean;
  is_deleted?: boolean;
  deleted_at?: string;
  reply_to_id?: string;
  thread_id?: string;
  attachments?: Array<{
    type: 'image' | 'file' | 'video';
    url: string;
    name?: string;
    size?: number;
  }>;
  media_type?: string;
  media_url?: string;
  link_preview?: RichLinkPreview | null;
  privacy_mode?: string;
  privacy_encrypted?: boolean;
  sentiment?: string;
}

export interface ChannelPermissions {
  can_read: boolean;
  can_write: boolean;
  can_manage: boolean;
}

export interface CreateChannelRequest {
  trip_id: string;
  name: string;
  description?: string;
  channel_type: 'role' | 'custom';
  role_filter?: {
    role?: string;
    department?: string;
  };
  member_user_ids?: string[];
}

export interface UpdateChannelRequest {
  name?: string;
  description?: string;
  is_archived?: boolean;
}

export interface ChannelMessageInput {
  trip_id: string;
  channel_id: string;
  content: string;
  parent_id?: string;
  attachments?: Array<{
    type: 'image' | 'file' | 'video';
    url: string;
    name?: string;
    size?: number;
  }>;
}

export interface ChannelStats {
  channel_id: string;
  member_count: number;
  message_count: number;
  last_message_at?: string;
  unread_count?: number;
}

export interface ChannelWithStats extends TripChannel {
  stats: ChannelStats;
  member_count: number;
  last_message?: ChannelMessage;
  is_unread: boolean;
}

export interface ChannelListFilters {
  channel_type?: 'role' | 'custom' | 'all';
  is_archived?: boolean;
  search?: string;
}

export interface ChannelMemberWithProfile extends ChannelMember {
  profile: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    role?: string;
  };
}

export interface ChannelInviteRequest {
  channel_id: string;
  user_ids: string[];
  message?: string;
}

export interface ChannelNotificationSettings {
  channel_id: string;
  user_id: string;
  notifications_enabled: boolean;
  mention_notifications: boolean;
  all_messages_notifications: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}
