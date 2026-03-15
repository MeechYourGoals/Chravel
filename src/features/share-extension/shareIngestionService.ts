/**
 * Share Extension ingestion service.
 *
 * Materializes SharedInboundItems from the iOS Share Extension
 * into their destination entities (chat messages, explore links, tasks, etc.).
 *
 * Flow:
 * 1. Extension saves SharedInboundItem to App Group shared storage
 * 2. Main app reads pending items on foreground / deep link
 * 3. This service processes each item and writes to Supabase
 * 4. Cleans up processed items from local storage
 */

import { supabase } from '@/integrations/supabase/client';
import type { SharedInboundItem, SharedInboundItemRow, ShareDestination } from './types';

// ── Persistence to Supabase ─────────────────────────────────────────────────

/**
 * Save a shared inbound item to Supabase and materialize it.
 */
export async function processSharedItem(
  item: SharedInboundItem,
  userId: string,
): Promise<{ success: boolean; error?: string; materializedId?: string }> {
  const tripId = item.selectedTripId;
  const destination = item.selectedDestination;

  if (!tripId || !destination) {
    return { success: false, error: 'Missing trip or destination' };
  }

  // Check for backend-level dedupe
  // intentional: shared_inbound_items not yet in generated types
  const sbAny = supabase as any;

  if (item.dedupeFingerprint) {
    const { data: existing } = await sbAny
      .from('shared_inbound_items')
      .select('id')
      .eq('dedupe_fingerprint', item.dedupeFingerprint)
      .eq('trip_id', tripId)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: true, materializedId: existing[0].id };
    }
  }

  // Insert the shared inbound item record
  const { data: savedItem, error: insertError } = await sbAny
    .from('shared_inbound_items')
    .insert({
      id: item.id,
      user_id: userId,
      trip_id: tripId,
      content_type: item.contentType,
      destination,
      normalized_url: item.normalizedURL,
      normalized_text: item.normalizedText,
      preview_title: item.previewTitle,
      preview_subtitle: item.previewSubtitle,
      user_note: item.userNote,
      source_app: item.sourceAppIdentifier,
      routing_confidence: item.routingDecision?.confidence ?? null,
      ingestion_status: 'processing',
      dedupe_fingerprint: item.dedupeFingerprint,
      attachments: JSON.stringify(item.attachments),
      metadata: JSON.stringify({
        routingDecision: item.routingDecision,
      }),
    } as Partial<SharedInboundItemRow>)
    .select()
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // Materialize into destination
  const result = await materializeToDestination(item, userId, tripId, destination);

  // Update ingestion status
  const finalStatus = result.success ? 'completed' : 'failed';
  await sbAny
    .from('shared_inbound_items')
    .update({
      ingestion_status: finalStatus,
      materialized_id: result.materializedId ?? null,
      materialized_type: destination,
      error_message: result.error ?? null,
    } as Partial<SharedInboundItemRow>)
    .eq('id', item.id);

  return result;
}

// ── Destination Materialization ──────────────────────────────────────────────

async function materializeToDestination(
  item: SharedInboundItem,
  userId: string,
  tripId: string,
  destination: ShareDestination,
): Promise<{ success: boolean; error?: string; materializedId?: string }> {
  switch (destination) {
    case 'explore_links':
      return materializeAsExploreLink(item, userId, tripId);
    case 'chat':
      return materializeAsChatMessage(item, userId, tripId);
    case 'tasks':
      return materializeAsTask(item, userId, tripId);
    case 'calendar':
      return materializeAsCalendarNote(item, userId, tripId);
    case 'concierge':
      return materializeAsConciergeItem(item, userId, tripId);
    default:
      return { success: false, error: `Unknown destination: ${destination}` };
  }
}

async function materializeAsExploreLink(
  item: SharedInboundItem,
  userId: string,
  tripId: string,
): Promise<{ success: boolean; error?: string; materializedId?: string }> {
  const url = item.normalizedURL;
  if (!url) {
    return { success: false, error: 'No URL to save as explore link' };
  }

  const title = item.previewTitle || url;
  const description =
    [item.userNote, item.normalizedText].filter(Boolean).join('\n\n') || undefined;

  const { data, error } = await supabase
    .from('trip_links')
    .insert({
      trip_id: tripId,
      url,
      title,
      description,
      added_by: userId,
      category: 'shared',
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, materializedId: data?.id };
}

async function materializeAsChatMessage(
  item: SharedInboundItem,
  userId: string,
  tripId: string,
): Promise<{ success: boolean; error?: string; materializedId?: string }> {
  const parts: string[] = [];

  if (item.userNote) parts.push(item.userNote);
  if (item.normalizedURL) parts.push(item.normalizedURL);
  if (item.normalizedText && item.normalizedText !== item.normalizedURL) {
    parts.push(item.normalizedText);
  }

  const content = parts.join('\n\n') || '[Shared content]';

  // intentional: trip_chat_messages insert shape mismatch with generated types
  const { data, error } = await (supabase as any)
    .from('trip_chat_messages')
    .insert({
      trip_id: tripId,
      sender_id: userId,
      content,
      client_message_id: `share_${item.id}`,
      metadata: {
        source: 'share_extension',
        content_type: item.contentType,
        shared_item_id: item.id,
      },
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, materializedId: data?.id };
}

async function materializeAsTask(
  item: SharedInboundItem,
  userId: string,
  tripId: string,
): Promise<{ success: boolean; error?: string; materializedId?: string }> {
  const title = item.previewTitle || item.normalizedText?.substring(0, 100) || 'Shared task';
  const description =
    [item.userNote, item.normalizedURL, item.normalizedText].filter(Boolean).join('\n\n') ||
    undefined;

  const { data, error } = await supabase
    .from('trip_tasks')
    .insert({
      trip_id: tripId,
      creator_id: userId,
      title,
      description,
      is_poll: false,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, materializedId: data?.id };
}

async function materializeAsCalendarNote(
  item: SharedInboundItem,
  userId: string,
  tripId: string,
): Promise<{ success: boolean; error?: string; materializedId?: string }> {
  // Calendar items are complex — for V1, create as a chat message with calendar context
  // so the concierge or user can convert it into a proper event
  const parts: string[] = [];
  parts.push('📅 Shared calendar content:');
  if (item.userNote) parts.push(item.userNote);
  if (item.normalizedURL) parts.push(item.normalizedURL);
  if (item.normalizedText) parts.push(item.normalizedText);

  const content = parts.join('\n\n');

  // intentional: trip_chat_messages insert shape mismatch with generated types
  const { data, error } = await (supabase as any)
    .from('trip_chat_messages')
    .insert({
      trip_id: tripId,
      sender_id: userId,
      content,
      client_message_id: `share_cal_${item.id}`,
      metadata: {
        source: 'share_extension',
        content_type: item.contentType,
        shared_item_id: item.id,
        intended_destination: 'calendar',
      },
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, materializedId: data?.id };
}

async function materializeAsConciergeItem(
  item: SharedInboundItem,
  userId: string,
  tripId: string,
): Promise<{ success: boolean; error?: string; materializedId?: string }> {
  // Save as a chat message tagged for concierge processing
  const parts: string[] = [];
  parts.push('🤖 Shared for AI Concierge processing:');
  if (item.userNote) parts.push(`Note: ${item.userNote}`);
  if (item.normalizedURL) parts.push(item.normalizedURL);
  if (item.normalizedText) parts.push(item.normalizedText);
  if (item.attachments.length > 0) {
    parts.push(`${item.attachments.length} attachment(s) included`);
  }

  const content = parts.join('\n\n');

  // intentional: trip_chat_messages insert shape mismatch with generated types
  const { data, error } = await (supabase as any)
    .from('trip_chat_messages')
    .insert({
      trip_id: tripId,
      sender_id: userId,
      content,
      client_message_id: `share_concierge_${item.id}`,
      metadata: {
        source: 'share_extension',
        content_type: item.contentType,
        shared_item_id: item.id,
        intended_destination: 'concierge',
        requires_processing: true,
      },
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, materializedId: data?.id };
}

// ── Pending Items Management ─────────────────────────────────────────────────

/**
 * Get all pending shared items for the current user.
 */
export async function getPendingSharedItems(userId: string): Promise<SharedInboundItemRow[]> {
  // intentional: shared_inbound_items not yet in generated types
  const { data, error } = await (supabase as any)
    .from('shared_inbound_items')
    .select('*')
    .eq('user_id', userId)
    .in('ingestion_status', ['pending', 'queued'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return (data as SharedInboundItemRow[]) ?? [];
}

/**
 * Get recent shared items for a trip.
 */
export async function getSharedItemsForTrip(
  tripId: string,
  limit: number = 20,
): Promise<SharedInboundItemRow[]> {
  // intentional: shared_inbound_items not yet in generated types
  const { data, error } = await (supabase as any)
    .from('shared_inbound_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data as SharedInboundItemRow[]) ?? [];
}
