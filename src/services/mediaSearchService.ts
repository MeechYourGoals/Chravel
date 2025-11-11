/**
 * Media Search Service
 * 
 * Provides full-text search capabilities for media metadata
 * Searches across filenames, tags, descriptions, and extracted text
 * 
 * @module services/mediaSearchService
 */

import { supabase } from '@/integrations/supabase/client';

export interface MediaSearchResult {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  metadata: Record<string, unknown>;
  created_at: string;
  source: 'chat' | 'upload';
  matchScore?: number; // Relevance score (0-1)
  matchedFields?: string[]; // Which fields matched
}

export interface SearchOptions {
  tripId: string;
  query: string;
  mediaTypes?: ('image' | 'video' | 'document')[];
  limit?: number;
  minScore?: number; // Minimum relevance score (0-1)
}

/**
 * Full-text search across media metadata
 * 
 * Searches in:
 * - Filename
 * - Metadata tags
 * - Metadata description
 * - Extracted text (for documents)
 * - AI-generated tags
 * 
 * @param options - Search options
 * @returns Array of matching media items with relevance scores
 */
export async function searchMedia(options: SearchOptions): Promise<MediaSearchResult[]> {
  const {
    tripId,
    query,
    mediaTypes = ['image', 'video', 'document'],
    limit = 50,
    minScore = 0.1,
  } = options;

  if (!query.trim()) {
    return [];
  }

  try {
    // Fetch all media items for the trip
    const [mediaResponse, filesResponse] = await Promise.all([
      supabase
        .from('trip_media_index')
        .select('*')
        .eq('trip_id', tripId)
        .in('media_type', mediaTypes)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('trip_files')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false }),
    ]);

    const allItems: MediaSearchResult[] = [
      ...(mediaResponse.data || []).map(item => ({
        id: item.id,
        media_url: item.media_url,
        filename: item.filename || 'Untitled',
        media_type: item.media_type as 'image' | 'video' | 'document',
        metadata: item.metadata || {},
        created_at: item.created_at,
        source: 'chat' as const,
      })),
      ...(filesResponse.data || []).map(item => ({
        id: item.id,
        media_url: `/storage/trip-files/${item.name}`,
        filename: item.name,
        media_type: item.file_type as 'image' | 'video' | 'document',
        metadata: { extracted_events: item.extracted_events },
        created_at: item.created_at,
        source: 'upload' as const,
      })),
    ];

    // Perform client-side search with scoring
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

    const scoredResults = allItems
      .map(item => {
        const searchableText = buildSearchableText(item);
        const { score, matchedFields } = calculateRelevanceScore(searchableText, queryWords, item);
        
        return {
          ...item,
          matchScore: score,
          matchedFields,
        };
      })
      .filter(item => item.matchScore! >= minScore)
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      .slice(0, limit);

    return scoredResults;
  } catch (error) {
    console.error('[mediaSearchService] Search error:', error);
    return [];
  }
}

/**
 * Build searchable text from media item
 */
function buildSearchableText(item: MediaSearchResult): string {
  const parts: string[] = [
    item.filename,
    item.media_type,
  ];

  // Add metadata tags
  if (item.metadata.tags && Array.isArray(item.metadata.tags)) {
    parts.push(...item.metadata.tags.map((t: unknown) => String(t)));
  }

  // Add AI-generated tags
  if (item.metadata.ai_tags && Array.isArray(item.metadata.ai_tags)) {
    parts.push(...item.metadata.ai_tags.map((t: unknown) => String(t)));
  }

  // Add description
  if (item.metadata.description) {
    parts.push(String(item.metadata.description));
  }

  // Add extracted text (for documents)
  if (item.metadata.extracted_text) {
    parts.push(String(item.metadata.extracted_text));
  }

  // Add location name
  if (item.metadata.location?.name) {
    parts.push(String(item.metadata.location.name));
  }

  return parts.join(' ').toLowerCase();
}

/**
 * Calculate relevance score for a media item
 * 
 * Scoring algorithm:
 * - Exact filename match: 1.0
 * - Partial filename match: 0.8
 * - Tag match: 0.6
 * - Description match: 0.4
 * - Word matches: 0.2 per word
 */
function calculateRelevanceScore(
  searchableText: string,
  queryWords: string[],
  item: MediaSearchResult
): { score: number; matchedFields: string[] } {
  let score = 0;
  const matchedFields: string[] = [];

  // Exact filename match
  if (item.filename.toLowerCase() === queryWords.join(' ')) {
    score = 1.0;
    matchedFields.push('filename');
    return { score, matchedFields };
  }

  // Partial filename match
  if (item.filename.toLowerCase().includes(queryWords.join(' '))) {
    score += 0.8;
    matchedFields.push('filename');
  }

  // Tag matches
  const tags = [
    ...(Array.isArray(item.metadata.tags) ? item.metadata.tags : []),
    ...(Array.isArray(item.metadata.ai_tags) ? item.metadata.ai_tags : []),
  ];
  const tagMatches = tags.filter((tag: unknown) => {
    const tagStr = String(tag).toLowerCase();
    return queryWords.some(word => tagStr.includes(word));
  });
  if (tagMatches.length > 0) {
    score += 0.6 * (tagMatches.length / tags.length);
    matchedFields.push('tags');
  }

  // Description match
  if (item.metadata.description) {
    const desc = String(item.metadata.description).toLowerCase();
    const descMatches = queryWords.filter(word => desc.includes(word));
    if (descMatches.length > 0) {
      score += 0.4 * (descMatches.length / queryWords.length);
      matchedFields.push('description');
    }
  }

  // Word-by-word matches in searchable text
  const wordMatches = queryWords.filter(word => searchableText.includes(word));
  score += 0.2 * (wordMatches.length / queryWords.length);

  // Normalize score to 0-1 range
  score = Math.min(score, 1.0);

  return { score, matchedFields };
}

/**
 * Search media by tags
 * 
 * @param tripId - Trip ID
 * @param tags - Array of tags to search for
 * @returns Array of media items matching any of the tags
 */
export async function searchMediaByTags(
  tripId: string,
  tags: string[]
): Promise<MediaSearchResult[]> {
  try {
    const [mediaResponse, filesResponse] = await Promise.all([
      supabase
        .from('trip_media_index')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('trip_files')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false }),
    ]);

    const allItems: MediaSearchResult[] = [
      ...(mediaResponse.data || []).map(item => ({
        id: item.id,
        media_url: item.media_url,
        filename: item.filename || 'Untitled',
        media_type: item.media_type as 'image' | 'video' | 'document',
        metadata: item.metadata || {},
        created_at: item.created_at,
        source: 'chat' as const,
      })),
      ...(filesResponse.data || []).map(item => ({
        id: item.id,
        media_url: `/storage/trip-files/${item.name}`,
        filename: item.name,
        media_type: item.file_type as 'image' | 'video' | 'document',
        metadata: { extracted_events: item.extracted_events },
        created_at: item.created_at,
        source: 'upload' as const,
      })),
    ];

    const tagsLower = tags.map(t => t.toLowerCase());

    return allItems.filter(item => {
      const itemTags = [
        ...(Array.isArray(item.metadata.tags) ? item.metadata.tags : []),
        ...(Array.isArray(item.metadata.ai_tags) ? item.metadata.ai_tags : []),
      ].map((t: unknown) => String(t).toLowerCase());

      return tagsLower.some(searchTag => 
        itemTags.some(itemTag => itemTag.includes(searchTag))
      );
    });
  } catch (error) {
    console.error('[mediaSearchService] Tag search error:', error);
    return [];
  }
}
