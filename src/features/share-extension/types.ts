/**
 * Types for the Share Extension ingestion pipeline.
 * Mirror of the iOS SharedModels — kept in sync manually.
 */

export type ShareDestination = 'explore_links' | 'chat' | 'tasks' | 'calendar' | 'concierge';

export type SharedContentType =
  | 'url'
  | 'plain_text'
  | 'rich_text'
  | 'image'
  | 'pdf'
  | 'file'
  | 'multiple';

export type IngestionStatus =
  | 'pending'
  | 'queued'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed';

export type RoutingConfidence = 'high' | 'medium' | 'low';

export interface SharedContentAttachment {
  id: string;
  contentType: SharedContentType;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  localRelativePath: string | null;
  inlineData: string | null;
  thumbnailData: string | null;
}

export interface SharedInboundItem {
  id: string;
  createdAt: string;
  sourceAppIdentifier: string | null;
  contentType: SharedContentType;
  normalizedURL: string | null;
  normalizedText: string | null;
  previewTitle: string | null;
  previewSubtitle: string | null;
  attachments: SharedContentAttachment[];
  selectedTripId: string | null;
  selectedDestination: ShareDestination | null;
  routingDecision: ShareRoutingDecision | null;
  userNote: string | null;
  ingestionStatus: IngestionStatus;
  dedupeFingerprint: string | null;
  errorMessage: string | null;
}

export interface ShareRoutingDecision {
  suggestedDestination: ShareDestination;
  confidence: RoutingConfidence;
  reason: string;
  alternativeDestinations: ShareDestination[];
}

export interface SharedInboundItemRow {
  id: string;
  user_id: string;
  trip_id: string;
  content_type: SharedContentType;
  destination: ShareDestination;
  normalized_url: string | null;
  normalized_text: string | null;
  preview_title: string | null;
  preview_subtitle: string | null;
  user_note: string | null;
  source_app: string | null;
  routing_confidence: RoutingConfidence | null;
  ingestion_status: IngestionStatus;
  materialized_id: string | null;
  materialized_type: string | null;
  dedupe_fingerprint: string | null;
  error_message: string | null;
  attachments: unknown;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export const DESTINATION_LABELS: Record<ShareDestination, string> = {
  explore_links: 'Explore Links',
  chat: 'Chat',
  tasks: 'Tasks',
  calendar: 'Calendar',
  concierge: 'Concierge',
};
