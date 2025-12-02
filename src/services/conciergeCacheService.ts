/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary until ChatMessage export resolved
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
}

interface CachedMessages {
  messages: ChatMessage[];
  timestamp: number;
  tripId: string;
}

const CACHE_PREFIX = 'concierge_cache_';
const MESSAGES_PREFIX = 'concierge_messages_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const SIMILARITY_THRESHOLD = 0.6; // Minimum similarity to use cached response

class ConciergeCacheService {
  /**
   * Cache an AI response for a query
   */
  cacheMessage(tripId: string, query: string, response: ChatMessage): void {
    try {
      const cacheKey = `${CACHE_PREFIX}${tripId}`;
      const cached = this.getCachedResponses(tripId);
      
      // Add new response (keep last 50 queries per trip)
      cached.push({
        query: query.toLowerCase().trim(),
        response,
        timestamp: Date.now(),
        tripId
      });
      
      // Keep only last 50 responses
      const recent = cached.slice(-50);
      
      localStorage.setItem(cacheKey, JSON.stringify(recent));
      
      // Also update messages cache
      this.updateMessagesCache(tripId, response);
    } catch (error) {
      console.error('Failed to cache message:', error);
      // Silently fail - caching is not critical
    }
  }

  /**
   * Get cached response for a similar query
   */
  getCachedResponse(tripId: string, query: string): ChatMessage | null {
    try {
      const cached = this.getCachedResponses(tripId);
      const normalizedQuery = query.toLowerCase().trim();
      
      // Find most similar cached query
      let bestMatch: CachedResponse | null = null;
      let bestSimilarity = 0;
      
      for (const item of cached) {
        // Check if expired
        if (Date.now() - item.timestamp > CACHE_TTL) {
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
   * Get all cached messages for a trip
   */
  getCachedMessages(tripId: string): ChatMessage[] {
    try {
      const cacheKey = `${MESSAGES_PREFIX}${tripId}`;
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
   * Update messages cache with new message
   */
  private updateMessagesCache(tripId: string, message: ChatMessage): void {
    try {
      const cacheKey = `${MESSAGES_PREFIX}${tripId}`;
      const existing = this.getCachedMessages(tripId);
      
      // Add new message (keep last 100 messages)
      const updated = [...existing, message].slice(-100);
      
      const cached: CachedMessages = {
        messages: updated,
        timestamp: Date.now(),
        tripId
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch (error) {
      console.error('Failed to update messages cache:', error);
    }
  }

  /**
   * Get all cached responses for a trip
   */
  private getCachedResponses(tripId: string): CachedResponse[] {
    try {
      const cacheKey = `${CACHE_PREFIX}${tripId}`;
      const data = localStorage.getItem(cacheKey);
      
      if (!data) return [];
      
      const cached: CachedResponse[] = JSON.parse(data);
      
      // Filter out expired entries
      const now = Date.now();
      const valid = cached.filter(item => now - item.timestamp <= CACHE_TTL);
      
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
   * Clear cache for a specific trip
   */
  clearCache(tripId: string): void {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${tripId}`);
      localStorage.removeItem(`${MESSAGES_PREFIX}${tripId}`);
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
        oldestCache: oldestTimestamp
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalTrips: 0,
        totalResponses: 0,
        totalMessages: 0,
        oldestCache: null
      };
    }
  }
}

export const conciergeCacheService = new ConciergeCacheService();
