import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TripContextAggregator } from '../tripContextAggregator';
import { supabase } from '../../integrations/supabase/client';

// Mock Supabase client
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn()
          }))
        }))
      }))
    }))
  }
}));

describe('TripContextAggregator', () => {
  const mockTripId = 'test-trip-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildContext', () => {
    it('should build comprehensive context successfully', async () => {
      // Mock successful responses for all data sources
      const mockTripMetadata = {
        id: mockTripId,
        name: 'Test Trip',
        destination: 'Paris',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        trip_type: 'consumer'
      };

      const mockCollaborators = [
        { user_id: 'user1', role: 'organizer', profiles: { full_name: 'John Doe', email: 'john@example.com' } },
        { user_id: 'user2', role: 'participant', profiles: { full_name: 'Jane Smith', email: 'jane@example.com' } }
      ];

      const mockMessages = [
        { id: 'msg1', content: 'Hello everyone!', author_name: 'John Doe', created_at: '2024-01-01T10:00:00Z', message_type: 'message' },
        { id: 'msg2', content: 'Looking forward to the trip!', author_name: 'Jane Smith', created_at: '2024-01-01T10:05:00Z', message_type: 'message' }
      ];

      const mockCalendar = [
        { id: 'event1', title: 'Arrival', start_time: '2024-01-01T14:00:00Z', end_time: '2024-01-01T15:00:00Z', location: 'CDG Airport', description: 'Meet at terminal' }
      ];

      const mockTasks = [
        { id: 'task1', content: 'Book restaurant', assignee_id: 'user1', due_date: '2024-01-02', is_complete: false, profiles: { full_name: 'John Doe' } }
      ];

      const mockPayments = [
        { id: 'payment1', description: 'Hotel booking', amount: 500, created_by: 'user1', split_participants: ['user1', 'user2'], is_settled: false, profiles: { full_name: 'John Doe' } }
      ];

      const mockPolls = [
        { id: 'poll1', question: 'Where should we eat?', options: [{ text: 'Restaurant A', votes: 2 }, { text: 'Restaurant B', votes: 1 }], status: 'active' }
      ];

      const mockPlaces = {
        trip: { basecamp_name: 'Hotel Paris', basecamp_address: '123 Champs Elysees' },
        places: [
          { name: 'Hotel Paris', address: '123 Champs Elysees', category: 'accommodation', lat: 48.8566, lng: 2.3522 }
        ]
      };

      const mockFiles = [
        { id: 'file1', file_name: 'itinerary.pdf', file_type: 'application/pdf', file_url: 'https://example.com/file1.pdf', uploaded_by: 'user1', created_at: '2024-01-01T09:00:00Z', profiles: { full_name: 'John Doe' } }
      ];

      const mockLinks = [
        { id: 'link1', url: 'https://example.com/restaurant', title: 'Best Restaurant', category: 'restaurant', added_by: 'user1', profiles: { full_name: 'John Doe' } }
      ];

      // Mock Supabase responses
      const mockSupabase = vi.mocked(supabase);
      
      // Mock trip metadata
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockTripMetadata, error: null })
          })
        })
      } as any);

      // Mock collaborators
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockCollaborators, error: null })
        })
      } as any);

      // Mock messages
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockMessages, error: null })
            })
          })
        })
      } as any);

      // Mock calendar
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockCalendar, error: null })
          })
        })
      } as any);

      // Mock tasks
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockTasks, error: null })
        })
      } as any);

      // Mock payments
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockPayments, error: null })
        })
      } as any);

      // Mock polls
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockPolls, error: null })
        })
      } as any);

      // Mock places (trip)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPlaces.trip, error: null })
          })
        })
      } as any);

      // Mock places (places)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockPlaces.places, error: null })
        })
      } as any);

      // Mock files
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockFiles, error: null })
        })
      } as any);

      // Mock links
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockLinks, error: null })
        })
      } as any);

      const result = await TripContextAggregator.buildContext(mockTripId);

      expect(result).toEqual({
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
          { id: 'msg1', content: 'Hello everyone!', authorName: 'John Doe', timestamp: '2024-01-01T10:00:00Z', type: 'message' },
          { id: 'msg2', content: 'Looking forward to the trip!', authorName: 'Jane Smith', timestamp: '2024-01-01T10:05:00Z', type: 'message' }
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
          savedPlaces: [
            { name: 'Hotel Paris', address: '123 Champs Elysees', category: 'accommodation' }
          ]
        },
        media: {
          files: [
            { id: 'file1', name: 'itinerary.pdf', type: 'application/pdf', url: 'https://example.com/file1.pdf', uploadedBy: 'John Doe', uploadedAt: '2024-01-01T09:00:00Z' }
          ],
          links: [
            { id: 'link1', url: 'https://example.com/restaurant', title: 'Best Restaurant', category: 'restaurant', addedBy: 'John Doe' }
          ]
        }
      });
    });

    it('should handle errors gracefully and return fallback data', async () => {
      // Mock error responses
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
          })
        })
      } as any);

      const result = await TripContextAggregator.buildContext(mockTripId);

      expect(result.tripMetadata).toEqual({
        id: mockTripId,
        name: 'Unknown Trip',
        destination: 'Unknown',
        startDate: '',
        endDate: '',
        type: 'consumer'
      });
      expect(result.collaborators).toEqual([]);
      expect(result.messages).toEqual([]);
    });

    it('should handle missing data gracefully', async () => {
      // Mock empty responses
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        })
      } as any);

      const result = await TripContextAggregator.buildContext(mockTripId);

      expect(result.tripMetadata.id).toBe(mockTripId);
      expect(result.collaborators).toEqual([]);
      expect(result.messages).toEqual([]);
    });
  });
});
