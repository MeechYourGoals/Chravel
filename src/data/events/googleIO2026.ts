import { EventData } from '../../types/events';
import { getMockAvatar } from '../../utils/mockAvatars';

export const googleIO2026Event: EventData = {
  id: 'spotify-house-seoul-2026',
  title: 'Spotify House Holiday Party — Seoul',
  location: 'Seoul, South Korea',
  dateRange: 'Dec 12, 2026',
  category: 'Brand / Music / Creator Event',
  description: 'Spotify\'s annual holiday celebration in Seoul bringing together artists, creators, industry leaders, and tastemakers. Featuring live performances, DJ sets, immersive brand activations, and curated experiences.',
  tags: ['Music', 'Creators', 'Brand Activation', 'Nightlife', 'Seoul'],
  participants: [
    { id: 1, name: 'DJ SODA', avatar: getMockAvatar('DJ SODA'), role: 'Headliner DJ' },
    { id: 2, name: 'Jay Park', avatar: getMockAvatar('Jay Park'), role: 'Special Guest Artist' },
    { id: 3, name: 'Min-ji Kim', avatar: getMockAvatar('Min-ji Kim'), role: 'Event Producer' },
    { id: 4, name: 'Alex Chen', avatar: getMockAvatar('Alex Chen'), role: 'Spotify Partnerships' }
  ],
  itinerary: [
    {
      date: '2026-12-12',
      events: [
        { title: 'VIP Check-In & Welcome Cocktails', location: 'Spotify House Seoul', time: '19:00' },
        { title: 'Opening Performance & Brand Activation', location: 'Main Stage', time: '20:00' },
        { title: 'DJ Sets & Late Night Party', location: 'Club Level', time: '22:00' }
      ]
    }
  ],
  budget: {
    total: 650000,
    spent: 420000,
    categories: [
      { name: 'Venue & Production', allocated: 280000, spent: 200000 },
      { name: 'Talent & Artists', allocated: 250000, spent: 150000 },
      { name: 'Hospitality & Catering', allocated: 120000, spent: 70000 }
    ]
  },
  groupChatEnabled: true,
  attendanceExpected: 1200,
  capacity: 1200,
  registrationStatus: 'open',
  checkedInCount: 0,
  userRole: 'attendee',
  tracks: [
    { id: 'main-stage', name: 'Main Stage', color: '#1DB954', location: 'Ground Floor' },
    { id: 'lounge', name: 'Creator Lounge', color: '#191414', location: '2nd Floor' },
    { id: 'club', name: 'Club Level', color: '#535353', location: 'Basement' }
  ],
  speakers: [
    {
      id: 'dj-soda',
      name: 'DJ SODA',
      title: 'International DJ & Producer',
      company: 'Independent',
      bio: 'World-renowned Korean DJ known for electrifying performances and massive social media following, bringing high-energy EDM to global audiences.',
      avatar: getMockAvatar('DJ SODA'),
      sessions: ['main-performance']
    },
    {
      id: 'jay-park',
      name: 'Jay Park',
      title: 'Artist & CEO',
      company: 'H1GHR Music & AOMG',
      bio: 'Korean-American rapper, singer, songwriter, and entrepreneur. Founder of two influential hip-hop labels and pioneer of Korean R&B.',
      avatar: getMockAvatar('Jay Park'),
      sessions: ['special-guest-set']
    }
  ],
  sessions: [
    {
      id: 'main-performance',
      title: 'Opening Performance & Brand Showcase',
      description: 'Spotify\'s immersive brand experience featuring live performances, artist collaborations, and exclusive music previews.',
      speaker: 'dj-soda',
      track: 'main-stage',
      startTime: '20:00',
      endTime: '22:00',
      location: 'Main Stage'
    },
    {
      id: 'special-guest-set',
      title: 'Jay Park Special Performance',
      description: 'Exclusive live set from Jay Park featuring unreleased tracks and surprise guest collaborations.',
      speaker: 'jay-park',
      track: 'main-stage',
      startTime: '21:00',
      endTime: '21:45',
      location: 'Main Stage'
    }
  ],
  sponsors: [
    {
      id: 'sponsor-1',
      name: 'Samsung',
      tier: 'platinum',
      logo: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=120&h=60&fit=crop',
      website: 'https://samsung.com',
      description: 'Premium audio and mobile technology partner',
      booth: 'Activation Zone A'
    }
  ],
  exhibitors: [],
  agenda: [
    { id: 'sps-a1', title: 'VIP Check-In & Welcome Cocktails', start_time: '19:00', end_time: '20:00', location: 'Entrance Lounge' },
    { id: 'sps-a2', title: 'Opening Performance', start_time: '20:00', end_time: '21:00', location: 'Main Stage' },
    { id: 'sps-a3', title: 'Jay Park Special Set', start_time: '21:00', end_time: '21:45', location: 'Main Stage' },
    { id: 'sps-a4', title: 'DJ Sets & Late Night Party', start_time: '22:00', end_time: '03:00', location: 'Club Level' }
  ],
  tasks: [
    { id: 'sps-t1', title: 'Download your digital invitation QR code', sort_order: 0 },
    { id: 'sps-t2', title: 'Arrive before 8 PM for priority entry', sort_order: 1 },
    { id: 'sps-t3', title: 'Check out the brand activations on the 2nd floor', sort_order: 2 },
    { id: 'sps-t4', title: 'Tag @spotify in your social posts for featured content', sort_order: 3 }
  ]
};
