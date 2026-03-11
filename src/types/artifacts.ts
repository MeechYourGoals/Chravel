// Trip Artifact Types — Multimodal Retrieval Layer

export const ARTIFACT_TYPES = [
  'flight',
  'hotel',
  'restaurant_reservation',
  'event_ticket',
  'itinerary',
  'schedule',
  'place_recommendation',
  'payment_proof',
  'roster',
  'credential',
  'generic_document',
  'generic_image',
  'unknown',
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ARTIFACT_SOURCE_TYPES = [
  'upload',
  'gmail_import',
  'smart_import',
  'chat_attachment',
  'link_extract',
  'manual',
] as const;

export type ArtifactSourceType = (typeof ARTIFACT_SOURCE_TYPES)[number];

export type EmbeddingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export type EmbeddingInputModality = 'text' | 'image' | 'pdf' | 'audio' | 'video';

export type ClassificationMethod = 'deterministic' | 'embedding' | 'llm' | 'user_override';

export interface TripArtifact {
  id: string;
  trip_id: string;
  creator_id: string;
  source_type: ArtifactSourceType;
  mime_type: string | null;
  file_name: string | null;
  file_url: string | null;
  file_size_bytes: number | null;
  artifact_type: ArtifactType;
  artifact_type_confidence: number;
  classification_method: ClassificationMethod | null;
  extracted_text: string | null;
  extracted_entities: Record<string, unknown>;
  ai_summary: string | null;
  embedding_model: string;
  embedding_dimensions: number;
  embedding_status: EmbeddingStatus;
  embedding_error: string | null;
  embedding_input_modality: EmbeddingInputModality | null;
  metadata: Record<string, unknown>;
  parent_artifact_id: string | null;
  chunk_index: number | null;
  created_at: string;
  updated_at: string;
}

export interface ArtifactSearchResult {
  id: string;
  trip_id: string;
  artifact_type: ArtifactType;
  source_type: ArtifactSourceType;
  file_name: string | null;
  extracted_text: string | null;
  ai_summary: string | null;
  similarity: number;
  metadata: Record<string, unknown>;
  created_at: string;
  creator_id: string;
}

export interface ArtifactClassification {
  artifact_type: ArtifactType;
  confidence: number;
  method: ClassificationMethod;
  reasoning: string;
}

export interface ArtifactSuggestedAction {
  type:
    | 'add_to_calendar'
    | 'save_to_places'
    | 'save_to_docs'
    | 'attach_to_recap'
    | 'store_in_memory';
  label: string;
  description: string;
  data?: Record<string, unknown>;
}

export interface ArtifactIngestResult {
  artifact: TripArtifact;
  classification: ArtifactClassification;
  suggestedActions: ArtifactSuggestedAction[];
  similarArtifacts: ArtifactSearchResult[];
  isDuplicate: boolean;
}

export interface ArtifactSearchQuery {
  tripId: string;
  query: string;
  artifactTypes?: ArtifactType[];
  sourceTypes?: ArtifactSourceType[];
  createdAfter?: string;
  createdBefore?: string;
  creatorId?: string;
  limit?: number;
  threshold?: number;
}
