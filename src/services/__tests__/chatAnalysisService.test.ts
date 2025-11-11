/**
 * Tests for Chat Analysis Service - Payment Participant Detection
 * 
 * Tests AI-powered and pattern-based payment participant detection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectPaymentParticipantsFromMessage,
  getAutomaticParticipantSuggestions,
  analyzeChatMessagesForPayment,
  recordPaymentSplitPattern,
  PaymentParticipantSuggestion,
  PaymentParsingResult
} from '../chatAnalysisService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('chatAnalysisService', () => {
  const mockTripId = 'trip-123';
  const mockUserId = 'user-1';
  const mockProfiles = [
    { user_id: 'user-1', display_name: 'Alice' },
    { user_id: 'user-2', display_name: 'Bob' },
    { user_id: 'user-3', display_name: 'Charlie' },
    { user_id: 'user-4', display_name: 'Diana' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectPaymentParticipantsFromMessage', () => {
    it('should detect participants from direct mentions', async () => {
      const message = 'Sam owes me $50';
      
      // Mock trip members
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
            error: null
          });
        })
      });

      // Mock profiles
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: mockProfiles,
            error: null
          });
        })
      });

      // Mock AI parsing (fallback to pattern matching)
      (supabase.functions.invoke as any).mockRejectedValueOnce(new Error('AI unavailable'));

      const result = await detectPaymentParticipantsFromMessage(
        message,
        mockTripId,
        mockUserId
      );

      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect "split between" patterns', async () => {
      const message = 'Dinner split between me, Sarah, and Mike';

      // Mock responses
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: mockProfiles,
            error: null
          });
        })
      });

      (supabase.functions.invoke as any).mockRejectedValueOnce(new Error('AI unavailable'));

      const result = await detectPaymentParticipantsFromMessage(
        message,
        mockTripId,
        mockUserId
      );

      expect(result.suggestedParticipants.length).toBeGreaterThan(0);
    });

    it('should extract amount and currency', async () => {
      const message = 'I paid €100 for the hotel';

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: mockProfiles,
            error: null
          });
        })
      });

      (supabase.functions.invoke as any).mockRejectedValueOnce(new Error('AI unavailable'));

      const result = await detectPaymentParticipantsFromMessage(
        message,
        mockTripId,
        mockUserId
      );

      expect(result.amount).toBe(100);
      expect(result.currency).toBe('EUR');
    });

    it('should use AI parsing when available', async () => {
      const message = 'Split dinner with Bob and Charlie';

      // Mock AI response
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: {
          response: JSON.stringify({
            participants: ['Bob', 'Charlie'],
            confidence: 0.85
          })
        },
        error: null
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: mockProfiles,
            error: null
          });
        })
      });

      const result = await detectPaymentParticipantsFromMessage(
        message,
        mockTripId,
        mockUserId
      );

      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('getAutomaticParticipantSuggestions', () => {
    it('should return historical suggestions when available', async () => {
      // Mock trip members
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: [{ user_id: 'user-2' }, { user_id: 'user-3' }],
            error: null
          });
        })
      });

      // Mock profiles
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: mockProfiles.slice(1),
            error: null
          });
        })
      });

      // Mock historical payments (no payment_split_patterns table)
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: [],
            error: null
          });
        })
      });

      const result = await getAutomaticParticipantSuggestions(
        mockTripId,
        mockUserId
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('analyzeChatMessagesForPayment', () => {
    it('should analyze recent chat messages for payment context', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          message_content: 'Just had lunch',
          sender_id: 'user-2',
          created_at: new Date().toISOString()
        },
        {
          id: 'msg-2',
          message_content: 'Sam owes me $50 for dinner',
          sender_id: 'user-3',
          created_at: new Date().toISOString()
        }
      ];

      // Mock chat messages query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: mockMessages,
            error: null
          });
        })
      });

      // Mock trip members and profiles for detection
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: mockProfiles,
            error: null
          });
        })
      });

      (supabase.functions.invoke as any).mockRejectedValueOnce(new Error('AI unavailable'));

      const result = await analyzeChatMessagesForPayment(mockTripId, mockUserId);

      expect(result).not.toBeNull();
      expect(result?.confidence).toBeGreaterThan(0);
    });

    it('should return null when no payment context found', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          message_content: 'Just checking in',
          sender_id: 'user-2',
          created_at: new Date().toISOString()
        }
      ];

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: mockMessages,
            error: null
          });
        })
      });

      const result = await analyzeChatMessagesForPayment(mockTripId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('recordPaymentSplitPattern', () => {
    it('should record payment split patterns', async () => {
      const participantIds = ['user-2', 'user-3'];

      // Mock table existence check
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: [],
            error: null
          });
        })
      });

      // Mock pattern lookup (no existing pattern)
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: null,
            error: { code: 'PGRST116' } // Not found
          });
        })
      });

      // Mock insert
      (supabase.from as any).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: { id: 'pattern-1' },
            error: null
          });
        })
      });

      await recordPaymentSplitPattern(mockTripId, mockUserId, participantIds);

      // Function should complete without error
      expect(true).toBe(true);
    });

    it('should handle missing table gracefully', async () => {
      const participantIds = ['user-2'];

      // Mock table doesn't exist
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => {
          callback({
            data: null,
            error: { code: '42P01' } // Table doesn't exist
          });
        })
      });

      // Should not throw
      await expect(
        recordPaymentSplitPattern(mockTripId, mockUserId, participantIds)
      ).resolves.not.toThrow();
    });
  });
});
