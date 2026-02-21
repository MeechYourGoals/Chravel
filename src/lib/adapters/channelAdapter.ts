/**
 * Channel adapter: converts between Supabase DB rows and app-level types.
 *
 * DB tables: trip_channels (channel_name), channel_messages (sender_id)
 * App types: TripChannel (name), ChannelMessage (user_id)
 *
 * Key mismatches resolved:
 * - channel_name -> name
 * - sender_id -> user_id (in ChannelMessage -- current app convention)
 */

import type { Database } from '../../integrations/supabase/types';
import type { TripChannel, ChannelMessage } from '../../types/channels';

type ChannelRow = Database['public']['Tables']['trip_channels']['Row'];
type ChannelMessageRow = Database['public']['Tables']['channel_messages']['Row'];

/**
 * Converts a Supabase trip_channels row to an app-level TripChannel.
 *
 * Handles:
 * - channel_name -> name
 * - channel_slug -> slug
 * - Nullable is_archived -> defaults to false
 * - channel_type defaults to 'custom' (not in DB; app-only concept)
 */
export function toAppChannel(row: ChannelRow): TripChannel {
  return {
    id: row.id,
    trip_id: row.trip_id,
    name: row.channel_name,
    slug: row.channel_slug,
    description: row.description ?? undefined,
    channel_type: 'custom', // DB doesn't store this; default for now
    role_filter: null,
    created_by: row.created_by,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at ?? '',
    is_archived: row.is_archived ?? false,
  };
}

/**
 * Converts a Supabase channel_messages row to an app-level ChannelMessage.
 *
 * Key mismatch: DB has `sender_id`, app type uses `user_id`.
 * This adapter maps sender_id -> user_id to match current app convention.
 *
 * Note: author_name is not in the DB channel_messages table; it must be
 * resolved separately from profiles. Pass it as an override.
 */
export function toAppChannelMessage(
  row: ChannelMessageRow,
  overrides?: { authorName?: string; tripId?: string },
): ChannelMessage {
  return {
    id: row.id,
    channel_id: row.channel_id,
    trip_id: overrides?.tripId ?? '',
    user_id: row.sender_id,
    content: row.content,
    author_name: overrides?.authorName ?? '',
    created_at: row.created_at ?? '',
    updated_at: row.created_at ?? '', // channel_messages has no updated_at; use created_at
    edited_at: row.edited_at ?? undefined,
    is_edited: false, // Not in DB schema; default
    is_deleted: row.deleted_at !== null ? true : undefined,
    deleted_at: row.deleted_at ?? undefined,
  };
}

/**
 * Converts app-level channel data to a DB-compatible insert payload.
 */
export function toDbChannelInsert(
  tripId: string,
  createdBy: string,
  data: {
    name: string;
    slug: string;
    description?: string;
  },
): Database['public']['Tables']['trip_channels']['Insert'] {
  return {
    trip_id: tripId,
    created_by: createdBy,
    channel_name: data.name,
    channel_slug: data.slug,
    description: data.description ?? null,
  };
}
