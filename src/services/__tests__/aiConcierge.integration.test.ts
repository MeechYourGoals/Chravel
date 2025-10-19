import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UniversalConciergeService } from '../universalConciergeService';
import { TripContextAggregator } from '../tripContextAggregator';
import { ContextCacheService } from '../contextCacheService';
import { supabase } from '../../integrations/supabase/client';

// Mock Supabase client
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock demo mode service
vi.mock('../demoModeService', () => ({
  demoModeService: {
    isDemoModeEnabled: vi.fn(() => Promise.resolve(false))
  }
}));

describe('AI Concierge Integration Tests', () => {
  const mockTripId = 'test-trip-123';
  const mockTripContext = {
    tripId: mockTripId,
    title: 'Test Trip',
    location: 'Paris',
    dateRange: { start: '2024-01-01', end: '2024-01-07' },
    participants: [
      { id: 'user1', name: 'John Doe', role: 'organizer' },
      { id: 'user2', name: 'Jane Smith', role: 'participant' }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ContextCacheService.clear();
  });

  describe('End-to-End AI Concierge Flow', () => {
    it('should process AI query with comprehensive context', async () => {
      // Mock comprehensive context
      const mockComprehensiveContext = {
        tripMetadata: {
          id: mockTripId,
          name: 'Test Trip',
          destination: 'Paris',
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          type: 'consumer'
        },
        collaborators: [
          { id: 'user1', name: 'John Doe', role: 'organizer', email: 'john@example.com' },
          { id: 'user2', name: 'Jane Smith', role: 'participant', email: 'jane@example.com' }
        ],
        messages: [
          { id: 'msg1', content: 'Looking forward to the trip!', authorName: 'John Doe', timestamp: '2024-01-01T10:00:00Z', type: 'message' }
        ],
        calendar: [
          { id: 'event1', title: 'Arrival', startTime: '2024-01-01T14:00:00Z', endTime: '2024-01-01T15:00:00Z', location: 'CDG Airport', description: 'Meet at terminal' }
        ],
        tasks: [
          { id: 'task1', content: 'Book restaurant', assignee: 'John Doe', dueDate: '2024-01-02', isComplete: false }
        ],
        payments: [
          { id: 'payment1', description: 'Hotel booking', amount: 500, paidBy: 'John Doe', participants: ['user1', 'user2'], isSettled: false }
        ],
        polls: [
          { id: 'poll1', question: 'Where should we eat?', options: [{ text: 'Restaurant A', votes: 2 }, { text: 'Restaurant B', votes: 1 }], status: 'active' }
        ],
        places: {
          basecamp: {
            name: 'Hotel Paris',
            address: '123 Champs Elysees',
            lat: 48.8566,
            lng: 2.3522
          },
          savedPlaces: []
        },
        media: {
          files: [],
          links: []
        }
      };

      // Mock edge function response
      const mockEdgeResponse = {
        data: {
          response: "Based on your trip to Paris, I can see you have an arrival event at CDG Airport and need to book a restaurant. Here are some great options near your hotel on Champs Elysees...",
          usage: { prompt_tokens: 150, completion_tokens: 200, total_tokens: 350 },
          sources: [
            { title: 'Best Restaurants in Paris', url: 'https://example.com', snippet: 'Top rated restaurants...', source: 'google_maps_grounding' }
          ],
          success: true
        },
        error: null
      };

      // Mock Supabase function call
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockEdgeResponse);

      // Mock TripContextAggregator
      vi.spyOn(TripContextAggregator, 'buildContext').mockResolvedValue(mockComprehensiveContext);

      const result = await UniversalConciergeService.processMessage(
        "What are the best restaurants for our group?",
        mockTripContext
      );

      expect(result.content).toContain('Based on your trip to Paris');
      expect(result.content).toContain('CDG Airport');
      expect(result.content).toContain('Champs Elysees');
      expect(result.searchResults).toEqual(mockEdgeResponse.data.sources);
      expect(result.isFromFallback).toBe(false);

      // Verify edge function was called with comprehensive context
      expect(supabase.functions.invoke).toHaveBeenCalledWith('lovable-concierge', {
        body: {
          message: "What are the best restaurants for our group?",
          tripContext: mockComprehensiveContext,
          tripId: mockTripId,
          chatHistory: mockComprehensiveContext.messages
        }
      });
    });

    it('should use cached context when available', async () => {
      const mockComprehensiveContext = {
        tripMetadata: { id: mockTripId, name: 'Test Trip', destination: 'Paris', startDate: '2024-01-01', endDate: '2024-01-07', type: 'consumer' },
        collaborators: [],
        messages: [],
        calendar: [],
        tasks: [],
        payments: [],
        polls: [],
        places: { basecamp: undefined, savedPlaces: [] },
        media: { files: [], links: [] }
      };

      // Pre-populate cache
      ContextCacheService.set(mockTripId, mockComprehensiveContext);

      const mockEdgeResponse = {
        data: {
          response: "I can help you with your Paris trip!",
          usage: { total_tokens: 100 },
          sources: [],
          success: true
        },
        error: null
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockEdgeResponse);

      const result = await UniversalConciergeService.processMessage(
        "Tell me about our trip",
        mockTripContext
      );

      expect(result.content).toBe("I can help you with your Paris trip!");
      
      // Verify TripContextAggregator was not called (cache hit)
      expect(TripContextAggregator.buildContext).not.toHaveBeenCalled();
    });

    it('should handle edge function errors gracefully', async () => {
      const mockComprehensiveContext = {
        tripMetadata: { id: mockTripId, name: 'Test Trip', destination: 'Paris', startDate: '2024-01-01', endDate: '2024-01-07', type: 'consumer' },
        collaborators: [],
        messages: [],
        calendar: [],
        tasks: [],
        payments: [],
        polls: [],
        places: { basecamp: undefined, savedPlaces: [] },
        media: { files: [], links: [] }
      };

      vi.spyOn(TripContextAggregator, 'buildContext').mockResolvedValue(mockComprehensiveContext);

      // Mock edge function error
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: new Error('Edge function error')
      });

      const result = await UniversalConciergeService.processMessage(
        "What should we do in Paris?",
        mockTripContext
      );

      expect(result.content).toContain("I'm having trouble processing your request right now");
      expect(result.isFromFallback).toBe(true);
    });

    it('should handle usage limit exceeded', async () => {
      const mockComprehensiveContext = {
        tripMetadata: { id: mockTripId, name: 'Test Trip', destination: 'Paris', startDate: '2024-01-01', endDate: '2024-01-07', type: 'consumer' },
        collaborators: [],
        messages: [],
        calendar: [],
        tasks: [],
        payments: [],
        polls: [],
        places: { basecamp: undefined, savedPlaces: [] },
        media: { files: [], links: [] }
      };

      vi.spyOn(TripContextAggregator, 'buildContext').mockResolvedValue(mockComprehensiveContext);

      // Mock usage limit exceeded response
      const mockLimitResponse = {
        data: {
          response: "🚫 **Daily query limit reached**\n\nYou've used all 10 free AI queries today. Upgrade to Pro for unlimited access!",
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          sources: [],
          success: false,
          error: 'usage_limit_exceeded',
          upgradeRequired: true
        },
        error: null
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockLimitResponse);

      const result = await UniversalConciergeService.processMessage(
        "What should we do?",
        mockTripContext
      );

      expect(result.content).toContain('Daily query limit reached');
      expect(result.content).toContain('Upgrade to Pro');
    });
  });

  describe('Context Aggregation Integration', () => {
    it('should aggregate data from all sources', async () => {
      const mockSupabase = vi.mocked(supabase);
      
      // Mock all data sources
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: mockTripId, name: 'Test Trip', destination: 'Paris', start_date: '2024-01-01', end_date: '2024-01-07', trip_type: 'consumer' }, error: null }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      } as any);

      const context = await TripContextAggregator.buildContext(mockTripId);

      expect(context.tripMetadata.id).toBe(mockTripId);
      expect(context.tripMetadata.name).toBe('Test Trip');
      expect(context.tripMetadata.destination).toBe('Paris');
      expect(context.collaborators).toEqual([]);
      expect(context.messages).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const mockSupabase = vi.mocked(supabase);
      
      // Mock database error
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Database connection failed') })
          })
        })
      } as any);

      const context = await TripContextAggregator.buildContext(mockTripId);

      expect(context.tripMetadata.id).toBe(mockTripId);
      expect(context.tripMetadata.name).toBe('Unknown Trip');
      expect(context.collaborators).toEqual([]);
    });
  });

  describe('Cache Integration', () => {
    it('should cache and retrieve context data', () => {
      const mockContext = {
        tripMetadata: { id: mockTripId, name: 'Test Trip', destination: 'Paris', startDate: '2024-01-01', endDate: '2024-01-07', type: 'consumer' },
        collaborators: [],
        messages: [],
        calendar: [],
        tasks: [],
        payments: [],
        polls: [],
        places: { basecamp: undefined, savedPlaces: [] },
        media: { files: [], links: [] }
      };

      // Set cache
      ContextCacheService.set(mockTripId, mockContext);
      
      // Retrieve from cache
      const retrieved = ContextCacheService.get(mockTripId);
      expect(retrieved).toEqual(mockContext);

      // Check cache stats
      const stats = ContextCacheService.getStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0].tripId).toBe(mockTripId);
    });

    it('should invalidate cache when needed', () => {
      const mockContext = {
        tripMetadata: { id: mockTripId, name: 'Test Trip', destination: 'Paris', startDate: '2024-01-01', endDate: '2024-01-07', type: 'consumer' },
        collaborators: [],
        messages: [],
        calendar: [],
        tasks: [],
        payments: [],
        polls: [],
        places: { basecamp: undefined, savedPlaces: [] },
        media: { files: [], links: [] }
      };

      ContextCacheService.set(mockTripId, mockContext);
      expect(ContextCacheService.get(mockTripId)).toEqual(mockContext);

      ContextCacheService.invalidate(mockTripId);
      expect(ContextCacheService.get(mockTripId)).toBeNull();
    });
  });

  describe('Real-time Updates', () => {
    it('should handle context updates', async () => {
      const mockContext = {
        tripMetadata: { id: mockTripId, name: 'Test Trip', destination: 'Paris', startDate: '2024-01-01', endDate: '2024-01-07', type: 'consumer' },
        collaborators: [],
        messages: [],
        calendar: [],
        tasks: [],
        payments: [],
        polls: [],
        places: { basecamp: undefined, savedPlaces: [] },
        media: { files: [], links: [] }
      };

      // Set initial cache
      ContextCacheService.set(mockTripId, mockContext);
      
      // Simulate context update
      ContextCacheService.invalidate(mockTripId);
      
      // Verify cache is cleared
      expect(ContextCacheService.get(mockTripId)).toBeNull();
    });
  });
});
