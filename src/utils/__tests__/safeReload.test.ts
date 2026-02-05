import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mock that needs to be accessible during vi.mock factory
const { mockIsNativePlatform } = vi.hoisted(() => ({
  mockIsNativePlatform: vi.fn().mockReturnValue(false),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mockIsNativePlatform,
  },
}));

import { safeReload } from '../safeReload';

describe('safeReload', () => {
  let mockReload: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockCachesKeys: ReturnType<typeof vi.fn>;
  let mockCachesDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock location methods
    mockReload = vi.fn();
    mockReplace = vi.fn();

    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        reload: mockReload,
        replace: mockReplace,
      },
      writable: true,
      configurable: true,
    });

    // Mock caches API
    mockCachesKeys = vi.fn().mockResolvedValue([]);
    mockCachesDelete = vi.fn().mockResolvedValue(true);

    Object.defineProperty(window, 'caches', {
      value: {
        keys: mockCachesKeys,
        delete: mockCachesDelete,
      },
      writable: true,
      configurable: true,
    });
  });

  describe('web platform', () => {
    beforeEach(() => {
      mockIsNativePlatform.mockReturnValue(false);
    });

    it('should call window.location.reload on web', async () => {
      await safeReload();
      expect(mockReload).toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should not clear caches when clearCaches is false', async () => {
      await safeReload(false);
      expect(mockCachesKeys).not.toHaveBeenCalled();
    });

    it('should clear caches when clearCaches is true', async () => {
      mockCachesKeys.mockResolvedValue(['cache-1', 'cache-2']);
      await safeReload(true);
      expect(mockCachesKeys).toHaveBeenCalled();
      expect(mockCachesDelete).toHaveBeenCalledWith('cache-1');
      expect(mockCachesDelete).toHaveBeenCalledWith('cache-2');
      expect(mockReload).toHaveBeenCalled();
    });

    it('should handle cache clearing failures gracefully', async () => {
      mockCachesKeys.mockRejectedValue(new Error('Cache error'));
      // Should not throw
      await safeReload(true);
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('native platform (Capacitor)', () => {
    beforeEach(() => {
      mockIsNativePlatform.mockReturnValue(true);
    });

    it('should use location.replace on native', async () => {
      const dateNow = vi.spyOn(Date, 'now').mockReturnValue(1234567890);
      await safeReload();
      expect(mockReplace).toHaveBeenCalledWith('/?_reload=1234567890');
      expect(mockReload).not.toHaveBeenCalled();
      dateNow.mockRestore();
    });

    it('should clear caches when clearCaches is true on native', async () => {
      mockCachesKeys.mockResolvedValue(['sw-cache']);
      await safeReload(true);
      expect(mockCachesKeys).toHaveBeenCalled();
      expect(mockCachesDelete).toHaveBeenCalledWith('sw-cache');
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('default parameter', () => {
    it('should default clearCaches to false', async () => {
      mockIsNativePlatform.mockReturnValue(false);
      await safeReload();
      expect(mockCachesKeys).not.toHaveBeenCalled();
    });
  });
});
