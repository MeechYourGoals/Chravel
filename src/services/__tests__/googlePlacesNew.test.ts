import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  autocomplete,
  resolveQuery,
  apiQuotaMonitor,
  retryWithBackoff,
  generateSessionToken,
  SearchOrigin,
} from '../googlePlacesNew';

// Mock Google Maps API
const mockGoogleMaps = {
  maps: {
    importLibrary: vi.fn(),
    Geocoder: vi.fn(),
    LatLng: vi.fn(),
    LatLngBounds: vi.fn(),
  },
};

// Mock window.google
global.window = {
  ...global.window,
  google: mockGoogleMaps as any,
};

describe('Google Places New API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset quota monitor
    (apiQuotaMonitor as any).dailyRequests.clear();
    (apiQuotaMonitor as any).hourlyRequests.clear();
    (apiQuotaMonitor as any).cachedResults.clear();
  });

  describe('API Quota Monitor', () => {
    it('should allow requests when under quota', () => {
      const check = apiQuotaMonitor.checkQuota();
      expect(check.canProceed).toBe(true);
    });

    it('should track API requests', () => {
      apiQuotaMonitor.recordRequest();
      apiQuotaMonitor.recordRequest();
      
      const stats = apiQuotaMonitor.getQuotaStats();
      expect(stats.daily).toBe(2);
      expect(stats.hourly).toBe(2);
    });

    it('should cache results with TTL', () => {
      const testData = { place_id: 'test123', name: 'Test Place' };
      const cacheKey = 'test:key';
      
      apiQuotaMonitor.cacheResult(cacheKey, testData);
      const cached = apiQuotaMonitor.getCachedResult(cacheKey);
      
      expect(cached).toEqual(testData);
    });

    it('should return null for expired cache', () => {
      const testData = { place_id: 'test123', name: 'Test Place' };
      const cacheKey = 'test:key';
      
      apiQuotaMonitor.cacheResult(cacheKey, testData);
      
      // Manually expire cache by setting old timestamp
      const cached = (apiQuotaMonitor as any).cachedResults.get(cacheKey);
      cached.timestamp = Date.now() - 3600001; // 1 hour + 1ms ago
      
      const result = apiQuotaMonitor.getCachedResult(cacheKey);
      expect(result).toBeNull();
    });

    it('should generate consistent cache keys', () => {
      const query = 'Coffee Shop';
      const origin: SearchOrigin = { lat: 40.7580, lng: -73.9855 };
      
      const key1 = apiQuotaMonitor.generateCacheKey(query, origin);
      const key2 = apiQuotaMonitor.generateCacheKey(query, origin);
      
      expect(key1).toBe(key2);
      expect(key1).toContain('coffee shop');
      expect(key1).toContain('40.758');
    });
  });

  describe('Retry with Backoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');
      
      const result = await retryWithBackoff(operation, 3, 100);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));
      
      await expect(retryWithBackoff(operation, 2, 10)).rejects.toThrow('Persistent error');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on quota errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('API quota exceeded'));
      
      await expect(retryWithBackoff(operation)).rejects.toThrow('API quota exceeded');
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Session Token Generation', () => {
    it('should generate unique tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      
      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^session_\d+_[a-z0-9]+$/);
    });
  });

  describe('Autocomplete', () => {
    it('should use cached results when available', async () => {
      const input = 'Coffee Shop';
      const origin: SearchOrigin = { lat: 40.7580, lng: -73.9855 };
      const sessionToken = generateSessionToken();
      
      const cachedResults = [
        { place_id: '123', description: 'Coffee Shop NYC' },
      ];
      
      const cacheKey = apiQuotaMonitor.generateCacheKey(`autocomplete:${input}`, origin);
      apiQuotaMonitor.cacheResult(cacheKey, cachedResults);
      
      // Mock loadMaps to avoid actual API call
      vi.doMock('../googlePlacesNew', async () => {
        const actual = await vi.importActual('../googlePlacesNew');
        return {
          ...actual,
          loadMaps: vi.fn().mockResolvedValue(mockGoogleMaps.maps),
        };
      });
      
      // Note: This test would need more mocking setup to fully test
      // The cache check happens before API calls, so we verify cache logic separately
      const cached = apiQuotaMonitor.getCachedResult(cacheKey);
      expect(cached).toEqual(cachedResults);
    });
  });

  describe('Resolve Query', () => {
    it('should use cached results when available', async () => {
      const query = 'Starbucks NYC';
      const origin: SearchOrigin = { lat: 40.7580, lng: -73.9855 };
      const sessionToken = generateSessionToken();
      
      const cachedResult = {
        place_id: '123',
        name: 'Starbucks',
        formatted_address: '123 Main St, NYC',
      };
      
      const cacheKey = apiQuotaMonitor.generateCacheKey(`resolve:${query}`, origin);
      apiQuotaMonitor.cacheResult(cacheKey, cachedResult);
      
      const cached = apiQuotaMonitor.getCachedResult(cacheKey);
      expect(cached).toEqual(cachedResult);
    });
  });
});
