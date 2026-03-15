/**
 * Recommendation Service
 *
 * Fetches organic recommendations from the recommendation_items table
 * and sponsored recommendations from active campaigns, then blends them
 * into a unified feed. Also handles impression/click tracking.
 *
 * This service does NOT replace the existing useRecommendations hook.
 * It sits alongside as the production-ready data layer until the page
 * is rewired to use it.
 */

import { supabase } from '@/integrations/supabase/client';
import { AdvertiserService } from '@/services/advertiserService';
import { dbItemToRecommendation, campaignToRecommendation } from '@/services/recommendationMappers';
import type { Recommendation, RecommendationItemRow } from '@/data/recommendations/types';

export interface RecommendationFilters {
  city?: string;
  type?: Recommendation['type'];
  limit?: number;
}

export interface SponsoredFilters {
  location?: string;
  tripType?: string;
}

export interface ImpressionParams {
  itemId: string;
  itemType: 'organic' | 'sponsored';
  userId?: string;
  tripId?: string;
  surface: 'recs_page' | 'trip_detail' | 'concierge' | 'home';
  position: number;
}

export interface ClickParams {
  impressionId: string;
  action: 'view' | 'save' | 'book' | 'external_link' | 'add_to_trip' | 'hide';
}

export class RecommendationService {
  /**
   * Fetch organic recommendations from the recommendation_items table.
   */
  static async getOrganicItems(filters?: RecommendationFilters): Promise<Recommendation[]> {
    // intentional: recommendation_items not yet in generated types
    let query = (supabase as any)
      .from('recommendation_items')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false });

    if (filters?.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch organic recommendations: ${error.message}`);
    }

    return ((data as RecommendationItemRow[]) || []).map(dbItemToRecommendation);
  }

  /**
   * Fetch sponsored recommendations from active campaigns.
   * Reuses AdvertiserService.getActiveCampaigns for the query.
   */
  static async getSponsoredItems(filters?: SponsoredFilters): Promise<Recommendation[]> {
    const campaigns = await AdvertiserService.getActiveCampaigns({
      location: filters?.location,
      trip_type: filters?.tripType,
    });

    return campaigns.map(campaignToRecommendation);
  }

  /**
   * Blend organic and sponsored recommendations into a unified feed.
   *
   * Rules:
   * - Organic items fill first; sponsored supplements
   * - Max 1 sponsored per 3 organic (25% cap)
   * - If fewer than 3 organic items, show 0 sponsored
   * - Sponsored must pass the relevance gate (handled upstream by filters)
   */
  static blendFeed(
    organic: Recommendation[],
    sponsored: Recommendation[],
    sponsoredRatio: number = 0.25,
  ): Recommendation[] {
    if (organic.length < 3 || sponsored.length === 0) {
      return organic;
    }

    const result: Recommendation[] = [];
    const organicPerSlot = Math.max(1, Math.round(1 / sponsoredRatio) - 1);
    let organicIdx = 0;
    let sponsoredIdx = 0;

    while (organicIdx < organic.length) {
      // Add a batch of organic items
      for (let i = 0; i < organicPerSlot && organicIdx < organic.length; i++) {
        result.push(organic[organicIdx++]);
      }

      // Interleave one sponsored item if available
      if (sponsoredIdx < sponsored.length) {
        result.push(sponsored[sponsoredIdx++]);
      }
    }

    // Append any remaining sponsored items (up to ratio limit)
    const maxSponsored = Math.floor(organic.length * sponsoredRatio);
    while (sponsoredIdx < sponsored.length && sponsoredIdx < maxSponsored) {
      result.push(sponsored[sponsoredIdx++]);
    }

    return result;
  }

  /**
   * Record an impression (item shown to user).
   * Fails silently — tracking should never break the UX.
   */
  static async trackImpression(params: ImpressionParams): Promise<string | null> {
    // intentional: recommendation tables not yet in generated types
    const { data, error } = await (supabase as any)
      .from('recommendation_impressions')
      .insert({
        item_id: params.itemId,
        item_type: params.itemType,
        user_id: params.userId || null,
        trip_id: params.tripId || null,
        surface: params.surface,
        position: params.position,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      // Tracking failures should not break the user experience
      return null;
    }

    return data?.id || null;
  }

  /**
   * Record a click action on a previously tracked impression.
   * Fails silently — tracking should never break the UX.
   */
  static async trackClick(params: ClickParams): Promise<void> {
    // intentional: recommendation tables not yet in generated types
    const { error } = await (supabase as any).from('recommendation_clicks').insert({
      impression_id: params.impressionId,
      action: params.action,
    });

    if (error) {
      // Tracking failures should not break the user experience
    }
  }

  /**
   * Record user feedback on a recommendation.
   */
  static async submitFeedback(params: {
    userId: string;
    itemId: string;
    itemType: 'organic' | 'sponsored';
    feedbackType: 'not_interested' | 'hide' | 'report' | 'save' | 'love';
  }): Promise<void> {
    // intentional: recommendation tables not yet in generated types
    const { error } = await (supabase as any).from('recommendation_feedback').insert({
      user_id: params.userId,
      item_id: params.itemId,
      item_type: params.itemType,
      feedback_type: params.feedbackType,
    });

    if (error && error.code !== '23505') {
      // 23505 = unique violation (already submitted this feedback)
      throw new Error(`Failed to submit feedback: ${error.message}`);
    }
  }

  /**
   * Get items the user has hidden, so they can be filtered from the feed.
   */
  static async getHiddenItemIds(userId: string): Promise<string[]> {
    // intentional: recommendation tables not yet in generated types
    const { data, error } = await (supabase as any)
      .from('recommendation_feedback')
      .select('item_id')
      .eq('user_id', userId)
      .in('feedback_type', ['not_interested', 'hide']);

    if (error) {
      return [];
    }

    return (data || []).map(row => row.item_id);
  }
}
