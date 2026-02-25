import { JoinRequest } from '@/hooks/useJoinRequests';

// Mock pending join requests for demo mode
export const mockPendingRequests: Record<string, JoinRequest[]> = {
  '1': [
    // Spring Break Cancun
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
      },
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
      },
    },
  ],
  '2': [
    // Euro Summer Trip / Tokyo Adventure
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
      },
    },
  ],
  '3': [
    // Tokyo Adventure
    {
      id: 'demo-request-tokyo-1',
      trip_id: '3',
      user_id: 'demo-user-tokyo-1',
      invite_code: 'TOKYO2024',
      status: 'pending',
      requested_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
      profile: {
        display_name: 'Kenji Watanabe',
        avatar_url: undefined,
      },
    },
    {
      id: 'demo-request-tokyo-2',
      trip_id: '3',
      user_id: 'demo-user-tokyo-2',
      invite_code: 'TOKYO2024',
      status: 'pending',
      requested_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
      profile: {
        display_name: 'Yuki Tanaka',
        avatar_url: undefined,
      },
    },
  ],
  '4': [
    // The Tyler's Tie The Knot
    {
      id: 'demo-request-wedding-1',
      trip_id: '4',
      user_id: 'demo-user-wedding-1',
      invite_code: 'WEDDING2024',
      status: 'pending',
      requested_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
      profile: {
        display_name: 'Michael Chen',
        avatar_url: undefined,
      },
    },
    {
      id: 'demo-request-wedding-2',
      trip_id: '4',
      user_id: 'demo-user-wedding-2',
      invite_code: 'WEDDING2024',
      status: 'pending',
      requested_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
      profile: {
        display_name: 'Emma Rodriguez',
        avatar_url: undefined,
      },
    },
    {
      id: 'demo-request-wedding-3',
      trip_id: '4',
      user_id: 'demo-user-wedding-3',
      invite_code: 'WEDDING2024',
      status: 'pending',
      requested_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
      profile: {
        display_name: 'David Park',
        avatar_url: undefined,
      },
    },
  ],
  'pro-1': [
    // Pro Trip Request
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
      },
    },
  ],
};

export const getMockPendingRequests = (tripId: string): JoinRequest[] => {
  return mockPendingRequests[tripId] || [];
};
