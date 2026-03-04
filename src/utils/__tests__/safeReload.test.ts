import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  let mockGetRegistrations: ReturnType<typeof vi.fn>;
  let mockUnregister: ReturnType<typeof vi.fn>;
  let matchMediaSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReload = vi.fn();
    mockReplace = vi.fn();

    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        href: 'http://localhost:3000/trips/abc?x=1#details',
        pathname: '/trips/abc',
        search: '?x=1',
        hash: '#details',
        reload: mockReload,
        replace: mockReplace,
      },
      writable: true,
      configurable: true,
    });

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

    mockUnregister = vi.fn().mockResolvedValue(true);
    mockGetRegistrations = vi.fn().mockResolvedValue([{ unregister: mockUnregister }]);
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: {
        getRegistrations: mockGetRegistrations,
      },
      writable: true,
      configurable: true,
    });

    matchMediaSpy = vi
      .spyOn(window, 'matchMedia')
      .mockReturnValue({ matches: false } as MediaQueryList);
  });

  afterEach(() => {
    matchMediaSpy.mockRestore();
  });

  it('should call window.location.reload on standard web', async () => {
    mockIsNativePlatform.mockReturnValue(false);

    await safeReload();

    expect(mockReload).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should use location.replace in standalone PWA mode', async () => {
    mockIsNativePlatform.mockReturnValue(false);
    matchMediaSpy.mockReturnValue({ matches: true } as MediaQueryList);

    await safeReload();

    expect(mockReload).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/trips/abc?x=1'));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('_reload='));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('#details'));
  });

  it('should clear caches and service workers when clearCaches is true', async () => {
    mockIsNativePlatform.mockReturnValue(false);
    mockCachesKeys.mockResolvedValue(['cache-1', 'cache-2']);

    await safeReload(true);

    expect(mockCachesDelete).toHaveBeenCalledWith('cache-1');
    expect(mockCachesDelete).toHaveBeenCalledWith('cache-2');
    expect(mockGetRegistrations).toHaveBeenCalled();
    expect(mockUnregister).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('should use location.replace on native', async () => {
    mockIsNativePlatform.mockReturnValue(true);

    await safeReload();

    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('_reload='));
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('should handle cache clearing failures gracefully', async () => {
    mockIsNativePlatform.mockReturnValue(false);
    mockCachesKeys.mockRejectedValue(new Error('cache failure'));

    await safeReload(true);

    expect(mockReplace).toHaveBeenCalled();
  });
});
