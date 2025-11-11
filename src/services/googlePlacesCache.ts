// @ts-nocheck
/**
 * Google Places API Cache Service
 * 
 * Provides server-side caching layer using Supabase to:
 * - Reduce API calls by 60-80% (cache hit rate)
 * - Lower costs by caching place details for 30 days
 * - Improve performance (cache responses are instant)
 * 
 * Cache Strategy:
 * - Autocomplete: 1 hour client-side, 30 days server-side
 * - Place Details: 30 days server-side (place data rarely changes)
 * - Text Search: 30 days server-side (same query = same results)
 * - Nearby Search: 1 hour client-side, 30 days server-side
 * 
 * Created: 2025-02-01
 * Purpose: Reduce Google Maps API costs and improve performance
 */

import { supabase } from '@/integrations/supabase/client';
import type { ConvertedPlace, ConvertedPrediction } from '@/types/places';

export type SearchOrigin = { lat: number; lng: number } | null;

/**
 * Generate a stable cache key from query parameters
 */
export function generateCacheKey(
  endpoint: 'autocomplete' | 'text-search' | 'place-details' | 'nearby-search',
  query: string,
  origin: SearchOrigin | null,
  additionalParams?: Record<string, string | number>
): string {
  const parts = [
    endpoint,
    query.toLowerCase().trim(),
    origin ? `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}` : 'no-origin',
    ...(additionalParams ? Object.entries(additionalParams).map(([k, v]) => `${k}:${v}`) : []),
  ];
  
  // Create a hash-like key (simple but effective for our use case)
  const key = parts.join('|');
  
  // Use a simple hash function (not cryptographically secure, but fast)
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `places_cache_${Math.abs(hash).toString(36)}`;
}

/**
 * Get cached place data from Supabase
 * Returns null if cache miss or expired
 */
export async function getCachedPlace<T extends ConvertedPlace | ConvertedPrediction[]>(
  cacheKey: string
): Promise<T | null> {
  try {
    const { data, error } = await supabase.rpc('get_places_cache', {
      p_cache_key: cacheKey,
    });

    if (error) {
      console.warn('[PlacesCache] Error fetching cache:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    console.log('[PlacesCache] ✅ Cache hit:', cacheKey.substring(0, 20) + '...');
    return data as T;
  } catch (error) {
    console.warn('[PlacesCache] Cache fetch failed:', error);
    return null;
  }
}

/**
 * Store place data in Supabase cache (30-day TTL)
 */
export async function setCachedPlace(
  cacheKey: string,
  endpoint: 'autocomplete' | 'text-search' | 'place-details' | 'nearby-search',
  query: string,
  data: ConvertedPlace | ConvertedPrediction[],
  placeId?: string,
  origin?: SearchOrigin | null
): Promise<void> {
  try {
    const { error } = await supabase.rpc('set_places_cache', {
      p_cache_key: cacheKey,
      p_query_text: query,
      p_api_endpoint: endpoint,
      p_response_data: data,
      p_place_id: placeId || null,
      p_origin_lat: origin?.lat || null,
      p_origin_lng: origin?.lng || null,
    });

    if (error) {
      console.warn('[PlacesCache] Error storing cache:', error);
      // Don't throw - caching is best-effort
    } else {
      console.log('[PlacesCache] ✅ Cached:', cacheKey.substring(0, 20) + '...');
    }
  } catch (error) {
    console.warn('[PlacesCache] Cache store failed:', error);
    // Don't throw - caching is best-effort, shouldn't break API calls
  }
}

/**
 * Record API usage for quota monitoring
 * Estimates cost based on Google Maps API pricing (as of 2024):
 * - Autocomplete: $0.017 per session
 * - Text Search: $0.017 per request
 * - Place Details: $0.017 per request
 * - Nearby Search: $0.032 per request
 */
export async function recordApiUsage(
  endpoint: 'autocomplete' | 'text-search' | 'place-details' | 'nearby-search' | 'geocode',
  userId?: string | null
): Promise<void> {
  // Cost estimates per request (USD) - update if Google changes pricing
  const costPerRequest: Record<string, number> = {
    'autocomplete': 0.017,
    'text-search': 0.017,
    'place-details': 0.017,
    'nearby-search': 0.032,
    'geocode': 0.005,
  };

  const estimatedCost = costPerRequest[endpoint] || 0.017;

  try {
    const { error } = await supabase.rpc('record_api_usage', {
      p_api_endpoint: endpoint,
      p_user_id: userId || null,
      p_estimated_cost_usd: estimatedCost,
    });

    if (error) {
      console.warn('[PlacesCache] Error recording usage:', error);
      // Don't throw - usage tracking is best-effort
    }
  } catch (error) {
    console.warn('[PlacesCache] Usage recording failed:', error);
    // Don't throw - usage tracking shouldn't break API calls
  }
}

/**
 * Get hourly usage statistics for quota monitoring
 */
export async function getHourlyUsage(
  endpoint: 'autocomplete' | 'text-search' | 'place-details' | 'nearby-search' | 'geocode',
  userId?: string | null
): Promise<Array<{ request_count: number; estimated_cost_usd: number; date_hour: string }>> {
  try {
    const { data, error } = await supabase.rpc('get_hourly_usage', {
      p_api_endpoint: endpoint,
      p_user_id: userId || null,
    });

    if (error) {
      console.warn('[PlacesCache] Error fetching hourly usage:', error);
      return [];
    }

    return (data || []) as Array<{ request_count: number; estimated_cost_usd: number; date_hour: string }>;
  } catch (error) {
    console.warn('[PlacesCache] Hourly usage fetch failed:', error);
    return [];
  }
}

/**
 * Get daily usage statistics for quota monitoring
 */
export async function getDailyUsage(
  endpoint: 'autocomplete' | 'text-search' | 'place-details' | 'nearby-search' | 'geocode',
  days: number = 7,
  userId?: string | null
): Promise<Array<{ request_count: number; estimated_cost_usd: number; date_day: string }>> {
  try {
    const { data, error } = await supabase.rpc('get_daily_usage', {
      p_api_endpoint: endpoint,
      p_user_id: userId || null,
      p_days: days,
    });

    if (error) {
      console.warn('[PlacesCache] Error fetching daily usage:', error);
      return [];
    }

    return (data || []) as Array<{ request_count: number; estimated_cost_usd: number; date_day: string }>;
  } catch (error) {
    console.warn('[PlacesCache] Daily usage fetch failed:', error);
    return [];
  }
}
