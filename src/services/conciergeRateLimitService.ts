/**
 * Concierge Rate Limiting Service for Trips/Events
 * Prevents API cost overruns while maintaining good UX
 * NOW WITH DATABASE-BACKED RATE LIMITING
 * 
 * IMPORTANT: Limits are per user, per trip (NOT daily reset):
 * - Free: 5 queries per user per trip
 * - Explorer (Plus): 10 queries per user per trip
 * - Frequent Chraveler (Pro): Unlimited
 */

import { supabase } from '@/integrations/supabase/client';
import { demoModeService } from './demoModeService';

export interface ConciergeUsage {
  userId: string;
  eventId: string;
  queriesUsed: number;
  tripLimit: number; // Per-trip limit (no daily reset)
  resetAt: string; // Not used for per-trip model, kept for backwards compatibility
}

class ConciergeRateLimitService {
  private storageKey = 'concierge-usage';

  /**
   * Get per-trip query limit based on user's subscription tier
   * 
   * Limits (per user, per trip - NO daily reset):
   * - Free: 5 queries
   * - Explorer/Plus: 10 queries
   * - Frequent Chraveler/Pro: Unlimited
   */
  getTripLimit(userTier: 'free' | 'plus' | 'pro'): number {
    if (userTier === 'pro') return Infinity;
    if (userTier === 'plus') return 10; // Explorer tier: 10 queries per trip
    return 5; // Free: 5 queries per trip
  }

  /**
   * @deprecated Use getTripLimit instead. Kept for backwards compatibility.
   * @see getTripLimit
   * TODO: Remove in v2.0 after all consumers migrated
   */
  getDailyLimit(userTier: 'free' | 'plus' | 'pro'): number {
    return this.getTripLimit(userTier);
  }

  /**
   * Get current usage for user in specific trip/event - DATABASE-BACKED
   * Note: This counts ALL queries for the trip (no daily reset)
   */
  async getUsage(userId: string, eventId: string, userTier: 'free' | 'plus' | 'pro' = 'free'): Promise<ConciergeUsage> {
    // Check if in demo mode
    const isDemoMode = await demoModeService.isDemoModeEnabled();

    if (isDemoMode) {
      return this.getUsageFromStorage(userId, eventId, userTier);
    }

    // Query database for ALL usage in this trip (no date filter - per-trip lifetime)
    const { data, error } = await supabase
      .from('concierge_usage')
      .select('id')
      .eq('user_id', userId)
      .eq('context_type', 'event')
      .eq('context_id', eventId);

    if (error) {
      console.error('Failed to fetch usage from database:', error);
      // Fallback to storage
      return this.getUsageFromStorage(userId, eventId, userTier);
    }

    const queriesUsed = data?.length || 0;

    return {
      userId,
      eventId,
      queriesUsed,
      tripLimit: this.getTripLimit(userTier),
      resetAt: '' // Not used for per-trip model
    };
  }

  /**
   * Get usage from localStorage (demo mode fallback)
   * Note: Per-trip usage persists until trip ends (no daily reset)
   */
  private getUsageFromStorage(userId: string, eventId: string, userTier: 'free' | 'plus' | 'pro'): ConciergeUsage {
    const storageData = this.loadFromStorage();
    const key = `${userId}-${eventId}`;
    const existing = storageData[key];

    // Check if usage data exists for this trip
    if (existing) {
      // Update the limit in case tier changed, but keep the usage count
      existing.tripLimit = this.getTripLimit(userTier);
      return existing;
    }

    // Create new usage record for this trip
    const newUsage: ConciergeUsage = {
      userId,
      eventId,
      queriesUsed: 0,
      tripLimit: this.getTripLimit(userTier),
      resetAt: '' // Not used for per-trip model
    };

    storageData[key] = newUsage;
    this.saveToStorage(storageData);

    return newUsage;
  }

  /**
   * Increment query count for user - DATABASE-BACKED
   */
  async incrementUsage(userId: string, eventId: string, userTier: 'free' | 'plus' | 'pro' = 'free'): Promise<ConciergeUsage> {
    const usage = await this.getUsage(userId, eventId, userTier);

    if (userTier !== 'pro' && usage.queriesUsed >= usage.tripLimit) {
      throw new Error('Trip query limit reached');
    }

    // Check if in demo mode
    const isDemoMode = await demoModeService.isDemoModeEnabled();

    if (isDemoMode) {
      // Use localStorage for demo mode
      usage.queriesUsed++;
      const storageData = this.loadFromStorage();
      storageData[`${userId}-${eventId}`] = usage;
      this.saveToStorage(storageData);
      return usage;
    }

    // Insert usage record to database
    const { error } = await supabase
      .from('concierge_usage')
      .insert({
        user_id: userId,
        context_type: 'event',
        context_id: eventId,
        query_count: 1
      });

    if (error) {
      console.error('Failed to increment usage in database:', error);
      // Fallback to storage
      usage.queriesUsed++;
      const storageData = this.loadFromStorage();
      storageData[`${userId}-${eventId}`] = usage;
      this.saveToStorage(storageData);
    } else {
      usage.queriesUsed++;
    }

    return usage;
  }

  /**
   * Check if user can make another query - DATABASE-BACKED
   */
  async canQuery(userId: string, eventId: string, userTier: 'free' | 'plus' | 'pro' = 'free'): Promise<boolean> {
    if (userTier === 'pro') return true;

    const usage = await this.getUsage(userId, eventId, userTier);
    return usage.queriesUsed < usage.tripLimit;
  }

  /**
   * Get remaining queries for user in this trip
   */
  async getRemainingQueries(userId: string, eventId: string, userTier: 'free' | 'plus' | 'pro'): Promise<number> {
    if (userTier === 'pro') return Infinity;
    
    const usage = await this.getUsage(userId, eventId, userTier);
    return Math.max(0, usage.tripLimit - usage.queriesUsed);
  }

  /**
   * Get time until limit resets
   * @deprecated Per-trip limits do not reset. Returns empty string.
   * @see getRemainingQueries for current usage info
   * TODO: Remove in v2.0 after all consumers migrated
   */
  async getTimeUntilReset(_userId: string, _eventId: string, _userTier: 'free' | 'plus' | 'pro'): Promise<string> {
    // Per-trip limits do not reset - they persist for the lifetime of the trip
    return '';
  }

  /**
   * Load usage data from localStorage
   */
  private loadFromStorage(): Record<string, ConciergeUsage> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  /**
   * Save usage data to localStorage
   * Note: Per-trip usage persists (no expiration cleanup)
   */
  private saveToStorage(data: Record<string, ConciergeUsage>): void {
    try {
      // No expiration cleanup for per-trip model - usage persists for trip lifetime
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save rate limit data:', error);
    }
  }

  /**
   * Reset usage for user (admin function)
   */
  resetUsage(userId: string, eventId: string): void {
    const storageData = this.loadFromStorage();
    delete storageData[`${userId}-${eventId}`];
    this.saveToStorage(storageData);
  }
}

export const conciergeRateLimitService = new ConciergeRateLimitService();

