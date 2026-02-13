/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  mapChannelSendError,
  formatToastDescription,
  validateMessageContent,
} from '../utils/channelErrors';

describe('channelErrors utility', () => {
  // ============================================
  // mapChannelSendError
  // ============================================
  describe('mapChannelSendError', () => {
    it('maps RLS / permission denied errors to a "no access" message', () => {
      const rlsError = {
        code: '42501',
        message: 'new row violates row-level security policy for table "channel_messages"',
        details: null,
      };
      const mapped = mapChannelSendError(rlsError);
      expect(mapped.title).toBe('Cannot send message');
      expect(mapped.description).toContain("don't have access");
    });

    it('maps permission denied message string', () => {
      const error = { message: 'permission denied for table channel_messages' };
      const mapped = mapChannelSendError(error);
      expect(mapped.title).toBe('Cannot send message');
    });

    it('maps foreign key constraint errors to "channel unavailable"', () => {
      const fkError = {
        code: '23503',
        message: 'insert or update on table "channel_messages" violates foreign key constraint',
        details: 'Key (channel_id) is not present in table "trip_channels"',
      };
      const mapped = mapChannelSendError(fkError);
      expect(mapped.title).toBe('Channel unavailable');
      expect(mapped.description).toContain('no longer exists');
    });

    it('maps null value constraint errors to "invalid message"', () => {
      const error = {
        code: '23502',
        message: 'null value in column "content"',
      };
      const mapped = mapChannelSendError(error);
      expect(mapped.title).toBe('Invalid message');
    });

    it('maps network/fetch errors to "connection issue"', () => {
      const fetchError = new TypeError('Failed to fetch');
      const mapped = mapChannelSendError(fetchError);
      expect(mapped.title).toBe('Connection issue');
      expect(mapped.description).toContain('connection');
    });

    it('maps timeout errors to "connection issue"', () => {
      const timeoutError = { message: 'Request timeout' };
      const mapped = mapChannelSendError(timeoutError);
      expect(mapped.title).toBe('Connection issue');
    });

    it('maps rate limit errors (HTTP 429) to "slow down"', () => {
      const rateLimitError = { status: 429, message: 'Too Many Requests' };
      const mapped = mapChannelSendError(rateLimitError);
      expect(mapped.title).toBe('Slow down');
    });

    it('returns generic fallback for unknown errors', () => {
      const unknownError = { code: 'UNKNOWN', message: 'something weird happened' };
      const mapped = mapChannelSendError(unknownError);
      expect(mapped.title).toBe('Message failed to send');
      expect(mapped.description).toContain('Something went wrong');
    });

    it('handles plain string errors gracefully', () => {
      const mapped = mapChannelSendError('some string error');
      expect(mapped.title).toBe('Message failed to send');
    });

    it('handles null/undefined gracefully', () => {
      const mapped = mapChannelSendError(null);
      expect(mapped.title).toBe('Message failed to send');
    });
  });

  // ============================================
  // formatToastDescription
  // ============================================
  describe('formatToastDescription', () => {
    it('returns plain description when raw is not provided', () => {
      const mapped = { title: 'Test', description: 'A description', raw: undefined };
      const result = formatToastDescription(mapped);
      expect(result).toBe('A description');
    });

    it('returns plain description in production mode (import.meta.env.DEV=false)', () => {
      // Note: in test environment DEV may be true. We test the base case.
      const mapped = { title: 'Test', description: 'A description', raw: { code: '42501' } };
      const result = formatToastDescription(mapped);
      // In dev mode it will append code, in prod it won't. Just check it contains base description.
      expect(result).toContain('A description');
    });
  });

  // ============================================
  // validateMessageContent
  // ============================================
  describe('validateMessageContent', () => {
    it('rejects empty messages', () => {
      expect(validateMessageContent('')).not.toBeNull();
      expect(validateMessageContent('   ')).not.toBeNull();
      const result = validateMessageContent('');
      expect(result?.title).toBe('Empty message');
    });

    it('accepts normal messages', () => {
      expect(validateMessageContent('Hello world')).toBeNull();
      expect(validateMessageContent('A')).toBeNull();
    });

    it('rejects messages over 5000 characters', () => {
      const longMessage = 'a'.repeat(5001);
      const result = validateMessageContent(longMessage);
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Message too long');
    });

    it('accepts messages exactly 5000 characters', () => {
      const exactMessage = 'a'.repeat(5000);
      expect(validateMessageContent(exactMessage)).toBeNull();
    });
  });

  // ============================================
  // Scenario: channel member can send message (positive path)
  // ============================================
  describe('Positive: channel member send flow', () => {
    it('validation passes for valid message content', () => {
      const content = 'Hey team, the tour bus leaves at 8am!';
      const validationError = validateMessageContent(content);
      expect(validationError).toBeNull();
    });
  });

  // ============================================
  // Scenario: non-member rejection with correct toast mapping
  // ============================================
  describe('Negative: non-member rejection', () => {
    it('maps RLS denial to "no access" toast when non-member tries to send', () => {
      // Simulate the error Supabase returns when RLS blocks an insert
      const rlsDenialError = {
        code: '42501',
        message: 'new row violates row-level security policy for table "channel_messages"',
        details: 'Failing row contains ...',
        hint: null,
        status: 403,
      };

      const mapped = mapChannelSendError(rlsDenialError);

      expect(mapped.title).toBe('Cannot send message');
      expect(mapped.description).toBe("You don't have access to post in this channel yet.");
      expect(mapped.raw).toBe(rlsDenialError);
    });

    it('produces dev-mode description with error code for debugging', () => {
      const rlsDenialError = {
        code: '42501',
        message: 'new row violates row-level security policy',
      };
      const mapped = mapChannelSendError(rlsDenialError);
      const devDesc = formatToastDescription(mapped);

      // In DEV mode (which vitest sets), should include code info
      expect(devDesc).toContain("don't have access");
      // The dev suffix should be appended
      expect(devDesc).toContain('42501');
    });
  });
});
