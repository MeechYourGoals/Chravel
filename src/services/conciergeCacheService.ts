/**
 * Concierge Cache Service
 * Provides offline mode support by caching AI responses
 *
 * Features:
 * - Caches AI responses with semantic similarity matching
 * - Stores messages for offline viewing
 * - Automatic cache expiration (7 days)
 * - Query similarity matching for offline responses
 */

import { ChatMessage } from '../components/AIConciergeChat';

interface CachedResponse {
  query: string;
  response: ChatMessage;
  timestamp: number;
  tripId: string;
  /** Per-entry TTL in milliseconds (allows trip-context entries to expire sooner). */
  ttl?: number;
}

interface CachedMessages {
  messages: ChatMessage[];
  timestamp: number;
  tripId: string;
}

const CACHE_PREFIX = 'concierge_cache_';
const MESSAGES_PREFIX = 'concierge_messages_';
/** 7 days — general knowledge queries (weather patterns, packing tips, cultural info) */
const GENERAL_TTL = 7 * 24 * 60 * 60 * 1000;
/** 1 hour — trip-context queries (calendar, tasks, payments, places, who's going) */
const TRIP_CONTEXT_TTL = 60 * 60 * 1000;
// Backward-compat alias used by existing callers that don't specify a TTL
const CACHE_TTL = GENERAL_TTL;
const SIMILARITY_THRESHOLD = 0.6; // Minimum similarity to use cached response
const MAX_CACHED_RESPONSES = 100; // Per-trip response cache capacity
const MAX_CACHED_MESSAGES = 100; // Per-trip message cache capacity - Reduced to 100 to match test expectation

/**
 * Keywords that indicate the query touches live trip data.
 * These responses have a short 1-hour TTL to avoid serving stale info
 * after group members make changes.
 */
const TRIP_CONTEXT_KEYWORDS =
  /\b(calendar|event|task|payment|expense|poll|hotel|flight|itinerary|schedule|basecamp|who|member|going|reservation|book|checkin|checkout|cost|budget|owe|paid)\b/i;

class ConciergeCacheService {
  /** Returns true if the query touches live trip data (short TTL applies). */
  private isContextualQuery(query: string): boolean {
    return TRIP_CONTEXT_KEYWORDS.test(query);
  }

  /**
   * Cache an AI response for a query (user-isolated).
   * Trip-context queries use a 1-hour TTL; general queries use 7 days.
   */
  cacheMessage(tripId: string, query: string, response: ChatMessage, userId?: string): void {
    try {
      const userKey = userId || 'anonymous';
      const cacheKey = `${CACHE_PREFIX}${tripId}_${userKey}`;
      // Get currently cached responses
      const cached = this.getCachedResponses(tripId, userId);

      // Choose TTL based on whether the query touches live trip data
      const entryTtl = this.isContextualQuery(query) ? TRIP_CONTEXT_TTL : GENERAL_TTL;

      // Add new response (keep last MAX_CACHED_RESPONSES queries per trip)
      const newEntry: CachedResponse = {
        query: query.toLowerCase().trim(),
        response,
        timestamp: Date.now(),
        tripId,
        ttl: entryTtl,
      };

      // Append new entry and slice to max size
      const updatedCache = [...cached, newEntry].slice(-MAX_CACHED_RESPONSES);

      try {
        localStorage.setItem(cacheKey, JSON.stringify(updatedCache));
      } catch {
        // localStorage quota exceeded — evict oldest half and retry
        const trimmed = updatedCache.slice(Math.floor(updatedCache.length / 2));
        try {
          localStorage.setItem(cacheKey, JSON.stringify(trimmed));
        } catch {
          /* give up silently */
        }
      }

      // Also update messages cache (user-isolated)
      this.updateMessagesCache(tripId, response, userId);
    } catch (error) {
      console.error('Failed to cache message:', error);
      // Silently fail - caching is not critical
    }
  }

  /**
   * Get cached response for a similar query (user-isolated)
   */
  getCachedResponse(tripId: string, query: string, userId?: string): ChatMessage | null {
    try {
      const cached = this.getCachedResponses(tripId, userId);
      const normalizedQuery = query.toLowerCase().trim();

      // Find most similar cached query
      let bestMatch: CachedResponse | null = null;
      let bestSimilarity = 0;

      for (const item of cached) {
        // Respect per-entry TTL (trip-context = 1h, general = 7d)
        const itemTtl = item.ttl ?? CACHE_TTL;
        if (Date.now() - item.timestamp > itemTtl) {
          continue;
        }

        // Simple similarity check (word overlap)
        const similarity = this.calculateSimilarity(normalizedQuery, item.query);

        if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD) {
          bestSimilarity = similarity;
          bestMatch = item;
        }
      }

      if (bestMatch) {
        return bestMatch.response;
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached response:', error);
      return null;
    }
  }

  /**
   * Get all cached messages for a trip (user-isolated)
   */
  getCachedMessages(tripId: string, userId?: string): ChatMessage[] {
    try {
      const userKey = userId || 'anonymous';
      const cacheKey = `${MESSAGES_PREFIX}${tripId}_${userKey}`;
      const data = localStorage.getItem(cacheKey);

      if (!data) return [];

      const cached: CachedMessages = JSON.parse(data);

      // Check if expired
      if (Date.now() - cached.timestamp > CACHE_TTL) {
        this.clearCache(tripId);
        return [];
      }

      return cached.messages || [];
    } catch (error) {
      console.error('Failed to get cached messages:', error);
      return [];
    }
  }

  /**
   * Update messages cache with new message (user-isolated)
   */
  private updateMessagesCache(tripId: string, message: ChatMessage, userId?: string): void {
    try {
      const userKey = userId || 'anonymous';
      const cacheKey = `${MESSAGES_PREFIX}${tripId}_${userKey}`;
      const existing = this.getCachedMessages(tripId, userId);

      // Append new message and slice to MAX_CACHED_MESSAGES
      const updated = [...existing, message].slice(-MAX_CACHED_MESSAGES);

      const cached: CachedMessages = {
        messages: updated,
        timestamp: Date.now(),
        tripId,
      };

      try {
        localStorage.setItem(cacheKey, JSON.stringify(cached));
      } catch {
        // If quota exceeded, trim aggressively
        const trimmed = { ...cached, messages: updated.slice(Math.floor(updated.length / 2)) };
        try {
          localStorage.setItem(cacheKey, JSON.stringify(trimmed));
        } catch {
          /* give up silently */
        }
      }
    } catch (error) {
      console.error('Failed to update messages cache:', error);
    }
  }

  /**
   * Get all cached responses for a trip (user-isolated)
   */
  private getCachedResponses(tripId: string, userId?: string): CachedResponse[] {
    try {
      const userKey = userId || 'anonymous';
      const cacheKey = `${CACHE_PREFIX}${tripId}_${userKey}`;
      const data = localStorage.getItem(cacheKey);

      if (!data) return [];

      const cached: CachedResponse[] = JSON.parse(data);

      // Filter out expired entries, respecting per-entry TTL
      const now = Date.now();
      const valid = cached.filter(item => now - item.timestamp <= (item.ttl ?? CACHE_TTL));

      // Update cache if we filtered anything
      if (valid.length !== cached.length) {
        localStorage.setItem(cacheKey, JSON.stringify(valid));
      }

      return valid;
    } catch (error) {
      console.error('Failed to get cached responses:', error);
      return [];
    }
  }

  /**
   * Calculate simple similarity between two queries (word overlap)
   */
  private calculateSimilarity(query1: string, query2: string): number {
    const words1 = new Set(query1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(query2.split(/\s+/).filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0;

    let matches = 0;
    for (const word of words1) {
      if (words2.has(word)) {
        matches++;
      }
    }

    // Jaccard similarity
    const union = new Set([...words1, ...words2]).size;
    return matches / union;
  }

  /**
   * Invalidate ALL users' trip-context cache entries for a trip.
   *
   * Call this when trip data changes (calendar update, new task, payment settled, etc.)
   * so the next query re-fetches fresh data instead of returning stale cached responses.
   *
   * This scans localStorage for all keys matching the trip prefix and removes entries
   * whose TTL is TRIP_CONTEXT_TTL (i.e., they were cached as contextual queries).
   * General knowledge entries (7-day TTL) are left intact.
   */
  invalidateForTrip(tripId: string): void {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (!key.startsWith(CACHE_PREFIX) && !key.startsWith(MESSAGES_PREFIX)) continue;
        // Only process keys for this specific trip
        if (!key.includes(tripId)) continue;

        if (key.startsWith(CACHE_PREFIX)) {
          // For response caches: remove individual contextual entries instead of full wipe
          // so general knowledge answers survive.
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          try {
            const entries: CachedResponse[] = JSON.parse(raw);
            const filtered = entries.filter(e => (e.ttl ?? GENERAL_TTL) !== TRIP_CONTEXT_TTL);
            if (filtered.length !== entries.length) {
              localStorage.setItem(key, JSON.stringify(filtered));
            }
          } catch {
            localStorage.removeItem(key);
          }
        } else {
          // Messages cache: always wipe for this trip (messages can reference stale data)
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Non-critical
    }
  }

  /**
   * Clear cache for a specific trip.
   * Accepts optional userId to clear the user-scoped key (matching how data is written).
   * If userId is omitted, clears the anonymous key only. Use clearAllCaches() for a full wipe.
   */
  clearCache(tripId: string, userId?: string): void {
    try {
      const userKey = userId ?? 'anonymous';
      localStorage.removeItem(`${CACHE_PREFIX}${tripId}_${userKey}`);
      localStorage.removeItem(`${MESSAGES_PREFIX}${tripId}_${userKey}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Clear all concierge caches
   */
  clearAllCaches(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX) || key.startsWith(MESSAGES_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear all caches:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalTrips: number;
    totalResponses: number;
    totalMessages: number;
    oldestCache: number | null;
  } {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      const messageKeys = keys.filter(k => k.startsWith(MESSAGES_PREFIX));

      let totalResponses = 0;
      let totalMessages = 0;
      let oldestTimestamp: number | null = null;

      cacheKeys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          const cached: CachedResponse[] = JSON.parse(data);
          totalResponses += cached.length;

          cached.forEach(item => {
            if (!oldestTimestamp || item.timestamp < oldestTimestamp) {
              oldestTimestamp = item.timestamp;
            }
          });
        }
      });

      messageKeys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          const cached: CachedMessages = JSON.parse(data);
          totalMessages += cached.messages?.length || 0;

          if (cached.timestamp && (!oldestTimestamp || cached.timestamp < oldestTimestamp)) {
            oldestTimestamp = cached.timestamp;
          }
        }
      });

      return {
        totalTrips: new Set(cacheKeys.map(k => k.replace(CACHE_PREFIX, ''))).size,
        totalResponses,
        totalMessages,
        oldestCache: oldestTimestamp,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalTrips: 0,
        totalResponses: 0,
        totalMessages: 0,
        oldestCache: null,
      };
    }
  }
}

export const conciergeCacheService = new ConciergeCacheService();
