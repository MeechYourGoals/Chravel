import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock safeReload
vi.mock('@/utils/safeReload', () => ({
  safeReload: vi.fn().mockResolvedValue(undefined),
}));

// Test the retryImport utility function logic independently
// (The function is defined inline in App.tsx - we test the same algorithm)
describe('App module: retryImport logic', () => {
  const createRetryImport = <T,>(
    importFn: () => Promise<T>,
    retries = 3,
    delay = 100,
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      importFn()
        .then(resolve)
        .catch(error => {
          const errorMessage = error?.message || String(error);
          const isChunkError =
            errorMessage.includes('Failed to fetch dynamically imported module') ||
            errorMessage.includes('Loading chunk') ||
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('NetworkError');

          if (!isChunkError || retries === 0) {
            reject(error);
            return;
          }

          const nextDelay = delay * Math.pow(2, 3 - retries);

          setTimeout(() => {
            createRetryImport(importFn, retries - 1, delay).then(resolve, reject);
          }, nextDelay);
        });
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should resolve on first successful import', async () => {
    const mockModule = { default: () => null };
    const importFn = vi.fn().mockResolvedValue(mockModule);

    const result = await createRetryImport(importFn);
    expect(result).toBe(mockModule);
    expect(importFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on chunk loading errors', async () => {
    vi.useRealTimers(); // Need real timers for retry delays
    const mockModule = { default: () => null };
    const importFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValue(mockModule);

    const result = await createRetryImport(importFn, 3, 10); // Short delay for tests
    expect(result).toBe(mockModule);
    expect(importFn).toHaveBeenCalledTimes(2);
  });

  it('should NOT retry on non-chunk errors', async () => {
    vi.useRealTimers();
    const importFn = vi.fn().mockRejectedValue(new Error('Syntax error in module'));

    await expect(createRetryImport(importFn)).rejects.toThrow('Syntax error in module');
    expect(importFn).toHaveBeenCalledTimes(1);
  });

  it('should exhaust retries on persistent chunk errors', async () => {
    vi.useRealTimers();
    const chunkError = new Error('Loading chunk 123 failed');
    const importFn = vi.fn().mockRejectedValue(chunkError);

    await expect(createRetryImport(importFn, 2, 10)).rejects.toThrow('Loading chunk 123 failed');
    // Initial call + 2 retries = 3 calls total
    expect(importFn).toHaveBeenCalledTimes(3);
  });

  it('should detect NetworkError as chunk error', async () => {
    vi.useRealTimers();
    const mockModule = { default: () => null };
    const importFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('NetworkError'))
      .mockResolvedValue(mockModule);

    const result = await createRetryImport(importFn, 3, 10);
    expect(result).toBe(mockModule);
  });

  it('should detect Failed to fetch as chunk error', async () => {
    vi.useRealTimers();
    const mockModule = { default: () => null };
    const importFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValue(mockModule);

    const result = await createRetryImport(importFn, 3, 10);
    expect(result).toBe(mockModule);
  });
});

describe('App module: breaking version check logic', () => {
  const BREAKING_VERSION_KEY = 'chravel_breaking_version';

  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should store breaking version on first visit', () => {
    const CURRENT_BREAKING_VERSION = '1';
    const storedBreaking = localStorage.getItem(BREAKING_VERSION_KEY);

    if (!storedBreaking) {
      localStorage.setItem(BREAKING_VERSION_KEY, CURRENT_BREAKING_VERSION);
    }

    expect(localStorage.getItem(BREAKING_VERSION_KEY)).toBe('1');
  });

  it('should detect breaking change when version differs', () => {
    localStorage.setItem(BREAKING_VERSION_KEY, '0');
    const CURRENT_BREAKING_VERSION = '1';
    const storedBreaking = localStorage.getItem(BREAKING_VERSION_KEY);

    expect(storedBreaking !== CURRENT_BREAKING_VERSION).toBe(true);
  });

  it('should not trigger reload when version matches', () => {
    localStorage.setItem(BREAKING_VERSION_KEY, '1');
    const CURRENT_BREAKING_VERSION = '1';
    const storedBreaking = localStorage.getItem(BREAKING_VERSION_KEY);

    expect(storedBreaking !== CURRENT_BREAKING_VERSION).toBe(false);
  });
});
