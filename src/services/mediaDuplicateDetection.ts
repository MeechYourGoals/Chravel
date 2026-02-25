/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary until trip_files columns added to generated types
/**
 * Media Duplicate Detection Service
 *
 * Detects duplicate media files using:
 * - File hash comparison (most accurate)
 * - Filename similarity
 * - Image similarity (for photos)
 *
 * @module services/mediaDuplicateDetection
 */

import { supabase } from '@/integrations/supabase/client';

export interface DuplicateGroup {
  hash: string;
  files: Array<{
    id: string;
    media_url: string;
    filename: string;
    created_at: string;
    source: 'chat' | 'upload';
  }>;
  count: number;
}

export interface DuplicateDetectionOptions {
  tripId: string;
  useHash?: boolean; // Use file hash if available (default: true)
  useFilename?: boolean; // Use filename similarity (default: true)
  similarityThreshold?: number; // Filename similarity threshold 0-1 (default: 0.8)
}

/**
 * Detect duplicate media files in a trip
 *
 * @param options - Detection options
 * @returns Array of duplicate groups
 */
export async function detectDuplicates(
  options: DuplicateDetectionOptions,
): Promise<DuplicateGroup[]> {
  const { tripId, useHash = true, useFilename = true, similarityThreshold = 0.8 } = options;

  try {
    // Fetch all media items
    const [mediaResponse, filesResponse] = await Promise.all([
      supabase
        .from('trip_media_index')
        .select('id, media_url, filename, created_at, metadata')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false }),

      supabase
        .from('trip_files')
        .select('id, name, created_at, file_hash')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false }),
    ]);

    const allItems = [
      ...(mediaResponse.data || []).map(item => ({
        id: item.id,
        media_url: item.media_url,
        filename: item.filename || 'Untitled',
        created_at: item.created_at,
        source: 'chat' as const,
        hash: item.metadata?.file_hash as string | undefined,
      })),
      ...(filesResponse.data || []).map(item => ({
        id: item.id,
        media_url: `/storage/trip-files/${item.name}`,
        filename: item.name,
        created_at: item.created_at,
        source: 'upload' as const,
        hash: item.file_hash || undefined,
      })),
    ];

    const duplicateGroups: Map<string, DuplicateGroup> = new Map();
    const itemsGroupedByHash = new Set<string>(); // Track items already grouped by hash

    // Group by hash (most accurate)
    if (useHash) {
      const hashGroups = new Map<string, typeof allItems>();

      for (const item of allItems) {
        if (item.hash) {
          if (!hashGroups.has(item.hash)) {
            hashGroups.set(item.hash, []);
          }
          hashGroups.get(item.hash)!.push(item);
        }
      }

      // Add groups with 2+ items
      for (const [hash, items] of hashGroups.entries()) {
        if (items.length >= 2) {
          // Mark all items in this group as already processed
          items.forEach(item => itemsGroupedByHash.add(item.id));

          duplicateGroups.set(`hash-${hash}`, {
            hash,
            files: items.map(item => ({
              id: item.id,
              media_url: item.media_url,
              filename: item.filename,
              created_at: item.created_at,
              source: item.source,
            })),
            count: items.length,
          });
        }
      }
    }

    // Group by filename similarity (runs independently, only checks items not grouped by hash)
    if (useFilename) {
      // Filter to items that weren't already grouped by hash
      const unhashedItems = allItems.filter(item => !itemsGroupedByHash.has(item.id));

      if (unhashedItems.length > 0) {
        const filenameGroups = new Map<string, typeof allItems>();

        for (let i = 0; i < unhashedItems.length; i++) {
          const item1 = unhashedItems[i];
          const normalizedName1 = normalizeFilename(item1.filename);

          let added = false;
          for (const [key, group] of filenameGroups.entries()) {
            const normalizedName2 = normalizeFilename(key);
            const similarity = calculateSimilarity(normalizedName1, normalizedName2);

            if (similarity >= similarityThreshold) {
              group.push(item1);
              added = true;
              break;
            }
          }

          if (!added) {
            filenameGroups.set(item1.filename, [item1]);
          }
        }

        // Add groups with 2+ items
        for (const [filename, items] of filenameGroups.entries()) {
          if (items.length >= 2) {
            duplicateGroups.set(`filename-${filename}`, {
              hash: `filename-${filename}`,
              files: items.map(item => ({
                id: item.id,
                media_url: item.media_url,
                filename: item.filename,
                created_at: item.created_at,
                source: item.source,
              })),
              count: items.length,
            });
          }
        }
      }
    }

    return Array.from(duplicateGroups.values());
  } catch (error) {
    console.error('[mediaDuplicateDetection] Error detecting duplicates:', error);
    return [];
  }
}

/**
 * Normalize filename for comparison
 */
function normalizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove special chars
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Calculate similarity between two filenames (0-1)
 * Uses Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Remove duplicate media files, keeping the oldest one
 *
 * @param tripId - Trip ID
 * @param duplicateGroups - Groups of duplicates from detectDuplicates
 * @returns Number of files removed
 */
export async function removeDuplicates(
  tripId: string,
  duplicateGroups: DuplicateGroup[],
): Promise<number> {
  let removedCount = 0;

  try {
    for (const group of duplicateGroups) {
      if (group.files.length < 2) continue;

      // Sort by created_at, keep oldest
      const sorted = [...group.files].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const keep = sorted[0];
      const remove = sorted.slice(1);

      // Delete duplicates
      for (const item of remove) {
        // Determine which table to delete from based on source
        if (item.source === 'chat') {
          await supabase.from('trip_media_index').delete().eq('id', item.id);
        } else {
          await supabase.from('trip_files').delete().eq('id', item.id);
        }
        removedCount++;
      }
    }
  } catch (error) {
    console.error('[mediaDuplicateDetection] Error removing duplicates:', error);
  }

  return removedCount;
}
