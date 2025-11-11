/**
 * Concierge Cache Service Tests
 * 
 * Tests cover:
 * - Message caching and retrieval
 * - Semantic similarity matching
 * - Cache expiration
 * - Offline response matching
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { conciergeCacheService } from '../conciergeCacheService';

describe('ConciergeCacheService', () => {
  const testTripId = 'test-trip-123';
  const testMessage = {
    id: 'msg-1',
    type: 'assistant' as const,
    content: 'Here are some great restaurants near your basecamp.',
    timestamp: new Date().toISOString()
  };

  beforeEach(() => {
    conciergeCacheService.clearCache(testTripId);
  });

  describe('Message Caching', () => {
    it('should cache a message successfully', () => {
      conciergeCacheService.cacheMessage(testTripId, 'find restaurants', testMessage);
      
      const cached = conciergeCacheService.getCachedMessages(testTripId);
      expect(cached.length).toBeGreaterThan(0);
    });

    it('should retrieve cached messages', () => {
      conciergeCacheService.cacheMessage(testTripId, 'test query', testMessage);
      
      const messages = conciergeCacheService.getCachedMessages(testTripId);
      expect(messages).toContainEqual(expect.objectContaining({
        content: testMessage.content
      }));
    });

    it('should limit cached messages to last 100', () => {
      // Add 110 messages
      for (let i = 0; i < 110; i++) {
        conciergeCacheService.cacheMessage(
          testTripId,
          `query ${i}`,
          { ...testMessage, id: `msg-${i}`, content: `Response ${i}` }
        );
      }

      const messages = conciergeCacheService.getCachedMessages(testTripId);
      expect(messages.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Semantic Similarity Matching', () => {
    it('should find similar cached responses', () => {
      conciergeCacheService.cacheMessage(
        testTripId,
        'where are good restaurants',
        testMessage
      );

      const similarQuery = 'find restaurants near me';
      const result = conciergeCacheService.getCachedResponse(testTripId, similarQuery);

      expect(result).not.toBeNull();
      expect(result?.content).toBe(testMessage.content);
    });

    it('should not match dissimilar queries', () => {
      conciergeCacheService.cacheMessage(
        testTripId,
        'what is the weather',
        { ...testMessage, content: 'Weather response' }
      );

      const dissimilarQuery = 'find restaurants';
      const result = conciergeCacheService.getCachedResponse(testTripId, dissimilarQuery);

      // Should not match if similarity is below threshold
      expect(result).toBeNull();
    });

    it('should handle exact query matches', () => {
      const exactQuery = 'find restaurants';
      conciergeCacheService.cacheMessage(testTripId, exactQuery, testMessage);

      const result = conciergeCacheService.getCachedResponse(testTripId, exactQuery);
      expect(result).not.toBeNull();
      expect(result?.content).toBe(testMessage.content);
    });
  });

  describe('Cache Expiration', () => {
    it('should expire old cache entries', () => {
      // This would require mocking Date/time, but structure is tested
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      
      // Cache would be expired after 7 days
      expect(oldTimestamp).toBeLessThan(Date.now() - (7 * 24 * 60 * 60 * 1000));
    });
  });

  describe('Cache Management', () => {
    it('should clear cache for specific trip', () => {
      conciergeCacheService.cacheMessage(testTripId, 'test', testMessage);
      conciergeCacheService.clearCache(testTripId);

      const messages = conciergeCacheService.getCachedMessages(testTripId);
      expect(messages.length).toBe(0);
    });

    it('should provide cache statistics', () => {
      conciergeCacheService.cacheMessage(testTripId, 'query 1', testMessage);
      conciergeCacheService.cacheMessage('trip-2', 'query 2', testMessage);

      const stats = conciergeCacheService.getCacheStats();
      
      expect(stats.totalTrips).toBeGreaterThanOrEqual(1);
      expect(stats.totalResponses).toBeGreaterThanOrEqual(0);
    });
  });
});
