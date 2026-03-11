import { describe, it, expect } from 'vitest';
import {
  ARTIFACT_TYPES,
  ARTIFACT_SOURCE_TYPES,
  type ArtifactType,
  type ArtifactSourceType,
  type EmbeddingStatus,
  type EmbeddingInputModality,
  type ClassificationMethod,
  type ArtifactSearchQuery,
  type ArtifactIngestResult,
} from '../artifacts';

describe('Artifact type constants', () => {
  it('contains all expected artifact types', () => {
    expect(ARTIFACT_TYPES).toContain('flight');
    expect(ARTIFACT_TYPES).toContain('hotel');
    expect(ARTIFACT_TYPES).toContain('restaurant_reservation');
    expect(ARTIFACT_TYPES).toContain('event_ticket');
    expect(ARTIFACT_TYPES).toContain('itinerary');
    expect(ARTIFACT_TYPES).toContain('schedule');
    expect(ARTIFACT_TYPES).toContain('place_recommendation');
    expect(ARTIFACT_TYPES).toContain('payment_proof');
    expect(ARTIFACT_TYPES).toContain('roster');
    expect(ARTIFACT_TYPES).toContain('credential');
    expect(ARTIFACT_TYPES).toContain('generic_document');
    expect(ARTIFACT_TYPES).toContain('generic_image');
    expect(ARTIFACT_TYPES).toContain('unknown');
  });

  it('has exactly 13 artifact types', () => {
    expect(ARTIFACT_TYPES.length).toBe(13);
  });
});

describe('Artifact source type constants', () => {
  it('contains all expected source types', () => {
    expect(ARTIFACT_SOURCE_TYPES).toContain('upload');
    expect(ARTIFACT_SOURCE_TYPES).toContain('gmail_import');
    expect(ARTIFACT_SOURCE_TYPES).toContain('smart_import');
    expect(ARTIFACT_SOURCE_TYPES).toContain('chat_attachment');
    expect(ARTIFACT_SOURCE_TYPES).toContain('link_extract');
    expect(ARTIFACT_SOURCE_TYPES).toContain('manual');
  });

  it('has exactly 6 source types', () => {
    expect(ARTIFACT_SOURCE_TYPES.length).toBe(6);
  });
});

describe('Type assignability', () => {
  it('accepts valid artifact types', () => {
    const validType: ArtifactType = 'flight';
    expect(validType).toBe('flight');
  });

  it('accepts valid source types', () => {
    const validSource: ArtifactSourceType = 'upload';
    expect(validSource).toBe('upload');
  });

  it('accepts valid embedding statuses', () => {
    const statuses: EmbeddingStatus[] = ['pending', 'processing', 'completed', 'failed', 'skipped'];
    expect(statuses.length).toBe(5);
  });

  it('accepts valid modalities', () => {
    const modalities: EmbeddingInputModality[] = ['text', 'image', 'pdf', 'audio', 'video'];
    expect(modalities.length).toBe(5);
  });

  it('accepts valid classification methods', () => {
    const methods: ClassificationMethod[] = ['deterministic', 'embedding', 'llm', 'user_override'];
    expect(methods.length).toBe(4);
  });
});

describe('ArtifactSearchQuery interface', () => {
  it('creates valid search queries', () => {
    const query: ArtifactSearchQuery = {
      tripId: 'trip-123',
      query: 'hotel confirmation',
      artifactTypes: ['hotel', 'generic_document'],
      limit: 5,
      threshold: 0.6,
    };

    expect(query.tripId).toBe('trip-123');
    expect(query.query).toBe('hotel confirmation');
    expect(query.artifactTypes).toHaveLength(2);
    expect(query.limit).toBe(5);
    expect(query.threshold).toBe(0.6);
  });

  it('allows minimal search queries', () => {
    const query: ArtifactSearchQuery = {
      tripId: 'trip-456',
      query: 'boarding pass',
    };

    expect(query.tripId).toBe('trip-456');
    expect(query.artifactTypes).toBeUndefined();
    expect(query.limit).toBeUndefined();
  });
});

describe('ArtifactIngestResult interface', () => {
  it('creates valid ingest results', () => {
    const result: ArtifactIngestResult = {
      artifact: {
        id: 'art-1',
        trip_id: 'trip-1',
        creator_id: 'user-1',
        source_type: 'upload',
        mime_type: 'image/jpeg',
        file_name: 'boarding-pass.jpg',
        file_url: null,
        file_size_bytes: 1024,
        artifact_type: 'flight',
        artifact_type_confidence: 0.92,
        classification_method: 'llm',
        extracted_text: 'Flight AA1234 LAX to JFK',
        extracted_entities: { airlines: ['AA'] },
        ai_summary: 'American Airlines boarding pass LAX to JFK',
        embedding_model: 'gemini-embedding-exp-03-07',
        embedding_dimensions: 1536,
        embedding_status: 'completed',
        embedding_error: null,
        embedding_input_modality: 'image',
        metadata: {},
        parent_artifact_id: null,
        chunk_index: null,
        created_at: '2026-03-10T00:00:00Z',
        updated_at: '2026-03-10T00:00:00Z',
      },
      classification: {
        artifact_type: 'flight',
        confidence: 0.92,
        method: 'llm',
        reasoning: 'Contains airline and flight number',
      },
      suggestedActions: [
        {
          type: 'add_to_calendar',
          label: 'Add to Calendar',
          description: 'Create a calendar event for this flight',
        },
      ],
      similarArtifacts: [],
      isDuplicate: false,
    };

    expect(result.artifact.artifact_type).toBe('flight');
    expect(result.classification.confidence).toBe(0.92);
    expect(result.suggestedActions).toHaveLength(1);
    expect(result.isDuplicate).toBe(false);
  });
});
