// @ts-nocheck
/**
 * Media AI Tagging Service
 * 
 * Uses Gemini Vision API to automatically tag and categorize media
 * Provides smart filters like "show me receipts" or "beach photos"
 * 
 * @module services/mediaAITagging
 */

import { supabase } from '@/integrations/supabase/client';

export interface AITagResult {
  tags: string[];
  category: string;
  description?: string;
  confidence: number;
}

export interface MediaItemForTagging {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
}

/**
 * Tag a single media item using AI
 * 
 * @param item - Media item to tag
 * @param tripId - Trip ID (for context)
 * @returns AI-generated tags and category
 */
export async function tagMediaItem(
  item: MediaItemForTagging,
  tripId: string
): Promise<AITagResult | null> {
  try {
    // Call enhanced-ai-parser edge function
    const response = await supabase.functions.invoke('enhanced-ai-parser', {
      body: {
        extractionType: 'photo_analysis',
        fileUrl: item.media_url,
        fileType: item.media_type === 'image' ? 'image/jpeg' : 'video/mp4',
        tripId,
      },
    });

    if (response.error) {
      console.error('[mediaAITagging] Error tagging media:', response.error);
      return null;
    }

    const analysis = response.data?.analysis;
    if (!analysis) {
      return null;
    }

    // Extract tags from analysis
    const tags: string[] = [];
    
    if (analysis.tags && Array.isArray(analysis.tags)) {
      tags.push(...analysis.tags);
    }
    
    if (analysis.activity) {
      tags.push(analysis.activity);
    }
    
    if (analysis.location) {
      tags.push(analysis.location);
    }
    
    if (analysis.mood) {
      tags.push(analysis.mood);
    }

    // Determine category
    let category = 'general';
    const activityLower = (analysis.activity || '').toLowerCase();
    const tagsLower = tags.map(t => t.toLowerCase()).join(' ');

    if (tagsLower.includes('receipt') || tagsLower.includes('invoice') || tagsLower.includes('payment')) {
      category = 'receipt';
    } else if (tagsLower.includes('schedule') || tagsLower.includes('calendar') || tagsLower.includes('itinerary')) {
      category = 'schedule';
    } else if (tagsLower.includes('beach') || tagsLower.includes('ocean') || tagsLower.includes('water')) {
      category = 'beach';
    } else if (tagsLower.includes('food') || tagsLower.includes('restaurant') || tagsLower.includes('dining')) {
      category = 'food';
    } else if (tagsLower.includes('landmark') || tagsLower.includes('monument') || tagsLower.includes('attraction')) {
      category = 'landmark';
    } else if (tagsLower.includes('group') || tagsLower.includes('people') || tagsLower.includes('team')) {
      category = 'group';
    }

    return {
      tags: [...new Set(tags)], // Remove duplicates
      category,
      description: analysis.suggested_caption,
      confidence: analysis.confidence || 0.8,
    };
  } catch (error) {
    console.error('[mediaAITagging] Error tagging media:', error);
    return null;
  }
}

/**
 * Batch tag multiple media items
 * 
 * @param items - Array of media items to tag
 * @param tripId - Trip ID
 * @param onProgress - Optional progress callback
 * @returns Map of item ID to tag results
 */
export async function batchTagMediaItems(
  items: MediaItemForTagging[],
  tripId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, AITagResult>> {
  const results = new Map<string, AITagResult>();
  const concurrency = 3; // Process 3 at a time to avoid rate limits

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const promises = batch.map(async (item) => {
      const result = await tagMediaItem(item, tripId);
      return { id: item.id, result };
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ id, result }) => {
      if (result) {
        results.set(id, result);
      }
    });

    if (onProgress) {
      onProgress(Math.min(i + concurrency, items.length), items.length);
    }

    // Small delay between batches to avoid rate limits
    if (i + concurrency < items.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Update media item metadata with AI tags
 * 
 * @param itemId - Media item ID
 * @param tags - AI-generated tags
 * @param category - Category
 * @param description - Description
 * @param source - Source table ('trip_media_index' or 'trip_files')
 */
export async function updateMediaWithAITags(
  itemId: string,
  tags: string[],
  category: string,
  description?: string,
  source: 'trip_media_index' | 'trip_files' = 'trip_media_index'
): Promise<boolean> {
  try {
    const table = source === 'trip_media_index' ? 'trip_media_index' : 'trip_files';
    
    // Fetch current metadata
    const { data: current, error: fetchError } = await supabase
      .from(table)
      .select('metadata')
      .eq('id', itemId)
      .single();

    if (fetchError || !current) {
      console.error('[mediaAITagging] Error fetching current metadata:', fetchError);
      return false;
    }

    const metadata = current.metadata || {};
    const existingTags = Array.isArray(metadata.tags) ? metadata.tags : [];
    const existingAITags = Array.isArray(metadata.ai_tags) ? metadata.ai_tags : [];

    // Merge tags (avoid duplicates)
    const allTags = [...new Set([...existingTags, ...tags])];
    const allAITags = [...new Set([...existingAITags, ...tags])];

    // Update metadata
    const { error: updateError } = await supabase
      .from(table)
      .update({
        metadata: {
          ...metadata,
          tags: allTags,
          ai_tags: allAITags,
          ai_category: category,
          ai_description: description,
          ai_tagged_at: new Date().toISOString(),
        },
      })
      .eq('id', itemId);

    if (updateError) {
      console.error('[mediaAITagging] Error updating metadata:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[mediaAITagging] Error updating media tags:', error);
    return false;
  }
}

/**
 * Filter media items by AI tags
 * 
 * @param items - Media items to filter
 * @param query - Search query (e.g., "beach photos", "receipts")
 * @returns Filtered items
 */
export function filterMediaByAITags<T extends { metadata?: Record<string, unknown> }>(
  items: T[],
  query: string
): T[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

  return items.filter(item => {
    const metadata = item.metadata || {};
    const tags = [
      ...(Array.isArray((metadata as any).tags) ? (metadata as any).tags : []),
      ...(Array.isArray((metadata as any).ai_tags) ? (metadata as any).ai_tags : []),
    ].map((t: unknown) => String(t).toLowerCase());

    const category = String((metadata as any).ai_category || '').toLowerCase();
    const description = String((metadata as any).ai_description || '').toLowerCase();

    // Check if any query word matches tags, category, or description
    return queryWords.some(word => {
      return (
        tags.some(tag => tag.includes(word)) ||
        category.includes(word) ||
        description.includes(word)
      );
    });
  });
}
