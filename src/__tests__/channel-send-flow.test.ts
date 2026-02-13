/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * Tests for channel message send flow.
 *
 * Verifies:
 * 1. A channel member can send a message (positive path)
 * 2. A non-member gets a clear error mapped to a user-friendly toast (negative path)
 * 3. Service methods throw errors instead of silently returning null
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapChannelSendError, validateMessageContent } from '../utils/channelErrors';

// ============================================
// Mock Supabase at module level
// ============================================
const mockInsertSelect = vi.fn();
const mockInsertSingle = vi.fn();
const mockGetUser = vi.fn();
const mockUpsert = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: vi.fn((table: string) => {
      if (table === 'channel_messages') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockInsertSingle,
            })),
          })),
        };
      }
      if (table === 'channel_members') {
        return {
          upsert: mockUpsert,
        };
      }
      // Default fallback
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  },
}));

// Import after mock
import { channelService } from '../services/channelService';

describe('Channel Send Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Positive path: member can send a message
  // ============================================
  describe('channel member can send message', () => {
    it('validates and sends a valid message successfully', async () => {
      const content = 'Hey team, meet at gate B12!';
      const channelId = 'channel-abc-123';

      // Validate content first
      const validationError = validateMessageContent(content);
      expect(validationError).toBeNull();

      // Mock authenticated user
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@chravel.com' } },
        error: null,
      });

      // Mock successful insert
      mockInsertSingle.mockResolvedValue({
        data: {
          id: 'msg-new-1',
          channel_id: channelId,
          sender_id: 'user-123',
          content,
          message_type: 'text',
          metadata: {},
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await channelService.sendMessage({
        channelId,
        content,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('msg-new-1');
      expect(result.channelId).toBe(channelId);
      expect(result.content).toBe(content);
      expect(result.senderId).toBe('user-123');
    });

    it('trims whitespace from content before sending', () => {
      const content = '  Hello!  ';
      const validationError = validateMessageContent(content);
      expect(validationError).toBeNull(); // Trimmed content is valid
    });
  });

  // ============================================
  // Negative path: non-member gets RLS rejection
  // ============================================
  describe('non-member cannot send message', () => {
    it('throws when RLS blocks the insert and maps to correct toast', async () => {
      const channelId = 'channel-private-456';
      const content = 'I should not be able to post here';

      // Mock authenticated user (but not a channel member)
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'non-member-user', email: 'outsider@test.com' } },
        error: null,
      });

      // Mock RLS denial
      const rlsError = {
        code: '42501',
        message: 'new row violates row-level security policy for table "channel_messages"',
        details: null,
        hint: null,
      };
      mockInsertSingle.mockResolvedValue({
        data: null,
        error: rlsError,
      });

      // sendMessage should throw instead of returning null
      await expect(
        channelService.sendMessage({ channelId, content })
      ).rejects.toMatchObject({
        code: '42501',
      });

      // The calling component maps the error to a user-friendly toast
      try {
        await channelService.sendMessage({ channelId, content });
      } catch (err) {
        const mapped = mapChannelSendError(err);
        expect(mapped.title).toBe('Cannot send message');
        expect(mapped.description).toContain("don't have access");
      }
    });

    it('throws when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        channelService.sendMessage({ channelId: 'ch-1', content: 'test' })
      ).rejects.toThrow('logged in');
    });

    it('throws when channel_id is missing', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      await expect(
        channelService.sendMessage({ channelId: '', content: 'test' })
      ).rejects.toThrow('No channel selected');
    });
  });

  // ============================================
  // Validation edge cases
  // ============================================
  describe('message validation', () => {
    it('rejects empty string', () => {
      const result = validateMessageContent('');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Empty message');
    });

    it('rejects whitespace-only string', () => {
      const result = validateMessageContent('   \n\t  ');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Empty message');
    });

    it('rejects messages over 5000 chars', () => {
      const result = validateMessageContent('x'.repeat(5001));
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Message too long');
    });

    it('accepts valid message', () => {
      expect(validateMessageContent('Hello!')).toBeNull();
    });
  });

  // ============================================
  // Error propagation (no silent failures)
  // ============================================
  describe('error propagation', () => {
    it('sendMessage throws on network error (never returns null)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      mockInsertSingle.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(
        channelService.sendMessage({ channelId: 'ch-1', content: 'test' })
      ).rejects.toThrow('fetch');
    });

    it('sendMessage throws on Supabase error object', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      mockInsertSingle.mockResolvedValue({
        data: null,
        error: { code: '23503', message: 'violates foreign key' },
      });

      await expect(
        channelService.sendMessage({ channelId: 'ch-1', content: 'test' })
      ).rejects.toMatchObject({ code: '23503' });

      // And the error maps to correct toast
      try {
        await channelService.sendMessage({ channelId: 'ch-1', content: 'test' });
      } catch (err) {
        const mapped = mapChannelSendError(err);
        expect(mapped.title).toBe('Channel unavailable');
      }
    });
  });
});
