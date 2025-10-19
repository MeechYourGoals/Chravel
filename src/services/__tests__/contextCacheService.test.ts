import { describe, it, expect, beforeEach } from 'vitest';
import { ContextCacheService } from '../contextCacheService';
import { ComprehensiveTripContext } from '../tripContextAggregator';

describe('ContextCacheService', () => {
  const mockTripId = 'test-trip-123';
  const mockContext: ComprehensiveTripContext = {
    tripMetadata: {
      id: mockTripId,
      name: 'Test Trip',
      destination: 'Paris',
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      type: 'consumer'
    },
    collaborators: [],
    messages: [],
    calendar: [],
    tasks: [],
    payments: [],
    polls: [],
    places: {
      basecamp: undefined,
      savedPlaces: []
    },
    media: {
      files: [],
      links: []
    }
  };

  beforeEach(() => {
    // Clear cache before each test
    ContextCacheService.clear();
  });

  describe('get and set', () => {
    it('should store and retrieve context data', () => {
      ContextCacheService.set(mockTripId, mockContext);
      const retrieved = ContextCacheService.get(mockTripId);
      
      expect(retrieved).toEqual(mockContext);
    });

    it('should return null for non-existent trip', () => {
      const result = ContextCacheService.get('non-existent-trip');
      expect(result).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('should return null for expired cache', () => {
      // Set context
      ContextCacheService.set(mockTripId, mockContext);
      
      // Mock Date.now to simulate time passage
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 6 * 60 * 1000); // 6 minutes later
      
      const result = ContextCacheService.get(mockTripId);
      expect(result).toBeNull();
      
      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should return data for non-expired cache', () => {
      // Set context
      ContextCacheService.set(mockTripId, mockContext);
      
      // Mock Date.now to simulate short time passage
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 2 * 60 * 1000); // 2 minutes later
      
      const result = ContextCacheService.get(mockTripId);
      expect(result).toEqual(mockContext);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('invalidate', () => {
    it('should remove cached data for specific trip', () => {
      ContextCacheService.set(mockTripId, mockContext);
      ContextCacheService.invalidate(mockTripId);
      
      const result = ContextCacheService.get(mockTripId);
      expect(result).toBeNull();
    });

    it('should not affect other cached trips', () => {
      const otherTripId = 'other-trip-456';
      const otherContext = { ...mockContext, tripMetadata: { ...mockContext.tripMetadata, id: otherTripId } };
      
      ContextCacheService.set(mockTripId, mockContext);
      ContextCacheService.set(otherTripId, otherContext);
      
      ContextCacheService.invalidate(mockTripId);
      
      expect(ContextCacheService.get(mockTripId)).toBeNull();
      expect(ContextCacheService.get(otherTripId)).toEqual(otherContext);
    });
  });

  describe('clear', () => {
    it('should remove all cached data', () => {
      ContextCacheService.set(mockTripId, mockContext);
      ContextCacheService.set('trip2', mockContext);
      
      ContextCacheService.clear();
      
      expect(ContextCacheService.get(mockTripId)).toBeNull();
      expect(ContextCacheService.get('trip2')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      ContextCacheService.set(mockTripId, mockContext);
      
      const stats = ContextCacheService.getStats();
      
      expect(stats.size).toBe(1);
      expect(stats.entries).toHaveLength(1);
      expect(stats.entries[0].tripId).toBe(mockTripId);
      expect(stats.entries[0].isExpired).toBe(false);
    });

    it('should identify expired entries', () => {
      ContextCacheService.set(mockTripId, mockContext);
      
      // Mock time passage to make entry expired
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 6 * 60 * 1000);
      
      const stats = ContextCacheService.getStats();
      expect(stats.entries[0].isExpired).toBe(true);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      ContextCacheService.set(mockTripId, mockContext);
      ContextCacheService.set('trip2', mockContext);
      
      // Mock time passage to make entries expired
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 6 * 60 * 1000);
      
      const cleaned = ContextCacheService.cleanup();
      expect(cleaned).toBe(2);
      
      const stats = ContextCacheService.getStats();
      expect(stats.size).toBe(0);
      
      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should not remove non-expired entries', () => {
      ContextCacheService.set(mockTripId, mockContext);
      
      const cleaned = ContextCacheService.cleanup();
      expect(cleaned).toBe(0);
      
      const result = ContextCacheService.get(mockTripId);
      expect(result).toEqual(mockContext);
    });
  });

  describe('hasValidCache', () => {
    it('should return true for valid cache', () => {
      ContextCacheService.set(mockTripId, mockContext);
      
      const hasValid = ContextCacheService.hasValidCache(mockTripId);
      expect(hasValid).toBe(true);
    });

    it('should return false for non-existent cache', () => {
      const hasValid = ContextCacheService.hasValidCache('non-existent');
      expect(hasValid).toBe(false);
    });

    it('should return false for expired cache', () => {
      ContextCacheService.set(mockTripId, mockContext);
      
      // Mock time passage
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 6 * 60 * 1000);
      
      const hasValid = ContextCacheService.hasValidCache(mockTripId);
      expect(hasValid).toBe(false);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('getCacheAge', () => {
    it('should return cache age in milliseconds', () => {
      const startTime = Date.now();
      ContextCacheService.set(mockTripId, mockContext);
      
      const age = ContextCacheService.getCacheAge(mockTripId);
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(1000); // Should be less than 1 second
    });

    it('should return null for non-existent cache', () => {
      const age = ContextCacheService.getCacheAge('non-existent');
      expect(age).toBeNull();
    });
  });
});
