import { JoinRequest } from '@/hooks/useJoinRequests';

// Mock pending join requests for demo mode
export const mockPendingRequests: Record<string, JoinRequest[]> = {
  '1': [ // Spring Break Cancun
    {
      id: 'demo-request-1',
      trip_id: '1',
      user_id: 'demo-user-123',
      invite_code: 'SPRING2024',
      status: 'pending',
      requested_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
      profile: {
        display_name: 'Alex Johnson',
        avatar_url: undefined,
        email: 'alex@example.com'
      }
    },
    {
      id: 'demo-request-2',
      trip_id: '1',
      user_id: 'demo-user-456',
      invite_code: 'SPRING2024',
      status: 'pending',
      requested_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      profile: {
        display_name: 'Jordan Smith',
        avatar_url: undefined,
        email: 'jordan@example.com'
      }
    }
  ],
  '2': [ // Euro Summer Trip
    {
      id: 'demo-request-3',
      trip_id: '2',
      user_id: 'demo-user-789',
      invite_code: 'EURO2024',
      status: 'pending',
      requested_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      profile: {
        display_name: 'Taylor Williams',
        avatar_url: undefined,
        email: 'taylor@example.com'
      }
    }
  ],
  'pro-1': [ // Pro Trip Request
    {
      id: 'demo-request-pro-1',
      trip_id: 'pro-1',
      user_id: 'demo-user-pro-1',
      invite_code: 'TEAM2024',
      status: 'pending',
      requested_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
      profile: {
        display_name: 'Chris Martinez',
        avatar_url: undefined,
        email: 'chris@example.com'
      }
    }
  ]
};

export const getMockPendingRequests = (tripId: string): JoinRequest[] => {
  return mockPendingRequests[tripId] || [];
};
