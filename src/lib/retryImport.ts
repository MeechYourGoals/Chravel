/**
 * Retry wrapper for dynamic imports with exponential backoff.
 *
 * Handles transient chunk-loading failures caused by stale caches,
 * network hiccups, or deployment-time asset mismatches.
 */
export const retryImport = <T>(
  importFn: () => Promise<T>,
  retries = 3,
  delay = 1000,
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

        // Only retry on chunk loading errors
        if (!isChunkError || retries === 0) {
          console.error('[retryImport] Import failed after retries:', error);
          reject(error);
          return;
        }

        // Exponential backoff: 1s, 2s, 4s
        const nextDelay = delay * Math.pow(2, 3 - retries);
        console.warn(
          `[retryImport] Retrying import (${retries} retries left) after ${nextDelay}ms...`,
        );

        setTimeout(() => {
          retryImport(importFn, retries - 1, delay).then(resolve, reject);
        }, nextDelay);
      });
  });
};
