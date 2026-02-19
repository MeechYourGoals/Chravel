/**
 * Trip Links Service
 *
 * Provides comprehensive CRUD operations for trip links
 * Handles both authenticated mode (Supabase) and demo mode (localStorage)
 *
 * Features:
 * - Create, read, update, delete trip links
 * - Vote on links
 * - Category management
 * - Demo mode persistence via localStorage
 */

import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import TripSpecificMockDataService from './tripSpecificMockDataService';
import { InputValidator } from '@/utils/securityUtils';

type TripLink = Database['public']['Tables']['trip_links']['Row'];
type TripLinkInsert = Database['public']['Tables']['trip_links']['Insert'];
type TripLinkUpdate = Database['public']['Tables']['trip_links']['Update'];

export function normalizeAndValidateUrl(rawUrl: string): string | null {
  const candidate = rawUrl.trim();
  const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  if (!InputValidator.isValidUrl(withScheme)) {
    return null;
  }

  const parsed = new URL(withScheme);
  return parsed.toString();
}

export interface CreateTripLinkParams {
  tripId: string;
  url: string;
  title: string;
  description?: string;
  category?: string;
  addedBy: string;
}

export interface UpdateTripLinkParams {
  linkId: string;
  title?: string;
  description?: string;
  category?: string;
}

/**
 * Demo mode storage key generator
 */
function getDemoLinksKey(tripId: string): string {
  return `demo_trip_links_${tripId}`;
}

/**
 * Map link source to category
 */
function mapSourceToCategory(source: string): string {
  const categoryMap: Record<string, string> = {
    places: 'attraction',
    manual: 'other',
    chat: 'other',
  };
  return categoryMap[source] || 'other';
}

/**
 * Get demo links from localStorage
 * Priority: Mock data for trips 1-12, then user-added links, then empty
 */
function getDemoLinks(tripId: string): TripLink[] {
  try {
    const tripIdNum = parseInt(tripId, 10);
    console.debug('[TripLinksService] getDemoLinks called', {
      tripId,
      tripIdNum,
      isNaN: Number.isNaN(tripIdNum),
    });

    // For trips 1-12, ALWAYS load mock data first (ignoring stale localStorage cache)
    if (tripIdNum >= 1 && tripIdNum <= 12) {
      const tripLinks = TripSpecificMockDataService.getTripLinkItems(tripIdNum);
      console.debug('[TripLinksService] Mock links from TripSpecificMockDataService', {
        tripIdNum,
        count: tripLinks.length,
        links: tripLinks,
      });

      if (tripLinks.length > 0) {
        // Transform trip-specific mock data to TripLink format
        const mockLinks = tripLinks.map((link, index) => ({
          id: `${tripId}-link-${index + 1}`,
          trip_id: tripId,
          url: link.url,
          title: link.title,
          description: link.description || null,
          category: mapSourceToCategory(link.source),
          votes: 0,
          added_by: 'demo-user',
          created_at: link.created_at,
          updated_at: link.created_at,
          sort_order: index,
        }));

        // Merge with any user-added links (links not starting with tripId-link-)
        const stored = localStorage.getItem(getDemoLinksKey(tripId));
        if (stored) {
          const userLinks = JSON.parse(stored).filter(
            (link: TripLink) => !link.id.startsWith(`${tripId}-link-`),
          );
          return [...mockLinks, ...userLinks];
        }

        return mockLinks;
      }
    }

    // For non-demo trips or trips without mock data, use localStorage only
    const stored = localStorage.getItem(getDemoLinksKey(tripId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[TripLinksService] Failed to parse demo links:', error);
    return [];
  }
}

/**
 * Save demo links to localStorage
 */
function saveDemoLinks(tripId: string, links: TripLink[]): void {
  try {
    localStorage.setItem(getDemoLinksKey(tripId), JSON.stringify(links));
  } catch (error) {
    console.error('[TripLinksService] Failed to save demo links:', error);
  }
}

/**
 * Create a new trip link
 */
export async function createTripLink(
  params: CreateTripLinkParams,
  isDemoMode: boolean,
): Promise<TripLink | null> {
  console.info('[TripLinksService] Creating trip link', {
    tripId: params.tripId,
    isDemoMode,
    hasUrl: Boolean(params.url),
  });

  const normalizedUrl = normalizeAndValidateUrl(params.url);
  if (!normalizedUrl) {
    toast.error('Please enter a valid URL');
    return null;
  }

  if (isDemoMode) {
    // Demo mode: Store in localStorage
    const demoLinks = getDemoLinks(params.tripId);
    const demoLink: TripLink = {
      id: `demo-link-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      trip_id: params.tripId,
      url: normalizedUrl,
      title: params.title,
      description: params.description || null,
      category: params.category || null,
      votes: 0,
      added_by: params.addedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sort_order: demoLinks.length,
    };

    demoLinks.push(demoLink);
    saveDemoLinks(params.tripId, demoLinks);

    console.info('[TripLinksService] ✅ Demo link created', { linkId: demoLink.id });
    toast.success('Link added to trip');
    return demoLink;
  }

  // Authenticated mode: Store in Supabase
  try {
    const { data: maxOrderData } = await supabase
      .from('trip_links')
      .select('sort_order')
      .eq('trip_id', params.tripId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const linkData: TripLinkInsert = {
      trip_id: params.tripId,
      url: normalizedUrl,
      title: params.title,
      description: params.description,
      category: params.category,
      added_by: params.addedBy,
      sort_order: (maxOrderData?.sort_order ?? -1) + 1,
    };

    const { data, error } = await supabase.from('trip_links').insert(linkData).select().single();

    if (error) {
      console.error('[TripLinksService] ❌ Create error', error);
      toast.error('Failed to add link');
      return null;
    }

    console.info('[TripLinksService] ✅ Link created', { linkId: data.id });
    toast.success('Link added to trip');
    return data;
  } catch (error) {
    console.error('[TripLinksService] ❌ Unexpected error', error);
    toast.error('Failed to add link');
    return null;
  }
}

/**
 * Get all trip links for a trip
 */
export async function getTripLinks(tripId: string, isDemoMode: boolean): Promise<TripLink[]> {
  console.debug('[TripLinksService] Fetching trip links', { tripId, isDemoMode });

  if (isDemoMode) {
    // Demo mode: Load from localStorage merged with mock data
    const demoLinks = getDemoLinks(tripId);
    console.info('[TripLinksService] ✅ Loaded demo links', {
      tripId,
      count: demoLinks.length,
      firstTitle: demoLinks[0]?.title,
    });
    return demoLinks;
  }

  // Authenticated mode: Query Supabase
  try {
    const { data, error } = await supabase
      .from('trip_links')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TripLinksService] ❌ Fetch error', error);
      toast.error('Failed to load links');
      return [];
    }

    console.info('[TripLinksService] ✅ Links fetched', { count: data?.length || 0 });
    return data || [];
  } catch (error) {
    console.error('[TripLinksService] ❌ Unexpected error', error);
    toast.error('Failed to load links');
    return [];
  }
}

/**
 * Get a single trip link by ID
 */
export async function getTripLinkById(
  linkId: string,
  tripId: string,
  isDemoMode: boolean,
): Promise<TripLink | null> {
  if (isDemoMode) {
    const demoLinks = getDemoLinks(tripId);
    return demoLinks.find(link => link.id === linkId) || null;
  }

  try {
    const { data, error } = await supabase.from('trip_links').select('*').eq('id', linkId).single();

    if (error) {
      console.error('[TripLinksService] ❌ Fetch single error', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[TripLinksService] ❌ Unexpected error', error);
    return null;
  }
}

/**
 * Update a trip link
 */
export async function updateTripLink(
  params: UpdateTripLinkParams,
  tripId: string,
  isDemoMode: boolean,
): Promise<boolean> {
  console.info('[TripLinksService] Updating trip link', {
    linkId: params.linkId,
    isDemoMode,
  });

  if (isDemoMode) {
    // Demo mode: Update in localStorage
    const demoLinks = getDemoLinks(tripId);
    const linkIndex = demoLinks.findIndex(link => link.id === params.linkId);

    if (linkIndex === -1) {
      console.warn('[TripLinksService] ⚠️ Demo link not found', { linkId: params.linkId });
      toast.error('Link not found');
      return false;
    }

    // Update fields
    if (params.title !== undefined) demoLinks[linkIndex].title = params.title;
    if (params.description !== undefined) demoLinks[linkIndex].description = params.description;
    if (params.category !== undefined) demoLinks[linkIndex].category = params.category;
    demoLinks[linkIndex].updated_at = new Date().toISOString();

    saveDemoLinks(tripId, demoLinks);
    console.info('[TripLinksService] ✅ Demo link updated');
    toast.success('Link updated');
    return true;
  }

  // Authenticated mode: Update in Supabase
  try {
    const updateData: TripLinkUpdate = {};
    if (params.title !== undefined) updateData.title = params.title;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.category !== undefined) updateData.category = params.category;
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase.from('trip_links').update(updateData).eq('id', params.linkId);

    if (error) {
      console.error('[TripLinksService] ❌ Update error', error);
      toast.error('Failed to update link');
      return false;
    }

    console.info('[TripLinksService] ✅ Link updated');
    toast.success('Link updated');
    return true;
  } catch (error) {
    console.error('[TripLinksService] ❌ Unexpected error', error);
    toast.error('Failed to update link');
    return false;
  }
}

/**
 * Delete a trip link
 */
export async function deleteTripLink(
  linkId: string,
  tripId: string,
  isDemoMode: boolean,
): Promise<boolean> {
  console.info('[TripLinksService] Deleting trip link', { linkId, isDemoMode });

  if (isDemoMode) {
    // Demo mode: Remove from localStorage
    const demoLinks = getDemoLinks(tripId);
    const filteredLinks = demoLinks.filter(link => link.id !== linkId);

    if (filteredLinks.length === demoLinks.length) {
      console.warn('[TripLinksService] ⚠️ Demo link not found', { linkId });
      toast.error('Link not found');
      return false;
    }

    saveDemoLinks(tripId, filteredLinks);
    console.info('[TripLinksService] ✅ Demo link deleted');
    toast.success('Link removed');
    return true;
  }

  // Authenticated mode: Delete from Supabase
  try {
    const { error } = await supabase.from('trip_links').delete().eq('id', linkId);

    if (error) {
      console.error('[TripLinksService] ❌ Delete error', error);
      toast.error('Failed to remove link');
      return false;
    }

    console.info('[TripLinksService] ✅ Link deleted');
    toast.success('Link removed');
    return true;
  } catch (error) {
    console.error('[TripLinksService] ❌ Unexpected error', error);
    toast.error('Failed to remove link');
    return false;
  }
}

/**
 * Vote on a trip link (upvote)
 */
export async function voteTripLink(
  linkId: string,
  tripId: string,
  isDemoMode: boolean,
): Promise<boolean> {
  console.info('[TripLinksService] Voting on trip link', { linkId, isDemoMode });

  if (isDemoMode) {
    // Demo mode: Increment vote count in localStorage
    const demoLinks = getDemoLinks(tripId);
    const linkIndex = demoLinks.findIndex(link => link.id === linkId);

    if (linkIndex === -1) {
      console.warn('[TripLinksService] ⚠️ Demo link not found', { linkId });
      return false;
    }

    demoLinks[linkIndex].votes = (demoLinks[linkIndex].votes || 0) + 1;
    demoLinks[linkIndex].updated_at = new Date().toISOString();

    saveDemoLinks(tripId, demoLinks);
    console.info('[TripLinksService] ✅ Demo vote recorded');
    toast.success('Vote recorded');
    return true;
  }

  // Authenticated mode: Increment vote in Supabase
  try {
    const { data: voteRecorded, error } = await supabase.rpc('increment_trip_link_votes', {
      p_link_id: linkId,
    });

    if (error) {
      console.error('[TripLinksService] ❌ Vote error', error);
      toast.error('Failed to vote');
      return false;
    }

    if (!voteRecorded) {
      toast.error('Link not found');
      return false;
    }

    console.info('[TripLinksService] ✅ Vote recorded');
    toast.success('Vote recorded');
    return true;
  } catch (error) {
    console.error('[TripLinksService] ❌ Unexpected error', error);
    toast.error('Failed to vote');
    return false;
  }
}

/**
 * Get links by category
 */
export async function getTripLinksByCategory(
  tripId: string,
  category: string,
  isDemoMode: boolean,
): Promise<TripLink[]> {
  const allLinks = await getTripLinks(tripId, isDemoMode);
  return allLinks.filter(link => link.category === category);
}

/**
 * Search trip links
 */
export async function searchTripLinks(
  tripId: string,
  searchQuery: string,
  isDemoMode: boolean,
): Promise<TripLink[]> {
  const allLinks = await getTripLinks(tripId, isDemoMode);
  const query = searchQuery.toLowerCase().trim();

  if (!query) return allLinks;

  return allLinks.filter(
    link =>
      link.title.toLowerCase().includes(query) ||
      link.description?.toLowerCase().includes(query) ||
      link.url.toLowerCase().includes(query),
  );
}

/**
 * Update the order of trip links
 */
export async function updateTripLinksOrder(
  tripId: string,
  orderedIds: string[],
  isDemoMode: boolean,
): Promise<boolean> {
  console.info('[TripLinksService] Updating links order', {
    tripId,
    isDemoMode,
    count: orderedIds.length,
  });

  if (isDemoMode) {
    // Demo mode: Reorder in localStorage
    const demoLinks = getDemoLinks(tripId);
    const orderedLinks: TripLink[] = [];

    for (const id of orderedIds) {
      const link = demoLinks.find(l => l.id === id);
      if (link) orderedLinks.push({ ...link, sort_order: orderedLinks.length });
    }

    // Add any links not in orderedIds at the end
    const remainingLinks = demoLinks
      .filter(l => !orderedIds.includes(l.id))
      .map((link, index) => ({ ...link, sort_order: orderedLinks.length + index }));
    orderedLinks.push(...remainingLinks);

    saveDemoLinks(tripId, orderedLinks);
    console.info('[TripLinksService] ✅ Demo links reordered');
    return true;
  }

  // Authenticated mode: Update order in Supabase
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('trip_links')
        .update({ sort_order: i, updated_at: new Date().toISOString() })
        .eq('id', orderedIds[i]);

      if (error) {
        console.error('[TripLinksService] ❌ Order update error', error);
        return false;
      }
    }

    console.info('[TripLinksService] ✅ Links reordered');
    return true;
  } catch (error) {
    console.error('[TripLinksService] ❌ Unexpected error', error);
    return false;
  }
}
