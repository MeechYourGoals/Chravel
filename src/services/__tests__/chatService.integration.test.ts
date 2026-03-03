/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendChatMessage, subscribeToChatMessages } from '../chatService';
import {
  createMockSupabaseClient as _createMockSupabaseClient,
  mockUser as _mockUser,
} from '@/__tests__/utils/supabaseMocks';
import { supabase } from '@/integrations/supabase/client';

describe.skip('chatService - Integration Tests', () => {
  const tripId = 'trip-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('sendChatMessage', () => {
    it('should send a chat message successfully', async () => {
      const mockSupabase = vi.mocked(supabase);
      const messageData = {
        trip_id: tripId,
        content: 'Hello, everyone!',
        created_by: 'user-123',
        message_type: 'message' as const,
      };

      const createdMessage = {
        id: 'msg-123',
        ...messageData,
        created_at: '2024-01-01T10:00:00Z',
        attachments: null,
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdMessage,
              error: null,
            }),
          }),
        }),
      } as unknown);

      const result = await sendChatMessage(messageData);

      expect(result.id).toBe('msg-123');
      expect(result.content).toBe('Hello, everyone!');
      expect(result.trip_id).toBe(tripId);
    });

    it('should send a message with attachments', async () => {
      const mockSupabase = vi.mocked(supabase);
      const messageData = {
        trip_id: tripId,
        content: 'Check out this photo!',
        created_by: 'user-123',
        message_type: 'message' as const,
        attachments: [
          {
            type: 'image' as const,
            ref_id: 'media-123',
            url: 'https://example.com/image.jpg',
          },
        ],
      };

      const createdMessage = {
        id: 'msg-124',
        ...messageData,
        created_at: '2024-01-01T10:00:00Z',
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdMessage,
              error: null,
            }),
          }),
        }),
      } as unknown);

      const result = await sendChatMessage(messageData);

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments?.[0].type).toBe('image');
    });

    it('should handle errors when sending message', async () => {
      const mockSupabase = vi.mocked(supabase);
      const error = new Error('Failed to send message');

      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error,
            }),
          }),
        }),
      } as unknown);

      const messageData = {
        trip_id: tripId,
        content: 'Test message',
        created_by: 'user-123',
        message_type: 'message' as const,
      };

      await expect(sendChatMessage(messageData)).rejects.toThrow('Failed to send message');
    });
  });

  describe.skip('subscribeToChatMessages', () => {
    it('should subscribe to chat messages for a trip', () => {
      const mockSupabase = vi.mocked(supabase);
      const onInsert = vi.fn();

      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };

      mockSupabase.channel = vi.fn().mockReturnValue(mockChannel as unknown);

      const subscription = subscribeToChatMessages(tripId, onInsert);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`chat:${tripId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'trip_chat_messages',
          filter: `trip_id=eq.${tripId}`,
        }),
        expect.any(Function),
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(subscription).toBeDefined();
    });

    it('should call onInsert callback when new message is received', () => {
      const mockSupabase = vi.mocked(supabase);
      const onInsert = vi.fn();
      let callback: ((payload: unknown) => void) | null = null;

      const mockChannel = {
        on: vi.fn((event: string, config: unknown, handler: (payload: unknown) => void) => {
          callback = handler;
          return mockChannel;
        }),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };

      mockSupabase.channel = vi.fn().mockReturnValue(mockChannel as unknown);

      subscribeToChatMessages(tripId, onInsert);

      // Simulate a new message
      const newMessage = {
        id: 'msg-new',
        trip_id: tripId,
        content: 'New message',
        created_by: 'user-456',
        created_at: '2024-01-01T11:00:00Z',
      };

      if (callback) {
        callback({ new: newMessage });
      }

      expect(onInsert).toHaveBeenCalledWith(newMessage);
    });
  });
});
