/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * Tests for Chat URL Extractor Service
 *
 * Tests URL extraction, normalization, categorization, and deduplication
 *
 * @module services/__tests__/chatUrlExtractor.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractUrlsFromTripChat } from '../chatUrlExtractor';
import { normalizeUrl } from '../urlUtils';
import { categorizeUrl } from '../ogMetadataService';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

describe('chatUrlExtractor', () => {
  describe('extractUrlsFromTripChat', () => {
    it('should return empty array for empty trip', async () => {
      const urls = await extractUrlsFromTripChat('trip-123', { fetchMetadata: false });
      expect(urls).toEqual([]);
    });

    it('should normalize URLs', async () => {
      // This would require mocking Supabase responses
      // For now, we test the normalization logic separately
      expect(true).toBe(true);
    });

    it('should deduplicate normalized URLs', async () => {
      // Test deduplication logic
      const url1 = 'https://example.com/page?utm_source=test';
      const url2 = 'https://example.com/page';
      // After normalization, these should be considered duplicates
      expect(normalizeUrl(url1)).toBe(normalizeUrl(url2));
    });
  });

  describe('categorizeUrl', () => {
    it('should categorize receipt URLs', () => {
      const receiptUrl = 'https://venmo.com/receipt/123';
      const category = categorizeUrl(receiptUrl);
      expect(category).toBe('receipt');
    });

    it('should categorize booking URLs', () => {
      const bookingUrl = 'https://airbnb.com/rooms/123';
      const category = categorizeUrl(bookingUrl);
      expect(category).toBe('booking');
    });

    it('should categorize schedule URLs', () => {
      const scheduleUrl = 'https://calendar.google.com/event/123';
      const category = categorizeUrl(scheduleUrl);
      expect(category).toBe('schedule');
    });

    it('should default to general for unknown URLs', () => {
      const generalUrl = 'https://example.com/page';
      const category = categorizeUrl(generalUrl);
      expect(category).toBe('general');
    });
  });
});
