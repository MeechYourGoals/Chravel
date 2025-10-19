import { ComprehensiveTripContext } from './tripContextAggregator';

interface CachedContext {
  data: ComprehensiveTripContext;
  timestamp: number;
}

export class ContextCacheService {
  private static cache = new Map<string, CachedContext>();
  private static TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached context for a trip
   */
  static get(tripId: string): ComprehensiveTripContext | null {
    const cached = this.cache.get(tripId);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.TTL) {
      this.cache.delete(tripId);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached context for a trip
   */
  static set(tripId: string, context: ComprehensiveTripContext): void {
    this.cache.set(tripId, {
      data: context,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cached context for a trip
   */
  static invalidate(tripId: string): void {
    this.cache.delete(tripId);
  }

  /**
   * Clear all cached contexts
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    size: number;
    entries: Array<{
      tripId: string;
      age: number;
      isExpired: boolean;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([tripId, cached]) => ({
      tripId,
      age: now - cached.timestamp,
      isExpired: (now - cached.timestamp) > this.TTL
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [tripId, cached] of this.cache.entries()) {
      if ((now - cached.timestamp) > this.TTL) {
        this.cache.delete(tripId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Check if context is cached and not expired
   */
  static hasValidCache(tripId: string): boolean {
    const cached = this.cache.get(tripId);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age <= this.TTL;
  }

  /**
   * Get cache age for a trip in milliseconds
   */
  static getCacheAge(tripId: string): number | null {
    const cached = this.cache.get(tripId);
    if (!cached) return null;

    return Date.now() - cached.timestamp;
  }
}
