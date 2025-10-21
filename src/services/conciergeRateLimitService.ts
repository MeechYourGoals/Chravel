/**
 * Concierge Rate Limiting Service for Events
 * Prevents API cost overruns while maintaining good UX
 * NOW WITH DATABASE-BACKED RATE LIMITING
 */

import { supabase } from '@/integrations/supabase/client';
import { demoModeService } from './demoModeService';

export interface ConciergeUsage {
  userId: string;
  eventId: string;
  queriesUsed: number;
  dailyLimit: number;
  resetAt: string; // Timestamp when limit resets
}

class ConciergeRateLimitService {
  private storageKey = 'concierge-usage';

  /**
   * Get daily query limit based on user's subscription tier
   */
  getDailyLimit(userTier: 'free' | 'plus' | 'pro'): number {
    if (userTier === 'pro') return Infinity;
    if (userTier === 'plus') return 50;
    return 5; // Free: 5 queries/day
  }

  /**
   * Get current usage for user in specific event - DATABASE-BACKED
   */
  async getUsage(userId: string, eventId: string, userTier: 'free' | 'plus' | 'pro' = 'free'): Promise<ConciergeUsage> {
    // Check if in demo mode
    const isDemoMode = await demoModeService.isDemoModeEnabled();

    if (isDemoMode) {
      return this.getUsageFromStorage(userId, eventId, userTier);
    }

    // Query database for usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('concierge_usage')
      .select('id')
      .eq('user_id', userId)
      .eq('context_type', 'event')
      .eq('context_id', eventId)
      .gte('created_at', today.toISOString());

    if (error) {
      console.error('Failed to fetch usage from database:', error);
      // Fallback to storage
      return this.getUsageFromStorage(userId, eventId, userTier);
    }

    const queriesUsed = data?.length || 0;
    const resetAt = this.getNextMidnight();

    return {
      userId,
      eventId,
      queriesUsed,
      dailyLimit: this.getDailyLimit(userTier),
      resetAt
    };
  }

  /**
   * Get usage from localStorage (demo mode fallback)
   */
  private getUsageFromStorage(userId: string, eventId: string, userTier: 'free' | 'plus' | 'pro'): ConciergeUsage {
    const storageData = this.loadFromStorage();
    const key = `${userId}-${eventId}`;
    const existing = storageData[key];

    // Check if usage data exists and hasn't expired
    if (existing && new Date(existing.resetAt) > new Date()) {
      return existing;
    }

    // Create new usage record
    const resetAt = this.getNextMidnight();
    const newUsage: ConciergeUsage = {
      userId,
      eventId,
      queriesUsed: 0,
      dailyLimit: this.getDailyLimit(userTier),
      resetAt
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

    if (userTier !== 'pro' && usage.queriesUsed >= usage.dailyLimit) {
      throw new Error('Daily query limit reached');
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
    return usage.queriesUsed < usage.dailyLimit;
  }

  /**
   * Get remaining queries for user
   */
  getRemainingQueries(userId: string, eventId: string, isChravelPlus: boolean): number {
    if (isChravelPlus) return Infinity;
    
    const usage = this.getUsage(userId, eventId, isChravelPlus);
    return Math.max(0, usage.dailyLimit - usage.queriesUsed);
  }

  /**
   * Get time until limit resets
   */
  getTimeUntilReset(userId: string, eventId: string, isChravelPlus: boolean): string {
    const usage = this.getUsage(userId, eventId, isChravelPlus);
    const now = new Date();
    const reset = new Date(usage.resetAt);
    const hoursLeft = Math.ceil((reset.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursLeft === 1) return '1 hour';
    if (hoursLeft < 24) return `${hoursLeft} hours`;
    return 'tomorrow';
  }

  /**
   * Get next midnight timestamp
   */
  private getNextMidnight(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
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
   */
  private saveToStorage(data: Record<string, ConciergeUsage>): void {
    try {
      // Clean up expired entries before saving
      const now = new Date();
      const cleaned = Object.entries(data).reduce((acc, [key, value]) => {
        if (new Date(value.resetAt) > now) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, ConciergeUsage>);

      localStorage.setItem(this.storageKey, JSON.stringify(cleaned));
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

