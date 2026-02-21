import { describe, it, expect } from 'vitest';
import { toAppChannel, toAppChannelMessage, toDbChannelInsert } from '../channelAdapter';
import type { Database } from '../../../integrations/supabase/types';

type ChannelRow = Database['public']['Tables']['trip_channels']['Row'];
type ChannelMessageRow = Database['public']['Tables']['channel_messages']['Row'];

const baseChannelRow: ChannelRow = {
  id: 'ch-1',
  trip_id: 'trip-1',
  channel_name: 'General Discussion',
  channel_slug: 'general-discussion',
  description: 'Main channel',
  created_by: 'user-a',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  is_archived: false,
  is_private: false,
  required_role_id: null,
  archived_at: null,
};

const baseMessageRow: ChannelMessageRow = {
  id: 'msg-1',
  channel_id: 'ch-1',
  sender_id: 'user-b',
  content: 'Hello everyone!',
  created_at: '2026-01-05T12:00:00Z',
  edited_at: null,
  deleted_at: null,
  message_type: 'text',
  metadata: null,
  broadcast_category: null,
  broadcast_priority: null,
};

describe('channelAdapter', () => {
  describe('toAppChannel', () => {
    it('maps channel_name -> name (high-risk #17)', () => {
      const result = toAppChannel(baseChannelRow);
      expect(result.name).toBe('General Discussion');
    });

    it('maps channel_slug -> slug', () => {
      const result = toAppChannel(baseChannelRow);
      expect(result.slug).toBe('general-discussion');
    });

    it('preserves all identity fields', () => {
      const result = toAppChannel(baseChannelRow);
      expect(result.id).toBe('ch-1');
      expect(result.trip_id).toBe('trip-1');
      expect(result.created_by).toBe('user-a');
    });

    it('defaults null is_archived to false', () => {
      const row: ChannelRow = { ...baseChannelRow, is_archived: null };
      expect(toAppChannel(row).is_archived).toBe(false);
    });

    it('converts null description to undefined', () => {
      const row: ChannelRow = { ...baseChannelRow, description: null };
      expect(toAppChannel(row).description).toBeUndefined();
    });

    it('defaults null timestamps to empty string', () => {
      const row: ChannelRow = { ...baseChannelRow, created_at: null, updated_at: null };
      const result = toAppChannel(row);
      expect(result.created_at).toBe('');
      expect(result.updated_at).toBe('');
    });
  });

  describe('toAppChannelMessage', () => {
    it('maps sender_id -> user_id (high-risk #18)', () => {
      const result = toAppChannelMessage(baseMessageRow);
      expect(result.user_id).toBe('user-b');
    });

    it('preserves channel_id and content', () => {
      const result = toAppChannelMessage(baseMessageRow);
      expect(result.channel_id).toBe('ch-1');
      expect(result.content).toBe('Hello everyone!');
    });

    it('accepts override for authorName and tripId', () => {
      const result = toAppChannelMessage(baseMessageRow, {
        authorName: 'Bob',
        tripId: 'trip-99',
      });
      expect(result.author_name).toBe('Bob');
      expect(result.trip_id).toBe('trip-99');
    });

    it('defaults authorName and tripId when no overrides', () => {
      const result = toAppChannelMessage(baseMessageRow);
      expect(result.author_name).toBe('');
      expect(result.trip_id).toBe('');
    });

    it('derives is_deleted from deleted_at', () => {
      const deletedRow: ChannelMessageRow = {
        ...baseMessageRow,
        deleted_at: '2026-01-06T00:00:00Z',
      };
      expect(toAppChannelMessage(deletedRow).is_deleted).toBe(true);

      const activeRow: ChannelMessageRow = { ...baseMessageRow, deleted_at: null };
      expect(toAppChannelMessage(activeRow).is_deleted).toBeUndefined();
    });
  });

  describe('toDbChannelInsert', () => {
    it('maps name -> channel_name', () => {
      const result = toDbChannelInsert('trip-1', 'user-a', {
        name: 'Logistics',
        slug: 'logistics',
      });
      expect(result.channel_name).toBe('Logistics');
      expect(result.channel_slug).toBe('logistics');
      expect(result.trip_id).toBe('trip-1');
      expect(result.created_by).toBe('user-a');
    });

    it('defaults null description', () => {
      const result = toDbChannelInsert('trip-1', 'user-a', {
        name: 'General',
        slug: 'general',
      });
      expect(result.description).toBeNull();
    });
  });
});
