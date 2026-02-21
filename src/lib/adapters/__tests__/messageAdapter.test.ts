import { describe, it, expect } from 'vitest';
import { toAppMessage, toUnifiedMessage, toDbMessageInsert } from '../messageAdapter';
import type { Database } from '../../../integrations/supabase/types';

type ChatMessageRow = Database['public']['Tables']['trip_chat_messages']['Row'];

const baseRow: ChatMessageRow = {
  id: 'chat-1',
  trip_id: 'trip-1',
  content: 'Hey everyone!',
  author_name: 'Alice',
  user_id: 'user-alice',
  created_at: '2026-02-01T10:00:00Z',
  updated_at: '2026-02-01T10:00:00Z',
  media_type: null,
  media_url: null,
  sentiment: null,
  link_preview: null,
  privacy_mode: null,
  privacy_encrypted: null,
  message_type: 'text',
  is_edited: false,
  edited_at: null,
  is_deleted: false,
  deleted_at: null,
  attachments: null,
  reply_to_id: null,
  thread_id: null,
  client_message_id: null,
  mentioned_user_ids: null,
  payload: null,
  system_event_type: null,
};

describe('messageAdapter', () => {
  describe('toAppMessage', () => {
    it('maps DB user_id -> Message.sender_id (high-risk #19)', () => {
      const result = toAppMessage(baseRow);
      expect(result.sender_id).toBe('user-alice');
    });

    it('also preserves user_id as optional field', () => {
      const result = toAppMessage(baseRow);
      expect(result.user_id).toBe('user-alice');
    });

    it('defaults null user_id to empty string for sender_id', () => {
      const row: ChatMessageRow = { ...baseRow, user_id: null };
      const result = toAppMessage(row);
      expect(result.sender_id).toBe('');
      expect(result.user_id).toBeUndefined();
    });

    it('preserves all core message fields', () => {
      const result = toAppMessage(baseRow);
      expect(result.id).toBe('chat-1');
      expect(result.trip_id).toBe('trip-1');
      expect(result.content).toBe('Hey everyone!');
      expect(result.author_name).toBe('Alice');
      expect(result.created_at).toBe('2026-02-01T10:00:00Z');
    });

    it('handles null optional fields as undefined', () => {
      const result = toAppMessage(baseRow);
      expect(result.media_type).toBeUndefined();
      expect(result.media_url).toBeUndefined();
      expect(result.reply_to_id).toBeUndefined();
      expect(result.thread_id).toBeUndefined();
    });
  });

  describe('toUnifiedMessage', () => {
    it('maps DB user_id -> UnifiedMessage.senderId', () => {
      const result = toUnifiedMessage(baseRow);
      expect(result.senderId).toBe('user-alice');
    });

    it('maps DB author_name -> UnifiedMessage.senderName', () => {
      const result = toUnifiedMessage(baseRow);
      expect(result.senderName).toBe('Alice');
    });

    it('maps DB created_at -> UnifiedMessage.timestamp', () => {
      const result = toUnifiedMessage(baseRow);
      expect(result.timestamp).toBe('2026-02-01T10:00:00Z');
    });

    it('normalizes message_type to canonical values', () => {
      const textRow: ChatMessageRow = { ...baseRow, message_type: 'text' };
      expect(toUnifiedMessage(textRow).type).toBe('text');

      const broadcastRow: ChatMessageRow = { ...baseRow, message_type: 'broadcast' };
      expect(toUnifiedMessage(broadcastRow).type).toBe('broadcast');

      const nullRow: ChatMessageRow = { ...baseRow, message_type: null };
      expect(toUnifiedMessage(nullRow).type).toBe('text');

      const unknownRow: ChatMessageRow = { ...baseRow, message_type: 'unknown-type' };
      expect(toUnifiedMessage(unknownRow).type).toBe('text');
    });

    it('accepts senderAvatar override', () => {
      const result = toUnifiedMessage(baseRow, { senderAvatar: 'https://avatar.url' });
      expect(result.senderAvatar).toBe('https://avatar.url');
    });

    it('builds replyTo from reply_to_id', () => {
      const row: ChatMessageRow = { ...baseRow, reply_to_id: 'reply-id' };
      const result = toUnifiedMessage(row);
      expect(result.replyTo).toEqual({
        messageId: 'reply-id',
        content: '',
        senderName: '',
      });
    });

    it('sets replyTo undefined when no reply_to_id', () => {
      expect(toUnifiedMessage(baseRow).replyTo).toBeUndefined();
    });
  });

  describe('toDbMessageInsert', () => {
    it('maps to DB field names correctly', () => {
      const result = toDbMessageInsert('trip-1', 'user-a', 'Alice', {
        content: 'Hello!',
      });

      expect(result.trip_id).toBe('trip-1');
      expect(result.user_id).toBe('user-a');
      expect(result.author_name).toBe('Alice');
      expect(result.content).toBe('Hello!');
      expect(result.message_type).toBe('text');
    });

    it('defaults optional fields to null', () => {
      const result = toDbMessageInsert('trip-1', 'user-a', 'Alice', {
        content: 'Test',
      });

      expect(result.reply_to_id).toBeNull();
      expect(result.thread_id).toBeNull();
      expect(result.media_type).toBeNull();
      expect(result.media_url).toBeNull();
      expect(result.privacy_mode).toBeNull();
    });
  });
});
