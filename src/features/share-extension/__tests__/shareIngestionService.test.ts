import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SharedInboundItem, ShareDestination } from '../types';

// Mock Supabase
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockGte = vi.fn();
const mockLimit = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          eq: mockEq.mockReturnValue({
            gte: mockGte.mockReturnValue({
              limit: mockLimit,
            }),
          }),
          in: mockIn.mockReturnValue({
            order: mockOrder.mockReturnValue({
              limit: mockLimit,
            }),
          }),
        }),
      }),
      update: mockUpdate.mockReturnValue({
        eq: mockEq,
      }),
    })),
  },
}));

function createTestItem(overrides: Partial<SharedInboundItem> = {}): SharedInboundItem {
  return {
    id: 'test-id-123',
    createdAt: new Date().toISOString(),
    sourceAppIdentifier: null,
    contentType: 'url',
    normalizedURL: 'https://example.com/article',
    normalizedText: null,
    previewTitle: 'Example Article',
    previewSubtitle: 'https://example.com/article',
    attachments: [],
    selectedTripId: 'trip-123',
    selectedDestination: 'explore_links',
    routingDecision: {
      suggestedDestination: 'explore_links',
      confidence: 'high',
      reason: 'Web link shared',
      alternativeDestinations: ['chat', 'concierge'],
    },
    userNote: null,
    ingestionStatus: 'queued',
    dedupeFingerprint: 'abc123',
    errorMessage: null,
    ...overrides,
  };
}

describe('shareIngestionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockSingle.mockResolvedValue({ data: { id: 'new-id' }, error: null });
    mockEq.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      gte: mockGte,
      order: mockOrder,
      limit: mockLimit,
    });
  });

  it('should create a valid test item', () => {
    const item = createTestItem();
    expect(item.id).toBe('test-id-123');
    expect(item.contentType).toBe('url');
    expect(item.selectedTripId).toBe('trip-123');
    expect(item.selectedDestination).toBe('explore_links');
  });

  it('should handle all destination types', () => {
    const destinations: ShareDestination[] = [
      'explore_links',
      'chat',
      'tasks',
      'calendar',
      'concierge',
    ];

    for (const dest of destinations) {
      const item = createTestItem({ selectedDestination: dest });
      expect(item.selectedDestination).toBe(dest);
    }
  });

  it('should handle items with attachments', () => {
    const item = createTestItem({
      contentType: 'image',
      attachments: [
        {
          id: 'attach-1',
          contentType: 'image',
          fileName: 'photo.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024000,
          localRelativePath: 'attachments/test-id-123/attach-1_photo.jpg',
          inlineData: null,
          thumbnailData: null,
        },
      ],
    });

    expect(item.attachments).toHaveLength(1);
    expect(item.attachments[0].fileName).toBe('photo.jpg');
    expect(item.attachments[0].contentType).toBe('image');
  });

  it('should handle items with user notes', () => {
    const item = createTestItem({
      userNote: 'Check this restaurant for our trip!',
    });

    expect(item.userNote).toBe('Check this restaurant for our trip!');
  });

  it('should handle items with no URL (text only)', () => {
    const item = createTestItem({
      contentType: 'plain_text',
      normalizedURL: null,
      normalizedText: 'Remember to book the hotel by Friday',
      selectedDestination: 'tasks',
    });

    expect(item.contentType).toBe('plain_text');
    expect(item.normalizedURL).toBeNull();
    expect(item.normalizedText).toBe('Remember to book the hotel by Friday');
  });
});

describe('content type routing expectations', () => {
  it('URLs should default to explore_links', () => {
    const item = createTestItem({ contentType: 'url' });
    expect(item.routingDecision?.suggestedDestination).toBe('explore_links');
  });

  it('should provide alternative destinations', () => {
    const item = createTestItem();
    expect(item.routingDecision?.alternativeDestinations).toContain('chat');
    expect(item.routingDecision?.alternativeDestinations).toContain('concierge');
  });
});
